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
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.ok && Array.isArray(data.users) ? data.users : []
  } catch (err) {
    console.warn('[usersApi] Falha ao carregar usuários do servidor, usando fallback local:', err)
    return null
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
