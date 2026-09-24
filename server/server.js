import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import {
  appwriteStatus,
  deleteEventFromAppwrite,
  fetchAthletesFromAppwrite,
  fetchEventsFromAppwrite,
  isAppwriteEnabled,
  persistAthletesToAppwrite,
  persistEventToAppwrite,
  updateAthleteStatusInAppwrite,
} from './appwrite.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
try {
  const rootEnv = path.resolve(__dirname, '..', '.env')
  if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(rootEnv)
  }
} catch {}

const PORT = Number(process.env.PORT || 3001)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
const EVENTS_FILE = path.join(DATA_DIR, 'events.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'pacetime@entregas.com').toLowerCase().trim()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'WgP2ZhkCXQ!7'
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[server] ADMIN_PASSWORD não definido no ambiente; usando credencial padrão de homologação. Defina ADMIN_PASSWORD na VPS.')
}

// ============================================================
// SESSÕES OPACAS (corrige restauração pós-reload + fecha /api/users)
// Token aleatório emitido no login, validado em /api/session e
// exigido nas rotas /api/users. Senha nunca volta em resposta.
// ============================================================
const sessions = new Map() // token -> { userId, email, role, eventId, eventName, name, expiresAt }
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return user
  const { password: _password, ...safe } = user
  return safe
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, {
    userId: user.id,
    email: user.email,
    role: user.role || 'OPERADOR',
    eventId: user.eventId || 'all',
    eventName: user.eventName || 'TODOS OS PROJETOS',
    name: user.name || '',
    expiresAt: Date.now() + SESSION_TTL_MS,
  })
  return token
}

function getSessionFromReq(req) {
  const header = String(req.headers.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : String(req.headers['x-auth-token'] || '').trim()
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }
  return { token, ...session }
}

function requireAuth(req, res, next) {
  const session = getSessionFromReq(req)
  if (!session) {
    return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Entre novamente.' })
  }
  req.session = session
  next()
}

function requireAdmin(req, res, next) {
  const session = getSessionFromReq(req)
  if (!session) {
    return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Entre novamente.' })
  }
  if (session.role !== 'ADMIN') {
    return res.status(403).json({ ok: false, message: 'Acesso restrito ao administrador.' })
  }
  req.session = session
  next()
}

setInterval(() => {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token)
  }
}, 60 * 60 * 1000).unref?.()

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
} catch (err) {
  console.error('[server] Erro ao inicializar diretório de dados:', err)
}

const app = express()
app.disable('x-powered-by')
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'connect-src': ["'self'", 'https://servicodados.ibge.gov.br'],
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
  })
)
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }))

// ============================================================
// ESPELHO PÚBLICO (segunda tela / QR Code)
// Quadro de avisos em memória por evento: o guichê (OperacaoPage)
// publica a ficha aberta e a config de aparência; a tela pública
// (/espelho/:id) consome via polling. Não persiste em disco e não
// exige autenticação por ser uma tela pública de exibição.
// Montado ANTES do parser global de 16kb porque a aparência pode
// carregar imagens (data URL) enviadas pelo painel.
// ============================================================
const espelhoStates = new Map()

const espelhoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Muitas requisições. Aguarde um instante.' },
})

const espelhoJsonParser = express.json({ limit: '6mb' })

function espelhoKey(rawId) {
  return String(rawId || 'default').replace(/[^\w-]/g, '').slice(0, 64) || 'default'
}

function sanitizeHexColor(value, fallback) {
  const text = String(value ?? '').trim()
  return /^#[0-9a-fA-F]{3,8}$/.test(text) ? text : fallback
}

function sanitizeImageDataUrl(value) {
  const text = String(value ?? '')
  if (!text.startsWith('data:image/')) return null
  return text.length <= 4 * 1024 * 1024 ? text : null
}

function sanitizeEspelhoConfig(raw) {
  if (!raw || typeof raw !== 'object') return undefined
  return {
    fundo: sanitizeHexColor(raw.fundo, '#071526'),
    texto: sanitizeHexColor(raw.texto, '#ffffff'),
    destaque: sanitizeHexColor(raw.destaque, '#ff6b00'),
    fontSize: Math.min(150, Math.max(70, Number(raw.fontSize) || 100)),
    mensagem: String(raw.mensagem ?? 'Guichê disponível').slice(0, 120),
    bgImage: sanitizeImageDataUrl(raw.bgImage),
    logo: sanitizeImageDataUrl(raw.logo),
  }
}

app.get('/api/espelho/:eventId/estado', espelhoLimiter, (req, res) => {
  const state = espelhoStates.get(espelhoKey(req.params.eventId))
  if (!state) return res.json({ ok: true, state: null })
  res.json({ ok: true, state })
})

