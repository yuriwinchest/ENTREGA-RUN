import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { canManageUsers, isEventBoundUser } from './sessionScope.js'

const app = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')

// Executa os efeitos reais de navegação com history controlado: o defeito era
// um segundo guard que devolvia o sub-admin à operação depois do clique.
function navigation(user, popstate = false) {
  const start = app.indexOf(popstate ? '  // Sincroniza navegação via botões' : '  // Guard de rota para isolamento')
  const end = app.indexOf(popstate ? '  function navigateTo' : '  // Sincroniza navegação via botões', start + 1)
  assert.ok(start >= 0 && end > start, 'Efeito de navegação precisa estar presente')
  const changes = []
  const listeners = new Map()
  vm.runInNewContext(app.slice(start, end), {
    user, isRestrictedUser: isEventBoundUser(user), currentPage: 'usuarios', effectiveEventId: 'event-test',
    useEffect: (callback) => callback(), canManageUsers, readKitDecision: () => null,
    setSelectedEventId: (id) => changes.push(['selected', id]),
    setCurrentPage: (page) => changes.push(['page', page]),
    window: {
      location: { pathname: '/usuarios' },
      history: { replaceState: (_state, _title, url) => changes.push(['url', url]) },
      addEventListener: (event, callback) => listeners.set(event, callback), removeEventListener() {},
    },
  })
  if (popstate) listeners.get('popstate')()
  return changes
}

test('sub-admin vinculado ao evento abre Usuários sem ser devolvido à operação', () => {
  const user = { id: 'sub-bound', role: 'SUB_ADMIN', eventId: 'event-test' }
  assert.deepEqual(navigation(user), [])
  assert.deepEqual(navigation(user, true), [['page', 'usuarios']])
})

test('gestores de equipe e gestores sem evento mantêm acesso à página Usuários', () => {
  for (const role of ['ADMIN', 'TEAM_ADMIN', 'SUB_ADMIN']) {
    const user = { id: role, role, eventId: 'all' }
    assert.deepEqual(navigation(user), [])
    assert.deepEqual(navigation(user, true), [['page', 'usuarios']])
  }
})

test('operador e supervisor continuam fora da gestão de Usuários', () => {
  for (const role of ['OPERADOR', 'SUPERVISOR']) {
    const user = { id: role, role, eventId: 'event-test' }
    assert.deepEqual(navigation(user), [['selected', 'event-test'], ['page', 'operacao'], ['url', '/operacao/event-test']])
    assert.deepEqual(navigation(user, true), [['page', 'operacao']])
  }
})
