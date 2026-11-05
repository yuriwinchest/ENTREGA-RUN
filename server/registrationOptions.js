import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { isIdentifyingColumn } from './medico.js'

export const STANDARD_OPTION_LIMITS = Object.freeze({
  equipe: 128,
  modalidade: 64,
  categoria: 64,
  kit: 64,
  camiseta: 32,
  nacionalidade: 64,
})

const CONTROL_CHARACTERS = /[\p{Cc}\p{Cf}]/u
const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const SENSITIVE_OR_OPERATIONAL = /\b(pcd|saude|medical|medic\w*|alerg\w*|sang\w*|doenc\w*|deficien\w*|laudo\w*|cid|emergencia|restric\w*|observ\w*|nome|name|idade|age|chip|qrcode|qr code|numero|peito|id|identificador|status|sexo|genero|morador|visitante|permiss\w*|papel|role|senha|password|token|entreg\w*)\b/
const SENTINELS = /^(?:[-—–]+|sem equipe|selecione(?:\b.*)?|selecionar(?:\b.*)?|adicionar(?:\b.*)?|__.*__)$/i

export class RegistrationOptionError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'RegistrationOptionError'
    this.status = status
  }
}

function normalizedText(value) {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
}

function optionIdentity(value) {
  return normalizedText(value).toLocaleUpperCase('pt-BR')
}

function semanticText(value) {
  return normalizedText(String(value || '')).normalize('NFD').replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim()
}

function customKey(column) {
  if (!column || typeof column !== 'object' || column.type === 'standard') return ''
  if (typeof column.customKey === 'string') return column.customKey
  return typeof column.key === 'string' && column.key.startsWith('custom:') ? column.key.slice(7) : ''
}

function validCustomKey(key) {
  return typeof key === 'string' && key.length > 0 && key.length <= 128 &&
    key === key.trim() && !CONTROL_CHARACTERS.test(key) && !RESERVED_KEYS.has(key.toLowerCase())
}

export function isEligibleCustomOptionField(column, healthFields = []) {
  const key = customKey(column)
  if (!validCustomKey(key)) return false
  const label = typeof column.label === 'string' ? column.label : key
  if (CONTROL_CHARACTERS.test(label)) return false
  const texts = [key, label]
  if (texts.some((text) => isIdentifyingColumn(text) || SENSITIVE_OR_OPERATIONAL.test(semanticText(text)))) return false
  return !(Array.isArray(healthFields) ? healthFields : []).some((field) => {
    const healthKey = String(field?.key || '').replace(/^custom:/, '')
    return optionIdentity(healthKey) === optionIdentity(key)
  })
}

export function eligibleCustomOptionFields(data = {}) {
  const schema = Array.isArray(data?.schema) ? data.schema : []
  // Sem schema legado, só descobrimos chaves realmente existentes no evento;
  // os valores dos atletas nunca são promovidos ao catálogo compartilhado.
  const columns = schema.length ? schema : [...new Set(
    (Array.isArray(data?.athletes) ? data.athletes : []).flatMap((athlete) =>
      athlete?.customFields && typeof athlete.customFields === 'object' && !Array.isArray(athlete.customFields)
        ? Object.keys(athlete.customFields) : []),
  )].map((key) => ({ key: `custom:${key}`, customKey: key, label: key, type: 'custom' }))
  return [...new Set(columns.filter((column) => isEligibleCustomOptionField(column, data?.healthFields)).map(customKey))]
}

function fieldLimit(field) {
  if (typeof field !== 'string') throw new RegistrationOptionError('Este campo não permite cadastrar opções.')
  if (Object.hasOwn(STANDARD_OPTION_LIMITS, field)) return STANDARD_OPTION_LIMITS[field]
  if (typeof field === 'string' && field.startsWith('custom:') && validCustomKey(field.slice(7))) return 128
  throw new RegistrationOptionError('Este campo não permite cadastrar opções.')
}

