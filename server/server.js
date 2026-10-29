import crypto from 'node:crypto'
import { teamOf, sameScope, canAccessEvent, canCreateEvent, canManageUser } from './teamAccess.js'
import { createEspelhoChannels, STATION_ID } from './espelhoChannels.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { hashPassword, verifyPassword } from './passwords.js'
import { eventMetrics, mergeActiveAthletes } from './athleteSync.js'
import { createSessionStore } from './sessionStore.js'
import { deployCheckTokenFile } from './deployCheck.js'
import { createEmergencyLinksStore, EMERGENCY_CODE } from './emergencyLinks.js'
import {
  athleteKey,
  athleteRef,
  calculateAge,
  createMedicoStore,
  formatAge,
  healthView,
  OCORRENCIA_STATUS,
  sanitizeHealthFields,
  searchAthletes,
  validateDesfecho,
  validateOcorrencia,
  validateRegistro,
  withoutHealthFields,
} from './medico.js'
import {
  decodeJpegDataUrl,
  deletePhoto,
  photoRoot,
  readPhoto,
  savePhoto,
  sweepExpiredPhotos,
} from './retiradaPhotos.js'
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
const sessions = createSessionStore(path.join(DATA_DIR, 'sessions.json'))
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return user
  const { password: _password, passwordHash: _passwordHash, ...safe } = user
  return safe
}

// Dono = conta de emergência definida por ADMIN_EMAIL no .env. Não pode ser
// removido, desativado nem rebaixado: garante que sempre sobre um acesso capaz
// de destravar o sistema. Trocar ADMIN_EMAIL transfere o papel.
function isOwnerAdmin(user) {
  return Boolean(user && String(user.email || '').toLowerCase().trim() === ADMIN_EMAIL)
}

// Acesso total ("principal"): o dono e os Super admins que o dono criar
// (ADMIN com superAdmin, fora de equipe). Só o dono gerencia Super admins.
function isPrincipalAdmin(user) {
  return isOwnerAdmin(user) || Boolean(user && user.role === 'ADMIN' && user.superAdmin === true && !teamOf(user))
}

function publicUser(user) {
  return { ...sanitizeUser(user), isPrincipal: isPrincipalAdmin(user), isOwner: isOwnerAdmin(user) }
}

function revokeUserSessions(userId) {
  sessions.revokeUser(userId)
}

function createSession(user, extra = {}) {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, {
    ...extra,
    userId: user.id,
    email: user.email,
    role: user.role || 'OPERADOR',
    eventId: user.eventId || 'all',
    eventName: user.eventName || 'TODOS OS PROJETOS',
    name: user.name || '',
    teamId: teamOf(user),
    legacy: user.legacy === true,
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
  const current = inMemoryUsers.find((user) => user.id === session.userId)
  if (!current && !session.legacy) return null
  if (current?.status === 'INATIVO') return null
  if (current?.role === 'TEAM_ADMIN' && !teamOf(current)) return null
  if (current?.teamId) {
    const leader = inMemoryUsers.find((user) => user.role === 'TEAM_ADMIN' && user.teamId === current.teamId)
    if (!leader || leader.status === 'INATIVO') return null
  }
  // Visita de Super admin ao ambiente de um Sub-admin: cai junto se quem visita
  // perder o acesso de Super admin.
  if (session.impersonatedBy) {
    const visitor = inMemoryUsers.find((user) => user.id === session.impersonatedBy)
    if (!visitor || visitor.status === 'INATIVO' || !isPrincipalAdmin(visitor)) return null
  }
  return { token, ...session, ...(current ? {
    role: current.role, teamId: teamOf(current), name: current.name, email: current.email,
    eventId: current.eventId && current.eventId !== 'all' ? current.eventId : session.eventId,
  } : {}), isPrincipal: isPrincipalAdmin(current), isOwner: isOwnerAdmin(current) }
}

function requireEventScope(req, res, session) {
  if (!req.params.eventId) return true
  const eventId = String(req.params.eventId)
  if (!EMERGENCY_CODE.test(eventId)) {
    res.status(400).json({ ok: false, message: 'Identificador de projeto inválido.' })
    return false
  }
  const event = inMemoryEvents.find((item) => item.id === eventId)
  // Preserve o 404 das rotas legadas, mas equipes nunca operam IDs sem dono.
  if (!event && !teamOf(session) && session.role !== 'TEAM_ADMIN') return true
  if (event && canAccessEvent(session, event)) return true
  res.status(403).json({ ok: false, message: 'Projeto fora do seu acesso.' })
  return false
}

function requireAuth(req, res, next) {
  const session = getSessionFromReq(req)
  if (!session) {
    return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Entre novamente.' })
  }
  if (!requireEventScope(req, res, session)) return
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

function requireAdminOrSubAdmin(req, res, next) {
  const session = getSessionFromReq(req)
  if (!session) {
    return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Entre novamente.' })
  }
  if (!['ADMIN', 'TEAM_ADMIN', 'SUB_ADMIN'].includes(session.role)) {
    return res.status(403).json({ ok: false, message: 'Acesso restrito à administração.' })
  }
  req.session = session
  next()
}

setInterval(() => sessions.prune(), 60 * 60 * 1000).unref?.()

// Leitura do gate de deploy (ver deployCheck.js): token novo a cada boot, só
// em GET, só do loopback do próprio container e só nas rotas que o gate lê.
const DEPLOY_CHECK_TOKEN = crypto.randomBytes(32).toString('hex')
try {
  fs.writeFileSync(deployCheckTokenFile(PORT), DEPLOY_CHECK_TOKEN, { mode: 0o600 })
} catch (err) {
  console.warn('[server] Token do gate de deploy não gravado:', err?.message)
}
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function isDeployCheck(req) {
  const given = Buffer.from(String(req.headers['x-deploy-check'] || ''))
  const expected = Buffer.from(DEPLOY_CHECK_TOKEN)
  return req.method === 'GET' &&
    LOOPBACK.has(req.socket.remoteAddress) &&
    given.length === expected.length &&
    crypto.timingSafeEqual(given, expected)
}

function requireAuthOrDeployCheck(req, res, next) {
  if (!isDeployCheck(req)) return requireAuth(req, res, next)
  req.session = { userId: 'deploy-check', role: 'ADMIN', isPrincipal: true, eventId: 'all', name: 'deploy-check' }
  next()
}

// docker stop/deploy envia SIGTERM: grava sessões pendentes antes de sair.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    sessions.flushNow()
    process.exit(0)
  })
}

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
} catch (err) {
  console.error('[server] Erro ao inicializar diretório de dados:', err)
}

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'connect-src': ["'self'", 'https://servicodados.ibge.gov.br'],
        // blob: = foto da retirada exibida após download autenticado (não é pública).
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      },
    },
  })
)
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }))

// Desabilita cache HTTP para todas as rotas de API — garante sincronização em tempo real
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  next()
})

// Perfil MEDICO só enxerga a fila de ocorrências do próprio evento: qualquer
// outra rota da API é recusada aqui, antes de chegar à regra de cada tela.
const MEDICO_ALLOWED_API = /^\/api\/(medico\/|session$|logout$|health$)/
app.use('/api', (req, res, next) => {
  const session = getSessionFromReq(req)
  if (session?.role === 'MEDICO' && !MEDICO_ALLOWED_API.test(req.originalUrl.split('?')[0])) {
    return res.status(403).json({ ok: false, message: 'Perfil médico acessa apenas o painel de ocorrências.' })
  }
  next()
})

// ============================================================
// ESPELHO PÚBLICO (segunda tela / QR Code)
// Quadro de avisos em memória por evento com persistência de configuração:
// O guichê (OperacaoPage) publica a ficha aberta e a config de aparência;
// a tela pública (/espelho/:id) consome via SSE em tempo real.
// ============================================================
const espelhoStates = new Map()
const espelhoClients = new Map() // key -> Set<Response>
const espelhoChannels = createEspelhoChannels(DATA_DIR)

const ESPELHO_CONFIGS_FILE = path.join(DATA_DIR, 'espelho_configs.json')
let inMemoryEspelhoConfigs = {}
try {
  if (fs.existsSync(ESPELHO_CONFIGS_FILE)) {
    inMemoryEspelhoConfigs = JSON.parse(fs.readFileSync(ESPELHO_CONFIGS_FILE, 'utf-8')) || {}
  }
} catch {
  inMemoryEspelhoConfigs = {}
}

