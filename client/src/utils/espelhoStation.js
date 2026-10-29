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
  if (!response.ok || !body.ok || !isEspelhoChannelId(body.canalId)) {
    throw new Error(body.message || 'Não foi possível conectar o Espelho deste posto.')
  }
  return { canalId: body.canalId, numero: Number(body.numero) || 0 }
}

export function isEspelhoChannelId(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

export function espelhoStationUrl(origin, eventId, canalId) {
  return `${origin}/espelho/${encodeURIComponent(eventId)}${espelhoChannelQuery(canalId)}`
}

// Link aberto (QR ou monitor) carrega o canal do guichê em ?canal=; sem ele é o link antigo do evento.
export function espelhoChannelFromSearch(search) {
  const canal = new URLSearchParams(search || '').get('canal') || ''
  return isEspelhoChannelId(canal) ? canal : ''
}

export function espelhoChannelQuery(canalId) {
  return canalId ? `?canal=${encodeURIComponent(canalId)}` : ''
}

// O link antigo acompanha qualquer guichê do evento; o do guichê, só o próprio canal.
export function isEspelhoStationMessage(message, eventId, canalId) {
  if (message?.eventId && message.eventId !== eventId) return false
  return canalId ? message?.canalId === canalId : true
}
