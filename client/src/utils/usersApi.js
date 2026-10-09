/**
 * API client para gerenciamento e sincronização de usuários da operação.
 * Envia o token de sessão (emitido no login) em todas as chamadas.
 */

function authHeaders(extra = {}) {
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

export async function apiFetchUsers() {
  try {
    const res = await fetch('/api/users', {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.ok && Array.isArray(data.users) ? data.users : []
  } catch (err) {
    console.warn('[usersApi] Falha ao carregar usuários do servidor:', err)
    return null
  }
}

export async function apiFetchEventOperators(eventId) {
  if (!eventId) return []
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/operators`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) {
      const all = await apiFetchUsers()
      return Array.isArray(all)
        ? all.filter((u) => u.eventId === 'all' || u.eventId === eventId || u.role === 'ADMIN')
        : []
    }
    const data = await res.json()
    return data.ok && Array.isArray(data.operators) ? data.operators : []
  } catch (err) {
    console.warn('[usersApi] Falha ao carregar operadores do evento:', err)
    return []
  }
}

export async function apiCreateUser(userData) {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(userData),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.ok ? data.user : null
  } catch (err) {
    console.error('[usersApi] Erro ao criar usuário no servidor:', err)
    throw err
  }
}

export async function apiUpdateUser(userId, patchData) {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patchData),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.ok ? data.user : null
  } catch (err) {
    console.error(`[usersApi] Erro ao atualizar usuário ${userId}:`, err)
    throw err
  }
}

export async function apiDeleteUser(userId) {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return Boolean(data.ok)
  } catch (err) {
    console.error(`[usersApi] Erro ao excluir usuário ${userId}:`, err)
    throw err
  }
}
