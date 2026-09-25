import assert from 'node:assert/strict'
import test from 'node:test'
import { eventMetrics, mergeActiveAthletes } from './athleteSync.js'

test('an old browser cannot roll back a delivery from another browser', () => {
  const first = [
    { id: 'a', numero: '1', chip: '11', status: 'ENTREGUE', entreguePor: 'operador A' },
    { id: 'b', numero: '2', chip: '22', status: 'PENDENTE' },
  ]
  const staleBrowser = [
    { id: 'a', numero: '1', chip: '11', status: 'PENDENTE' },
    { id: 'b', numero: '2', chip: '22', status: 'ENTREGUE', entreguePor: 'operador B' },
  ]
  const merged = mergeActiveAthletes(first, staleBrowser)
  assert.equal(merged[0].status, 'ENTREGUE')
  assert.equal(merged[0].entreguePor, 'operador A')
  assert.equal(merged[1].status, 'ENTREGUE')
  assert.deepEqual(eventMetrics(merged), { total: 2, entregues: 2, pendentes: 0, concl: '100.0%' })
})

test('a stale sheet cannot clear an association or remove an athlete during an active event', () => {
  const saved = [
    { id: 'a', numero: '500', chip: '7775', status: 'PENDENTE' },
    { id: 'b', numero: '501', chip: '7776', status: 'PENDENTE' },
  ]
  const incoming = [{ id: 'a', numero: '', chip: '', status: 'PENDENTE' }]
  assert.deepEqual(mergeActiveAthletes(saved, incoming), saved)
  assert.deepEqual(mergeActiveAthletes(saved, incoming, { undoAthleteId: 'a' }), [incoming[0], saved[1]])
})

test('delivery undo needs an explicit authorized intent', () => {
  const saved = [{ id: 'a', numero: '500', chip: '7775', status: 'ENTREGUE' }]
  const undone = [{ id: 'a', numero: '', chip: '', status: 'PENDENTE' }]
  assert.deepEqual(mergeActiveAthletes(saved, undone), saved)
  assert.deepEqual(mergeActiveAthletes(saved, undone, { undoAthleteId: 'a' }), saved)
  assert.deepEqual(mergeActiveAthletes(saved, undone, { undoAthleteId: 'a', canUndoDelivery: true }), undone)
})
