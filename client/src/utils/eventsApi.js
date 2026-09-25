/**
 * API client para gerenciamento e sincronização centralizada de eventos.
 */

function getAuthHeaders(extra = {}) {
  let token = ''
  try {
    token = localStorage.getItem('entregas_run_token') || ''
  } catch {
    token = ''
  }
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

export async function apiFetchEvents() {
  try {
    const res = await fetch('/api/events', {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.ok && Array.isArray(data.events) ? data.events : []
  } catch (err) {
    console.warn('[eventsApi] Não foi possível carregar eventos do servidor:', err)
    return null
  }
}

export async function apiCreateEvent(eventData) {
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(eventData),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.ok ? data.event : null
  } catch (err) {
    console.error('[eventsApi] Erro ao criar evento no servidor:', err)
    return null
  }
}

export async function apiUpdateEvent(eventId, patchData) {
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(patchData),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.ok ? data.event : null
  } catch (err) {
    console.error(`[eventsApi] Erro ao atualizar evento ${eventId} no servidor:`, err)
    return null
  }
}

export async function apiDeleteEvent(eventId) {
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    return Boolean(data.ok)
  } catch (err) {
    console.error(`[eventsApi] Erro ao excluir evento ${eventId} no servidor:`, err)
    return false
  }
}

export async function apiSyncEvents(localEvents) {
  if (!Array.isArray(localEvents) || localEvents.length === 0) return []
  try {
    const res = await fetch('/api/events/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ events: localEvents }),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.ok && Array.isArray(data.events) ? data.events : []
  } catch (err) {
    console.warn('[eventsApi] Falha na sincronização em lote de eventos:', err)
    return []
  }
}

export async function apiFetchAthletes(eventId) {
  if (!eventId) return null
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/athletes`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.ok ? { athletes: data.athletes || [], schema: data.schema || [], kits: data.kits || [] } : null
  } catch (err) {
    console.warn(`[eventsApi] Erro ao buscar atletas do evento ${eventId}:`, err)
    return null
  }
}

export async function apiSaveAthletes(eventId, athletes, schema = [], kits) {
  if (!eventId || !Array.isArray(athletes)) return false
  // Listas grandes (ex: 1.011 atletas) vão fatiadas para não estourar
  // o payload único e permitir retry por fatia no servidor.
  if (athletes.length > 300) {
    return apiSaveAthletesChunked(eventId, athletes, schema, kits, 250)
  }
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/athletes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ athletes, schema, ...(kits === undefined ? {} : { kits }) }),
    })
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.ok)
  } catch (err) {
    console.error(`[eventsApi] Erro ao salvar atletas do evento ${eventId}:`, err)
    return false
  }
}

export async function apiSaveAthletesChunked(eventId, athletes, schema = [], kits, chunkSize = 250) {
  if (!eventId || !Array.isArray(athletes)) return false
  const uploadId = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  const totalChunks = Math.max(1, Math.ceil(athletes.length / chunkSize))
  try {
    for (let i = 0; i < totalChunks; i += 1) {
      const chunk = athletes.slice(i * chunkSize, (i + 1) * chunkSize)
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/athletes/chunks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          chunkIndex: i,
          totalChunks,
          athletesChunk: chunk,
          ...(i === 0 ? { schema, ...(kits === undefined ? {} : { kits }) } : {}),
        }),
      })
      if (!res.ok) {
        // Servidor antigo sem rota de chunks: cai para o POST único
        if (res.status === 404 && totalChunks > 1) {
          return apiSaveAthletesSingle(eventId, athletes, schema, kits)
        }
        return false
      }
      const data = await res.json().catch(() => ({}))
      if (!data.ok) return false
    }
    return true
  } catch (err) {
    console.error(`[eventsApi] Erro no upload fatiado do evento ${eventId}:`, err)
    return false
  }
}

async function apiSaveAthletesSingle(eventId, athletes, schema = [], kits) {
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/athletes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ athletes, schema, ...(kits === undefined ? {} : { kits }) }),
    })
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.ok)
  } catch {
    return false
  }
}

export async function apiPublicValidateAthlete(eventId, numero) {
  if (!eventId || !numero) return null
  try {
    const res = await fetch(
      `/api/public/events/${encodeURIComponent(eventId)}/athletes/${encodeURIComponent(numero)}`,
      { headers: { Accept: 'application/json' } }
    )
    const data = await res.json()
    return { status: res.status, data }
  } catch (err) {
    console.error(`[eventsApi] Erro ao validar atleta #${numero}:`, err)
    return { status: 500, data: { ok: false, message: 'Erro de conexão com o servidor.' } }
  }
}

export async function apiGetAppwriteStatus() {
  try {
    const res = await fetch('/api/appwrite/status', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return { enabled: false, connected: false }
    return await res.json()
  } catch {
    return { enabled: false, connected: false }
  }
}

