import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// Foto de retirada: prova de que o kit saiu para aquela pessoa. É dado pessoal,
// guardado só até RETENTION_DAYS após a corrida e fora do backup de deploy
// (scripts/deploy-vps.sh exclui esta pasta) para que a exclusão seja real.
export const PHOTO_DIR_NAME = 'fotos-retirada'
export const RETENTION_DAYS = 7
export const MAX_PHOTO_BYTES = 600 * 1024
const BRT_OFFSET_HOURS = 3
const DAY_MS = 24 * 60 * 60 * 1000

export function photoRoot(dataDir) {
  return path.join(dataDir, PHOTO_DIR_NAME)
}

function safeEventId(eventId) {
  const safe = String(eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  if (!safe) throw new Error('Evento inválido.')
  return safe
}

// O id do atleta vira hash: o nome do arquivo não expõe CPF/número e não aceita "../".
function athleteFileKey(athleteId) {
  const raw = String(athleteId || '').trim()
  if (!raw) throw new Error('Atleta inválido.')
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 40)
}

export function photoPaths(root, eventId, athleteId) {
  const dir = path.join(root, safeEventId(eventId))
  const key = athleteFileKey(athleteId)
  return { dir, image: path.join(dir, `${key}.jpg`), meta: path.join(dir, `${key}.json`) }
}

// Aceita só data URL JPEG real (assinatura FF D8 FF) e dentro do limite de tamanho.
export function decodeJpegDataUrl(dataUrl, maxBytes = MAX_PHOTO_BYTES) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
  if (!match) throw new Error('Envie a foto em JPEG.')
  const buffer = Buffer.from(match[1], 'base64')
  if (buffer.length === 0 || buffer.length > maxBytes) throw new Error('Foto vazia ou grande demais.')
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) throw new Error('Arquivo não é um JPEG válido.')
  return buffer
}

// Data da corrida em BRT ("2026-10-04" ou "04/10/2026") → meia-noite de BRT.
export function parseRaceDate(event) {
  const candidates = [event?.dateInput, event?.date].map((v) => String(v || '').trim())
  for (const value of candidates) {
    let y, m, d
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value)
    if (iso) [, y, m, d] = iso
    else if (br) [, d, m, y] = br
    else continue
    const time = Date.UTC(Number(y), Number(m) - 1, Number(d), BRT_OFFSET_HOURS)
    if (Number.isFinite(time)) return time
  }
  return null
}

// Apaga ao fim do 7º dia após a corrida. Sem data de corrida, conta da foto.
export function photoExpiresAt(event, takenAt) {
  const race = parseRaceDate(event)
  if (race != null) return race + (RETENTION_DAYS + 1) * DAY_MS
  return Number(takenAt || Date.now()) + RETENTION_DAYS * DAY_MS
}

function writeAtomic(file, content) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, content)
  fs.renameSync(tmp, file)
}

export function savePhoto(root, { event, athleteId, buffer, takenBy, now = Date.now() }) {
  const paths = photoPaths(root, event?.id, athleteId)
  fs.mkdirSync(paths.dir, { recursive: true })
  const meta = {
    takenAt: now,
    takenBy: String(takenBy || '').slice(0, 120),
    expiresAt: photoExpiresAt(event, now),
  }
  writeAtomic(paths.image, buffer)
  writeAtomic(paths.meta, JSON.stringify(meta))
  return meta
}

export function readPhoto(root, eventId, athleteId) {
  const paths = photoPaths(root, eventId, athleteId)
  if (!fs.existsSync(paths.image)) return null
  let meta = {}
  try {
    meta = JSON.parse(fs.readFileSync(paths.meta, 'utf8'))
  } catch {
    // Foto sem metadado continua servível; a varredura usa a data do arquivo.
  }
  return { buffer: fs.readFileSync(paths.image), meta }
}

export function deletePhoto(root, eventId, athleteId) {
  const paths = photoPaths(root, eventId, athleteId)
  let removed = false
  for (const file of [paths.image, paths.meta]) {
    try {
      fs.unlinkSync(file)
      removed = true
    } catch {
      // Já não existia.
    }
  }
  return removed
}

// Remove fotos vencidas. Evento que já não existe → fotos apagadas.
export function sweepExpiredPhotos(root, events, now = Date.now()) {
  if (!fs.existsSync(root)) return 0
  const byId = new Map((events || []).map((event) => [String(event?.id || ''), event]))
  let removed = 0
  for (const eventDir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!eventDir.isDirectory()) continue
    const dir = path.join(root, eventDir.name)
    const event = byId.get(eventDir.name)
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.jpg')) continue
      const image = path.join(dir, file)
      const metaFile = image.replace(/\.jpg$/, '.json')
      let takenAt
      try {
        takenAt = JSON.parse(fs.readFileSync(metaFile, 'utf8')).takenAt
      } catch {
        takenAt = fs.statSync(image).mtimeMs
      }
      const expired = !event || now >= photoExpiresAt(event, takenAt)
      if (!expired) continue
      for (const target of [image, metaFile]) {
        try { fs.unlinkSync(target) } catch { /* já removido */ }
      }
      removed += 1
    }
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir)
  }
  return removed
}
