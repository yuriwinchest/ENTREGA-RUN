const isDelivered = (athlete) => String(athlete?.status || '').toUpperCase() === 'ENTREGUE'
const hasBinding = (athlete) => Boolean(String(athlete?.numero || '').trim() && String(athlete?.chip || '').trim())

function athleteKey(athlete) {
  const id = String(athlete?.id || '').trim()
  if (id) return `id:${id}`
  const document = String(athlete?.doc || athlete?.documento || '').replace(/\D/g, '')
  if (document) return `doc:${document}`
  return `numero:${String(athlete?.numero || '').trim()}`
}

// Old browser tabs send an entire cached spreadsheet on every delivery. During
// an active event, a stale copy must never roll a delivered kit back to pending.
export function mergeActiveAthletes(current, incoming, { undoAthleteId = '', canUndoDelivery = false } = {}) {
  if (!Array.isArray(current) || current.length === 0) return incoming
  const byKey = new Map(current.map((athlete) => [athleteKey(athlete), athlete]))
  const seen = new Set()
  const merged = incoming.map((athlete) => {
    const key = athleteKey(athlete)
    seen.add(key)
    const saved = byKey.get(key)
    if (!saved) return athlete
    if (String(saved.id || '') === String(undoAthleteId) &&
      (!isDelivered(saved) || canUndoDelivery)) return athlete
    if (isDelivered(saved)) return saved
    if (hasBinding(saved) && (!hasBinding(athlete) ||
      String(saved.numero) !== String(athlete.numero) || String(saved.chip) !== String(athlete.chip))) {
      return saved
    }
    return athlete
  })
  for (const saved of current) {
    if (!seen.has(athleteKey(saved))) merged.push(saved)
  }
  return merged
}

export function eventMetrics(athletes) {
  const total = Array.isArray(athletes) ? athletes.length : 0
  const deliveredList = Array.isArray(athletes) ? athletes.filter(isDelivered) : []
  const entregues = deliveredList.length
  const uniqueOperators = new Set(
    deliveredList
      .map((a) => String(a.entreguePor || '').trim())
      .filter(Boolean)
  )
  const operadores = Array.from(uniqueOperators)
  return {
    total,
    entregues,
    delivered_count: entregues,
    pendentes: Math.max(0, total - entregues),
    concl: total ? `${((entregues / total) * 100).toFixed(1)}%` : '0.0%',
    operadoresAtivos: operadores.length,
    operadores,
  }
}