app.post('/api/espelho/:eventId/estado', espelhoLimiter, espelhoJsonParser, (req, res) => {
  const body = req.body || {}
  const key = espelhoKey(req.params.eventId)
  const previous = espelhoStates.get(key)
  const hasAtletaField = Object.prototype.hasOwnProperty.call(body, 'atleta')
  const atleta = body.atleta
  const state = {
    status: ['LIVRE', 'ATENDENDO', 'ENTREGUE'].includes(body.status)
      ? body.status
      : (previous?.status ?? 'LIVRE'),
    eventName:
      typeof body.eventName === 'string'
        ? body.eventName.slice(0, 120)
        : (previous?.eventName ?? ''),
    // Atleta: ausência do campo preserva a ficha atual (ex: post só de
    // config); campo explícito (objeto ou null) substitui/limpa a ficha.
    // Exceção: status LIVRE sempre limpa a ficha — guichê sem atleta.
    atleta:
      body.status === 'LIVRE'
        ? null
        : !hasAtletaField
          ? (previous?.atleta ?? null)
          : atleta && typeof atleta === 'object'
            ? {
                numero: String(atleta.numero ?? '').slice(0, 30),
                nome: String(atleta.nome ?? '').slice(0, 120),
                nome_peito: String(atleta.nome_peito ?? '').slice(0, 80),
                doc: String(atleta.doc ?? '').slice(0, 50),
                modalidade: String(atleta.modalidade ?? '').slice(0, 60),
                categoria: String(atleta.categoria ?? '').slice(0, 60),
                camiseta: String(atleta.camiseta ?? '').slice(0, 20),
                kit: String(atleta.kit ?? '').slice(0, 80),
                chip: String(atleta.chip ?? '').slice(0, 60),
                sexo: String(atleta.sexo ?? '').slice(0, 20),
                equipe: String(atleta.equipe ?? '').slice(0, 80),
                cidade: String(atleta.cidade ?? '').slice(0, 80),
                nascimento: String(atleta.nascimento ?? '').slice(0, 30),
                morador: String(atleta.morador ?? '').slice(0, 40),
                contato: String(atleta.contato ?? '').slice(0, 60),
                nacionalidade: String(atleta.nacionalidade ?? '').slice(0, 40),
                pcd: String(atleta.pcd ?? '').slice(0, 60),
                customFields: atleta.customFields && typeof atleta.customFields === 'object' ? atleta.customFields : {},
              }
            : null,
    config: sanitizeEspelhoConfig(body.config) ?? previous?.config ?? null,
    updatedAt: Date.now(),
  }
  espelhoStates.set(key, state)
  res.json({ ok: true })
})

app.use(express.json({ limit: '64kb' }))

// Crowley (Fase A, desenho): login com limite de tentativas, sem logar senha.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Muitas tentativas. Aguarde alguns minutos.' },
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'entregas-run-server',
    eventsCount: typeof inMemoryEvents !== 'undefined' ? inMemoryEvents.length : 0,
    diskWriteError,
    dataDir: DATA_DIR,
    appwriteEnabled: isAppwriteEnabled(),
  })
})

// Diagnóstico do espelho Appwrite (sem expor segredo)
app.get('/api/appwrite/status', async (_req, res) => {
  try {
    const status = await appwriteStatus()
    res.json({ ok: true, ...status })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Falha ao consultar Appwrite.' })
  }
})

app.get('/api/municipios', (_req, res) => {
  const distFile = path.join(__dirname, '..', 'client', 'dist', 'municipios.json')
  const pubFile = path.join(__dirname, '..', 'client', 'public', 'municipios.json')
  res.sendFile(distFile, (err) => {
    if (err) res.sendFile(pubFile)
  })
})

// ============================================================
// PERSISTÊNCIA CENTRALIZADA DE EVENTOS (API REST)
// Salva eventos em JSON persistido em volume Docker (/app/data).
// Garante sincronização em tempo real entre celular e computador.
// ============================================================
const MOCK_EVENT_IDS = [
  '11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6',
  '22c2fb52-9b9d-4f50-ad9a-3bffa67b00b7',
  '33c3fb52-9b9d-4f50-ad9a-3bffa67b00c8',
]

const DELETED_EVENTS_FILE = path.join(DATA_DIR, 'deleted_events.json')

function readDeletedIds() {
  const set = new Set(['event-1790199601392'])
  try {
    if (fs.existsSync(DELETED_EVENTS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(DELETED_EVENTS_FILE, 'utf-8'))
      if (Array.isArray(arr)) arr.forEach((id) => set.add(id))
    }
  } catch {}
  return set
}

const deletedEventIds = readDeletedIds()

function markEventDeleted(id) {
  if (!id) return
  deletedEventIds.add(id)
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DELETED_EVENTS_FILE, JSON.stringify([...deletedEventIds]), 'utf-8')
  } catch {}
}

let diskWriteError = null

function readEventsFromDisk() {
  const candidates = [
    EVENTS_FILE,
    '/tmp/entregas-run-data/events.json',
  ]

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(
            (e) =>
              e &&
              !MOCK_EVENT_IDS.includes(e.id) &&
              !deletedEventIds.has(e.id) &&
              !String(e.name || '').includes('GALINHA') &&
              !String(e.name || '').includes('SURUBIM') &&
              !String(e.name || '').includes('YURI2TESTE')
          )
        }
      }
    } catch (err) {
      console.error(`[server] Erro ao ler ${filePath}:`, err)
    }
  }
  return []
}

