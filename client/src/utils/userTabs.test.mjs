import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEventTabs, buildUserScopes, scopeTotals, searchUsers, usersForEventTab } from './userTabs.js'

const users = [
  { id: 'dono', name: 'AGNER', role: 'ADMIN', eventId: 'all', isOwner: true, isPrincipal: true },
  { id: 'chefe', name: 'CHEFE', role: 'ADMIN', eventId: 'all', isPrincipal: true },
  { id: 'op1', name: 'DIAVILA', role: 'OPERADOR', eventId: 'ev-p' },
  { id: 'fabio', name: 'FABIO', role: 'TEAM_ADMIN', eventId: 'all', teamId: 't1' },
  { id: 'op2', name: 'BETO', role: 'OPERADOR', eventId: 'ev-f1', teamId: 't1' },
  { id: 'sup2', name: 'ANA', role: 'SUPERVISOR', eventId: 'ev-f2', teamId: 't1' },
  { id: 'perdido', name: 'ZE', role: 'OPERADOR', eventId: 'ev-x', teamId: 't9', eventName: 'EVENTO APAGADO' },
]
const events = [
  { id: 'ev-p', name: 'BATALHÃO' },
  { id: 'ev-f1', name: 'CORRIDA DO FABIO', teamId: 't1', total: 100, entregues: 40 },
  { id: 'ev-f2', name: 'NOITE DO FABIO', teamId: 't1' },
]

test('super admin: aba própria, uma por sub-admin e equipe sem responsável', () => {
  const scopes = buildUserScopes(users, events, { isPrincipal: true })
  assert.deepEqual(scopes.map((s) => [s.id, s.label, s.users.map((u) => u.id)]), [
    ['principal', 'Meus usuários', ['dono', 'chefe', 'op1']],
    ['team:t1', 'FABIO', ['fabio', 'sup2', 'op2']],
    ['orphans', 'Sem responsável', ['perdido']],
  ])
  assert.deepEqual(scopes[1].events.map((e) => e.id), ['ev-f1', 'ev-f2'])
})

test('sub-admin: um escopo só, com tudo o que o servidor devolveu', () => {
  const mine = users.filter((u) => u.teamId === 't1')
  const scopes = buildUserScopes(mine, events.filter((e) => e.teamId === 't1'), { isPrincipal: false })
  assert.equal(scopes.length, 1)
  assert.equal(scopes[0].users[0].id, 'fabio', 'o próprio sub-admin vem primeiro')
})

test('sub-abas por evento: todos, administração, eventos e evento sumido', () => {
  const [, fabio, orphan] = buildUserScopes(users, events, { isPrincipal: true })
  assert.deepEqual(buildEventTabs(fabio).map((t) => [t.id, t.count]), [['all', 3], ['admins', 1], ['ev-f1', 1], ['ev-f2', 1]])
  assert.deepEqual(usersForEventTab(fabio, 'ev-f2').map((u) => u.id), ['sup2'])
  assert.deepEqual(usersForEventTab(fabio, 'admins').map((u) => u.id), ['fabio'])
  assert.deepEqual(buildEventTabs(orphan).map((t) => [t.id, t.label]), [['all', 'Todos'], ['ev-x', 'EVENTO APAGADO']])
  assert.deepEqual(buildEventTabs(null), [])
})

test('busca atravessa as abas, ignora acento e diz onde a pessoa está', () => {
  const scopes = buildUserScopes(users, events, { isPrincipal: true })
  assert.deepEqual(searchUsers(scopes, 'ana').map((u) => [u.id, u.scopeLabel]), [['sup2', 'Sub-admin FABIO']])
  assert.deepEqual(searchUsers(scopes, 'BATALHAO').map((u) => u.id), [])
  assert.deepEqual(searchUsers(scopes, 'super.example').map((u) => u.id), [])
  assert.deepEqual(searchUsers(scopes, 'apagado').map((u) => [u.id, u.scopeLabel]), [['perdido', 'Sem responsável']])
  assert.deepEqual(searchUsers(scopes, '   '), [])
})

test('totais do sub-admin somam os eventos dele', () => {
  const [, fabio, orphan] = buildUserScopes(users, events, { isPrincipal: true })
  assert.deepEqual(scopeTotals(fabio), { eventos: 2, atletas: 100, entregues: 40, percentual: 40 })
  assert.deepEqual(scopeTotals(orphan), { eventos: 0, atletas: 0, entregues: 0, percentual: 0 })
})