export function cleanRegistrationOption(field, value) {
  const limit = fieldLimit(field)
  if (typeof value !== 'string' || CONTROL_CHARACTERS.test(value)) {
    throw new RegistrationOptionError('Informe uma opção em texto, sem caracteres de controle.')
  }
  const label = normalizedText(value)
  if (!label || SENTINELS.test(label) || SENTINELS.test(semanticText(label)) || /^[-—–]+$/.test(label)) {
    throw new RegistrationOptionError('Informe o nome da nova opção.')
  }
  if (label.length > limit) throw new RegistrationOptionError(`A opção deve ter no máximo ${limit} caracteres.`)
  return label
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function validateState(state) {
  if (!isRecord(state) || state.version !== 1 || !isRecord(state.scopes)) throw new Error('Formato inválido.')
  for (const [scope, options] of Object.entries(state.scopes)) {
    if (!scope.startsWith('team:') || !isRecord(options)) throw new Error('Organização inválida.')
    for (const [field, labels] of Object.entries(options)) {
      if (!Array.isArray(labels)) throw new Error('Lista de opções inválida.')
      const seen = new Set()
      for (const label of labels) {
        if (cleanRegistrationOption(field, label) !== label || seen.has(optionIdentity(label))) throw new Error('Opção inválida ou repetida.')
        seen.add(optionIdentity(label))
      }
      fieldLimit(field)
    }
  }
  return state
}

function scopeKey(scope) {
  if (typeof scope !== 'string' || scope.length > 256 || CONTROL_CHARACTERS.test(scope)) {
    throw new RegistrationOptionError('Organização inválida.')
  }
  return `team:${scope}`
}

export function createRegistrationOptionsStore(dataDir) {
  const file = path.join(dataDir, 'registration_options.json')
  const unavailable = () => new RegistrationOptionError('O catálogo de opções está indisponível. Tente novamente ou contate a administração.', 503)

  function read() {
    try {
      return validateState(JSON.parse(fs.readFileSync(file, 'utf8')))
    } catch (error) {
      if (error.code === 'ENOENT') return { version: 1, scopes: {} }
      throw unavailable()
    }
  }

  function write(next) {
    const temp = `${file}.${crypto.randomUUID()}.tmp`
    try {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
      fs.writeFileSync(temp, JSON.stringify(next), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      fs.renameSync(temp, file)
    } catch {
      throw unavailable()
    } finally {
      try { fs.rmSync(temp, { force: true }) } catch {}
    }
  }

  return {
    list(scope = '', fields = Object.keys(STANDARD_OPTION_LIMITS)) {
      const key = scopeKey(scope)
      const state = read()
      const options = Object.hasOwn(state.scopes, key) ? state.scopes[key] : {}
      return Object.fromEntries(fields.map((field) => {
        fieldLimit(field)
        return [field, Object.hasOwn(options, field) ? [...options[field]] : []]
      }))
    },
    add(scope, field, value) {
      const key = scopeKey(scope)
      const label = cleanRegistrationOption(field, value)
      // Leitura e gravação síncronas mantêm duas inclusões do processo web
      // serializadas, inclusive quando chegam de eventos diferentes.
      const next = read()
      const options = Object.hasOwn(next.scopes, key) ? next.scopes[key] : (next.scopes[key] = {})
      const existing = Object.hasOwn(options, field) ? options[field] : []
      const duplicate = existing.find((item) => optionIdentity(item) === optionIdentity(label))
      if (duplicate !== undefined) return { field, value: duplicate, created: false }
      options[field] = [...existing, label]
      write(next)
      return { field, value: label, created: true }
    },
    merge(scope, entries) {
      const key = scopeKey(scope)
      const incoming = entries.map(({ field, value }) => ({ field, value: cleanRegistrationOption(field, value) }))
      const next = read()
      const options = Object.hasOwn(next.scopes, key) ? next.scopes[key] : (next.scopes[key] = {})
      let added = 0
      for (const { field, value } of incoming) {
        const labels = Object.hasOwn(options, field) ? options[field] : []
        if (labels.some((item) => optionIdentity(item) === optionIdentity(value))) continue
        options[field] = [...labels, value]
        added += 1
      }
      if (added) write(next)
      return added
    },
  }
}
