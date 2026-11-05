/**
 * Conector Oficial Appwrite para Entregas-run (server-only).
 *
 * Estrutura Relacional no Appwrite (db.largadabrasil.com):
 * - Database: entregas_run_db
 * - Coleções:
 *   - events: metadados do evento (nome, data, local, total, entregues, status)
 *   - athletes: cadastro individual de atletas com número de peito, chip, equipe, etc.
 *   - user_profiles: operadores, supervisores e administradores
 *   - audit_logs: histórico e comprovantes de entrega de kits
 *
 * Princípio Arquitetural: Write-through com Resiliência Local.
 * - Leitura/escrita síncrona no disco local garante 0ms de latência e operação offline na tenda.
 * - Sincronização automática para o Appwrite consolida a base central em nuvem.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { eligibleCustomOptionFields, isEligibleCustomOptionField, STANDARD_OPTION_LIMITS } from './registrationOptions.js'

// Garante leitura de .env em qualquer ambiente (Node 20.6+)
try {
  const rootEnv = path.resolve(process.cwd(), '.env')
  const parentEnv = path.resolve(process.cwd(), '..', '.env')
  if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(rootEnv)
  } else if (fs.existsSync(parentEnv) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(parentEnv)
  }
} catch {}

function getEnv() {
  return {
    endpoint: (process.env.APPWRITE_ENDPOINT || '').replace(/\/+$/, ''),
    projectId: process.env.APPWRITE_PROJECT_ID || '',
    apiKey: process.env.APPWRITE_API_KEY || '',
    databaseId: process.env.APPWRITE_DATABASE_ID || 'entregas_run_db',
    eventsCol: process.env.APPWRITE_COLLECTION_EVENTS || 'events',
    athletesCol: process.env.APPWRITE_COLLECTION_ATHLETES || 'athletes',
    usersCol: process.env.APPWRITE_COLLECTION_USERS || 'user_profiles',
    auditsCol: process.env.APPWRITE_COLLECTION_AUDITS || 'audit_logs',
    registrationOptionsCol: process.env.APPWRITE_COLLECTION_REGISTRATION_OPTIONS || 'registration_options',
  }
}

export function isAppwriteEnabled() {
  if (process.env.APPWRITE_ENABLED === 'false') return false
  const { endpoint, projectId, apiKey } = getEnv()
  return Boolean(endpoint && projectId && apiKey)
}

function headers() {
  const { projectId, apiKey } = getEnv()
  return {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
    'Content-Type': 'application/json',
  }
}

async function api(apiPath, options = {}) {
  const { endpoint } = getEnv()
  if (!endpoint) return { status: 0, data: null, error: 'Endpoint ausente' }

  const controller = new AbortController()
  const timeoutMs = options.timeoutMs || 10000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${endpoint}${apiPath}`, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) },
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  } catch (err) {
    return { status: 0, data: null, error: err.message || String(err) }
  } finally {
    clearTimeout(timer)
  }
}

function formatQueries(queries) {
  if (!Array.isArray(queries) || queries.length === 0) return ''
  return '?' + queries
    .map((q, idx) => `queries[${idx}]=${encodeURIComponent(typeof q === 'string' ? q : JSON.stringify(q))}`)
    .join('&')
}

/**
 * Gera um ID de documento determinístico de 32 caracteres (MD5 hex),
 * respeitando os limites estritos do Appwrite (<= 36 caracteres alfanuméricos).
 */
export function getAthleteDocId(eventId, bibNumber) {
  const cleanEvent = String(eventId || '').trim().toLowerCase()
  const cleanBib = String(bibNumber || '').trim().toLowerCase()
  return crypto.createHash('md5').update(`ath:${cleanEvent}:${cleanBib}`).digest('hex')
}

export function getEventDocId(eventId) {
  const cleanEvent = String(eventId || '').trim().toLowerCase()
  return crypto.createHash('md5').update(`ev:${cleanEvent}`).digest('hex')
}

