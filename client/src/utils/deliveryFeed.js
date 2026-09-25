import { getAuditTimestamp } from './auditData.js'

function deliveryTime(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0
  const localTime = getAuditTimestamp({ dataHora: raw })
  if (localTime !== null) return localTime
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getRecentDeliveries(athletes, limit = 5) {
  return (Array.isArray(athletes) ? athletes : [])
    .filter((athlete) => athlete?.status === 'ENTREGUE')
    .map((athlete) => ({
      id: athlete.numero || athlete.id,
      name: athlete.nome || '',
      doc: athlete.doc || '',
      dataHora: athlete.entregueEm || '',
      operadorNome: athlete.entreguePor || '',
    }))
    .sort((left, right) => deliveryTime(right.dataHora) - deliveryTime(left.dataHora))
    .slice(0, limit)
}
