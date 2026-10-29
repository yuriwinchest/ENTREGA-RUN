import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const STATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CHANNEL_ID = /^[0-9a-f]{64}$/

export function createEspelhoChannels(dataDir) {
  const file = path.join(dataDir, 'espelho_canais.json')
  let records = []
  if (fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!Array.isArray(saved) || saved.some((record) => !record || !CHANNEL_ID.test(record.canalId) || !STATION_ID.test(record.stationId) || typeof record.eventId !== 'string' || typeof record.ownerUserId !== 'string')) {
      throw new Error('Registro de canais do Espelho inválido')
    }
    records = saved
  }
  // O registro só cresce, então a ordem de criação dá ao guichê um número estável.
  const numbered = (record) => record && { ...record, numero: records.filter((item) => item.eventId === record.eventId).indexOf(record) + 1 }
  return {
    get(eventId, canalId) {
      return typeof canalId === 'string' && CHANNEL_ID.test(canalId)
        ? numbered(records.find((record) => record.eventId === eventId && record.canalId === canalId)) || null
        : null
    },
    open(eventId, ownerUserId, stationId) {
      const existing = records.find((record) => record.eventId === eventId && record.ownerUserId === ownerUserId && record.stationId === stationId)
      if (existing) return numbered(existing)
      const record = { eventId, ownerUserId, stationId, canalId: crypto.randomBytes(32).toString('hex'), createdAt: new Date().toISOString() }
      const next = [...records, record]
      const temp = `${file}.${process.pid}.tmp`
      try {
        fs.mkdirSync(dataDir, { recursive: true })
        fs.writeFileSync(temp, JSON.stringify(next, null, 2), { mode: 0o600 })
        fs.renameSync(temp, file)
      } catch (error) {
        try { fs.unlinkSync(temp) } catch {}
        throw error
      }
      records = next
      return numbered(record)
    },
    forEvent(eventId) { return records.filter((record) => record.eventId === eventId) },
  }
}
