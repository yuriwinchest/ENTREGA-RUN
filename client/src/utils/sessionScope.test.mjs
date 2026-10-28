import test from 'node:test'
import assert from 'node:assert/strict'
import { activateSessionScope, clearPrivateCaches, canManageUsers, isEventBoundUser, credentialStorageChangeRequiresReset } from './sessionScope.js'

function storage() {
  const entries = new Map()
  return {
    get length() { return entries.size },
    key: (index) => [...entries.keys()][index],
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }
}

test('troca de usuário ou equipe remove projetos e atletas do acesso anterior', () => {
  const cache = storage()
  const first = { id: 'first', role: 'TEAM_ADMIN', teamId: 'a', eventId: 'all' }
  activateSessionScope(first, cache)
  cache.setItem('entregas_run_athletes_private', 'athletes')
  cache.setItem('entregas_run_events', 'projects')
  cache.setItem('entregas_run_sidebar_collapsed', 'true')
  activateSessionScope(first, cache)
  assert.equal(cache.getItem('entregas_run_athletes_private'), 'athletes')
  activateSessionScope({ ...first, teamId: 'b' }, cache)
  assert.equal(cache.getItem('entregas_run_athletes_private'), null)
  assert.equal(cache.getItem('entregas_run_events'), null)
  assert.equal(cache.getItem('entregas_run_sidebar_collapsed'), 'true')
  cache.setItem('entregas_run_audits_private', 'audit')
  activateSessionScope({ ...first, id: 'second', teamId: 'b' }, cache)
  assert.equal(cache.getItem('entregas_run_audits_private'), null)
})

test('cache legado sem identificação não passa para o próximo login', () => {
  const cache = storage()
  cache.setItem('entregas_run_original_sheet_old', 'sheet')
  cache.setItem('entregas_run_kit_decision_old', 'decision')
  activateSessionScope({ id: 'new', role: 'TEAM_ADMIN', teamId: 'new', eventId: 'all' }, cache)
  assert.equal(cache.getItem('entregas_run_original_sheet_old'), null)
  assert.equal(cache.getItem('entregas_run_kit_decision_old'), null)
  clearPrivateCaches(cache)
  assert.equal(cache.getItem('entregas_run_cache_scope'), null)
})

test('administrador de equipe usa gestão e os perfis menores continuam vinculados ao evento', () => {
  assert.equal(canManageUsers({ role: 'TEAM_ADMIN' }), true)
  assert.equal(isEventBoundUser({ role: 'TEAM_ADMIN', eventId: 'all' }), false)
  for (const role of ['OPERADOR', 'SUPERVISOR', 'MEDICO']) {
    assert.equal(canManageUsers({ role }), false)
    assert.equal(isEventBoundUser({ role, eventId: 'event-a' }), true)
  }
  assert.equal(isEventBoundUser({ role: 'SUB_ADMIN', eventId: 'event-a' }), true)
})

test('outra aba valida a mesma sessão sem recarregar por ordem JSON ou nome atualizado', () => {
  const user = { id: 'sub', email: 'sub@example.test', name: 'Sub', role: 'SUB_ADMIN', eventId: 'event-a', teamId: null, isPrincipal: false }
  const validated = { id: user.id, name: 'Sub atualizado', email: user.email, role: user.role, eventId: user.eventId, teamId: null, isPrincipal: false }
  assert.notEqual(JSON.stringify(user), JSON.stringify(validated))
  assert.equal(credentialStorageChangeRequiresReset({ key: 'entregas_run_user', oldValue: JSON.stringify(user), newValue: JSON.stringify(validated) }, user, 'same-token'), false)
  assert.equal(credentialStorageChangeRequiresReset({ key: 'entregas_run_events', newValue: '[]' }, user, 'same-token'), false)
  assert.equal(credentialStorageChangeRequiresReset({ key: 'entregas_run_token', newValue: 'same-token' }, user, 'same-token'), false)
})

test('troca real de credencial, equipe, perfil ou logout continua invalidando a outra aba', () => {
  const user = { id: 'sub', role: 'SUB_ADMIN', eventId: 'event-a', teamId: 'team-a', isPrincipal: false }
  for (const patch of [{ id: 'other' }, { teamId: 'team-b' }, { role: 'OPERADOR' }, { eventId: 'event-b' }, { isPrincipal: true }]) {
    assert.equal(credentialStorageChangeRequiresReset({ key: 'entregas_run_user', newValue: JSON.stringify({ ...user, ...patch }) }, user, 'token'), true)
  }
  assert.equal(credentialStorageChangeRequiresReset({ key: 'entregas_run_user', newValue: null }, user, 'token'), true)
  assert.equal(credentialStorageChangeRequiresReset({ key: 'entregas_run_user', newValue: '{invalid' }, user, 'token'), true)
  assert.equal(credentialStorageChangeRequiresReset({ key: 'entregas_run_token', newValue: 'other' }, user, 'token'), true)
  assert.equal(credentialStorageChangeRequiresReset({ key: 'entregas_run_token', newValue: null }, user, 'token'), true)
  assert.equal(credentialStorageChangeRequiresReset({ key: null }, user, 'token'), true)
})
