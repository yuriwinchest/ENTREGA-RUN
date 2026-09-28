import { matchesAthleteReference } from './athleteDetail.js'

// App.jsx lê a mesma chave para barrar o "voltar" do navegador enquanto a decisão está pendente.
export function kitDecisionStorageKey(eventId) {
  return `entregas_run_kit_decision_${eventId}`
}

function storage() {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

export function readKitDecision(eventId) {
  if (!eventId) return null
  try {
    const decision = JSON.parse(storage()?.getItem(kitDecisionStorageKey(eventId)) || 'null')
    return decision && decision.eventId === eventId ? decision : null
  } catch {
    return null
  }
}

export function writeKitDecision(eventId, athlete) {
  const decision = {
    eventId,
    athleteId: String(athlete?.id ?? ''),
    numero: String(athlete?.numero ?? ''),
    chip: String(athlete?.chip ?? ''),
    lockedAt: Date.now(),
  }
  try {
    storage()?.setItem(kitDecisionStorageKey(eventId), JSON.stringify(decision))
  } catch {
    // Sem storage a trava continua valendo em memória até a decisão.
  }
  return decision
}

export function clearKitDecision(eventId) {
  try {
    storage()?.removeItem(kitDecisionStorageKey(eventId))
  } catch {
    // ignore
  }
}

// Atleta que ainda exige a decisão: kit associado e não entregue. Qualquer outro
// estado significa que a decisão já foi tomada (aqui ou em outro dispositivo).
export function findPendingKitDecisionAthlete(decision, athletes) {
  if (!decision || !Array.isArray(athletes)) return null
  const reference = decision.athleteId
    ? { id: decision.athleteId, numero: decision.numero }
    : { numero: decision.numero }
  const athlete = athletes.find((item) => matchesAthleteReference(item, reference))
  if (!athlete) return null
  const delivered = String(athlete.status || '').trim().toUpperCase() === 'ENTREGUE' || Boolean(athlete.entregueEm)
  const hasKit = String(athlete.chip || '').trim() !== '' || String(athlete.qrCode || '').trim() !== ''
  return !delivered && hasKit ? athlete : null
}