export const REGISTRATION_FIELDS_MAX_LENGTH = 16384

function optionLabel(value) {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
}

function optionIdentity(value) {
  return optionLabel(value).toLocaleUpperCase('pt-BR')
}

function validOptionScope(scope) {
  return typeof scope === 'string' && scope !== '__principal__' && scope.length <= 256 && !/[\p{Cc}\p{Cf}]/u.test(scope)
}

function validRegistrationOption(field, value) {
  if (typeof field !== 'string' || field.length > 160 || typeof value !== 'string' || /[\p{Cc}\p{Cf}]/u.test(value)) return false
  const standard = Object.hasOwn(STANDARD_OPTION_LIMITS, field)
  if (!standard && !(field.startsWith('custom:') && isEligibleCustomOptionField({ key: field, type: 'custom' }))) return false
  const label = optionLabel(value)
  const limit = standard ? STANDARD_OPTION_LIMITS[field] : 128
  return Boolean(label && label.length <= limit && !/^(?:[-—–]+|sem equipe|selecione\b.*|selecionar\b.*|adicionar\b.*|__.*__)$/iu.test(label))
}

export function getRegistrationOptionDocId(scope, field, value) {
  return crypto.createHash('sha256').update(JSON.stringify([scope, field, optionIdentity(value)])).digest('hex').slice(0, 36)
}

export async function fetchRegistrationOptionsFromAppwrite(scope) {
  if (!isAppwriteEnabled()) return { ok: false, skipped: true }
  if (!validOptionScope(scope)) return { ok: false, status: 400, error: 'Organização inválida.' }
  const { databaseId, registrationOptionsCol } = getEnv()
  const base = `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(registrationOptionsCol)}/documents`
  const options = []
  let cursor = ''
  const seenCursors = new Set()
  while (true) {
    const queries = [
      { method: 'equal', attribute: 'scope_id', values: [scope || '__principal__'] },
      { method: 'limit', values: [100] },
      { method: 'orderAsc', attribute: '$id' },
      ...(cursor ? [{ method: 'cursorAfter', values: [cursor] }] : []),
    ]
    const result = await api(`${base}${formatQueries(queries)}`)
    if (result.status !== 200 || !Array.isArray(result.data?.documents)) {
      return { ok: false, status: result.status, error: 'Não foi possível consultar o catálogo no banco.' }
    }
    const docs = result.data.documents
    for (const doc of docs) {
      if (doc.scope_id !== (scope || '__principal__') || !validRegistrationOption(doc.field, doc.value)) {
        return { ok: false, status: 503, error: 'O banco retornou uma opção incompatível com o catálogo.' }
      }
      options.push({ field: doc.field, value: doc.value })
    }
    if (docs.length < 100) return { ok: true, options }
    cursor = docs.at(-1)?.$id
    if (typeof cursor !== 'string' || !cursor || seenCursors.has(cursor)) {
      return { ok: false, status: 503, error: 'Paginação inválida do catálogo no banco.' }
    }
    seenCursors.add(cursor)
  }
}

export async function persistRegistrationOptionToAppwrite(scope, field, value) {
  if (!isAppwriteEnabled()) return { ok: false, skipped: true }
  if (!validOptionScope(scope) || !validRegistrationOption(field, value)) {
    return { ok: false, status: 400, error: 'Opção de cadastro inválida.' }
  }
  const label = optionLabel(value)
  const { databaseId, registrationOptionsCol } = getEnv()
  const base = `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(registrationOptionsCol)}/documents`
  const documentId = getRegistrationOptionDocId(scope, field, label)
  const created = await api(base, {
    method: 'POST',
    body: JSON.stringify({
      documentId,
      permissions: [],
      data: { scope_id: scope || '__principal__', field, value: label, created_at: new Date().toISOString() },
    }),
  })
  if (created.status === 201) return { ok: true, value: label, created: true }
  if (created.status === 409) {
    const existing = await api(`${base}/${documentId}`)
    const doc = existing.data
    if (existing.status === 200 && doc?.scope_id === (scope || '__principal__') && doc.field === field &&
      validRegistrationOption(doc.field, doc.value) && optionIdentity(doc.value) === optionIdentity(label)) {
      return { ok: true, value: doc.value, created: false }
    }
    return { ok: false, status: existing.status === 200 ? 503 : existing.status, error: 'Não foi possível confirmar a opção existente no banco.' }
  }
  return { ok: false, status: created.status, error: 'Não foi possível salvar a opção no banco.' }
}

