// Ausência de equipe identifica o acervo principal; nunca uma equipe nova.
export function teamOf(record) {
  return typeof record?.teamId === 'string' ? record.teamId : ''
}

export function sameScope(actor, record) {
  if (actor?.isPrincipal === true) return true
  if (!actor || !record || (actor.role === 'TEAM_ADMIN' && !teamOf(actor))) return false
  return teamOf(actor) === teamOf(record)
}

export function canAccessEvent(actor, event) {
  if (!sameScope(actor, event)) return false
  if (actor.isPrincipal || ['ADMIN', 'TEAM_ADMIN'].includes(actor.role)) return true
  if (actor.role === 'SUB_ADMIN' && actor.eventId === 'all') return true
  return Boolean(actor.eventId && actor.eventId === event.id)
}

export function canCreateEvent(actor) {
  return ['ADMIN', 'TEAM_ADMIN', 'SUB_ADMIN', 'SUPERVISOR'].includes(actor?.role) &&
    (actor.role !== 'TEAM_ADMIN' || Boolean(teamOf(actor)))
}

export function canManageUser(actor, target) {
  if (!sameScope(actor, target)) return false
  // Super admins gerenciam todos (suspender, senha, excluir), inclusive outros
  // Super admins; a conta dona só o próprio dono altera, para nunca perder o acesso.
  if (target.isOwner) return actor.isOwner === true
  if (actor.isPrincipal) return true
  if (actor.role === 'ADMIN') return target.role !== 'TEAM_ADMIN'
  if (['ADMIN', 'TEAM_ADMIN'].includes(target.role) || target.isPrincipal) return false
  if (actor.role === 'TEAM_ADMIN') return true
  return actor.role === 'SUB_ADMIN' &&
    (actor.eventId === 'all' || actor.eventId === target.eventId)
}
