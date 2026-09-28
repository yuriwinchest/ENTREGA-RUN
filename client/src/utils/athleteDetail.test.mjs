import test from 'node:test'
import assert from 'node:assert/strict'
import { hasAthleteDetailChanges, hasCadastralChanges } from './athleteDetail.js'

const base = { numero: '777', nome: 'ADRIANA', chip: '7771', entreguePara: '' }

test('só "Retirado por" alterado não bloqueia a entrega', () => {
  const recipient = { ...base, entreguePara: 'AGNER' }
  assert.equal(hasAthleteDetailChanges(base, recipient), true)
  assert.equal(hasCadastralChanges(base, recipient), false)
})

test('cadastro alterado continua exigindo salvar antes de entregar', () => {
  assert.equal(hasCadastralChanges(base, { ...base, nome: 'ADRIANA PATRICIA' }), true)
  assert.equal(hasCadastralChanges(base, { ...base, nome: 'ADRIANA PATRICIA', entreguePara: 'AGNER' }), true)
  assert.equal(hasCadastralChanges(base, { ...base }), false)
})