function registrationFieldText(value, limit) {
  if (typeof value !== 'string' || /[\p{Cc}\p{Cf}]/u.test(value) || value.length > limit) throw new Error('Campo de cadastro inválido.')
  return value.trim()
}

function registrationCustomFieldText(value) {
  if (value === null) return ''
  if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('Campo de cadastro inválido.')
  const text = String(value)
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text) || text.length > REGISTRATION_FIELDS_MAX_LENGTH) throw new Error('Campo de cadastro inválido.')
  return text.trim()
}

function serializeRegistrationFields(athlete, metadata) {
  const fields = {}
  if (athlete.nacionalidade !== undefined && athlete.nacionalidade !== null) {
    const nationality = registrationFieldText(athlete.nacionalidade, 64)
    if (nationality) fields.nacionalidade = nationality
  }
  if (athlete.customFields !== undefined && athlete.customFields !== null) {
    if (typeof athlete.customFields !== 'object' || Array.isArray(athlete.customFields)) throw new Error('Campos de cadastro inválidos.')
    const eligible = eligibleCustomOptionFields({ ...metadata, athletes: [athlete] })
    const customFields = Object.fromEntries(eligible.filter((key) => Object.hasOwn(athlete.customFields, key)).map((key) => [key, registrationCustomFieldText(athlete.customFields[key])]))
    if (Object.keys(customFields).length) fields.customFields = customFields
  }
  // Omitir o atributo mantém o contrato anterior e preserva extras remotos
  // quando uma aba antiga salva um atleta que ainda não conhece esses campos.
  if (Object.keys(fields).length === 0) return undefined
  const json = JSON.stringify(fields)
  if (json.length > REGISTRATION_FIELDS_MAX_LENGTH) throw new Error('Campos de cadastro excedem o limite do banco.')
  return json
}

function deserializeRegistrationFields(raw) {
  if (typeof raw !== 'string' || raw.length > REGISTRATION_FIELDS_MAX_LENGTH) return {}
  try {
    const fields = JSON.parse(raw)
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {}
    const restored = {}
    if (typeof fields.nacionalidade === 'string') restored.nacionalidade = registrationFieldText(fields.nacionalidade, 64)
    if (fields.customFields && typeof fields.customFields === 'object' && !Array.isArray(fields.customFields)) {
      restored.customFields = Object.fromEntries(Object.entries(fields.customFields)
        .filter(([key]) => isEligibleCustomOptionField({ key: `custom:${key}`, customKey: key, type: 'custom' }))
        .map(([key, value]) => [key, registrationCustomFieldText(value)]))
    }
    return restored
  } catch {
    return {}
  }
}

