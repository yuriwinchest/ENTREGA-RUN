import fs from 'node:fs'
import path from 'node:path'
import { withoutHealthFields } from './medico.js'

// Base de clientes (decisão do PO, 2026-10-31): excluir evento nunca perde o
// cadastro do atleta nem o contato. Saúde e planilha bruta (que pode trazer as
// colunas de saúde) não entram: a exclusão continua apagando dado de saúde.
export const CLIENT_DIR_NAME = 'clientes'

export function clientBaseDir(dataDir) {
  return path.join(dataDir, CLIENT_DIR_NAME)
}

// Fora da raiz de DATA_DIR de propósito: o gate de deploy e a carga do servidor
// só leem athletes_*.json da raiz, então o evento excluído não volta a existir.
export function preserveDeletedEventAthletes(dataDir, event, data, now = Date.now()) {
  if (!Array.isArray(data?.athletes) || data.athletes.length === 0) return null
  const safeId = String(event?.id || data.eventId || '').replace(/[^\w-]/g, '').slice(0, 64)
  if (!safeId) throw new Error('Evento sem id para guardar na base de clientes.')
  const record = {
    eventId: safeId,
    eventName: String(event?.name || ''),
    eventDate: String(event?.date || ''),
    deletedAt: now,
    schema: Array.isArray(data.schema) ? data.schema : [],
    athletes: data.athletes.map((athlete) => ({
      ...athlete,
      customFields: withoutHealthFields(athlete.customFields, data.healthFields),
    })),
  }
  const dir = clientBaseDir(dataDir)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `evento-excluido_${safeId}_${now}.json`)
  const temp = `${file}.tmp`
  fs.writeFileSync(temp, JSON.stringify(record), 'utf-8')
  fs.renameSync(temp, file)
  return file
}
