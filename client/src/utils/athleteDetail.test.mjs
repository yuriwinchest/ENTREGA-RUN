import test from 'node:test'
import assert from 'node:assert/strict'
import { hasAthleteDetailChanges, hasCadastralChanges, undoDeliveryChanges, wasAssociatedInApp } from './athleteDetail.js'

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

const entregue = { status: 'ENTREGUE', entregueEm: '07/10/2026, 13:06', entreguePor: 'AGNER', entreguePara: 'MARIA' }

test('DESFAZER de planilha já associada só desfaz a entrega e mantém chip e número', () => {
  const importado = { id: 'import-1-1', numero: '95', chip: '7791', qrCode: 'Q95', ...entregue }
  const resultado = undoDeliveryChanges(importado)
  assert.equal(wasAssociatedInApp(importado), false)
  assert.deepEqual(
    [resultado.status, resultado.entregueEm, resultado.entreguePor, resultado.entreguePara],
    ['PENDENTE', '', '', '']
  )
  assert.deepEqual([resultado.numero, resultado.chip, resultado.qrCode], ['95', '7791', 'Q95'])
})

test('DESFAZER de associação feita no sistema desfaz entrega e associação', () => {
  const associado = { id: 'import-1-2', numero: '300', chip: '8800', qrCode: 'Q300', _kitPreviousNumero: '', ...entregue }
  const resultado = undoDeliveryChanges(associado)
  assert.equal(wasAssociatedInApp(associado), true)
  assert.deepEqual([resultado.status, resultado.numero, resultado.chip, resultado.qrCode], ['PENDENTE', '', '', ''])
  assert.equal('_kitPreviousNumero' in resultado, false)
  assert.equal(undoDeliveryChanges({ ...associado, _kitPreviousNumero: '12' }).numero, '12')
})