function writeEspelhoConfigsToDisk(configs) {
  let tempFile
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    tempFile = `${ESPELHO_CONFIGS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(configs, null, 2), 'utf-8')
    fs.renameSync(tempFile, ESPELHO_CONFIGS_FILE)
  } catch (err) {
    if (tempFile) { try { fs.unlinkSync(tempFile) } catch {} }
    console.error('[server] Erro ao salvar espelho_configs.json em DATA_DIR:', err.code)
    throw err
  }
}

const espelhoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1200, // Permite digitação contínua e fluida do operador em tempo real
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Muitas requisições. Aguarde um instante.' },
})

const espelhoJsonParser = express.json({ limit: '9mb' })

function espelhoKey(rawId) {
  return String(rawId || 'default').replace(/[^\w-]/g, '').slice(0, 64) || 'default'
}

function resolveEspelho(req, res) {
  const eventId = req.params.eventId
  const hasChannel = Object.hasOwn(req.query, 'canal')
  const channel = hasChannel ? espelhoChannels.get(eventId, req.query.canal) : null
  if (hasChannel && (!channel || !inMemoryEvents.some((event) => event.id === eventId))) {
    res.status(404).json({ ok: false, message: 'Canal do Espelho não encontrado. Abra o link deste posto novamente.' })
    return null
  }
  return { eventId, channel, key: channel ? `${eventId}:${channel.canalId}` : espelhoKey(eventId) }
}

function espelhoState(eventId, key, channel = null) {
  const state = espelhoStates.get(key)
  const config = inMemoryEspelhoConfigs[espelhoKey(eventId)] || null
  if (!state && !config && !channel) return null
  const { source: _source, ...visible } = state || {}
  return { status: 'LIVRE', eventName: '', atleta: null, updatedAt: Date.now(), ...visible, config, ...(channel ? { guiche: channel.numero } : {}) }
}

function broadcastEspelho(eventId, keys) {
  const channels = new Map(espelhoChannels.forEvent(eventId).map((channel) => [`${eventId}:${channel.canalId}`, channel.canalId]))
  const targets = keys === 'all' ? [espelhoKey(eventId), ...channels.keys()] : keys
  for (const target of targets) {
    const channel = channels.has(target) ? espelhoChannels.get(eventId, channels.get(target)) : null
    const state = espelhoState(eventId, target, channel)
    const payload = `data: ${JSON.stringify({ ok: true, state })}\n\n`
    for (const client of espelhoClients.get(target) || []) {
      try { client.write(payload) } catch {}
    }
  }
}

app.post('/api/espelho/:eventId/canais', espelhoLimiter, requireAuth, express.json({ limit: '2kb' }), (req, res) => {
  if (!inMemoryEvents.some((event) => event.id === req.params.eventId)) return res.status(404).json({ ok: false, message: 'Projeto não encontrado.' })
  const stationId = typeof req.body?.stationId === 'string' ? req.body.stationId.toLowerCase() : ''
  if (!STATION_ID.test(stationId)) return res.status(400).json({ ok: false, message: 'Identificador do posto inválido.' })
  try {
    const channel = espelhoChannels.open(req.params.eventId, req.session.userId, stationId)
    res.json({ ok: true, canalId: channel.canalId, numero: channel.numero })
  } catch {
    res.status(503).json({ ok: false, message: 'Não foi possível salvar o canal deste posto. Tente novamente.' })
  }
})

function sanitizeHexColor(value, fallback) {
  const text = String(value ?? '').trim()
  return /^#[0-9a-fA-F]{3,8}$/.test(text) ? text : fallback
}

function sanitizeImageDataUrl(value) {
  const text = String(value ?? '')
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(text)) return null
  return text.length <= 4 * 1024 * 1024 ? text : null
}

function sanitizeEspelhoConfig(raw, previousConfig) {
  if (!raw || typeof raw !== 'object') return undefined
  return {
    fundo: sanitizeHexColor(raw.fundo, previousConfig?.fundo || '#071526'),
    texto: sanitizeHexColor(raw.texto, previousConfig?.texto || '#ffffff'),
    destaque: sanitizeHexColor(raw.destaque, previousConfig?.destaque || '#ff6b00'),
    fontSize: raw.fontSize !== undefined
      ? Math.min(150, Math.max(70, Number(raw.fontSize) || 100))
      : (previousConfig?.fontSize ?? 100),
    mensagem: raw.mensagem !== undefined
      ? String(raw.mensagem ?? 'Guichê disponível').slice(0, 120)
      : (previousConfig?.mensagem ?? 'Guichê disponível'),
    bgImage: raw.bgImage !== undefined
      ? (raw.bgImage ? sanitizeImageDataUrl(raw.bgImage) : null)
      : (previousConfig?.bgImage ?? null),
    logo: raw.logo !== undefined
      ? (raw.logo ? sanitizeImageDataUrl(raw.logo) : null)
      : (previousConfig?.logo ?? null),
    showBibCard: raw.showBibCard !== undefined
      ? raw.showBibCard !== false
      : (previousConfig?.showBibCard ?? true),
    showShirtCard: raw.showShirtCard !== undefined
      ? raw.showShirtCard !== false
      : (previousConfig?.showShirtCard ?? true),
    showKitCard: raw.showKitCard !== undefined
      ? raw.showKitCard !== false
      : (previousConfig?.showKitCard ?? true),
    showThirdParty: raw.showThirdParty !== undefined
      ? raw.showThirdParty !== false
      : (previousConfig?.showThirdParty ?? true),
    showEventName: raw.showEventName !== undefined
      ? raw.showEventName !== false
      : (previousConfig?.showEventName ?? true),
    visibleFields: raw.visibleFields !== undefined
      ? (Array.isArray(raw.visibleFields)
          ? raw.visibleFields
              .map((f) => String(f || '').trim().slice(0, 80))
              .filter(Boolean)
          : null)
      : (previousConfig?.visibleFields ?? null),
  }
}

// Endpoint de streaming SSE para segunda tela / espelho em tempo real
app.get('/api/espelho/:eventId/stream', (req, res) => {
  const resolved = resolveEspelho(req, res)
  if (!resolved) return
  const { key, eventId, channel } = resolved

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Evita buffering de proxies como Nginx e Caddy
  })
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders()
  }

  if (!espelhoClients.has(key)) {
    espelhoClients.set(key, new Set())
  }
  const clients = espelhoClients.get(key)
  clients.add(res)

  // Envia estado atual imediatamente ao conectar, garantindo que a config persistida acompanhe
  const initialPayload = espelhoState(eventId, key, channel) || { status: 'LIVRE', eventName: '', atleta: null, config: null, updatedAt: Date.now() }
  res.write(`data: ${JSON.stringify({ ok: true, state: initialPayload })}\n\n`)

  // Heartbeat a cada 15 segundos para manter a conexão aberta
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch {
      clearInterval(heartbeat)
    }
  }, 15000)

  req.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(res)
    if (clients.size === 0) {
      espelhoClients.delete(key)
    }
  })
})

app.get('/api/espelho/:eventId/estado', espelhoLimiter, (req, res) => {
  const resolved = resolveEspelho(req, res)
  if (!resolved) return
  res.json({ ok: true, state: espelhoState(resolved.eventId, resolved.key, resolved.channel) })
})

app.post('/api/espelho/:eventId/estado', espelhoLimiter, requireAuth, espelhoJsonParser, (req, res) => {
  const body = req.body || {}
  const resolved = resolveEspelho(req, res)
  if (!resolved) return
  const { key, eventId, channel } = resolved
  if (channel && channel.ownerUserId !== req.session.userId) return res.status(403).json({ ok: false, message: 'Este canal pertence a outro posto de atendimento.' })
  const previous = espelhoStates.get(key)

  // Proteção contra sobrescrita por requisições fora de ordem
  const hasLiveState = Object.hasOwn(body, 'status') || Object.hasOwn(body, 'atleta')
  const incomingTime = hasLiveState ? (Number(body.updatedAt) || Date.now()) : (previous?.updatedAt || Date.now())
  if (hasLiveState && previous?.updatedAt && incomingTime < previous.updatedAt) {
    return res.json({ ok: true, ignored: true })
  }

  for (const field of ['bgImage', 'logo']) {
    const value = body.config?.[field]
    if (value && !sanitizeImageDataUrl(value)) {
      return res.status(400).json({ ok: false, message: 'Use imagem PNG, JPG ou WebP em base64, até 4 MB.' })
    }
  }

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
    // Atleta: status LIVRE sempre limpa a ficha — guichê sem atleta.
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
                doc: String(atleta.doc ?? atleta.cpf ?? '').slice(0, 50),
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
                entreguePara: String(atleta.entreguePara ?? atleta.retiradoPor ?? '').slice(0, 120),
                retiradoPor: String(atleta.retiradoPor ?? atleta.entreguePara ?? '').slice(0, 120),
                entregueEm: String(atleta.entregueEm ?? '').slice(0, 60),
                entreguePor: String(atleta.entreguePor ?? '').slice(0, 80),
                status: String(atleta.status ?? '').slice(0, 20),
                customFields: withoutHealthFields(atleta.customFields, loadAthletesForEvent(eventId)?.healthFields),
              }
            : null,
    updatedAt: incomingTime,
  }
  if (body.config && typeof body.config === 'object') {
    const configKey = espelhoKey(eventId)
    const nextConfigs = { ...inMemoryEspelhoConfigs, [configKey]: sanitizeEspelhoConfig(body.config, inMemoryEspelhoConfigs[configKey]) }
    try {
      writeEspelhoConfigsToDisk(nextConfigs)
    } catch {
      return res.status(503).json({ ok: false, message: 'Não foi possível salvar a aparência. Tente novamente.' })
    }
    inMemoryEspelhoConfigs = nextConfigs
  }
  const changed = [key]
  if (hasLiveState) {
    espelhoStates.set(key, state)
    // O link antigo (/espelho/:id, sem canal) segue mostrando o último atendimento
    // de qualquer guichê; um guichê que fica livre não apaga a ficha que outro
    // guichê ainda mostra ali.
    const legacyKey = espelhoKey(eventId)
    const legacy = espelhoStates.get(legacyKey)
    const otherStillServing = state.status === 'LIVRE' && legacy && legacy.source !== key && legacy.status !== 'LIVRE'
    if (channel && !otherStillServing && !(legacy?.updatedAt > incomingTime)) {
      espelhoStates.set(legacyKey, { ...state, source: key })
      changed.push(legacyKey)
    }
  }

  // Aparência vale para o evento inteiro; atendimento só para a tela afetada.
  broadcastEspelho(eventId, body.config && typeof body.config === 'object' ? 'all' : changed)

  res.json({ ok: true })
})

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

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

// Servir assets de marca na raiz sem cair no wildcard de SPA
app.get('/logo.png', (_req, res) => {
  const candidates = [
    path.join(__dirname, '..', 'client', 'dist', 'logo.png'),
    path.join(__dirname, '..', 'client', 'public', 'logo.png'),
    path.join(__dirname, '..', 'client', 'src', 'assets', 'logo.png'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return res.sendFile(candidate)
    }
  }
  return res.redirect(302, '/favicon.svg')
})

app.get('/favicon.svg', (_req, res) => {
  const candidates = [
    path.join(__dirname, '..', 'client', 'dist', 'favicon.svg'),
    path.join(__dirname, '..', 'client', 'public', 'favicon.svg'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return res.sendFile(candidate)
    }
  }
  return res.status(404).end()
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
        if (Array.isArray(parsed)) {
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
const emergencyLinks = createEmergencyLinksStore(DATA_DIR)

// Se o disco local estiver vazio em uma nova máquina, reidrata do Appwrite
if (inMemoryEvents.length === 0 && !fs.existsSync(EVENTS_FILE) && isAppwriteEnabled()) {
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

// GET /api/events — Retorna os eventos persistidos (filtrados por permissão do usuário)
const eventMirrors = new Map()

function mirrorEventToAppwrite(event) {
  // O schema remoto legado não guarda a equipe. Não produza cópia que possa
  // reaparecer como projeto principal após reidratação sem o volume local.
  if (teamOf(event)) return
  let mirror = eventMirrors.get(event.id)
  if (!mirror) {
    mirror = { running: false, latest: null }
    eventMirrors.set(event.id, mirror)
  }
  mirror.latest = { ...event }
  if (mirror.running) return
  mirror.running = true
  void (async () => {
    try {
      while (mirror.latest) {
        const snapshot = mirror.latest
        mirror.latest = null
        const result = await persistEventToAppwrite(snapshot)
        if (!result.ok && !result.skipped) {
          console.warn(`[server] Espelho do evento ${event.id} incompleto no Appwrite.`)
        }
      }
    } catch (err) {
      console.error(`[server] Erro no espelho do evento ${event.id}:`, err)
    } finally {
      mirror.running = false
      if (mirror.latest) mirrorEventToAppwrite(mirror.latest)
    }
  })()
}

app.get('/api/events', requireAuthOrDeployCheck, (req, res) => {
  const events = inMemoryEvents.filter((event) => canAccessEvent(req.session, event)).map((event) => {
    const athletes = loadAthletesForEvent(event.id)?.athletes
    return Array.isArray(athletes) && athletes.length > 0
      ? { ...event, ...eventMetrics(athletes) }
      : event
  })
  const session = req.session
  if (session.role !== 'ADMIN' && session.eventId && session.eventId !== 'all') {
    const userEvents = events.filter((e) => e.id === session.eventId)
    return res.json({ ok: true, events: userEvents })
  }
  if (session.role === 'OPERADOR' && (!session.eventId || session.eventId === 'all')) {
    const fallback = events.length > 0 ? [events[0]] : []
    return res.json({ ok: true, events: fallback })
  }
  res.json({ ok: true, events })
})

// POST /api/events — Cria novo evento
app.post('/api/events', requireAuth, (req, res) => {
  if (!canCreateEvent(req.session)) {
    return res.status(403).json({ ok: false, message: 'Operador não tem permissão para criar eventos.' })
  }

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
    teamId: teamOf(req.session),
    createdBy: req.session.userId,
    updatedAt: Date.now(),
  }

  if (!EMERGENCY_CODE.test(eventId) || deletedEventIds.has(eventId) || emergencyLinks.reserved(eventId) || inMemoryEvents.some((event) => event.id === eventId)) {
    return res.status(409).json({ ok: false, message: 'Identificador já utilizado. Crie um evento novo e reaproveite o QR pela opção própria.' })
  }

  inMemoryEvents.unshift(newEvent)

  writeEventsToDisk(inMemoryEvents)
  mirrorEventToAppwrite(newEvent)
  res.status(201).json({ ok: true, event: newEvent })
})

// PUT /api/events/:eventId — Atualiza dados e status do evento
app.put('/api/events/:eventId', requireAuth, (req, res) => {
  const eventId = String(req.params.eventId || '').trim().slice(0, 64)
  const session = req.session
  if (session.role === 'OPERADOR') {
    return res.status(403).json({ ok: false, message: 'Operador não tem permissão para alterar eventos.' })
  }
  if (session.role === 'SUB_ADMIN' && session.eventId !== 'all' && session.eventId !== eventId) {
    return res.status(403).json({ ok: false, message: 'Sub-Admin só pode alterar o evento atribuído a ele.' })
  }

  const index = inMemoryEvents.findIndex((e) => e.id === eventId)

  if (index === -1) {
    return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  }

  const current = inMemoryEvents[index]
  if (current.status === 'ARQUIVADO') return res.status(409).json({ ok: false, message: 'Restaure o evento antes de alterá-lo.' })
  let body = req.body || {}
  // Telas abertas antes da lista de eventos carregar mandavam o evento provisório
  // "CARREGANDO..." inteiro: só as contagens dele valem, nunca nome/status/data/local.
  if (typeof body.name === 'string' && body.name.trim().toUpperCase().startsWith('CARREGANDO')) {
    const { name: _n, status: _s, active: _a, date: _d, dateInput: _di, location: _l, ...counts } = body
    body = counts
  }
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
  const persistedAthletes = loadAthletesForEvent(eventId)?.athletes
  if (Array.isArray(persistedAthletes) && persistedAthletes.length > 0) {
    Object.assign(updated, eventMetrics(persistedAthletes))
  }

  inMemoryEvents[index] = updated
  writeEventsToDisk(inMemoryEvents)
  mirrorEventToAppwrite(updated)
  res.json({ ok: true, event: updated })
})

// DELETE /api/events/:eventId — Remove evento (somente Super Admin)
app.delete('/api/events/:eventId', requireAuth, (req, res) => {
  if (!['ADMIN', 'TEAM_ADMIN'].includes(req.session.role)) {
    return res.status(403).json({
      ok: false,
      message: 'Sub-Admin não tem permissão para excluir eventos. Somente o Super Admin pode realizar exclusões.',
    })
  }

  const eventId = String(req.params.eventId || '').trim().slice(0, 64)
  if (!inMemoryEvents.some((event) => event.id === eventId)) return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  if (req.body?.confirmQrInvalidation !== true) return res.status(409).json({ ok: false, message: 'A exclusão desativa os QR Codes vinculados e apaga os dados de saúde. Prefira arquivar ou confirme esse efeito.' })
  try {
    emergencyLinks.issue(eventId, req.session.userId)
    fs.rmSync(getAthletesFilePath(eventId), { force: true })
  } catch {
    return res.status(503).json({ ok: false, message: 'Não foi possível preservar o QR e remover a planilha. Evento não excluído.' })
  }
  athletesCache.delete(eventId)
  inMemoryEvents = inMemoryEvents.filter((e) => e.id !== eventId)

  markEventDeleted(eventId)
  // Evento excluído não mantém foto de atleta nem dado de saúde guardado.
  runPhotoSweep()
  medicoStore.deleteEvent(eventId)

  writeEventsToDisk(inMemoryEvents)
  void deleteEventFromAppwrite(eventId)
  res.json({ ok: true })
})

// Endereços impressos ficam no volume, separados dos dados médicos do evento.
app.post('/api/events/:eventId/emergency-links', requireAuth, (req, res) => {
  const event = inMemoryEvents.find((item) => item.id === req.params.eventId)
  if (!event) return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  const session = req.session
  if (!['ADMIN', 'TEAM_ADMIN'].includes(session.role) && !(session.role === 'SUB_ADMIN' && (session.eventId === 'all' || session.eventId === event.id))) {
    return res.status(403).json({ ok: false, message: 'Sem permissão para gerenciar o QR deste evento.' })
  }
  try {
    const primary = emergencyLinks.issue(event.id, session.userId)
    res.json({ ok: true, primaryCode: primary.code, links: emergencyLinks.forEvent(event.id) })
  } catch { res.status(503).json({ ok: false, message: 'Falha ao salvar o endereço permanente. Tente novamente.' }) }
})

app.get('/api/emergency-links/preview', requireAuth, (req, res) => {
  if (!req.session.isPrincipal) return res.status(403).json({ ok: false, message: 'Somente o administrador principal pode transferir um QR.' })
  const code = String(req.query.code || '')
  if (!EMERGENCY_CODE.test(code)) return res.status(400).json({ ok: false, message: 'Código inválido.' })
  const link = emergencyLinks.get(code)
  const previous = inMemoryEvents.find((event) => event.id === (link?.eventId || code))
  if (!link && !previous && !deletedEventIds.has(code)) return res.status(404).json({ ok: false, message: 'Endereço antigo não encontrado. Confira o QR impresso.' })
  res.json({ ok: true, code, revision: link?.revision || 0, previous: previous ? { id: previous.id, name: previous.name, date: previous.date, status: previous.status } : null })
})

app.put('/api/emergency-links/binding', requireAuth, (req, res) => {
  if (!req.session.isPrincipal) return res.status(403).json({ ok: false, message: 'Somente o administrador principal pode transferir um QR.' })
  if (fs.existsSync(path.join(DATA_DIR, '.emergency-links-release-pending'))) return res.status(503).json({ ok: false, message: 'Atualização em validação. Aguarde alguns instantes e tente novamente.' })
  const { code, targetEventId, expectedRevision, confirmed } = req.body || {}
  const target = inMemoryEvents.find((event) => event.id === targetEventId)
  if (!target || target.status === 'ARQUIVADO') return res.status(400).json({ ok: false, message: 'Escolha um evento não arquivado.' })
  if (confirmed !== true) return res.status(400).json({ ok: false, message: 'Confirme o evento, a data e a lista de atletas do destino.' })
  try {
    const result = emergencyLinks.bind({ code: String(code || ''), eventId: target.id, expectedRevision, actor: req.session.userId, knownDeleted: deletedEventIds.has(code), currentEvent: (id) => inMemoryEvents.find((event) => event.id === id) })
    if (result.status) return res.status(result.status).json({ ok: false, message: result.message })
    res.json({ ok: true, link: result.link })
  } catch { res.status(503).json({ ok: false, message: 'Falha ao salvar o vínculo. Nenhuma transferência foi confirmada.' }) }
})

app.post('/api/events/:eventId/archive', requireAuth, (req, res) => {
  if (!['ADMIN', 'TEAM_ADMIN'].includes(req.session.role)) return res.status(403).json({ ok: false, message: 'Sem permissão para arquivar ou restaurar.' })
  if (fs.existsSync(path.join(DATA_DIR, '.emergency-links-release-pending'))) return res.status(503).json({ ok: false, message: 'Atualização em validação. Aguarde alguns instantes e tente novamente.' })
  const event = inMemoryEvents.find((item) => item.id === req.params.eventId)
  if (!event) return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  if (typeof req.body?.archived !== 'boolean') return res.status(400).json({ ok: false, message: 'Informe se deseja arquivar ou restaurar.' })
  const updated = { ...event, status: req.body.archived ? 'ARQUIVADO' : 'PLANEJADO', active: false, updatedAt: Date.now() }
  const next = inMemoryEvents.map((item) => item.id === event.id ? updated : item)
  writeEventsToDisk(next)
  if (diskWriteError) return res.status(503).json({ ok: false, message: 'Falha ao salvar o arquivamento.' })
  inMemoryEvents = next
  mirrorEventToAppwrite(updated)
  res.json({ ok: true, event: updated })
})

// POST /api/events/sync — Sincronização em lote (dispositivo móvel -> servidor)
app.post('/api/events/sync', requireAuth, (req, res) => {
  if (!canCreateEvent(req.session)) {
    return res.status(403).json({ ok: false, message: 'Operador não tem permissão para criar eventos.' })
  }
  const incoming = Array.isArray(req.body?.events) ? req.body.events : []
  // Rejeite o lote inteiro antes de gravar qualquer projeto se houver ID alheio.
  if (incoming.some((raw) => {
    const id = String(raw?.id || '').trim().slice(0, 64)
    const existing = inMemoryEvents.find((event) => event.id === id)
    return existing && !canAccessEvent(req.session, existing)
  })) return res.status(403).json({ ok: false, message: 'Sincronização contém projeto fora do seu acesso.' })
  let changed = false

  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object' || !raw.id) continue
    if (MOCK_EVENT_IDS.includes(raw.id)) continue
    if (deletedEventIds.has(raw.id)) continue
    const sanitized = sanitizeEventPayload(raw, false)
    if (!sanitized) continue
    const id = String(raw.id).trim().slice(0, 64)
    if (!EMERGENCY_CODE.test(id) || emergencyLinks.reserved(id)) continue
    const existingIdx = inMemoryEvents.findIndex((e) => e.id === id)
    if (existingIdx === -1) {
      inMemoryEvents.push({ ...sanitized, id, teamId: teamOf(req.session), createdBy: req.session.userId, updatedAt: Date.now() })
      changed = true
    }
  }

  if (changed) {
    writeEventsToDisk(inMemoryEvents)
    for (const ev of inMemoryEvents) {
      mirrorEventToAppwrite(ev)
    }
  }
  res.json({ ok: true, events: inMemoryEvents.filter((event) => canAccessEvent(req.session, event)) })
})

// ============================================================
// PERSISTÊNCIA CENTRALIZADA DE ATLETAS POR EVENTO
// Salva a lista de atletas e schema em athletes_{eventId}.json.
// Permite consulta pública instantânea via QR Code e sincronização.
// ============================================================
const athletesJsonParser = express.json({ limit: '20mb' })

app.use('/api/events/:eventId/athletes', (req, res, next) => {
  if (req.method === 'GET') return next()
  return requireAuth(req, res, () => {
    if (!inMemoryEvents.some((event) => event.id === req.params.eventId)) return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
    if (inMemoryEvents.some((event) => event.id === req.params.eventId && event.status === 'ARQUIVADO')) {
      return res.status(409).json({ ok: false, message: 'Evento arquivado. Restaure-o antes de alterar atletas ou registrar entregas.' })
    }
    next()
  })
})

function getAthletesFilePath(eventId) {
  const safeId = String(eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  return path.join(DATA_DIR, `athletes_${safeId}.json`)
}

const athletesCache = new Map()
const athleteMirrors = new Map()

function mirrorAthletesToAppwrite(eventId, athletes) {
  let mirror = athleteMirrors.get(eventId)
  if (!mirror) {
    mirror = { running: false, latest: null }
    athleteMirrors.set(eventId, mirror)
  }
  mirror.latest = athletes
  if (mirror.running) return
  mirror.running = true
  void (async () => {
    try {
      while (mirror.latest) {
        const snapshot = mirror.latest
        mirror.latest = null
        const result = await persistAthletesToAppwrite(eventId, snapshot)
        if ((!result.ok && !result.skipped) || result.errorCount > 0) {
          console.warn(`[server] Espelho Appwrite incompleto para evento ${eventId}.`)
        }
      }
    } catch (err) {
      console.error(`[server] Erro no espelho Appwrite para evento ${eventId}:`, err)
    } finally {
      mirror.running = false
      if (mirror.latest) mirrorAthletesToAppwrite(eventId, mirror.latest)
    }
  })()
}

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

// healthFields: colunas da planilha marcadas como saúde (e quais são públicas na
// emergência). Ausente = mantém a escolha anterior, inclusive ao reimportar.
function saveAthletesForEvent(eventId, athletes, schema = [], kits, originalSheet, healthFields, listRevision) {
  const safeId = String(eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  if (!safeId) return false

  const existing = loadAthletesForEvent(safeId)

  const data = {
    eventId: safeId,
    athletes: Array.isArray(athletes) ? athletes : [],
    schema: Array.isArray(schema) ? schema : [],
    kits: kits === undefined ? (existing?.kits || []) : kits,
    originalSheet: originalSheet !== undefined ? originalSheet : (existing?.originalSheet || null),
    healthFields: healthFields !== undefined ? sanitizeHealthFields(healthFields) : (existing?.healthFields || []),
    listRevision: listRevision ?? existing?.listRevision ?? 0,
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

// A substituição muda a geração: abas antigas não podem restaurar a lista removida.
function validateAthleteWrite(existing, importMode, listRevision) {
  if (importMode !== undefined && importMode !== 'replace' && importMode !== 'add') {
    return { status: 400, message: 'Modo de importação inválido.' }
  }
  const revision = listRevision ?? 0
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return { status: 400, message: 'Revisão da lista inválida.' }
  }
  if (revision !== (existing?.listRevision || 0)) {
    return { status: 409, message: 'A lista foi substituída em outra sessão. Atualize a página antes de salvar.' }
  }
  if (importMode === 'replace' && existing?.athletes?.some((a) => String(a.status || '').toUpperCase() === 'ENTREGUE')) {
    return { status: 409, message: 'Não é possível substituir a lista: já existem kits entregues. Use Adicionar atletas.' }
  }
  return null
}

function mergeImportMetadata(current, incoming, key) {
  const merged = new Map()
  for (const item of [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const id = String(item?.[key] || '')
    if (!merged.has(id)) merged.set(id, item)
  }
  return [...merged.values()]
}

// GET /api/events/:eventId/athletes — Recupera lista de atletas e schema
// Fallback: disco vazio + Appwrite com dados => devolve Appwrite e
// reidrata o disco (cura a divergência total x lista zerada).
app.get('/api/events/:eventId/athletes', requireAuthOrDeployCheck, async (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const session = req.session
  if (session.role !== 'ADMIN') {
    if (session.eventId && session.eventId !== 'all' && session.eventId !== safeEventId) {
      return res.status(403).json({
        ok: false,
        message: 'Acesso negado: você não tem permissão para acessar os atletas deste evento.',
      })
    }
  }

  const data = loadAthletesForEvent(safeEventId)
  if (data && Array.isArray(data.athletes) && data.athletes.length > 0) {
    return res.json({
      ok: true,
      listRevision: data?.listRevision || 0,
      athletes: data.athletes || [],
      schema: data.schema || [],
      kits: data.kits || [],
      originalSheet: data.originalSheet || null,
      healthFields: data.healthFields || [],
    })
  }
  try {
    const remote = await fetchAthletesFromAppwrite(safeEventId)
    if (remote && Array.isArray(remote.athletes) && remote.athletes.length > 0) {
      saveAthletesForEvent(safeEventId, remote.athletes, remote.schema, remote.kits)
      return res.json({
        ok: true,
        listRevision: data?.listRevision || 0,
        athletes: remote.athletes,
        schema: remote.schema || [],
        kits: remote.kits || [],
        originalSheet: data?.originalSheet || null,
        healthFields: data?.healthFields || [],
        source: 'appwrite',
      })
    }
  } catch {}
  if (!data) {
    return res.json({ ok: true, listRevision: 0, athletes: [], schema: [], kits: [], originalSheet: null })
  }
  res.json({
    ok: true,
    listRevision: data?.listRevision || 0,
    athletes: data.athletes || [],
    schema: data.schema || [],
    kits: data.kits || [],
    originalSheet: data.originalSheet || null,
    healthFields: data.healthFields || [],
  })
})

// POST /api/events/:eventId/athletes — Sincroniza/persiste lista de atletas
// Kits inválidos NÃO derrubam mais a lista: atletas são salvos e o aviso
// volta em kitsWarning (causa raiz da divergência total x lista zerada).
app.post('/api/events/:eventId/athletes', requireAuth, athletesJsonParser, (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const session = req.session
  if (session.role !== 'ADMIN') {
    if (session.eventId && session.eventId !== 'all' && session.eventId !== safeEventId) {
      return res.status(403).json({
        ok: false,
        message: 'Acesso negado: você não tem permissão para modificar atletas deste evento.',
      })
    }
  }

  const { athletes, schema, kits, originalSheet, undoAthleteId, healthFields, importMode, listRevision } = req.body || {}

  if (!Array.isArray(athletes)) {
    return res.status(400).json({ ok: false, message: 'Lista de atletas inválida.' })
  }

  const existing = loadAthletesForEvent(safeEventId)
  const intentError = validateAthleteWrite(existing, importMode, listRevision)
  if (intentError) return res.status(intentError.status).json({ ok: false, message: intentError.message })
  let kitsWarning = null
  let kitsToSave = importMode === 'replace' ? [] : undefined
  if (kits !== undefined) {
    const error = validateKits(kits)
    if (error) {
      if (importMode === 'replace') return res.status(400).json({ ok: false, message: error })
      kitsWarning = error
      kitsToSave = undefined // preserva kits já salvos; não bloqueia atletas
    } else {
      kitsToSave = kits
    }
  }

  const curEv = inMemoryEvents.find((e) => e.id === safeEventId)
  const protectExisting = curEv?.status === 'EM OPERAÇÃO' ||
    existing?.athletes?.some((athlete) => String(athlete.status || '').toUpperCase() === 'ENTREGUE')
  const safeUndoId = String(undoAthleteId || '').slice(0, 64)
  const undoTarget = existing?.athletes?.find((athlete) => String(athlete.id) === safeUndoId)
  const canUndoDelivery = ['ADMIN', 'TEAM_ADMIN', 'SUPERVISOR'].includes(session.role)
  if (undoTarget?.status === 'ENTREGUE' && !canUndoDelivery) {
    return res.status(403).json({ ok: false, message: 'Somente supervisores podem desfazer uma entrega.' })
  }
  const safeAthletes = importMode !== 'replace' && (protectExisting || importMode === 'add')
    ? mergeActiveAthletes(existing?.athletes, athletes, { undoAthleteId: safeUndoId, canUndoDelivery })
    : athletes
  const safeSchema = importMode === 'add' ? mergeImportMetadata(existing?.schema, schema, 'key')
    : importMode !== 'replace' && protectExisting && existing?.schema?.length ? existing.schema : schema
  if (importMode === 'add') kitsToSave = mergeImportMetadata(existing?.kits, kitsToSave, 'numero')
  const safeHealthFields = importMode === 'add' ? mergeImportMetadata(existing?.healthFields, healthFields, 'key') : healthFields
  const nextRevision = (existing?.listRevision || 0) + (importMode === 'replace' ? 1 : 0)
  const success = saveAthletesForEvent(safeEventId, safeAthletes, safeSchema, kitsToSave, originalSheet, safeHealthFields, nextRevision)
  if (!success) {
    return res.status(500).json({ ok: false, message: 'Erro ao persistir atletas.' })
  }
  mirrorAthletesToAppwrite(safeEventId, safeAthletes)
  if (curEv) {
    Object.assign(curEv, eventMetrics(safeAthletes))
    writeEventsToDisk(inMemoryEvents)
    mirrorEventToAppwrite(curEv)
  }
  res.json({ ok: true, listRevision: nextRevision, count: safeAthletes.length, ...(kitsWarning ? { kitsWarning } : {}) })
})

// POST /api/events/:eventId/athletes/chunks — upload fatiado p/ listas grandes
// Evita payload gigante único (ex: 1.011 atletas) e permite retry por fatia.
const athleteChunkUploads = new Map()

app.post('/api/events/:eventId/athletes/chunks', requireAuth, athletesJsonParser, (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const session = req.session
  if (session.role !== 'ADMIN') {
    if (session.eventId && session.eventId !== 'all' && session.eventId !== safeEventId) {
      return res.status(403).json({
        ok: false,
        message: 'Acesso negado: você não tem permissão para modificar atletas deste evento.',
      })
    }
  }

  const { uploadId, chunkIndex, totalChunks, athletesChunk, schema, kits, originalSheet, undoAthleteId, healthFields, importMode, listRevision } = req.body || {}
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
    upload = { chunks: new Array(total).fill(null), totalChunks: total, schema: [], kits: undefined, originalSheet: undefined, healthFields: undefined, undoAthleteId: '', importMode, listRevision: listRevision ?? 0, received: 0, updatedAt: Date.now() }
    athleteChunkUploads.set(`${safeEventId}:${safeUploadId}`, upload)
  }
  if ((importMode !== undefined && importMode !== upload.importMode) ||
      (listRevision !== undefined && listRevision !== upload.listRevision)) {
    return res.status(400).json({ ok: false, message: 'Intenção divergente no mesmo uploadId.' })
  }
  const intentError = validateAthleteWrite(loadAthletesForEvent(safeEventId), upload.importMode, upload.listRevision)
  if (intentError) {
    athleteChunkUploads.delete(`${safeEventId}:${safeUploadId}`)
    return res.status(intentError.status).json({ ok: false, message: intentError.message })
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
    if (error && upload.importMode === 'replace') {
      athleteChunkUploads.delete(`${safeEventId}:${safeUploadId}`)
      return res.status(400).json({ ok: false, message: error })
    }
    if (!error) upload.kits = kits
  }
  if (originalSheet !== undefined) {
    upload.originalSheet = originalSheet
  }
  if (healthFields !== undefined) upload.healthFields = healthFields
  if (undoAthleteId !== undefined) upload.undoAthleteId = String(undoAthleteId || '').slice(0, 64)

  if (upload.received < upload.totalChunks) {
    return res.json({ ok: true, received: upload.received, totalChunks: upload.totalChunks, done: false })
  }

  const merged = upload.chunks.flat()
  const curEvChunk = inMemoryEvents.find((e) => e.id === safeEventId)
  const existingChunk = loadAthletesForEvent(safeEventId)
  const protectExistingChunk = curEvChunk?.status === 'EM OPERAÇÃO' ||
    existingChunk?.athletes?.some((athlete) => String(athlete.status || '').toUpperCase() === 'ENTREGUE')
  const undoTargetChunk = existingChunk?.athletes?.find((athlete) => String(athlete.id) === upload.undoAthleteId)
  const canUndoDelivery = ['ADMIN', 'TEAM_ADMIN', 'SUPERVISOR'].includes(session.role)
  if (undoTargetChunk?.status === 'ENTREGUE' && !canUndoDelivery) {
    athleteChunkUploads.delete(`${safeEventId}:${safeUploadId}`)
    return res.status(403).json({ ok: false, message: 'Somente supervisores podem desfazer uma entrega.' })
  }
  const safeMerged = upload.importMode !== 'replace' && (protectExistingChunk || upload.importMode === 'add')
    ? mergeActiveAthletes(existingChunk?.athletes, merged, { undoAthleteId: upload.undoAthleteId, canUndoDelivery })
    : merged
  const safeSchema = upload.importMode === 'add' ? mergeImportMetadata(existingChunk?.schema, upload.schema, 'key')
    : upload.importMode !== 'replace' && protectExistingChunk && existingChunk?.schema?.length ? existingChunk.schema : upload.schema
  const safeKits = upload.importMode === 'replace' ? (upload.kits || [])
    : upload.importMode === 'add' ? mergeImportMetadata(existingChunk?.kits, upload.kits, 'numero') : upload.kits
  const safeHealthFields = upload.importMode === 'add' ? mergeImportMetadata(existingChunk?.healthFields, upload.healthFields, 'key') : upload.healthFields
  const nextRevision = (existingChunk?.listRevision || 0) + (upload.importMode === 'replace' ? 1 : 0)
  const success = saveAthletesForEvent(safeEventId, safeMerged, safeSchema, safeKits, upload.originalSheet, safeHealthFields, nextRevision)
  athleteChunkUploads.delete(`${safeEventId}:${safeUploadId}`)
  if (!success) {
    return res.status(500).json({ ok: false, message: 'Erro ao persistir atletas fatiados.' })
  }
  mirrorAthletesToAppwrite(safeEventId, safeMerged)
  if (curEvChunk) {
    Object.assign(curEvChunk, eventMetrics(safeMerged))
    writeEventsToDisk(inMemoryEvents)
    mirrorEventToAppwrite(curEvChunk)
  }
  res.json({ ok: true, listRevision: nextRevision, count: safeMerged.length, done: true })
})

setInterval(() => {
  const now = Date.now()
  for (const [key, upload] of athleteChunkUploads) {
    if (now - upload.updatedAt > 15 * 60 * 1000) athleteChunkUploads.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

// ============================================================
// FOTO DE RETIRADA (Crowley + Vitor): prova da retirada do kit. Só com login e
// no escopo do evento; nunca pública nem cacheada; apagada 7 dias após a corrida.
// ============================================================
const PHOTO_ROOT = photoRoot(DATA_DIR)
const photoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Muitas requisições de foto. Aguarde um instante.' },
})

function resolvePhotoTarget(req, res) {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const athleteId = String(req.params.athleteId || '').trim().slice(0, 120)
  const session = req.session
  if (session.role !== 'ADMIN' && session.eventId && session.eventId !== 'all' && session.eventId !== safeEventId) {
    res.status(403).json({ ok: false, message: 'Sem permissão para este evento.' })
    return null
  }
  const event = inMemoryEvents.find((e) => e.id === safeEventId)
  if (!event || !athleteId) {
    res.status(404).json({ ok: false, message: 'Evento ou atleta não encontrado.' })
    return null
  }
  return { event, eventId: safeEventId, athleteId }
}

app.put('/api/events/:eventId/athletes/:athleteId/photo', photoLimiter, requireAuth, (req, res) => {
  const target = resolvePhotoTarget(req, res)
  if (!target) return
  const athletes = loadAthletesForEvent(target.eventId)?.athletes || []
  if (!athletes.some((a) => String(a.id) === target.athleteId)) {
    return res.status(404).json({ ok: false, message: 'Atleta não encontrado neste evento.' })
  }
  let buffer
  try {
    buffer = decodeJpegDataUrl(req.body?.image)
  } catch (err) {
    return res.status(400).json({ ok: false, message: err.message })
  }
  try {
    const meta = savePhoto(PHOTO_ROOT, {
      event: target.event,
      athleteId: target.athleteId,
      buffer,
      takenBy: req.session.name || req.session.email,
    })
    res.json({ ok: true, takenAt: meta.takenAt, takenBy: meta.takenBy, expiresAt: meta.expiresAt })
  } catch (err) {
    console.error('[fotos] Falha ao salvar foto de retirada:', err?.message)
    res.status(500).json({ ok: false, message: 'Não foi possível salvar a foto.' })
  }
})

app.get('/api/events/:eventId/athletes/:athleteId/photo', photoLimiter, requireAuth, (req, res) => {
  const target = resolvePhotoTarget(req, res)
  if (!target) return
  const photo = readPhoto(PHOTO_ROOT, target.eventId, target.athleteId)
  if (!photo || (photo.meta.expiresAt && Date.now() >= photo.meta.expiresAt)) {
    return res.status(404).json({ ok: false, message: 'Sem foto de retirada.' })
  }
  res.set({
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Foto-Tirada-Em': String(photo.meta.takenAt || ''),
    'X-Foto-Expira-Em': String(photo.meta.expiresAt || ''),
    'X-Foto-Por': encodeURIComponent(photo.meta.takenBy || ''),
  })
  res.send(photo.buffer)
})

app.delete('/api/events/:eventId/athletes/:athleteId/photo', photoLimiter, requireAuth, (req, res) => {
  const target = resolvePhotoTarget(req, res)
  if (!target) return
  res.json({ ok: true, removed: deletePhoto(PHOTO_ROOT, target.eventId, target.athleteId) })
})

let photoSweepRunning = false
function runPhotoSweep() {
  if (photoSweepRunning) return
  photoSweepRunning = true
  try {
    const removed = sweepExpiredPhotos(PHOTO_ROOT, inMemoryEvents)
    if (removed > 0) console.log(`[fotos] ${removed} foto(s) de retirada vencida(s) apagada(s).`)
  } catch (err) {
    console.error('[fotos] Falha na limpeza de fotos vencidas:', err?.message)
  } finally {
    photoSweepRunning = false
  }
}
setTimeout(runPhotoSweep, 30 * 1000).unref?.()
setInterval(runPhotoSweep, 60 * 60 * 1000).unref?.()

// PUT /api/events/:eventId/athletes/:numero/status — Atualiza status da entrega
app.put('/api/events/:eventId/athletes/:numero/status', requireAuth, express.json(), (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const safeNumero = String(req.params.numero || '').trim().slice(0, 50)
  const session = req.session
  if (session.role !== 'ADMIN') {
    if (session.eventId && session.eventId !== 'all' && session.eventId !== safeEventId) {
      return res.status(403).json({
        ok: false,
        message: 'Acesso negado: operador não autorizado a entregar kits neste evento.',
      })
    }
  }

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

  saveAthletesForEvent(safeEventId, data.athletes, data.schema, undefined, data.originalSheet)
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
    mirrorEventToAppwrite(evStatus)
  }
  res.json({ ok: true, athlete: data.athletes[idx] })
})

// ============================================================
// CONTAGEM EM TEMPO REAL DE ENTREGAS POR OPERADOR / USUÁRIO
// Permite que o Super Admin acompanhe a produtividade de cada operador
// ao vivo nas telas de Usuários e Dashboards.
// ============================================================
function getUserDeliveryCounts(restrictedEventId = null, actor = null) {
  const countsByNormalizedName = new Map()
  const eventsToScan = restrictedEventId && restrictedEventId !== 'all'
    ? inMemoryEvents.filter((e) => e.id === restrictedEventId)
    : inMemoryEvents

  for (const event of eventsToScan.filter((event) => !actor || canAccessEvent(actor, event))) {
    const data = loadAthletesForEvent(event.id)
    if (data && Array.isArray(data.athletes)) {
      for (const athlete of data.athletes) {
        if (athlete && String(athlete.status || '').toUpperCase() === 'ENTREGUE') {
          const raw = String(athlete.entreguePor || '').trim().toLowerCase()
          if (raw) {
            countsByNormalizedName.set(raw, (countsByNormalizedName.get(raw) || 0) + 1)
          }
        }
      }
    }
  }
  return countsByNormalizedName
}

function resolveUserDeliveries(user, countsMap) {
  if (!user || !countsMap) return 0
  const normName = String(user.name || '').trim().toLowerCase()
  const normEmail = String(user.email || '').trim().toLowerCase()
  const normId = String(user.id || '').trim().toLowerCase()

  let count = 0
  if (normName && countsMap.has(normName)) {
    count += countsMap.get(normName)
  }
  if (normEmail && normEmail !== normName && countsMap.has(normEmail)) {
    count += countsMap.get(normEmail)
  }
  if (normId && normId !== normName && normId !== normEmail && countsMap.has(normId)) {
    count += countsMap.get(normId)
  }

  if (count === 0 && normName) {
    for (const [key, val] of countsMap.entries()) {
      if (key && (key === normName || key.startsWith(normName) || normName.startsWith(key))) {
        count += val
      }
    }
  }
  return count
}

// GET /api/events/:eventId/operators — Lista operadores vinculados ao evento com entregas reais
app.get('/api/events/:eventId/operators', requireAuth, (req, res) => {
  const safeEventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const event = inMemoryEvents.find((item) => item.id === safeEventId)
  const visibleUsers = inMemoryUsers.filter((user) => teamOf(user) === teamOf(event) && (
    user.eventId === 'all' ||
    user.eventId === safeEventId ||
    user.role === 'ADMIN' ||
    (user.role === 'SUB_ADMIN' && (user.eventId === 'all' || user.eventId === safeEventId))
  ))
  const countsMap = getUserDeliveryCounts(safeEventId)
  res.json({
    ok: true,
    operators: visibleUsers.map((u) => ({
      ...sanitizeUser(u),
      deliveries: resolveUserDeliveries(u, countsMap),
    })),
  })
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
      // Coluna de saúde só aparece na página de emergência, nunca na validação do kit.
      customFields: withoutHealthFields(athlete.customFields, data.healthFields),
    },
  })
})

// ============================================================
// EMERGÊNCIA MÉDICA (Crowley + Teclide)
// Página pública aberta pelo QR Code do número de peito: mostra só o que o
// socorro precisa (nome, peito, modalidade e as colunas de saúde que o
// organizador marcou como públicas), nunca CPF, telefone ou endereço. Todas as
// colunas de saúde e o cadastro ficam no painel do perfil MEDICO.
// ============================================================
const medicoStore = createMedicoStore(DATA_DIR)

const emergenciaReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Muitas consultas. Aguarde um instante.' },
})
const emergenciaWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Muitas ocorrências enviadas deste aparelho. Ligue para o socorro do evento.' },
})
const medicoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Muitas requisições. Aguarde um instante.' },
})

// Índice ref/chave -> atleta, refeito só quando a lista de atletas muda.
const emergencyIndexes = new WeakMap()
function emergencyContext(rawEventId) {
  const eventId = String(rawEventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const event = inMemoryEvents.find((e) => e.id === eventId)
  if (!event) return null
  const data = loadAthletesForEvent(eventId)
  const athletes = Array.isArray(data?.athletes) ? data.athletes : []
  let index = data ? emergencyIndexes.get(data) : null
  if (!index) {
    index = { byRef: new Map(), byKey: new Map() }
    for (const athlete of athletes) {
      index.byRef.set(athleteRef(eventId, athlete), athlete)
      index.byKey.set(athleteKey(eventId, athlete), athlete)
    }
    if (data) emergencyIndexes.set(data, index)
  }
  return { eventId, event, athletes, index, healthFields: data?.healthFields || [] }
}

function publicAthleteSummary(ctx, athlete) {
  const age = calculateAge(athlete)
  return {
    ref: athleteRef(ctx.eventId, athlete),
    nome: athlete.nome || athlete.nome_peito || 'ATLETA',
    numero: String(athlete.numero ?? ''),
    modalidade: athlete.modalidade || '',
    idade: age,
    idadeTexto: formatAge(age),
  }
}

function publicEmergencyContext(req, res) {
  res.set('Cache-Control', 'no-store')
  const code = String(req.params.eventId || '')
  const ctx = EMERGENCY_CODE.test(code) ? emergencyContext(emergencyLinks.resolve(code)) : null
  if (!ctx || ctx.event.status === 'ARQUIVADO') {
    res.status(404).json({ ok: false, message: 'Página indisponível. O evento pode ter sido arquivado ou excluído. Procure a organização.' })
    return null
  }
  const expected = req.query.event || req.body?.expectedEventId
  if (expected && expected !== ctx.eventId) {
    res.status(409).json({ ok: false, message: 'O destino deste QR foi atualizado. Recarregue a página e confira o evento antes de continuar.' })
    return null
  }
  return ctx
}

app.get('/api/public/emergencia/:eventId', emergenciaReadLimiter, (req, res) => {
  const ctx = publicEmergencyContext(req, res)
  if (!ctx) return
  res.json({
    ok: true,
    event: {
      id: ctx.eventId,
      name: ctx.event.name,
      date: ctx.event.date || '',
      location: ctx.event.location || '',
      atletas: ctx.athletes.length,
    },
  })
})

app.get('/api/public/emergencia/:eventId/busca', emergenciaReadLimiter, (req, res) => {
  const ctx = publicEmergencyContext(req, res)
  if (!ctx) return
  const result = searchAthletes(ctx.athletes, req.query.q)
  res.json({
    ok: true,
    kind: result.kind,
    truncated: Boolean(result.truncated),
    results: result.matches.map((athlete) => publicAthleteSummary(ctx, athlete)),
  })
})

app.get('/api/public/emergencia/:eventId/atleta/:ref', emergenciaReadLimiter, (req, res) => {
  const ctx = publicEmergencyContext(req, res)
  if (!ctx) return
  const athlete = ctx?.index.byRef.get(String(req.params.ref || ''))
  if (!athlete) return res.status(404).json({ ok: false, message: 'Atleta não encontrado neste evento.' })
  res.json({
    ok: true,
    athlete: {
      ...publicAthleteSummary(ctx, athlete),
      saude: healthView(athlete, ctx.healthFields, { publicOnly: true }),
      saudeConfigurada: ctx.healthFields.some((field) => field.publico),
    },
  })
})

app.post('/api/public/emergencia/:eventId/ocorrencias', emergenciaWriteLimiter, (req, res) => {
  const ctx = publicEmergencyContext(req, res)
  if (!ctx) return
  const { value, error } = validateOcorrencia(req.body)
  if (error) return res.status(400).json({ ok: false, message: error })

  const athlete = value.athleteRef ? ctx.index.byRef.get(value.athleteRef) : null
  if (value.athleteRef && !athlete) {
    return res.status(400).json({ ok: false, message: 'Atleta não encontrado. Busque de novo ou use "Pessoa não identificada".' })
  }
  const { athleteRef: _ref, ...fields } = value
  try {
    const age = athlete ? calculateAge(athlete) : null
    const ocorrencia = medicoStore.addOcorrencia(ctx.eventId, {
      ...fields,
      athleteKey: athlete ? athleteKey(ctx.eventId, athlete) : null,
      atleta: athlete
        ? {
            nome: athlete.nome || '',
            numero: String(athlete.numero ?? ''),
            modalidade: athlete.modalidade || '',
            idade: age,
            idadeTexto: formatAge(age),
          }
        : null,
    })
    if (!ocorrencia) {
      return res.status(429).json({ ok: false, message: 'Limite de ocorrências do evento atingido. Ligue para o socorro do evento.' })
    }
    res.status(201).json({ ok: true, protocolo: ocorrencia.protocolo })
  } catch (err) {
    console.error('[medico] Falha ao gravar ocorrência:', err?.code || err?.name)
    res.status(500).json({ ok: false, message: 'Não foi possível registrar. Ligue para o socorro do evento.' })
  }
})

// Painel do médico: MEDICO preso ao evento; ADMIN e SUB_ADMIN no seu escopo.
function requireMedicoAccess(req, res, next) {
  const session = getSessionFromReq(req)
  if (!session) return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Entre novamente.' })
  const eventId = String(req.params.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  const allowedRole = ['MEDICO', 'ADMIN', 'TEAM_ADMIN', 'SUB_ADMIN'].includes(session.role)
  const inScope = session.role === 'ADMIN' || (session.eventId && session.eventId !== 'all'
    ? session.eventId === eventId
    : session.role === 'SUB_ADMIN')
  if (!allowedRole || !(session.role === 'TEAM_ADMIN' || inScope) || !requireEventScope(req, res, session)) {
    if (res.headersSent) return
    return res.status(403).json({ ok: false, message: 'Sem acesso às ocorrências deste evento.' })
  }
  req.session = session
  next()
}

function medicoAthleteView(ctx, ocorrencia) {
  const athlete = ocorrencia.athleteKey ? ctx.index.byKey.get(ocorrencia.athleteKey) : null
  if (!athlete) {
    if (!ocorrencia.atleta) return null
    const age = ocorrencia.atleta.idade ?? calculateAge(ocorrencia.atleta)
    return {
      ...ocorrencia.atleta,
      idade: age,
      idadeTexto: formatAge(age),
      saude: [],
    }
  }
  const age = calculateAge(athlete)
  return {
    nome: athlete.nome || '',
    nome_peito: athlete.nome_peito || '',
    numero: String(athlete.numero ?? ''),
    doc: athlete.doc || '',
    nascimento: athlete.nascimento || '',
    idade: age,
    idadeTexto: formatAge(age),
    sexo: athlete.sexo || '',
    contato: athlete.contato || '',
    cidade: athlete.cidade || '',
    equipe: athlete.equipe || '',
    modalidade: athlete.modalidade || '',
    categoria: athlete.categoria || '',
    nacionalidade: athlete.nacionalidade || '',
    saude: healthView(athlete, ctx.healthFields),
  }
}

app.get('/api/medico/:eventId/ocorrencias', medicoLimiter, requireMedicoAccess, (req, res) => {
  const ctx = emergencyContext(req.params.eventId)
  if (!ctx) return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  const version = medicoStore.version(ctx.eventId)
  if (req.query.v !== undefined && Number(req.query.v) === version) {
    return res.json({ ok: true, unchanged: true, version })
  }
  res.json({
    ok: true,
    version,
    event: { id: ctx.eventId, name: ctx.event.name, date: ctx.event.date || '', location: ctx.event.location || '' },
    ocorrencias: medicoStore.listOcorrencias(ctx.eventId).map((item) => {
      const { athleteKey: _key, alertaReconhecidoPor: _ackUser, ...rest } = item
      return { ...rest, atleta: medicoAthleteView(ctx, item) }
    }),
  })
})

app.post('/api/medico/:eventId/ocorrencias/:ocorrenciaId/silenciar', medicoLimiter, requireMedicoAccess, (req, res) => {
  const ctx = emergencyContext(req.params.eventId)
  if (!ctx) return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  try {
    const updated = medicoStore.recognizeAlert(ctx.eventId, String(req.params.ocorrenciaId || '').slice(0, 64), req.session.userId)
    if (!updated) return res.status(404).json({ ok: false, message: 'Ocorrência não encontrada.' })
    res.json({ ok: true, id: updated.id, alertaReconhecidoEm: updated.alertaReconhecidoEm, version: medicoStore.version(ctx.eventId) })
  } catch (err) {
    console.error('[medico] Falha ao silenciar alerta:', err?.code || err?.name)
    res.status(500).json({ ok: false, message: 'Não foi possível silenciar o alerta. Tente novamente.' })
  }
})

// Registro de atendimento (avaliação, condutas, prescrições/administrações): só
// acrescenta; hora e autor vêm da sessão no servidor. Nunca sai em rota pública.
app.post('/api/medico/:eventId/ocorrencias/:ocorrenciaId/registros', medicoLimiter, requireMedicoAccess, (req, res) => {
  const ctx = emergencyContext(req.params.eventId)
  if (!ctx) return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  const { value, error } = validateRegistro(req.body)
  if (error) return res.status(400).json({ ok: false, message: error })
  try {
    const updated = medicoStore.addRegistro(
      ctx.eventId,
      String(req.params.ocorrenciaId || '').slice(0, 64),
      value,
      req.session.name || req.session.email,
    )
    if (!updated) return res.status(404).json({ ok: false, message: 'Ocorrência não encontrada.' })
    if (updated.limite) return res.status(409).json({ ok: false, message: 'Limite de registros desta ocorrência atingido.' })
    res.status(201).json({ ok: true, registro: updated.registros.at(-1), version: medicoStore.version(ctx.eventId) })
  } catch (err) {
    console.error('[medico] Falha ao gravar registro de atendimento:', err?.code || err?.name)
    res.status(500).json({ ok: false, message: 'Não foi possível salvar o registro. O texto continua na tela.' })
  }
})

app.patch('/api/medico/:eventId/ocorrencias/:ocorrenciaId', medicoLimiter, requireMedicoAccess, (req, res) => {
  const ctx = emergencyContext(req.params.eventId)
  if (!ctx) return res.status(404).json({ ok: false, message: 'Evento não encontrado.' })
  const status = req.body?.status
  if (!OCORRENCIA_STATUS.includes(status) || (req.body?.reconhecerAlerta === true && status !== 'EM_ATENDIMENTO')) {
    return res.status(400).json({ ok: false, message: 'Status inválido.' })
  }
  const ocorrenciaId = String(req.params.ocorrenciaId || '').slice(0, 64)
  const atual = medicoStore.listOcorrencias(ctx.eventId).find((item) => item.id === ocorrenciaId)
  if (!atual) return res.status(404).json({ ok: false, message: 'Ocorrência não encontrada.' })
  // Encerrar exige desfecho/destino; a anotação final (opcional) vai na mesma gravação.
  let desfecho = null
  let registro = null
  if (status === 'ENCERRADA' && atual.status !== 'ENCERRADA') {
    const checked = validateDesfecho(req.body?.desfecho)
    if (checked.error) return res.status(400).json({ ok: false, message: checked.error })
    desfecho = checked.value
  }
  if (req.body?.registro !== undefined) {
    const checked = validateRegistro(req.body.registro)
    if (!checked.error) registro = checked.value
  }
  try {
    const updated = medicoStore.updateStatus(
      ctx.eventId,
      ocorrenciaId,
      status,
      req.session.name || req.session.email,
      req.body?.reconhecerAlerta === true ? req.session.userId : null,
      { desfecho, registro },
    )
    if (!updated) return res.status(404).json({ ok: false, message: 'Ocorrência não encontrada.' })
    res.json({ ok: true, status: updated.status, alertaReconhecidoEm: updated.alertaReconhecidoEm || null, version: medicoStore.version(ctx.eventId) })
  } catch (err) {
    console.error('[medico] Falha ao atualizar ocorrência:', err?.code || err?.name)
    res.status(500).json({ ok: false, message: 'Não foi possível atualizar o status.' })
  }
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
    passwordHash: hashPassword(ADMIN_PASSWORD),
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

const USER_ROLES = ['TEAM_ADMIN', 'ADMIN', 'SUB_ADMIN', 'SUPERVISOR', 'OPERADOR', 'MEDICO']
const EVENT_BOUND_ROLES = ['OPERADOR', 'SUPERVISOR', 'MEDICO']

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
    return false
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
  return true
}

// GET /api/users — Lista usuários cadastrados com total de entregas em tempo real
app.get('/api/users', requireAdminOrSubAdmin, (req, res) => {
  const isRestrictedSubAdmin = req.session.role === 'SUB_ADMIN' && req.session.eventId !== 'all'
  const visibleUsers = isRestrictedSubAdmin
    ? inMemoryUsers.filter((user) => sameScope(req.session, user) && user.eventId === req.session.eventId)
    : inMemoryUsers.filter((user) => sameScope(req.session, user))
  const countsByTeam = new Map()
  const usersWithDeliveries = visibleUsers.map((u) => ({
    ...publicUser(u),
    deliveries: (() => {
      const team = teamOf(u)
      if (!countsByTeam.has(team)) countsByTeam.set(team, getUserDeliveryCounts(
        isRestrictedSubAdmin ? req.session.eventId : null,
        { role: 'ADMIN', teamId: team },
      ))
      return resolveUserDeliveries(u, countsByTeam.get(team))
    })(),
  }))
  res.json({ ok: true, users: usersWithDeliveries })
})

// POST /api/users — Cria usuário com a senha escolhida pelo administrador.
app.post('/api/users', requireAdminOrSubAdmin, (req, res) => {
  const body = req.body || {}
  const name = String(body.name || '').trim().toUpperCase()
  const email = String(body.email || '').trim().toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const role = USER_ROLES.includes(body.role) ? body.role : 'OPERADOR'
  const eventId = String(body.eventId || 'all').trim()
  const eventName = String(body.eventName || 'TODOS OS PROJETOS').trim()

  if (['ADMIN', 'TEAM_ADMIN'].includes(role) && !req.session.isPrincipal) {
    return res.status(403).json({ ok: false, message: 'Somente o principal pode criar administradores.' })
  }
  const superAdmin = role === 'ADMIN' && body.superAdmin === true
  if (superAdmin && !req.session.isOwner) {
    return res.status(403).json({ ok: false, message: 'Somente o dono do sistema pode criar Super admins.' })
  }
  if (superAdmin && eventId !== 'all') {
    return res.status(400).json({ ok: false, message: 'Super admin tem acesso a todos os projetos.' })
  }
  // O rollback da imagem candidata não pode receber uma equipe que só a versão nova entende.
  if (role === 'TEAM_ADMIN' && fs.existsSync(path.join(DATA_DIR, '.emergency-links-release-pending'))) {
    return res.status(503).json({ ok: false, message: 'Atualização em validação. Aguarde alguns instantes e tente novamente.' })
  }
  if (eventId !== 'all') {
    const event = inMemoryEvents.find((item) => item.id === eventId)
    if (!event || !canAccessEvent(req.session, event) || (!req.session.isPrincipal && teamOf(event) !== teamOf(req.session))) {
      return res.status(403).json({ ok: false, message: 'Projeto fora da sua equipe.' })
    }
  }
  if (role === 'TEAM_ADMIN' && eventId !== 'all') return res.status(400).json({ ok: false, message: 'Administrador de equipe deve começar sem projeto atribuído.' })
  if (req.session?.role === 'SUB_ADMIN' && role === 'ADMIN') {
    return res.status(403).json({ ok: false, message: 'Sub-Admin não tem permissão para criar usuários Super Admin.' })
  }
  if (req.session?.role === 'SUB_ADMIN' && req.session.eventId !== 'all' && eventId !== req.session.eventId) {
    return res.status(403).json({ ok: false, message: 'O usuário deve pertencer ao evento do Sub-Admin.' })
  }

  if (EVENT_BOUND_ROLES.includes(role)) {
    if (!eventId || eventId === 'all') {
      return res.status(400).json({
        ok: false,
        message: 'Operadores, Supervisores e Médicos devem ser vinculados obrigatoriamente a um projeto específico.',
      })
    }
  }

  if (!name || !email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, message: 'Nome e e-mail válido são obrigatórios.' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Senha deve ter pelo menos 6 caracteres.' })
  }

  if (inMemoryUsers.some((u) => u.email && u.email.toLowerCase() === email)) {
    return res.status(409).json({ ok: false, message: 'Já existe um usuário com este e-mail.' })
  }
  const newUser = {
    id: `user-${crypto.randomUUID()}`,
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    eventId,
    eventName,
    status: body.status === 'INATIVO' ? 'INATIVO' : 'ATIVO',
    deliveries: Number(body.deliveries || 0),
    avatar: name.substring(0, 2).toUpperCase(),
    ...(superAdmin ? { superAdmin: true } : {}),
    teamId: superAdmin ? '' : role === 'TEAM_ADMIN' ? `team-${crypto.randomUUID()}`
      : req.session.isPrincipal && eventId !== 'all'
        ? teamOf(inMemoryEvents.find((event) => event.id === eventId)) : teamOf(req.session),
    createdBy: req.session.userId,
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  }
  const nextUsers = [newUser, ...inMemoryUsers]
  if (!writeUsersToDisk(nextUsers)) return res.status(500).json({ ok: false, message: 'Não foi possível salvar o usuário.' })
  inMemoryUsers = nextUsers
  res.status(201).json({ ok: true, user: sanitizeUser(newUser) })
})

// PUT /api/users/:id — Atualiza usuário (dados, função ou redefinição de senha)
app.put('/api/users/:id', requireAdminOrSubAdmin, (req, res) => {
  const userId = String(req.params.id || '').trim()
  const idx = inMemoryUsers.findIndex((u) => u.id === userId)
  if (idx === -1) {
    return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' })
  }

  const body = req.body || {}
  const current = inMemoryUsers[idx]
  if (!canManageUser(req.session, publicUser(current))) return res.status(403).json({ ok: false, message: 'Usuário fora da sua administração.' })
  if (body.teamId !== undefined && body.teamId !== teamOf(current)) return res.status(400).json({ ok: false, message: 'Transferência de equipe não permitida.' })
  if (current.superAdmin === true && body.role && body.role !== 'ADMIN') {
    return res.status(400).json({ ok: false, message: 'Para tirar o acesso de um Super admin, desative ou remova o usuário.' })
  }
  if (body.role && body.role !== current.role && (['ADMIN', 'TEAM_ADMIN'].includes(body.role) || current.role === 'TEAM_ADMIN')) return res.status(400).json({ ok: false, message: 'Crie um administrador de equipe separado; conversão de perfil não permitida.' })
  const targetRole = body.role && USER_ROLES.includes(body.role) ? body.role : current.role
  const targetEventId = body.eventId !== undefined ? String(body.eventId).trim() : current.eventId

  if (targetEventId !== 'all') {
    const event = inMemoryEvents.find((item) => item.id === targetEventId)
    if (!event || teamOf(event) !== teamOf(current) || !canAccessEvent(req.session, event)) return res.status(403).json({ ok: false, message: 'Projeto fora da equipe do usuário.' })
  }
  if (EVENT_BOUND_ROLES.includes(targetRole)) {
    if (!targetEventId || targetEventId === 'all') {
      return res.status(400).json({
        ok: false,
        message: 'Operadores, Supervisores e Médicos devem ser vinculados obrigatoriamente a um projeto específico.',
      })
    }
  }

  if (isOwnerAdmin(current) && ((body.status && body.status !== 'ATIVO') || (body.role && body.role !== 'ADMIN'))) {
    return res.status(400).json({ ok: false, message: 'O dono do sistema não pode ser desativado nem rebaixado.' })
  }

  if (req.session?.role === 'SUB_ADMIN') {
    if (current.role === 'ADMIN' || isPrincipalAdmin(current)) {
      return res.status(403).json({ ok: false, message: 'Sub-Admin não pode alterar o Super Admin.' })
    }
    if (body.role === 'ADMIN') {
      return res.status(403).json({ ok: false, message: 'Sub-Admin não pode promover usuários para Super Admin.' })
    }
    if (req.session.eventId !== 'all' && (current.eventId !== req.session.eventId || (body.eventId !== undefined && String(body.eventId) !== req.session.eventId))) {
      return res.status(403).json({ ok: false, message: 'Usuário fora do evento do Sub-Admin.' })
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'password') && (typeof body.password !== 'string' || body.password.length < 6)) {
    return res.status(400).json({ ok: false, message: 'Senha deve ter pelo menos 6 caracteres.' })
  }

  const updated = {
    ...current,
    name: body.name ? String(body.name).trim().toUpperCase() : current.name,
    role: targetRole,
    eventId: targetEventId,
    eventName: body.eventName !== undefined ? String(body.eventName).trim() : current.eventName,
    status: body.status && ['ATIVO', 'INATIVO'].includes(body.status) ? body.status : current.status,
    deliveries: typeof body.deliveries === 'number' ? body.deliveries : current.deliveries,
    updatedAt: Date.now(),
  }

  if (typeof body.password === 'string') {
    updated.passwordHash = hashPassword(body.password)
    delete updated.password
  }
  const nextUsers = inMemoryUsers.map((item, index) => index === idx ? updated : item)
  if (!writeUsersToDisk(nextUsers)) return res.status(500).json({ ok: false, message: 'Não foi possível salvar o usuário.' })
  inMemoryUsers = nextUsers
  if (body.password !== undefined || body.role !== undefined || body.status !== undefined || body.eventId !== undefined) revokeUserSessions(userId)
  if (current.role === 'TEAM_ADMIN' && body.status !== undefined) {
    for (const member of inMemoryUsers.filter((user) => user.teamId === current.teamId)) revokeUserSessions(member.id)
  }
  res.json({ ok: true, user: publicUser(updated) })
})

// POST /api/users/:id/isolar — o principal transforma um SUB-ADMIN/ADMIN antigo
// (que via todo o acervo principal) em sub-admin isolado (TEAM_ADMIN). Vão junto
// os eventos escolhidos e os usuários ligados a eles ou criados por ele. Eventos
// antigos não registram autor, por isso a escolha é do principal.
app.post('/api/users/:id/isolar', requireAdminOrSubAdmin, (req, res) => {
  if (!req.session.isPrincipal) return res.status(403).json({ ok: false, message: 'Somente o super admin principal pode isolar um sub-admin.' })
  if (fs.existsSync(path.join(DATA_DIR, '.emergency-links-release-pending'))) {
    return res.status(503).json({ ok: false, message: 'Atualização em validação. Aguarde alguns instantes e tente novamente.' })
  }
  const userId = String(req.params.id || '').trim()
  const target = inMemoryUsers.find((u) => u.id === userId)
  if (!target) return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' })
  if (isPrincipalAdmin(target) || teamOf(target) || !['SUB_ADMIN', 'ADMIN'].includes(target.role)) {
    return res.status(400).json({ ok: false, message: 'Só SUB-ADMIN ou ADMIN do acervo principal pode ser isolado.' })
  }
  const requested = Array.isArray(req.body?.eventIds) ? [...new Set(req.body.eventIds.map((id) => String(id)))] : null
  if (!requested) return res.status(400).json({ ok: false, message: 'Informe a lista de eventos (pode ser vazia).' })
  const moving = requested.map((id) => inMemoryEvents.find((event) => event.id === id))
  if (moving.some((event) => !event || teamOf(event))) {
    return res.status(400).json({ ok: false, message: 'Evento inexistente ou já pertencente a outro sub-admin.' })
  }
  const teamId = `team-${crypto.randomUUID()}`
  const movingIds = new Set(requested)
  const movesWithEvent = (user) => user.id !== target.id && !isPrincipalAdmin(user) && !teamOf(user) &&
    !['ADMIN', 'TEAM_ADMIN'].includes(user.role) &&
    (movingIds.has(user.eventId) || (user.createdBy === target.id && user.eventId === 'all'))
  const movedUsers = inMemoryUsers.filter(movesWithEvent)
  const movedUserIds = new Set(movedUsers.map((user) => user.id))
  const now = Date.now()

  const previousEvents = inMemoryEvents
  const nextEvents = inMemoryEvents.map((event) => movingIds.has(event.id) ? { ...event, teamId, updatedAt: now } : event)
  const nextUsers = inMemoryUsers.map((user) => {
    if (user.id === target.id) {
      return { ...user, role: 'TEAM_ADMIN', teamId, eventId: 'all', eventName: 'TODOS OS PROJETOS DA EQUIPE', isolatedAt: new Date(now).toISOString(), updatedAt: now }
    }
    return movedUserIds.has(user.id) ? { ...user, teamId, updatedAt: now } : user
  })
  inMemoryEvents = nextEvents
  if (!writeEventsToDisk(inMemoryEvents)) {
    inMemoryEvents = previousEvents
    writeEventsToDisk(inMemoryEvents)
    return res.status(500).json({ ok: false, message: 'Não foi possível salvar os eventos. Nada foi alterado.' })
  }
  if (!writeUsersToDisk(nextUsers)) {
    inMemoryEvents = previousEvents
    writeEventsToDisk(inMemoryEvents)
    return res.status(500).json({ ok: false, message: 'Não foi possível salvar os usuários. Nada foi alterado.' })
  }
  inMemoryUsers = nextUsers
  // Sessões guardam a equipe: quem mudou de âmbito entra de novo.
  revokeUserSessions(target.id)
  for (const id of movedUserIds) revokeUserSessions(id)
  res.json({
    ok: true,
    user: publicUser(inMemoryUsers.find((u) => u.id === target.id)),
    eventos: requested.length,
    usuarios: movedUserIds.size,
  })
})

// DELETE /api/users/:id — Remove usuário
app.delete('/api/users/:id', requireAdminOrSubAdmin, (req, res) => {
  const userId = String(req.params.id || '').trim()
  const idx = inMemoryUsers.findIndex((u) => u.id === userId)
  if (idx === -1) {
    return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' })
  }
  const target = inMemoryUsers[idx]
  if (!canManageUser(req.session, publicUser(target))) return res.status(403).json({ ok: false, message: 'Usuário fora da sua administração.' })
  if (target.role === 'TEAM_ADMIN') return res.status(409).json({ ok: false, message: 'Desative o administrador para suspender a equipe; exclusão não permitida.' })
  if (isOwnerAdmin(target)) {
    return res.status(400).json({ ok: false, message: 'Não é possível remover o dono do sistema.' })
  }
  if (req.session.role === 'SUB_ADMIN' && (target.role === 'ADMIN' || target.createdBy !== req.session.userId || (req.session.eventId !== 'all' && target.eventId !== req.session.eventId))) {
    return res.status(403).json({ ok: false, message: 'Sub-Admin só pode remover usuários que criou no próprio evento.' })
  }
  const nextUsers = inMemoryUsers.filter((u) => u.id !== userId)
  if (!writeUsersToDisk(nextUsers)) return res.status(500).json({ ok: false, message: 'Não foi possível remover o usuário.' })
  inMemoryUsers = nextUsers
  revokeUserSessions(userId)
  res.json({ ok: true, message: 'Usuário removido com sucesso.' })
})

// POST /api/users/:id/entrar — Super admin entra no ambiente de um Sub-admin e
// age como ele (decisão do Yuri, 2026-10-28: só Sub-admin, sem aviso nem trilha
// de autoria). O cliente guarda o token de origem para voltar.
app.post('/api/users/:id/entrar', requireAuth, (req, res) => {
  if (!req.session.isPrincipal || req.session.impersonatedBy) {
    return res.status(403).json({ ok: false, message: 'Só o Super admin entra no ambiente de um Sub-admin.' })
  }
  const target = inMemoryUsers.find((user) => user.id === req.params.id)
  if (!target || target.role !== 'TEAM_ADMIN' || !teamOf(target)) {
    return res.status(400).json({ ok: false, message: 'Só dá para entrar no ambiente de um Sub-admin.' })
  }
  if (target.status === 'INATIVO') {
    return res.status(409).json({ ok: false, message: 'Sub-admin desativado. Reative para entrar no ambiente dele.' })
  }
  const visitor = inMemoryUsers.find((user) => user.id === req.session.userId)
  const sessionUser = {
    id: target.id,
    name: target.name,
    email: target.email,
    role: target.role,
    teamId: teamOf(target),
    isPrincipal: false,
    isOwner: false,
    eventId: 'all',
    eventName: target.eventName || 'TODOS OS PROJETOS DA EQUIPE',
  }
  const token = createSession(sessionUser, { impersonatedBy: req.session.userId })
  res.json({ ok: true, token, user: { ...sessionUser, impersonatedBy: { id: req.session.userId, name: visitor?.name || '' } } })
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

  // Usuários cadastrados, incluindo o Super Admin. A senha salva prevalece
  // sobre a configuração inicial do ambiente após uma redefinição manual.
  const foundUser = inMemoryUsers.find(
    (u) => u.email && u.email.toLowerCase() === normalizedEmail
  )
  if (foundUser && (verifyPassword(password, foundUser.passwordHash) || (!foundUser.passwordHash && foundUser.password === password))) {
    if (teamOf(foundUser) && !inMemoryUsers.some((user) => user.role === 'TEAM_ADMIN' && user.teamId === foundUser.teamId && user.status !== 'INATIVO')) {
      return res.status(403).json({ ok: false, message: 'Equipe desativada. Fale com o administrador principal.' })
    }
    if (foundUser.status === 'INATIVO') {
      return res.status(403).json({
        ok: false,
        message: 'Usuário desativado. Entre em contato com o administrador.',
      })
    }

    let finalEventId = foundUser.eventId || 'all'
    let finalEventName = foundUser.eventName || 'TODOS OS PROJETOS'

    if (foundUser.role === 'MEDICO' && (!finalEventId || finalEventId === 'all')) {
      return res.status(403).json({ ok: false, message: 'Médico sem evento vinculado. Fale com o administrador.' })
    }

    if ((foundUser.role === 'OPERADOR' || foundUser.role === 'SUPERVISOR') && (!finalEventId || finalEventId === 'all')) {
      const firstEvent = inMemoryEvents.find((event) => teamOf(event) === teamOf(foundUser))
      if (firstEvent) {
        finalEventId = firstEvent.id
        finalEventName = firstEvent.name
      }
    }

    const sessionUser = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role || 'OPERADOR',
      teamId: teamOf(foundUser),
      isPrincipal: isPrincipalAdmin(foundUser),
      isOwner: isOwnerAdmin(foundUser),
      eventId: finalEventId,
      eventName: finalEventName,
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
    const firstEvent = inMemoryEvents.find((event) => !teamOf(event))
    const legacyUser = {
      id: normalizedEmail.split('@')[0],
      legacy: true,
      name: legacyOperators[normalizedEmail],
      email: normalizedEmail,
      role: 'OPERADOR',
      eventId: firstEvent?.id || 'event-default',
      eventName: firstEvent?.name || 'PROJETO ATRIBUÍDO',
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
      teamId: teamOf(session),
      isPrincipal: session.isPrincipal === true,
      isOwner: session.isOwner === true,
      impersonatedBy: session.impersonatedBy
        ? { id: session.impersonatedBy, name: inMemoryUsers.find((user) => user.id === session.impersonatedBy)?.name || '' }
        : null,
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
