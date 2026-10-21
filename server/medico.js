// Emergência médica por evento. Os dados de saúde vêm da planilha de inscrição
// importada: o organizador marca na importação quais colunas são de saúde e quais
// delas aparecem na página pública de emergência. Quem socorre abre a ocorrência;
// o perfil MEDICO acompanha a fila.
// Crowley: dado de saúde é sensível (LGPD). Coluna que identifica a pessoa (CPF,
// telefone, e-mail, endereço, nascimento) nunca é pública, e nada disso vai a log.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const GRAVIDADES = ['LEVE', 'MODERADA', 'GRAVE', 'CRITICA']
export const OCORRENCIA_STATUS = ['ABERTA', 'EM_ATENDIMENTO', 'ENCERRADA']
export const MAX_HEALTH_FIELDS = 40
export const MAX_OCORRENCIAS_POR_EVENTO = 2000
const MAX_NAME_RESULTS = 5

function cleanText(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max)
}

export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

export function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeEventId(eventId) {
  return String(eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
}

// ------------------------------------------------------------------
// Colunas de saúde do evento
// ------------------------------------------------------------------
const IDENTIFYING_COLUMN = /\b(cpf|rg|documento|doc|passaporte|telefone|tel|fone|celular|cel|whats\w*|contato|email|e mail|endereco|rua|logradouro|bairro|cep|complemento|numero da casa|nascimento|nasc|data de nasc\w*|dt nasc)\b/

// Coluna que identifica ou localiza a pessoa não vai para a página pública,
// mesmo que o organizador marque — o socorro não precisa dela para atender.
export function isIdentifyingColumn(text) {
  return IDENTIFYING_COLUMN.test(normalizeName(text))
}

export function sanitizeHealthFields(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const fields = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const key = cleanText(item.key, 80)
    if (!key || seen.has(key.toLowerCase())) continue
    seen.add(key.toLowerCase())
    const label = cleanText(item.label || key, 120)
    fields.push({
      key,
      label,
      publico: item.publico === true && !isIdentifyingColumn(key) && !isIdentifyingColumn(label),
    })
    if (fields.length >= MAX_HEALTH_FIELDS) break
  }
  return fields
}

// "Não", "nenhum", "-" e vazio não merecem destaque vermelho.
export function isNegativeAnswer(value) {
  const text = normalizeName(value)
  return !text || /^(nao|no|n|nenhum|nenhuma|nada|negativo|nunca|sem|na|nd)\b/.test(text)
}

export function healthView(athlete, healthFields, { publicOnly = false } = {}) {
  const custom = athlete?.customFields && typeof athlete.customFields === 'object' ? athlete.customFields : {}
  const rows = []
  for (const field of healthFields || []) {
    if (publicOnly && !field.publico) continue
    const value = cleanText(custom[field.key], 500)
    if (publicOnly && !value) continue
    rows.push({ key: field.key, label: field.label, value, alerta: !isNegativeAnswer(value), publico: field.publico })
  }
  return rows
}

// Tira as colunas de saúde de um customFields antes de ele sair numa rota pública
// que não é a de emergência (validação do kit, espelho do guichê).
export function withoutHealthFields(customFields, healthFields) {
  if (!customFields || typeof customFields !== 'object') return {}
  const hidden = new Set((healthFields || []).map((field) => field.key))
  return Object.fromEntries(Object.entries(customFields).filter(([key]) => !hidden.has(key)))
}

// ------------------------------------------------------------------
// Identidade do atleta
// ------------------------------------------------------------------
// Liga a ocorrência ao atleta mesmo depois de reimportar a planilha (que troca o
// id): vem do CPF, ou do número de peito quando não há CPF. Hash, sem CPF no disco.
export function athleteKey(eventId, athlete) {
  const cpf = onlyDigits(athlete?.doc)
  const identity = cpf.length === 11 ? `cpf:${cpf}` : `num:${String(athlete?.numero ?? '').trim()}`
  return crypto.createHash('sha256').update(`${safeEventId(eventId)}|${identity}`).digest('hex').slice(0, 32)
}

// Referência opaca usada nas páginas públicas: não expõe id de importação nem CPF.
export function athleteRef(eventId, athlete) {
  const base = `${String(athlete?.id ?? '')}|${String(athlete?.numero ?? '')}`
  return crypto.createHash('sha256').update(`ref|${safeEventId(eventId)}|${base}`).digest('hex').slice(0, 20)
}

// ------------------------------------------------------------------
// Busca pública
// ------------------------------------------------------------------
export function searchAthletes(athletes, rawQuery) {
  const query = String(rawQuery ?? '').trim().slice(0, 80)
  if (!query) return { kind: 'vazio', matches: [] }
  const digits = onlyDigits(query)
  const isNumeric = /^[\d.\-\s]+$/.test(query)

  if (isNumeric && digits.length === 11) {
    const matches = athletes.filter((a) => onlyDigits(a?.doc) === digits)
    return { kind: 'cpf', matches: matches.slice(0, MAX_NAME_RESULTS) }
  }
  if (/^[\w-]{1,12}$/.test(query) && (isNumeric || query.length <= 6)) {
    const bib = query.replace(/^0+(?=\d)/, '')
    const matches = athletes.filter((a) => {
      const numero = String(a?.numero ?? '').trim()
      return numero === query || numero.replace(/^0+(?=\d)/, '') === bib
    })
    if (matches.length > 0 || isNumeric) return { kind: 'peito', matches: matches.slice(0, MAX_NAME_RESULTS) }
  }

  const terms = normalizeName(query).split(' ').filter((term) => term.length >= 2)
  if (terms.join('').length < 3) return { kind: 'curto', matches: [] }
  const matches = []
  for (const athlete of athletes) {
    const name = normalizeName(`${athlete?.nome ?? ''} ${athlete?.nome_peito ?? ''}`)
    if (terms.every((term) => name.includes(term))) {
      matches.push(athlete)
      if (matches.length > MAX_NAME_RESULTS) break
    }
  }
  return {
    kind: 'nome',
    matches: matches.slice(0, MAX_NAME_RESULTS),
    truncated: matches.length > MAX_NAME_RESULTS,
  }
}