// ============================================================
// STATUS E SAÚDE DO APPWRITE
// ============================================================
export async function appwriteStatus() {
  if (!isAppwriteEnabled()) {
    return {
      enabled: false,
      reason: 'APPWRITE_API_KEY, ENDPOINT ou PROJECT_ID não configurados no ambiente.',
    }
  }

  const { endpoint, projectId, databaseId, eventsCol, athletesCol } = getEnv()

  try {
    const { status, data, error } = await api(`/databases/${encodeURIComponent(databaseId)}/collections`, { timeoutMs: 5000 })
    if (status !== 200) {
      return {
        enabled: true,
        connected: false,
        endpoint,
        projectId,
        databaseId,
        error: error || data?.message || `HTTP ${status}`,
      }
    }

    const cols = Array.isArray(data.collections) ? data.collections.map((c) => ({ id: c.$id, name: c.name })) : []

    // Consulta contagem de eventos e atletas
    const q1 = formatQueries([{ method: 'limit', values: [1] }])
    const [eventsRes, athletesRes] = await Promise.all([
      api(`/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents${q1}`),
      api(`/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents${q1}`),
    ])

    return {
      enabled: true,
      connected: true,
      endpoint,
      projectId,
      databaseId,
      collections: cols,
      counts: {
        events: eventsRes?.data?.total ?? 0,
        athletes: athletesRes?.data?.total ?? 0,
      },
    }
  } catch (err) {
    return {
      enabled: true,
      connected: false,
      endpoint,
      projectId,
      databaseId,
      error: err.message || String(err),
    }
  }
}

// ============================================================
// OPERAÇÕES DE EVENTOS (events)
// ============================================================
export async function persistEventToAppwrite(event) {
  if (!isAppwriteEnabled() || !event || !event.id) return { ok: false, skipped: true }

  const { databaseId, eventsCol } = getEnv()
  const docId = getEventDocId(event.id)

  const payload = {
    name: String(event.name || '').slice(0, 255),
    date: String(event.date || event.dateInput || '').slice(0, 64),
    location: String(event.location || 'RECIFE/PE').slice(0, 255),
    city: String(event.city || '').slice(0, 128),
    status: String(event.status || 'PLANEJADO').slice(0, 32),
    modalities: String(event.modalities || '').slice(0, 500),
    total_athletes: Number(event.total || event.total_athletes || 0),
    delivered_count: Number(event.entregues || event.delivered_count || 0),
    banner_url: String(event.banner_url || '').slice(0, 500),
  }

  try {
    // Tenta atualizar documento existente (PATCH)
    const patchRes = await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents/${encodeURIComponent(docId)}`,
      { method: 'PATCH', body: JSON.stringify({ data: payload }) }
    )

    if (patchRes.status === 200) {
      return { ok: true, action: 'updated', id: docId }
    }

    // Se não existe (404), cria com ID determinístico
    if (patchRes.status === 404) {
      const createRes = await api(
        `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents`,
        {
          method: 'POST',
          body: JSON.stringify({ documentId: docId, data: payload }),
        }
      )
      if (createRes.status === 201) {
        return { ok: true, action: 'created', id: docId }
      }
    }

    return { ok: false, status: patchRes.status }
  } catch (err) {
    console.warn('[appwrite] Falha ao persistir evento no Appwrite:', err.message)
    return { ok: false, error: err.message }
  }
}

export async function deleteEventFromAppwrite(eventId) {
  if (!isAppwriteEnabled() || !eventId) return { ok: false, skipped: true }

  const { databaseId, eventsCol } = getEnv()
  const docId = getEventDocId(eventId)
  sentAthletes.delete(String(eventId).trim())

  // Só o evento sai. Os atletas ficam: são a base de clientes (decisão do PO, 2026-10-31).
  try {
    await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents/${encodeURIComponent(docId)}`,
      { method: 'DELETE' }
    )
    return { ok: true }
  } catch (err) {
    console.warn(`[appwrite] Falha ao excluir evento ${eventId}:`, err.message)
    return { ok: false, error: err.message }
  }
}

