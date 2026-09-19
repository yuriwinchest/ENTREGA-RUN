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
  res.sendFile(path.join(__dirname, '..', 'client', 'public', 'municipios.json'))
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
