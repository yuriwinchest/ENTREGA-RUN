/**
 * API client para gerenciamento e sincronização centralizada de eventos.
 */

export async function apiFetchEvents() {
  try {
    const res = await fetch('/api/events', {
      headers: { Accept: 'application/json' },
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
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
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
      headers: { Accept: 'application/json' },
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
    return data.ok ? { athletes: data.athletes || [], schema: data.schema || [] } : null
  } catch (err) {
    console.warn(`[eventsApi] Erro ao buscar atletas do evento ${eventId}:`, err)
    return null
  }
}

export async function apiSaveAthletes(eventId, athletes, schema = []) {
  if (!eventId || !Array.isArray(athletes)) return false
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/athletes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ athletes, schema }),
    })
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.ok)
  } catch (err) {
    console.error(`[eventsApi] Erro ao salvar atletas do evento ${eventId}:`, err)
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