export async function fetchEventsFromAppwrite() {
  if (!isAppwriteEnabled()) return null

  const { databaseId, eventsCol } = getEnv()
  try {
    const qEvents = formatQueries([
      { method: 'limit', values: [100] },
      { method: 'orderDesc', attribute: '$updatedAt' },
    ])
    const { status, data } = await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents${qEvents}`
    )
    if (status !== 200 || !Array.isArray(data?.documents)) return null

    return data.documents.map((doc) => ({
      id: doc.$id,
      name: doc.name,
      date: doc.date,
      dateInput: doc.date,
      location: doc.location || 'RECIFE/PE',
      city: doc.city || '',
      status: doc.status || 'PLANEJADO',
      active: doc.status === 'EM OPERAÇÃO',
      modalities: doc.modalities || '',
      total: Number(doc.total_athletes || 0),
      entregues: Number(doc.delivered_count || 0),
      pendentes: Math.max(0, Number(doc.total_athletes || 0) - Number(doc.delivered_count || 0)),
      concl:
        doc.total_athletes > 0
          ? `${((doc.delivered_count / doc.total_athletes) * 100).toFixed(1)}%`
          : '0.0%',
      banner_url: doc.banner_url || '',
    }))
  } catch {
    return null
  }
}

// ============================================================
// OPERAÇÕES DE ATLETAS (athletes)
// ============================================================

function mapLocalAthleteToAppwrite(eventId, atleta, metadata = {}) {
  const safeNumero = String(atleta.numero ?? atleta.bib_number ?? '').trim()
  const safeNome = String(atleta.nome ?? atleta.name ?? '').trim().toUpperCase()
  const registrationFields = serializeRegistrationFields(atleta, metadata)

  return {
    event_id: String(eventId || '').trim(),
    bib_number: safeNumero || 'S/N',
    name: safeNome || 'ATLETA SEM NOME',
    chip_code: String(atleta.chip ?? atleta.chip_code ?? '').slice(0, 64),
    bib_name: String(atleta.nome_peito ?? atleta.bib_name ?? '').slice(0, 128),
    document: String(atleta.doc ?? atleta.document ?? '').slice(0, 64),
    gender: String(atleta.sexo ?? atleta.gender ?? 'Masculino').slice(0, 32),
    shirt_size: String(atleta.camiseta ?? atleta.shirt_size ?? 'M').slice(0, 32),
    team: String(atleta.equipe ?? atleta.team ?? '—').slice(0, 128),
    city: String(atleta.cidade ?? atleta.city ?? '').slice(0, 128),
    birth_date: String(atleta.nascimento ?? atleta.birth_date ?? '').slice(0, 32),
    modality: String(atleta.modalidade ?? atleta.modality ?? '5 KM').slice(0, 64),
    category: String(atleta.categoria ?? atleta.category ?? 'GERAL').slice(0, 64),
    resident_type: String(atleta.morador ?? atleta.resident_type ?? 'Visitante').slice(0, 32),
    kit_type: String(atleta.kit ?? atleta.kit_type ?? 'Kit Padrão').slice(0, 64),
    status: atleta.status === 'ENTREGUE' ? 'ENTREGUE' : 'PENDENTE',
    delivered_at: atleta.entregueEm || atleta.delivered_at || '',
    operator_id: String(atleta.operator_id || '').slice(0, 64),
    operator_name: String(atleta.entreguePor || atleta.operator_name || '').slice(0, 128),
    collected_by: atleta.entreguePara ? 'TERCEIRO' : (atleta.collected_by || 'PROPRIO_ATLETA'),
    third_party_name: String(atleta.entreguePara || atleta.third_party_name || '').slice(0, 128),
    third_party_doc: String(atleta.terceiroDoc || atleta.third_party_doc || '').slice(0, 64),
    ...(registrationFields !== undefined ? { registration_fields: registrationFields } : {}),
  }
}

function mapAppwriteDocToLocalAthlete(doc) {
  return {
    id: doc.$id,
    numero: doc.bib_number,
    nome: doc.name,
    nome_peito: doc.bib_name || '',
    doc: doc.document || '',
    sexo: doc.gender || '',
    camiseta: doc.shirt_size || '',
    equipe: doc.team || '',
    cidade: doc.city || '',
    nascimento: doc.birth_date || '',
    modalidade: doc.modality || '',
    categoria: doc.category || '',
    morador: doc.resident_type || '',
    kit: doc.kit_type || '',
    chip: doc.chip_code || '',
    status: doc.status || 'PENDENTE',
    entregueEm: doc.delivered_at || '',
    entreguePor: doc.operator_name || '',
    entreguePara: doc.third_party_name || '',
    terceiroDoc: doc.third_party_doc || '',
    ...deserializeRegistrationFields(doc.registration_fields),
  }
}

/**
 * Sincroniza para o Appwrite só os atletas que mudaram desde o último envio.
 * Utiliza pool concorrente de 10 requisições simultâneas.
 */
// Último conteúdo gravado de cada documento, por evento. Sem isso cada entrega
// regravava o evento inteiro (~800 PATCH a cada 30 s em 30/10/2026). Ao reiniciar
// o servidor o registro zera e o primeiro envio volta a ser completo.
const sentAthletes = new Map()

function sentFor(eventId) {
  let sent = sentAthletes.get(eventId)
  if (!sent) {
    sent = new Map()
    sentAthletes.set(eventId, sent)
  }
  return sent
}

export async function persistAthletesToAppwrite(eventId, athletes, metadata = {}) {
  if (!isAppwriteEnabled() || !eventId || !Array.isArray(athletes) || athletes.length === 0) {
    return { ok: false, skipped: true }
  }

  const { databaseId, athletesCol } = getEnv()
  const safeEventId = String(eventId || '').trim()
  const sent = sentFor(safeEventId)

  // Mesmo nº de peito gera o mesmo documento: vale o último, como já valia no Appwrite.
  const latest = new Map()
  let invalidCount = 0
  for (const atleta of athletes) {
    try {
      const payload = mapLocalAthleteToAppwrite(safeEventId, atleta, metadata)
      const docId = getAthleteDocId(safeEventId, payload.bib_number)
      latest.delete(docId)
      latest.set(docId, { docId, payload, hash: JSON.stringify(payload) })
    } catch {
      invalidCount++
    }
  }
  const pending = [...latest.values()].filter((item) => sent.get(item.docId) !== item.hash)
  if (pending.length === 0) return { ok: true, total: athletes.length, successCount: 0, errorCount: invalidCount }

  console.log(`[appwrite] Sincronizando ${pending.length} de ${athletes.length} atletas do evento ${safeEventId}...`)

  let successCount = 0
  let errorCount = invalidCount
  const CONCURRENCY = 10

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const chunk = pending.slice(i, i + CONCURRENCY)

    await Promise.all(
      chunk.map(async ({ docId, payload, hash }) => {
        const saved = () => {
          sent.set(docId, hash)
          successCount++
        }
        try {
          // Tenta atualizar registro existente
          const patchRes = await api(
            `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents/${encodeURIComponent(docId)}`,
            { method: 'PATCH', body: JSON.stringify({ data: payload }) }
          )

          if (patchRes.status === 200) {
            saved()
            return
          }

          // Se não existe, cria novo documento
          if (patchRes.status === 404) {
            const createRes = await api(
              `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents`,
              {
                method: 'POST',
                body: JSON.stringify({ documentId: docId, data: payload }),
              }
            )
            if (createRes.status === 201) {
              saved()
              return
            }
          }

          // Fica fora do registro: o próximo envio tenta de novo.
          sent.delete(docId)
          errorCount++
        } catch {
          sent.delete(docId)
          errorCount++
        }
      })
    )
  }

  console.log(`[appwrite] Sincronização concluída: ${successCount} salvos, ${errorCount} erros.`)
  return { ok: true, total: athletes.length, successCount, errorCount }
}

/**
 * Atualiza o status da entrega do atleta no Appwrite e registra no audit_logs.
 */
export async function updateAthleteStatusInAppwrite(eventId, bibNumber, updates = {}) {
  if (!isAppwriteEnabled() || !eventId || !bibNumber) return { ok: false, skipped: true }

  const { databaseId, athletesCol, auditsCol } = getEnv()
  const safeEventId = String(eventId || '').trim()
  const safeBib = String(bibNumber || '').trim()
  const docId = getAthleteDocId(safeEventId, safeBib)
  // Grava só parte do documento: o próximo envio completo não pode pular este atleta.
  sentFor(safeEventId).delete(docId)

  const payload = {
    status: updates.status || 'ENTREGUE',
    delivered_at: updates.entregueEm || new Date().toISOString(),
    operator_name: String(updates.entreguePor || '').slice(0, 128),
    collected_by: updates.entreguePara ? 'TERCEIRO' : 'PROPRIO_ATLETA',
    third_party_name: String(updates.entreguePara || '').slice(0, 128),
    third_party_doc: String(updates.terceiroDoc || '').slice(0, 64),
  }

  try {
    const patchRes = await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents/${encodeURIComponent(docId)}`,
      { method: 'PATCH', body: JSON.stringify({ data: payload }) }
    )

    // Registra log de auditoria
    void createAuditLog(safeEventId, safeBib, updates, payload)

    return { ok: patchRes.status === 200 }
  } catch (err) {
    console.warn(`[appwrite] Falha ao atualizar status do atleta #${safeBib}:`, err.message)
    return { ok: false, error: err.message }
  }
}

