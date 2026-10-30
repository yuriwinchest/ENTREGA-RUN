import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { readDeployCheckToken } from './deployCheck.js'

const safeFile = /^athletes_[\w-]+\.json$/
const delivered = (athlete) => String(athlete?.status || '').toUpperCase() === 'ENTREGUE'

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function athleteIdentity(athlete) {
  const id = String(athlete.id || '').trim()
  const doc = String(athlete.doc || athlete.documento || '').replace(/\D/g, '')
  const number = String(athlete.numero || '').trim()
  const key = id ? `id:${id}` : doc ? `doc:${doc}` : number ? `numero:${number}` : ''
  if (!key) throw new Error('Atleta entregue sem identificação estável.')
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function deliveredContentHash(athlete) {
  const fields = ['numero', 'chip', 'entregueEm', 'entreguePor', 'entreguePara']
  const content = fields.map((field) => String(athlete[field] ?? ''))
  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex')
}

// Cópia exata de uma entrega (mesma identidade e mesma prova) não é ambígua: conta
// uma vez, e o servidor a descarta no próximo salvamento. Prova divergente barra.
function deliveredProofs(athletes) {
  const confirmed = athletes.filter(delivered)
  const content = {}
  let duplicateCopies = 0
  for (const athlete of confirmed) {
    const id = athleteIdentity(athlete)
    const proof = deliveredContentHash(athlete)
    if (content[id]) {
      if (content[id] !== proof) throw new Error('Identidade duplicada entre atletas entregues.')
      duplicateCopies += 1
      continue
    }
    content[id] = proof
  }
  return {
    duplicateCopies,
    deliveredCount: confirmed.length - duplicateCopies,
    deliveredIds: Object.keys(content).sort(),
    deliveredContent: content,
  }
}

export function captureSnapshot(dataDir) {
  const events = readJson(path.join(dataDir, 'events.json'))
  if (!Array.isArray(events)) throw new Error('events.json inválido.')
  const files = fs.readdirSync(dataDir).filter((file) => safeFile.test(file)).sort()
  const requiredEventId = String(process.env.REQUIRED_EVENT_ID || '').trim()
  if (requiredEventId && !events.some((event) => String(event.id) === requiredEventId)) {
    throw new Error(`Evento obrigatório ausente: ${requiredEventId}`)
  }
  const active = events.filter((event) => event?.status === 'EM OPERAÇÃO' && Number(event.total) > 0)
  for (const event of [...active, ...events.filter((item) => String(item.id) === requiredEventId)]) {
    const file = `athletes_${String(event.id || '').replace(/[^\w-]/g, '').slice(0, 64)}.json`
    if (!files.includes(file)) throw new Error(`Planilha de evento ativo ausente: ${file}`)
  }
  const athletesByFile = {}
  for (const file of files) {
    const data = readJson(path.join(dataDir, file))
    if (!Array.isArray(data?.athletes)) throw new Error(`Lista de atletas inválida: ${file}`)
    const { duplicateCopies, ...proofs } = deliveredProofs(data.athletes)
    athletesByFile[file] = {
      total: data.athletes.length - duplicateCopies,
      ...proofs,
    }
  }
  const linksFile = path.join(dataDir, 'emergency_links.json')
  const emergencyLinks = fs.existsSync(linksFile) ? readJson(linksFile).links : {}
  if (!emergencyLinks || typeof emergencyLinks !== 'object') throw new Error('Registro de QR inválido.')
  return { version: 1, eventIds: events.map((event) => String(event.id)).sort(), athletesByFile, emergencyLinks }
}

export function verifySnapshot(before, dataDir) {
  if (before?.version !== 1 || !before.athletesByFile || !Array.isArray(before.eventIds)) {
    throw new Error('Manifesto de integridade inválido.')
  }
  const after = captureSnapshot(dataDir)
  for (const [code, previous] of Object.entries(before.emergencyLinks || {})) {
    const current = after.emergencyLinks[code]
    if (!current || current.revision < previous.revision || (current.revision === previous.revision && current.eventId !== previous.eventId)) {
      throw new Error(`Vínculo de QR perdido ou alterado sem revisão: ${code}`)
    }
  }
  const eventIds = new Set(after.eventIds)
  for (const id of before.eventIds) {
    if (!eventIds.has(id)) throw new Error(`Evento desapareceu após o deploy: ${id}`)
  }
  for (const [file, previous] of Object.entries(before.athletesByFile)) {
    if (!safeFile.test(file)) throw new Error('Nome de planilha inválido no manifesto.')
    const current = after.athletesByFile[file]
    if (!current || current.total < previous.total || current.deliveredCount < previous.deliveredCount) {
      throw new Error(`Quantidade de atletas ou entregas diminuiu: ${file}`)
    }
    const currentIds = new Set(current.deliveredIds)
    if (!previous.deliveredIds.every((id) => currentIds.has(id))) {
      throw new Error(`Entrega confirmada deixou de constar: ${file}`)
    }
    if (!previous.deliveredContent || previous.deliveredIds.some((id) =>
      previous.deliveredContent[id] !== current.deliveredContent[id])) {
      throw new Error(`Dados de entrega confirmada mudaram: ${file}`)
    }
  }
  return after
}

export async function verifyApiSnapshot(before, baseUrl = 'http://127.0.0.1:3001', checkToken = '') {
  const headers = checkToken ? { 'x-deploy-check': checkToken } : {}
  const eventResponse = await fetch(`${baseUrl}/api/events`, { headers })
  if (!eventResponse.ok) throw new Error('API de eventos indisponível após o deploy.')
  const eventBody = await eventResponse.json()
  const eventIds = new Set((eventBody.events || []).map((event) => String(event.id)))
  for (const id of before.eventIds) {
    if (!eventIds.has(id)) throw new Error(`Evento ausente na API após o deploy: ${id}`)
  }
  for (const [file, previous] of Object.entries(before.athletesByFile)) {
    if (!safeFile.test(file)) throw new Error('Nome de planilha inválido no manifesto.')
    const eventId = file.slice('athletes_'.length, -'.json'.length)
    const response = await fetch(`${baseUrl}/api/events/${encodeURIComponent(eventId)}/athletes`, { headers })
    if (!response.ok) throw new Error(`API de atletas indisponível: ${eventId}`)
    const body = await response.json()
    if (!Array.isArray(body.athletes)) throw new Error(`Resposta de atletas inválida: ${eventId}`)
    const proofs = deliveredProofs(body.athletes)
    const deliveredIds = new Set(proofs.deliveredIds)
    if (body.athletes.length - proofs.duplicateCopies < previous.total || proofs.deliveredCount < previous.deliveredCount ||
      !previous.deliveredIds.every((id) => deliveredIds.has(id))) {
      throw new Error(`API perdeu atletas ou entregas confirmadas: ${eventId}`)
    }
    if (!previous.deliveredContent || previous.deliveredIds.some((id) =>
      previous.deliveredContent[id] !== proofs.deliveredContent[id])) {
      throw new Error(`API alterou dados de entrega confirmada: ${eventId}`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dataDir = process.env.DATA_DIR || '/app/data'
  try {
    if (process.argv[2] === 'capture') {
      process.stdout.write(JSON.stringify(captureSnapshot(dataDir)))
    } else if (process.argv[2] === 'verify' && process.argv[3]) {
      const before = readJson(process.argv[3])
      const after = verifySnapshot(before, dataDir)
      const total = Object.values(after.athletesByFile).reduce((sum, item) => sum + item.total, 0)
      const deliveredCount = Object.values(after.athletesByFile).reduce((sum, item) => sum + item.deliveredCount, 0)
      process.stdout.write(`Integridade preservada: ${after.eventIds.length} eventos, ${total} atletas, ${deliveredCount} entregas.\n`)
    } else if (process.argv[2] === 'verify-api' && process.argv[3]) {
      const before = readJson(process.argv[3])
      const port = Number(process.env.PORT || 3001)
      await verifyApiSnapshot(before, `http://127.0.0.1:${port}`, readDeployCheckToken(port))
      process.stdout.write('API manteve todos os eventos, atletas e entregas anteriores.\n')
    } else {
      throw new Error('Uso: capture | verify <manifesto>')
    }
  } catch (error) {
    console.error(`[snapshot] ${error.message}`)
    process.exitCode = 1
  }
}
