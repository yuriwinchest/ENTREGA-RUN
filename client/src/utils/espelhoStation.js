const STATION_KEY = 'entregas_run_posto_id'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
let temporaryStationId

export function getEspelhoStationId(storage = globalThis.localStorage, randomUUID = () => crypto.randomUUID()) {
  try {
    const saved = storage?.getItem(STATION_KEY)
    if (UUID.test(saved || '')) return saved
  } catch { /* Um posto ainda funciona enquanto o armazenamento está indisponível. */ }
  const id = temporaryStationId ||= randomUUID()
  try { storage?.setItem(STATION_KEY, id) } catch { /* Mantém a identidade desta sessão. */ }
  return id
}

export async function openEspelhoStation(eventId, { signal } = {}) {
  const token = localStorage.getItem('entregas_run_token') || ''
  if (!token) throw new Error('Entre novamente para conectar o Espelho deste posto.')
  const response = await fetch(`/api/espelho/${encodeURIComponent(eventId)}/canais`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ stationId: getEspelhoStationId() }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.ok || !/^[a-f0-9]{64}$/.test(body.canalId || '')) {
    throw new Error(body.message || 'Não foi possível conectar o Espelho deste posto.')
  }
  return body.canalId
}

export function espelhoChannelQuery(canalId) {
  return canalId ? `?canal=${encodeURIComponent(canalId)}` : ''
}

export function isEspelhoStationMessage(message, eventId, canalId) {
  return Boolean(canalId && message?.eventId === eventId && message?.canalId === canalId)
}
