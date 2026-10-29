import test from 'node:test'
import assert from 'node:assert/strict'
import { clearVisitOrigin, readVisitOrigin, saveVisitOrigin } from './visitSession.js'
import { clearPrivateCaches } from './sessionScope.js'

function memoryStorage() {
  const data = new Map()
  return {
    get length() { return data.size },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  }
}

test('origem da visita: guarda, sobrevive à limpeza de cache e some ao voltar', () => {
  const storage = memoryStorage()
  assert.equal(readVisitOrigin(storage), null)
  saveVisitOrigin('tok-dono', { id: 'dono' }, storage)
  clearPrivateCaches(storage)
  assert.deepEqual(readVisitOrigin(storage), { token: 'tok-dono', user: { id: 'dono' } })
  clearVisitOrigin(storage)
  assert.equal(readVisitOrigin(storage), null)
})

test('origem corrompida ou sem token é ignorada', () => {
  const storage = memoryStorage()
  storage.setItem('entregas_run_visit_origin', '{quebrado')
  assert.equal(readVisitOrigin(storage), null)
  saveVisitOrigin('', { id: 'x' }, storage)
  assert.equal(readVisitOrigin(storage), null)
})