async function createAuditLog(eventId, bibNumber, updates, payload) {
  const { databaseId, auditsCol } = getEnv()
  const logId = crypto.createHash('md5').update(`audit:${eventId}:${bibNumber}:${Date.now()}`).digest('hex')

  try {
    await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(auditsCol)}/documents`,
      {
        method: 'POST',
        body: JSON.stringify({
          documentId: logId,
          data: {
            event_id: eventId,
            bib_number: bibNumber,
            athlete_name: String(updates.athleteName || `Atleta #${bibNumber}`).slice(0, 128),
            action: 'ENTREGA_KIT',
            collected_by: payload.collected_by || 'PROPRIO_ATLETA',
            operator_name: payload.operator_name || 'Operador',
            pickup_station: String(updates.pickupStation || 'Tenda Principal').slice(0, 64),
            kit_details: String(updates.kitDetails || '').slice(0, 1000),
            receipt_code: logId.slice(0, 16).toUpperCase(),
            created_at: payload.delivered_at,
          },
        }),
      }
    )
  } catch (err) {
    console.warn('[appwrite] Falha ao gravar log de auditoria:', err.message)
  }
}

/**
 * Busca todos os atletas de um evento no Appwrite com paginação automática.
 */
export async function fetchAthletesFromAppwrite(eventId) {
  if (!isAppwriteEnabled() || !eventId) return null

  const { databaseId, athletesCol } = getEnv()
  const safeId = String(eventId || '').trim()
  const allAthletes = []
  let offset = 0
  const limit = 100

  try {
    while (true) {
      const qAth = formatQueries([
        { method: 'equal', attribute: 'event_id', values: [safeId] },
        { method: 'limit', values: [limit] },
        { method: 'offset', values: [offset] },
      ])
      const { status, data } = await api(
        `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents${qAth}`
      )

      if (status !== 200 || !Array.isArray(data?.documents)) break

      const docs = data.documents
      if (docs.length === 0) break

      for (const doc of docs) {
        allAthletes.push(mapAppwriteDocToLocalAthlete(doc))
      }

      offset += docs.length
      if (allAthletes.length >= (data.total || 0) || docs.length < limit) break
    }

    if (allAthletes.length === 0) return null
    return { athletes: allAthletes, schema: [], kits: [] }
  } catch (err) {
    console.warn(`[appwrite] Falha ao carregar atletas do evento ${eventId}:`, err.message)
    return null
  }
}
