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
  assert.deepEqual(eventMetrics(merged), {
    total: 2,
    entregues: 2,
    delivered_count: 2,
    pendentes: 0,
    concl: '100.0%',
    operadoresAtivos: 2,
    operadores: ['operador A', 'operador B'],
  })
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

test('a delivered athlete can be corrected only with an explicit authorized edit', () => {
  const saved = [
    { id: 'a', numero: '500', chip: '7775', camiseta: 'G', status: 'ENTREGUE', entregueEm: '29/10 10:00', entreguePor: 'Ana' },
    { id: 'b', numero: '501', chip: '7776', camiseta: 'M', status: 'ENTREGUE', entregueEm: '29/10 10:05', entreguePor: 'Ana' },
  ]
  const edited = [
    { ...saved[0], camiseta: 'GG', status: 'PENDENTE', entregueEm: '', entreguePor: 'Outro' },
    { ...saved[1], camiseta: 'P' },
  ]
  assert.deepEqual(mergeActiveAthletes(saved, edited), saved)
  assert.deepEqual(mergeActiveAthletes(saved, edited, { editAthleteId: 'a' }), saved)
  const merged = mergeActiveAthletes(saved, edited, { editAthleteId: 'a', canEditDelivered: true })
  assert.equal(merged[0].camiseta, 'GG')
  assert.equal(merged[0].status, 'ENTREGUE')
  assert.equal(merged[0].entregueEm, '29/10 10:00')
  assert.equal(merged[0].entreguePor, 'Ana')
  assert.deepEqual(merged[1], saved[1])
})

test('two incoming rows for the same saved delivery keep a single copy', () => {
  const delivered = { id: 'a', numero: '447', chip: '9', status: 'ENTREGUE', entregueEm: '29/10 16:03' }
  const saved = [delivered, { id: 'b', numero: '448', status: 'PENDENTE' }, { ...delivered }]
  const incoming = [{ ...delivered }, { id: 'b', numero: '448', status: 'PENDENTE' }, { ...delivered }]
  const merged = mergeActiveAthletes(saved, incoming)
  assert.equal(merged.filter((a) => a.id === 'a').length, 1)
  assert.equal(merged.length, 2)
  const fromCleanTab = mergeActiveAthletes(saved, [{ ...delivered }, { id: 'b', numero: '448', status: 'PENDENTE' }])
  assert.equal(fromCleanTab.length, 2)
})

test('pending athletes sharing a document without id are not merged away', () => {
  const saved = [{ doc: '111', numero: '1', status: 'PENDENTE' }, { doc: '111', numero: '2', status: 'PENDENTE' }]
  assert.equal(mergeActiveAthletes(saved, saved.map((a) => ({ ...a }))).length, 2)
})