// ------------------------------------------------------------------
// Ocorrências
// ------------------------------------------------------------------
export function validateOcorrencia(raw) {
  const body = raw && typeof raw === 'object' ? raw : {}
  const gravidade = GRAVIDADES.includes(body.gravidade) ? body.gravidade : ''
  const solicitanteNome = cleanText(body.solicitanteNome, 80)
  const solicitanteTelefone = onlyDigits(body.solicitanteTelefone).slice(0, 13)
  const descricao = cleanText(body.descricao, 1000)
  const localTexto = cleanText(body.localTexto, 160)

  if (!gravidade) return { error: 'Selecione o nível de gravidade.' }
  if (solicitanteNome.length < 2) return { error: 'Informe o nome de quem está abrindo a ocorrência.' }
  if (solicitanteTelefone.length < 10) return { error: 'Informe um telefone com DDD.' }
  if (descricao.length < 3) return { error: 'Descreva a ocorrência.' }

  let geo = null
  const geoRaw = body.geo
  if (geoRaw && typeof geoRaw === 'object') {
    const lat = Number(geoRaw.lat)
    const lng = Number(geoRaw.lng)
    const accuracy = Number(geoRaw.accuracy)
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      geo = {
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
        accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.min(Math.round(accuracy), 100000) : null,
      }
    }
  }

  return {
    value: {
      gravidade,
      solicitanteNome,
      solicitanteTelefone,
      descricao,
      localTexto,
      geo,
      athleteRef: /^[0-9a-f]{20}$/.test(String(body.athleteRef || '')) ? body.athleteRef : null,
    },
  }
}

export function nextProtocol(ocorrencias) {
  const highest = ocorrencias.reduce((max, item) => Math.max(max, Number(item.protocolo) || 0), 0)
  return highest + 1
}

// ------------------------------------------------------------------
// Ocorrências em disco (gravação atômica, cache em memória)
// ------------------------------------------------------------------
export function createMedicoStore(dataDir) {
  const dir = path.join(dataDir, 'medico')
  const cache = new Map()
  const versions = new Map()

  function file(eventId) {
    return path.join(dir, `ocorrencias_${safeEventId(eventId)}.json`)
  }

  function load(eventId) {
    const id = safeEventId(eventId)
    if (!cache.has(id)) {
      let data = null
      try {
        if (fs.existsSync(file(id))) data = JSON.parse(fs.readFileSync(file(id), 'utf-8'))
      } catch (err) {
        console.error(`[medico] Falha ao ler ocorrências do evento ${id}:`, err?.code || err?.name)
      }
      cache.set(id, Array.isArray(data?.ocorrencias) ? data.ocorrencias : [])
      versions.set(id, Number(data?.version) || 0)
    }
    return cache.get(id)
  }

  function persist(id, list) {
    const version = (versions.get(id) || 0) + 1
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    const target = file(id)
    const temp = `${target}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}.tmp`
    fs.writeFileSync(temp, JSON.stringify({ eventId: id, version, ocorrencias: list }), { encoding: 'utf-8', mode: 0o600 })
    fs.renameSync(temp, target)
    cache.set(id, list)
    versions.set(id, version)
  }

  return {
    listOcorrencias(eventId) {
      return load(eventId)
    },
    version(eventId) {
      load(eventId)
      return versions.get(safeEventId(eventId)) || 0
    },
    addOcorrencia(eventId, value) {
      const id = safeEventId(eventId)
      const list = load(id)
      if (list.length >= MAX_OCORRENCIAS_POR_EVENTO) return null
      const now = new Date().toISOString()
      const item = {
        id: crypto.randomUUID(),
        protocolo: nextProtocol(list),
        ...value,
        status: 'ABERTA',
        criadaEm: now,
        historico: [{ status: 'ABERTA', em: now, por: 'Página pública' }],
      }
      persist(id, [...list, item])
      return item
    },
    updateStatus(eventId, ocorrenciaId, status, por) {
      const id = safeEventId(eventId)
      const list = load(id)
      const index = list.findIndex((item) => item.id === ocorrenciaId)
      if (index === -1) return null
      const current = list[index]
      if (current.status === status) return current
      const updated = {
        ...current,
        status,
        historico: [...(current.historico || []), { status, em: new Date().toISOString(), por: cleanText(por, 80) }],
      }
      persist(id, list.map((item, i) => (i === index ? updated : item)))
      return updated
    },
    // Evento excluído não deixa ocorrência (dado de saúde) para trás.
    deleteEvent(eventId) {
      const id = safeEventId(eventId)
      try {
        fs.rmSync(file(id), { force: true })
      } catch (err) {
        console.error(`[medico] Falha ao apagar ocorrências do evento ${id}:`, err?.code || err?.name)
      }
      cache.delete(id)
      versions.delete(id)
    },
  }
}
