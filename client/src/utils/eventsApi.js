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