// Estado em memória síncrono e ultra-rápido: qualquer requisição de qualquer
// aparelho recebe o estado mais atual imediatamente em 0ms.
let inMemoryEvents = readEventsFromDisk()

// Se o disco local estiver vazio em uma nova máquina, reidrata do Appwrite
if (inMemoryEvents.length === 0 && isAppwriteEnabled()) {
  fetchEventsFromAppwrite()
    .then((remote) => {
      if (Array.isArray(remote) && remote.length > 0) {
        console.log(`[appwrite] Reidratando ${remote.length} eventos do Appwrite para a memória local.`)
        inMemoryEvents = remote
        writeEventsToDisk(inMemoryEvents)
      }
    })
    .catch((err) => console.warn('[appwrite] Falha na reidratação de eventos:', err?.message))
}

function writeEventsToDisk(events) {
  let saved = false

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const tempFile = `${EVENTS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(events, null, 2), 'utf-8')
    fs.renameSync(tempFile, EVENTS_FILE)
    diskWriteError = null
    saved = true
  } catch (err) {
    diskWriteError = err.message || String(err)
    console.error('[server] Erro ao salvar events.json em DATA_DIR:', err)
  }

  // Fallback secundário em /tmp para resguardo de dados
  try {
    const fallbackDir = '/tmp/entregas-run-data'
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true })
    }
    const tempFb = path.join(fallbackDir, `events.${Date.now()}.tmp`)
    const targetFb = path.join(fallbackDir, 'events.json')
    fs.writeFileSync(tempFb, JSON.stringify(events, null, 2), 'utf-8')
    fs.renameSync(tempFb, targetFb)
    saved = true
  } catch (fbErr) {
    console.error('[server] Erro ao salvar no diretório de contingência:', fbErr)
  }

  return saved
}

function sanitizeEventPayload(raw, isUpdate = false) {
  if (!raw || typeof raw !== 'object') return null

  const name = typeof raw.name === 'string' ? raw.name.trim().toUpperCase().slice(0, 120) : ''
  if (!isUpdate && !name) return null

  const date = typeof raw.date === 'string' ? raw.date.trim().slice(0, 30) : ''
  const dateInput = typeof raw.dateInput === 'string' ? raw.dateInput.trim().slice(0, 30) : date
  const location = typeof raw.location === 'string' ? raw.location.trim().toUpperCase().slice(0, 120) : 'RECIFE/PE'

  const validStatuses = ['PLANEJADO', 'EM OPERAÇÃO', 'FINALIZADO']
  const status = validStatuses.includes(raw.status) ? raw.status : 'PLANEJADO'
  const active = typeof raw.active === 'boolean' ? raw.active : status === 'EM OPERAÇÃO'

  const total = typeof raw.total === 'number' && Number.isFinite(raw.total) && raw.total >= 0 ? raw.total : 0
  const entregues = typeof raw.entregues === 'number' && Number.isFinite(raw.entregues) && raw.entregues >= 0 ? raw.entregues : 0
  const pendentes = typeof raw.pendentes === 'number' && Number.isFinite(raw.pendentes) && raw.pendentes >= 0 ? raw.pendentes : 0
  const concl = typeof raw.concl === 'string' ? raw.concl.slice(0, 10) : '0.0%'

  return {
    name,
    date,
    dateInput,
    location,
    status,
    active,
    total,
    entregues,
    pendentes,
    concl,
  }
}

// GET /api/events — Retorna todos os eventos persistidos em memória central
app.get('/api/events', (_req, res) => {
  res.json({ ok: true, events: inMemoryEvents })
})

// POST /api/events — Cria novo evento
app.post('/api/events', (req, res) => {
  const sanitized = sanitizeEventPayload(req.body, false)
  if (!sanitized) {
    return res.status(400).json({ ok: false, message: 'Dados inválidos para criação do evento.' })
  }

  const eventId = typeof req.body.id === 'string' && req.body.id.trim()
    ? req.body.id.trim().slice(0, 64)
    : `event-${Date.now()}`

  const newEvent = {
    ...sanitized,
    id: eventId,
    updatedAt: Date.now(),
  }

  const existingIdx = inMemoryEvents.findIndex((e) => e.id === eventId)
  if (existingIdx >= 0) {
    inMemoryEvents[existingIdx] = { ...inMemoryEvents[existingIdx], ...newEvent }
  } else {
    inMemoryEvents.unshift(newEvent)
  }

  writeEventsToDisk(inMemoryEvents)
  void persistEventToAppwrite(newEvent)
  res.status(201).json({ ok: true, event: newEvent })
})

// PUT /api/events/:eventId — Atualiza dados e status do evento
app.put('/api/events/:eventId', (req, res) => {
  const eventId = String(req.params.eventId || '').trim().slice(0, 64)
  const index = inMemoryEvents.findIndex((e) => e.id === eventId)

  if (index === -1) {
    return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  }

  const current = inMemoryEvents[index]
  const body = req.body || {}
  const validStatuses = ['PLANEJADO', 'EM OPERAÇÃO', 'FINALIZADO']

  const updated = {
    ...current,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().toUpperCase().slice(0, 120) : current.name,
    date: typeof body.date === 'string' && body.date.trim() ? body.date.trim().slice(0, 30) : current.date,
    dateInput: typeof body.dateInput === 'string' && body.dateInput.trim() ? body.dateInput.trim().slice(0, 30) : (current.dateInput || current.date),
    location: typeof body.location === 'string' && body.location.trim() ? body.location.trim().toUpperCase().slice(0, 120) : current.location,
    status: validStatuses.includes(body.status) ? body.status : current.status,
    active: typeof body.active === 'boolean' ? body.active : (body.status ? body.status === 'EM OPERAÇÃO' : current.active),
    total: typeof body.total === 'number' && Number.isFinite(body.total) && body.total >= 0 ? body.total : current.total,
    entregues: typeof body.entregues === 'number' && Number.isFinite(body.entregues) && body.entregues >= 0 ? body.entregues : current.entregues,
    pendentes: typeof body.pendentes === 'number' && Number.isFinite(body.pendentes) && body.pendentes >= 0 ? body.pendentes : current.pendentes,
    concl: typeof body.concl === 'string' ? body.concl.slice(0, 10) : current.concl,
    updatedAt: Date.now(),
  }

  inMemoryEvents[index] = updated
  writeEventsToDisk(inMemoryEvents)
  void persistEventToAppwrite(updated)
  res.json({ ok: true, event: updated })
})

// DELETE /api/events/:eventId — Remove evento
app.delete('/api/events/:eventId', (req, res) => {
  const eventId = String(req.params.eventId || '').trim().slice(0, 64)
  const initialLength = inMemoryEvents.length
  inMemoryEvents = inMemoryEvents.filter((e) => e.id !== eventId)

  markEventDeleted(eventId)

  if (inMemoryEvents.length === initialLength) {
    return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  }

  writeEventsToDisk(inMemoryEvents)
  void deleteEventFromAppwrite(eventId)
  res.json({ ok: true })
})

// POST /api/events/sync — Sincronização em lote (dispositivo móvel -> servidor)
app.post('/api/events/sync', (req, res) => {
  const incoming = Array.isArray(req.body?.events) ? req.body.events : []
  let changed = false

  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object' || !raw.id) continue
    if (MOCK_EVENT_IDS.includes(raw.id)) continue
    if (deletedEventIds.has(raw.id)) continue
    const sanitized = sanitizeEventPayload(raw, false)
    if (!sanitized) continue
    const id = String(raw.id).trim().slice(0, 64)
    const existingIdx = inMemoryEvents.findIndex((e) => e.id === id)
    if (existingIdx === -1) {
      inMemoryEvents.push({ ...sanitized, id, updatedAt: Date.now() })
      changed = true
    }
  }

  if (changed) {
    writeEventsToDisk(inMemoryEvents)
    for (const ev of inMemoryEvents) {
      void persistEventToAppwrite(ev)
    }
  }
  res.json({ ok: true, events: inMemoryEvents })
})

// ============================================================
// PERSISTÊNCIA CENTRALIZADA DE ATLETAS POR EVENTO
// Salva a lista de atletas e schema em athletes_{eventId}.json.
// Permite consulta pública instantânea via QR Code e sincronização.
// ============================================================
const athletesJsonParser = express.json({ limit: '20mb' })

function getAthletesFilePath(eventId) {
  const safeId = String(eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  return path.join(DATA_DIR, `athletes_${safeId}.json`)
}

const athletesCache = new Map()

function loadAthletesForEvent(eventId) {
  const safeId = String(eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  if (!safeId) return null
  if (athletesCache.has(safeId)) return athletesCache.get(safeId)

  const filePath = getAthletesFilePath(safeId)
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)
      athletesCache.set(safeId, data)
      return data
    }
  } catch (err) {
    console.error(`[server] Erro ao carregar atletas do evento ${safeId}:`, err)
  }
  return null
}

function saveAthletesForEvent(eventId, athletes, schema = [], kits) {
  const safeId = String(eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  if (!safeId) return false

  const existing = loadAthletesForEvent(safeId)

  const data = {
    eventId: safeId,
    athletes: Array.isArray(athletes) ? athletes : [],
    schema: Array.isArray(schema) ? schema : [],
    kits: kits === undefined ? (existing?.kits || []) : kits,
    updatedAt: Date.now(),
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const filePath = getAthletesFilePath(safeId)
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(data), 'utf-8')
    fs.renameSync(tempPath, filePath)
    athletesCache.set(safeId, data)
    return true
  } catch (err) {
    console.error(`[server] Erro ao salvar atletas de ${safeId} no disco:`, err)
    return false
  }
}

function validateKits(kits) {
  if (!Array.isArray(kits)) return 'Lista de kits inválida.'
  for (const kit of kits) {
    if (!kit || typeof kit !== 'object' || Array.isArray(kit)) return 'Kit inválido.'
    for (const field of ['qrCode', 'numero', 'chip']) {
      const value = kit[field]
      if ((typeof value !== 'string' && typeof value !== 'number') || !String(value).trim()) {
        return `Kit sem ${field} válido.`
      }
    }
  }
  return null
}

// GET /api/events/:eventId/athletes — Recupera lista de atletas e schema
// Fallback: disco vazio + Appwrite com dados => devolve Appwrite e
// reidrata o disco (cura a divergência total x lista zerada).
app.get('/api/events/:eventId/athletes', async (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const data = loadAthletesForEvent(safeEventId)
  if (data && Array.isArray(data.athletes) && data.athletes.length > 0) {
    return res.json({ ok: true, athletes: data.athletes || [], schema: data.schema || [], kits: data.kits || [] })
  }
  try {
    const remote = await fetchAthletesFromAppwrite(safeEventId)
    if (remote && Array.isArray(remote.athletes) && remote.athletes.length > 0) {
      saveAthletesForEvent(safeEventId, remote.athletes, remote.schema, remote.kits)
      return res.json({ ok: true, athletes: remote.athletes, schema: remote.schema || [], kits: remote.kits || [], source: 'appwrite' })
    }
  } catch {}
  if (!data) {
    return res.json({ ok: true, athletes: [], schema: [], kits: [] })
  }
  res.json({ ok: true, athletes: data.athletes || [], schema: data.schema || [], kits: data.kits || [] })
})

// POST /api/events/:eventId/athletes — Sincroniza/persiste lista de atletas
// Kits inválidos NÃO derrubam mais a lista: atletas são salvos e o aviso
// volta em kitsWarning (causa raiz da divergência total x lista zerada).
app.post('/api/events/:eventId/athletes', athletesJsonParser, (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const { athletes, schema, kits } = req.body || {}

  if (!Array.isArray(athletes)) {
    return res.status(400).json({ ok: false, message: 'Lista de atletas inválida.' })
  }

  let kitsWarning = null
  let kitsToSave
  if (kits !== undefined) {
    const error = validateKits(kits)
    if (error) {
      kitsWarning = error
      kitsToSave = undefined // preserva kits já salvos; não bloqueia atletas
    } else {
      kitsToSave = kits
    }
  }

  const success = saveAthletesForEvent(safeEventId, athletes, schema, kitsToSave)
  void persistAthletesToAppwrite(safeEventId, athletes)
  const curEv = inMemoryEvents.find((e) => e.id === safeEventId)
  if (curEv) {
    curEv.total = athletes.length
    curEv.pendentes = Math.max(0, athletes.length - (curEv.entregues || 0))
    writeEventsToDisk(inMemoryEvents)
    void persistEventToAppwrite(curEv)
  }
  if (!success) {
    return res.status(500).json({ ok: false, message: 'Erro ao persistir atletas.' })
  }

  res.json({ ok: true, count: athletes.length, ...(kitsWarning ? { kitsWarning } : {}) })
})

// POST /api/events/:eventId/athletes/chunks — upload fatiado p/ listas grandes
// Evita payload gigante único (ex: 1.011 atletas) e permite retry por fatia.
const athleteChunkUploads = new Map()

app.post('/api/events/:eventId/athletes/chunks', athletesJsonParser, (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const { uploadId, chunkIndex, totalChunks, athletesChunk, schema, kits } = req.body || {}
  const safeUploadId = String(uploadId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const idx = Number(chunkIndex)
  const total = Number(totalChunks)

  if (!safeUploadId || !Number.isInteger(idx) || !Number.isInteger(total) || total < 1 || idx < 0 || idx >= total) {
    return res.status(400).json({ ok: false, message: 'Parâmetros de chunk inválidos.' })
  }
  if (!Array.isArray(athletesChunk)) {
    return res.status(400).json({ ok: false, message: 'Fatia de atletas inválida.' })
  }

  let upload = athleteChunkUploads.get(`${safeEventId}:${safeUploadId}`)
  if (!upload) {
    upload = { chunks: new Array(total).fill(null), totalChunks: total, schema: [], kits: undefined, received: 0, updatedAt: Date.now() }
    athleteChunkUploads.set(`${safeEventId}:${safeUploadId}`, upload)
  }
  if (upload.totalChunks !== total) {
    return res.status(400).json({ ok: false, message: 'totalChunks divergente no mesmo uploadId.' })
  }
  if (!upload.chunks[idx]) upload.received += 1
  upload.chunks[idx] = athletesChunk
  upload.updatedAt = Date.now()
  if (Array.isArray(schema) && schema.length > 0) upload.schema = schema
  if (kits !== undefined) {
    const error = validateKits(kits)
    if (!error) upload.kits = kits
  }

  if (upload.received < upload.totalChunks) {
    return res.json({ ok: true, received: upload.received, totalChunks: upload.totalChunks, done: false })
  }

  const merged = upload.chunks.flat()
  const success = saveAthletesForEvent(safeEventId, merged, upload.schema, upload.kits)
  void persistAthletesToAppwrite(safeEventId, merged)
  const curEvChunk = inMemoryEvents.find((e) => e.id === safeEventId)
  if (curEvChunk) {
    curEvChunk.total = merged.length
    curEvChunk.pendentes = Math.max(0, merged.length - (curEvChunk.entregues || 0))
    writeEventsToDisk(inMemoryEvents)
    void persistEventToAppwrite(curEvChunk)
  }
  athleteChunkUploads.delete(`${safeEventId}:${safeUploadId}`)
  if (!success) {
    return res.status(500).json({ ok: false, message: 'Erro ao persistir atletas fatiados.' })
  }
  res.json({ ok: true, count: merged.length, done: true })
})

setInterval(() => {
  const now = Date.now()
  for (const [key, upload] of athleteChunkUploads) {
    if (now - upload.updatedAt > 15 * 60 * 1000) athleteChunkUploads.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

// PUT /api/events/:eventId/athletes/:numero/status — Atualiza status da entrega
app.put('/api/events/:eventId/athletes/:numero/status', express.json(), (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const safeNumero = String(req.params.numero || '').trim().slice(0, 50)
  const { status, entregueEm, entreguePor, entreguePara } = req.body || {}

  const data = loadAthletesForEvent(safeEventId)
  if (!data || !Array.isArray(data.athletes)) {
    return res.status(404).json({ ok: false, message: 'Atletas não encontrados.' })
  }

  const idx = data.athletes.findIndex((a) => String(a.numero || '').trim() === safeNumero)
  if (idx === -1) {
    return res.status(404).json({ ok: false, message: 'Atleta não encontrado.' })
  }

  data.athletes[idx] = {
    ...data.athletes[idx],
    status: status || data.athletes[idx].status,
    entregueEm: entregueEm !== undefined ? entregueEm : data.athletes[idx].entregueEm,
    entreguePor: entreguePor !== undefined ? entreguePor : data.athletes[idx].entreguePor,
    entreguePara: entreguePara !== undefined ? entreguePara : data.athletes[idx].entreguePara,
  }

  saveAthletesForEvent(safeEventId, data.athletes, data.schema)
  void updateAthleteStatusInAppwrite(safeEventId, safeNumero, {
    status: data.athletes[idx].status,
    entregueEm: data.athletes[idx].entregueEm,
    entreguePor: data.athletes[idx].entreguePor,
    entreguePara: data.athletes[idx].entreguePara,
    athleteName: data.athletes[idx].nome,
  })
  const evStatus = inMemoryEvents.find((e) => e.id === safeEventId)
  if (evStatus) {
    const deliveredCount = data.athletes.filter((a) => a.status === 'ENTREGUE').length
    evStatus.entregues = deliveredCount
    evStatus.pendentes = Math.max(0, (evStatus.total || data.athletes.length) - deliveredCount)
    evStatus.concl = evStatus.total > 0 ? `${((deliveredCount / evStatus.total) * 100).toFixed(1)}%` : '0.0%'
    writeEventsToDisk(inMemoryEvents)
    void persistEventToAppwrite(evStatus)
  }
  res.json({ ok: true, athlete: data.athletes[idx] })
})

// ============================================================
// CONSULTA PÚBLICA DE VALIDAÇÃO DE QR CODE
// Qualquer smartphone/leitor externo pode consultar os dados
// do atleta e seu status de entrega em tempo real.
// ============================================================
const publicValidateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Muitas consultas. Aguarde um instante.' },
})

app.get('/api/public/events/:eventId/athletes/:numero', publicValidateLimiter, (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const safeNumero = String(req.params.numero || '').trim().slice(0, 50)

  const event = inMemoryEvents.find((e) => e.id === safeEventId)
  const data = loadAthletesForEvent(safeEventId)

  if (!data || !Array.isArray(data.athletes) || data.athletes.length === 0) {
    return res.status(404).json({
      ok: false,
      message: 'Base de atletas não sincronizada no servidor para este evento.',
      eventName: event?.name || 'Evento Esportivo',
    })
  }

  const athlete = data.athletes.find(
    (a) => String(a.numero || '').trim() === safeNumero || String(a.id || '').trim() === safeNumero
  )

  if (!athlete) {
    return res.status(404).json({
      ok: false,
      message: `Atleta com número #${safeNumero} não localizado na lista oficial do evento.`,
      eventName: event?.name || 'Evento Esportivo',
    })
  }

  let docDisplay = athlete.doc || '—'
  if (docDisplay && docDisplay.length > 5 && !docDisplay.includes('*')) {
    docDisplay = docDisplay.replace(/^(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})$/, '$1.***.***-$4')
  }

  res.json({
    ok: true,
    eventName: event?.name || 'Evento Esportivo',
    eventDate: event?.date || '',
    eventLocation: event?.location || '',
    athlete: {
      numero: athlete.numero,
      nome: athlete.nome,
      doc: docDisplay,
      nascimento: athlete.nascimento || '',
      sexo: athlete.sexo || '',
      modalidade: athlete.modalidade || '',
      categoria: athlete.categoria || '',
      camiseta: athlete.camiseta || '',
      kit: athlete.kit || '',
      chip: athlete.chip || '',
      equipe: athlete.equipe || '',
      status: athlete.status || 'PENDENTE',
      entregueEm: athlete.entregueEm || null,
      entreguePor: athlete.entreguePor || null,
      entreguePara: athlete.entreguePara || null,
      customFields: athlete.customFields || {},
    },
  })
})

