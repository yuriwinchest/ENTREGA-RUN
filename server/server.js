import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3001)

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
                modalidade: String(atleta.modalidade ?? '').slice(0, 60),
                categoria: String(atleta.categoria ?? '').slice(0, 60),
                camiseta: String(atleta.camiseta ?? '').slice(0, 10),
                kit: String(atleta.kit ?? '').slice(0, 80),
                chip: String(atleta.chip ?? '').slice(0, 60),
                sexo: String(atleta.sexo ?? '').slice(0, 20),
                equipe: String(atleta.equipe ?? '').slice(0, 80),
              }
            : null,
    config: sanitizeEspelhoConfig(body.config) ?? previous?.config ?? null,
    updatedAt: Date.now(),
  }
  espelhoStates.set(key, state)
  res.json({ ok: true })
})

app.use(express.json({ limit: '16kb' }))

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
  res.json({ ok: true, service: 'entregas-run-server' })
})

app.get('/api/municipios', (_req, res) => {
  const distFile = path.join(__dirname, '..', 'client', 'dist', 'municipios.json')
  const pubFile = path.join(__dirname, '..', 'client', 'public', 'municipios.json')
  res.sendFile(distFile, (err) => {
    if (err) res.sendFile(pubFile)
  })
})

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'pacetime@entregas.com').toLowerCase().trim()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'WgP2ZhkCXQ!7'

// Autenticação do Administrador Geral e Operadores
app.post('/api/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {}

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ ok: false, message: 'Informe um e-mail válido.' })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Senha deve ter ao menos 6 caracteres.' })
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Administrador Geral
  if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({
      ok: true,
      user: {
        id: 'admin_pacetime',
        name: 'Felipe Admin',
        email: normalizedEmail,
        role: 'ADMIN',
      },
    })
  }

  // Operadores de homologação com a mesma chave ou senha específica
  const operators = {
    'agner.israel@entregas.com': 'Agner Israel',
    'agner.araujo@entregas.com': 'Agner Araujo',
    'entregas1@entregas.com': 'Entregas 01',
    'entregas2@entregas.com': 'Entregas 02',
    'entregas3@entregas.com': 'Entregas 03',
  }

  if (operators[normalizedEmail] && password === ADMIN_PASSWORD) {
    return res.json({
      ok: true,
      user: {
        id: normalizedEmail.split('@')[0],
        name: operators[normalizedEmail],
        email: normalizedEmail,
        role: 'OPERADOR',
      },
    })
  }

  return res.status(401).json({
    ok: false,
    message: 'E-mail ou senha incorretos. Verifique suas credenciais.',
  })
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
