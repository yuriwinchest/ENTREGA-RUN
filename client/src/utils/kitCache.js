// O servidor persiste os kits; a falta de espaço no cache não pode bloquear a operação.
export function cacheEventKits(eventId, kits) {
  if (!eventId || !Array.isArray(kits)) return false
  try {
    localStorage.setItem(`entregas_run_kits_${eventId}`, JSON.stringify(kits))
    return true
  } catch {
    return false
  }
}
