// Chamadas da emergência médica. As rotas públicas nunca enviam o token de
// login: quem abre pelo QR Code é anônimo, mesmo que o aparelho esteja logado.

async function call(url, { method = 'GET', body, token } = {}) {
  try {
    const res = await fetch(url, {
      method,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok && data.ok !== false, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { message: 'Sem conexão. Verifique a internet e tente de novo.' } }
  }
}

function authToken() {
  try {
    return localStorage.getItem('entregas_run_token') || ''
  } catch {
    return ''
  }
}

const enc = encodeURIComponent

export const emergenciaApi = {
  evento: (eventId) => call(`/api/public/emergencia/${enc(eventId)}`),
  buscar: (eventId, q, expectedEventId) => call(`/api/public/emergencia/${enc(eventId)}/busca?q=${enc(q)}&event=${enc(expectedEventId || '')}`),
  atleta: (eventId, ref, expectedEventId) => call(`/api/public/emergencia/${enc(eventId)}/atleta/${enc(ref)}?event=${enc(expectedEventId || '')}`),
  abrirOcorrencia: (eventId, payload) =>
    call(`/api/public/emergencia/${enc(eventId)}/ocorrencias`, { method: 'POST', body: payload }),
}

export const emergencyLinksApi = {
  issue: (eventId) => call(`/api/events/${enc(eventId)}/emergency-links`, { method: 'POST', token: authToken() }),
  preview: (code) => call(`/api/emergency-links/preview?code=${enc(code)}`, { token: authToken() }),
  bind: (payload) => call('/api/emergency-links/binding', { method: 'PUT', body: payload, token: authToken() }),
  archive: (eventId, archived) => call(`/api/events/${enc(eventId)}/archive`, { method: 'POST', body: { archived }, token: authToken() }),
}

export const medicoApi = {
  ocorrencias: (eventId, version) =>
    call(`/api/medico/${enc(eventId)}/ocorrencias${version === undefined || version === null ? '' : `?v=${version}`}`, { token: authToken() }),
  mudarStatus: (eventId, id, status) =>
    call(`/api/medico/${enc(eventId)}/ocorrencias/${enc(id)}`, { method: 'PATCH', body: { status }, token: authToken() }),
}
