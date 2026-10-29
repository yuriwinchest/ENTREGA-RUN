// Organização da tela de Usuários em "escadinha": o super admin vê uma aba com
// os usuários dele e uma aba por Sub-admin (equipe); dentro de cada aba, as
// pessoas são separadas por evento.

const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
const ADMIN_FIRST = (a, b) => rank(a) - rank(b) || byName(a, b)

function rank(user) {
  if (user.isOwner) return 0
  if (user.isPrincipal) return 1
  if (user.role === 'TEAM_ADMIN') return 2
  if (user.eventId === 'all') return 3
  return 4
}

export function buildUserScopes(users = [], events = [], viewer = {}) {
  if (!viewer.isPrincipal) {
    return [{ id: 'mine', label: 'Meus usuários', leader: null, users: [...users].sort(ADMIN_FIRST), events }]
  }
  const scopes = [{
    id: 'principal',
    label: 'Meus usuários',
    leader: null,
    users: users.filter((user) => !user.teamId).sort(ADMIN_FIRST),
    events: events.filter((event) => !event.teamId),
  }]
  const leaders = users.filter((user) => user.role === 'TEAM_ADMIN' && user.teamId).sort(byName)
  for (const leader of leaders) {
    scopes.push({
      id: `team:${leader.teamId}`,
      label: leader.name || 'SUB-ADMIN',
      leader,
      users: users.filter((user) => user.teamId === leader.teamId).sort(ADMIN_FIRST),
      events: events.filter((event) => event.teamId === leader.teamId),
    })
  }
  // Equipe sem responsável (dado antigo/inconsistente) não pode sumir da tela.
  const known = new Set(leaders.map((leader) => leader.teamId))
  const orphans = users.filter((user) => user.teamId && !known.has(user.teamId))
  if (orphans.length > 0) {
    scopes.push({ id: 'orphans', label: 'Sem responsável', leader: null, users: orphans.sort(ADMIN_FIRST), events: [] })
  }
  return scopes
}

// Sub-abas por evento dentro de um escopo. "Administração" junta quem tem acesso
// a todos os eventos (super admins, sub-admin, perfis antigos).
export function buildEventTabs(scope) {
  if (!scope) return []
  const tabs = [{ id: 'all', label: 'Todos', count: scope.users.length }]
  const admins = scope.users.filter((user) => !user.eventId || user.eventId === 'all')
  if (admins.length > 0) tabs.push({ id: 'admins', label: 'Administração', count: admins.length })
  const seen = new Set()
  for (const event of scope.events) {
    seen.add(event.id)
    tabs.push({ id: event.id, label: event.name, count: scope.users.filter((user) => user.eventId === event.id).length, event })
  }
  // Usuário ligado a evento que não está na lista (excluído/arquivado) continua visível.
  for (const user of scope.users) {
    if (user.eventId && user.eventId !== 'all' && !seen.has(user.eventId)) {
      seen.add(user.eventId)
      tabs.push({ id: user.eventId, label: user.eventName || 'Evento indisponível', count: scope.users.filter((u) => u.eventId === user.eventId).length })
    }
  }
  return tabs
}

export function usersForEventTab(scope, tabId) {
  if (!scope) return []
  if (!tabId || tabId === 'all') return scope.users
  if (tabId === 'admins') return scope.users.filter((user) => !user.eventId || user.eventId === 'all')
  return scope.users.filter((user) => user.eventId === tabId)
}