// ============================================================
// PERSISTÊNCIA CENTRALIZADA DE USUÁRIOS
// Salva operadores e supervisores no volume Docker (/app/data/users.json).
// Permite criar usuários com senha gerada e login em qualquer dispositivo.
// ============================================================
function readUsersFromDisk() {
  const defaultAdmin = {
    id: 'admin_pacetime',
    name: 'Felipe Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'ADMIN',
    eventId: 'all',
    eventName: 'TODOS OS PROJETOS',
    status: 'ATIVO',
    deliveries: 0,
    avatar: 'FA',
    createdAt: new Date().toISOString(),
  }

  const candidates = [
    USERS_FILE,
    '/tmp/entregas-run-data/users.json',
  ]

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasAdmin = parsed.some((u) => u.email && u.email.toLowerCase() === ADMIN_EMAIL)
          return hasAdmin ? parsed : [defaultAdmin, ...parsed]
        }
      }
    } catch (err) {
      console.error(`[server] Erro ao ler ${filePath}:`, err)
    }
  }

  return [defaultAdmin]
}

let inMemoryUsers = readUsersFromDisk()

function writeUsersToDisk(users) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const tempFile = `${USERS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2), 'utf-8')
    fs.renameSync(tempFile, USERS_FILE)
  } catch (err) {
    console.error('[server] Erro ao salvar users.json em DATA_DIR:', err)
  }

  try {
    const fallbackDir = '/tmp/entregas-run-data'
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true })
    }
    const tempFb = path.join(fallbackDir, `users.${Date.now()}.tmp`)
    const targetFb = path.join(fallbackDir, 'users.json')
    fs.writeFileSync(tempFb, JSON.stringify(users, null, 2), 'utf-8')
    fs.renameSync(tempFb, targetFb)
  } catch {}
}

// GET /api/users — Lista usuários cadastrados (somente ADMIN, sem senhas)
app.get('/api/users', requireAdmin, (_req, res) => {
  res.json({ ok: true, users: inMemoryUsers.map(sanitizeUser) })
})

// POST /api/users — Cria ou atualiza usuário com senha gerada (somente ADMIN)
app.post('/api/users', requireAdmin, (req, res) => {
  const body = req.body || {}
  const name = String(body.name || '').trim().toUpperCase()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '').trim()
  const role = ['ADMIN', 'SUPERVISOR', 'OPERADOR'].includes(body.role) ? body.role : 'OPERADOR'
  const eventId = String(body.eventId || 'all').trim()
  const eventName = String(body.eventName || 'TODOS OS PROJETOS').trim()

  if (!name || !email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, message: 'Nome e e-mail válido são obrigatórios.' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Senha deve ter pelo menos 6 caracteres.' })
  }

  const existingIdx = inMemoryUsers.findIndex((u) => u.email && u.email.toLowerCase() === email)
  const newUser = {
    id: body.id || (existingIdx >= 0 ? inMemoryUsers[existingIdx].id : `user-${Date.now()}`),
    name,
    email,
    password,
    role,
    eventId,
    eventName,
    status: body.status === 'INATIVO' ? 'INATIVO' : 'ATIVO',
    deliveries: Number(body.deliveries || 0),
    avatar: name.substring(0, 2).toUpperCase(),
    updatedAt: Date.now(),
  }

  if (existingIdx >= 0) {
    inMemoryUsers[existingIdx] = { ...inMemoryUsers[existingIdx], ...newUser }
  } else {
    inMemoryUsers.unshift(newUser)
  }

  writeUsersToDisk(inMemoryUsers)
  res.status(201).json({ ok: true, user: sanitizeUser(newUser) })
})

// PUT /api/users/:id — Atualiza usuário (dados, função ou redefinição de senha)
app.put('/api/users/:id', requireAdmin, (req, res) => {
  const userId = String(req.params.id || '').trim()
  const idx = inMemoryUsers.findIndex((u) => u.id === userId)
  if (idx === -1) {
    return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' })
  }

  const current = inMemoryUsers[idx]
  const body = req.body || {}

  const updated = {
    ...current,
    name: body.name ? String(body.name).trim().toUpperCase() : current.name,
    role: body.role && ['ADMIN', 'SUPERVISOR', 'OPERADOR'].includes(body.role) ? body.role : current.role,
    eventId: body.eventId !== undefined ? String(body.eventId) : current.eventId,
    eventName: body.eventName !== undefined ? String(body.eventName) : current.eventName,
    status: body.status && ['ATIVO', 'INATIVO'].includes(body.status) ? body.status : current.status,
    deliveries: typeof body.deliveries === 'number' ? body.deliveries : current.deliveries,
    updatedAt: Date.now(),
  }

  if (body.password && typeof body.password === 'string' && body.password.trim().length >= 6) {
    updated.password = body.password.trim()
  }

  inMemoryUsers[idx] = updated
  writeUsersToDisk(inMemoryUsers)
  res.json({ ok: true, user: sanitizeUser(updated) })
})

// DELETE /api/users/:id — Remove usuário
app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const userId = String(req.params.id || '').trim()
  if (userId === 'admin_pacetime' || userId === inMemoryUsers.find(u => u.email === ADMIN_EMAIL)?.id) {
    return res.status(400).json({ ok: false, message: 'Não é possível remover o administrador principal.' })
  }

  const idx = inMemoryUsers.findIndex((u) => u.id === userId)
  if (idx === -1) {
    return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' })
  }

  inMemoryUsers.splice(idx, 1)
  writeUsersToDisk(inMemoryUsers)
  res.json({ ok: true, message: 'Usuário removido com sucesso.' })
})

// Autenticação do Administrador Geral, Operadores e Usuários cadastrados
app.post('/api/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {}

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ ok: false, message: 'Informe um e-mail válido.' })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Senha deve ter ao menos 6 caracteres.' })
  }

  const normalizedEmail = email.trim().toLowerCase()

  // 1. Administrador Geral (Padrão ou via ENV)
  if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const adminUser = {
      id: 'admin_pacetime',
      name: 'Felipe Admin',
      email: normalizedEmail,
      role: 'ADMIN',
      eventId: 'all',
      eventName: 'TODOS OS PROJETOS',
    }
    return res.json({ ok: true, user: adminUser, token: createSession(adminUser) })
  }

  // 2. Usuários cadastrados no sistema (Operadores, Supervisores, Admins)
  const foundUser = inMemoryUsers.find(
    (u) => u.email && u.email.toLowerCase() === normalizedEmail && u.password === password
  )
  if (foundUser) {
    if (foundUser.status === 'INATIVO') {
      return res.status(403).json({
        ok: false,
        message: 'Usuário desativado. Entre em contato com o administrador.',
      })
    }
    const sessionUser = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role || 'OPERADOR',
      eventId: foundUser.eventId || 'all',
      eventName: foundUser.eventName || 'TODOS OS PROJETOS',
    }
    return res.json({ ok: true, user: sessionUser, token: createSession(sessionUser) })
  }

  // 3. Operadores de homologação com a senha geral (retrocompatibilidade)
  const legacyOperators = {
    'agner.israel@entregas.com': 'Agner Israel',
    'agner.araujo@entregas.com': 'Agner Araujo',
    'entregas1@entregas.com': 'Entregas 01',
    'entregas2@entregas.com': 'Entregas 02',
    'entregas3@entregas.com': 'Entregas 03',
  }

  if (legacyOperators[normalizedEmail] && password === ADMIN_PASSWORD) {
    const legacyUser = {
      id: normalizedEmail.split('@')[0],
      name: legacyOperators[normalizedEmail],
      email: normalizedEmail,
      role: 'OPERADOR',
      eventId: 'all',
      eventName: 'TODOS OS PROJETOS',
    }
    return res.json({ ok: true, user: legacyUser, token: createSession(legacyUser) })
  }

  return res.status(401).json({
    ok: false,
    message: 'E-mail ou senha incorretos. Verifique suas credenciais.',
  })
})

// GET /api/session — valida o token e restaura o login após reload
app.get('/api/session', (req, res) => {
  const session = getSessionFromReq(req)
  if (!session) {
    return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada.' })
  }
  res.json({
    ok: true,
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      eventId: session.eventId,
      eventName: session.eventName,
    },
  })
})

// POST /api/logout — revoga o token atual
app.post('/api/logout', (req, res) => {
  const header = String(req.headers.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : String(req.headers['x-auth-token'] || '').trim()
  if (token) sessions.delete(token)
  res.json({ ok: true })
})


// Em produção (dist gerado), serve o frontend na mesma origem.
const distDir = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(distDir, { index: false }))
app.get(/^(?!\/api\/).*/, (_req, res, next) => {
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next()
  })
})

app.listen(PORT, () => {
  console.log(`entregas-run-server ouvindo em http://localhost:${PORT}`)
})
