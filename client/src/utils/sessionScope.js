const BUSINESS_CACHE = /^entregas_run_(events$|users$|athletes_|kits_|athlete_columns_|original_sheet_|deliveries_|audits_|espelho_|kit_decision_)/
const CACHE_SCOPE_KEY = 'entregas_run_cache_scope'

export function sessionScopeSignature(user) {
  if (!user?.id || !user.role) return null
  return JSON.stringify([user.id, user.teamId || '', user.role, user.eventId || 'all', Boolean(user.isPrincipal)])
}

export function credentialStorageChangeRequiresReset(event, currentUser, currentToken) {
  if (event.key === null) return true
  if (event.key === 'entregas_run_token') return (event.newValue || '') !== (currentToken || '')
  if (event.key !== 'entregas_run_user') return false
  try {
    const nextScope = sessionScopeSignature(JSON.parse(event.newValue || 'null'))
    const currentScope = sessionScopeSignature(currentUser || JSON.parse(event.oldValue || 'null'))
    return !nextScope || nextScope !== currentScope
  } catch {
    return true
  }
}

export function clearPrivateCaches(storage = localStorage) {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    for (const key of keys) {
      if (BUSINESS_CACHE.test(key || '')) storage.removeItem(key)
    }
    storage.removeItem(CACHE_SCOPE_KEY)
  } catch { /* Sem armazenamento disponível, a sessão continua usando o servidor. */ }
}

export function activateSessionScope(user, storage = localStorage) {
  const scope = sessionScopeSignature(user)
  try {
    if (storage.getItem(CACHE_SCOPE_KEY) !== scope) clearPrivateCaches(storage)
    storage.setItem(CACHE_SCOPE_KEY, scope)
  } catch { /* O armazenamento local é apenas cache. */ }
}

export function canManageUsers(user) {
  return ['ADMIN', 'TEAM_ADMIN', 'SUB_ADMIN'].includes(user?.role)
}

export function isEventBoundUser(user) {
  return Boolean(user && !['ADMIN', 'TEAM_ADMIN'].includes(user.role) &&
    (['OPERADOR', 'SUPERVISOR', 'MEDICO'].includes(user.role) || (user.eventId && user.eventId !== 'all')))
}
