import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearKitDecision,
  findPendingKitDecisionAthlete,
  kitDecisionStorageKey,
  readKitDecision,
  writeKitDecision,
} from './kitDecisionLock.js'

function installMemoryStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  }
  return store
}

test('grava, lê e limpa a decisão pendente por evento', () => {
  const store = installMemoryStorage()
  writeKitDecision('evt-1', { id: 'a1', numero: '101', chip: 'C101' })

  assert.ok(store.has(kitDecisionStorageKey('evt-1')))
  assert.equal(readKitDecision('evt-1').athleteId, 'a1')
  assert.equal(readKitDecision('evt-2'), null)

  clearKitDecision('evt-1')
  assert.equal(readKitDecision('evt-1'), null)
})

test('ignora registro corrompido ou de outro evento', () => {
  const store = installMemoryStorage()
  store.set(kitDecisionStorageKey('evt-1'), '{quebrado')
  assert.equal(readKitDecision('evt-1'), null)

  store.set(kitDecisionStorageKey('evt-1'), JSON.stringify({ eventId: 'evt-9', athleteId: 'a1' }))
  assert.equal(readKitDecision('evt-1'), null)
})

test('mantém a trava enquanto o kit está associado e não entregue', () => {
  const decision = { eventId: 'evt-1', athleteId: 'a1', numero: '101' }
  const athletes = [{ id: 'a1', numero: '101', chip: 'C101', status: 'PENDENTE' }]
  assert.equal(findPendingKitDecisionAthlete(decision, athletes)?.id, 'a1')
})

test('libera a trava quando o kit foi entregue, desfeito ou o atleta sumiu', () => {
  const decision = { eventId: 'evt-1', athleteId: 'a1', numero: '101' }
  assert.equal(findPendingKitDecisionAthlete(decision, [{ id: 'a1', numero: '101', chip: 'C101', status: 'ENTREGUE' }]), null)
  assert.equal(findPendingKitDecisionAthlete(decision, [{ id: 'a1', numero: '', chip: '', qrCode: '', status: 'PENDENTE' }]), null)
  assert.equal(findPendingKitDecisionAthlete(decision, [{ id: 'b2', numero: '202', chip: 'C202' }]), null)
  assert.equal(findPendingKitDecisionAthlete(null, []), null)
})
