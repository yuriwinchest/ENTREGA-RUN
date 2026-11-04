import { SESSION_EXPIRED_EVENT } from './eventsApi.js'

async function request(eventId, payload, signal) {
  let token = ''
  try { token = localStorage.getItem('entregas_run_token') || '' } catch {}
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/registration-options`, {
    method: payload ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal,
  })
  if (response.status === 401) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) throw new Error(data.message || 'Não foi possível carregar ou salvar as opções. Tente novamente.')
  return data
}

export const fetchRegistrationOptions = (eventId, signal) => request(eventId, undefined, signal)
export const createRegistrationOption = (eventId, field, value) => request(eventId, { field, value })
