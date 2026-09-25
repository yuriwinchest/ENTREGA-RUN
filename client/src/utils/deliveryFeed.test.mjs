import assert from 'node:assert/strict'
import test from 'node:test'
import { getRecentDeliveries } from './deliveryFeed.js'
import { enrichAuditRecords } from './auditData.js'

test('últimas entregas usam a lista do servidor e a hora real, independente do navegador', () => {
  const athletes = [
    { id: 'a1', numero: '1', nome: 'Primeiro', status: 'ENTREGUE', entregueEm: '25/09/2026, 17:05:00', entreguePor: 'Operador A' },
    { id: 'a2', numero: '2', nome: 'Segundo', status: 'ENTREGUE', entregueEm: '25/09/2026, 17:55:27', entreguePor: 'Operador B' },
    { id: 'a3', numero: '3', nome: 'Pendente', status: 'PENDENTE' },
    { id: 'a4', numero: '4', nome: 'Terceiro', status: 'ENTREGUE', entregueEm: '25/09/2026, 17:43:36', entreguePor: 'Operador C' },
  ]

  const result = getRecentDeliveries(athletes, 2)
  assert.deepEqual(result.map((item) => item.id), ['2', '4'])
  assert.equal(result[0].dataHora, '25/09/2026, 17:55:27')
  assert.equal(result[0].operadorNome, 'Operador B')
})

test('auditoria mostra operador e hora do registro persistido, sem atribuir e-mail do observador', () => {
  const audits = [{ atletaNumero: '2', dataHora: '25/09/2026, 12:00:00', operadorNome: 'Superadmin', operadorEmail: 'observador@example.test' }]
  const athletes = [{ numero: '2', status: 'ENTREGUE', entregueEm: '25/09/2026, 17:55:27', entreguePor: 'Operador B', chip: '7775' }]

  const [result] = enrichAuditRecords(audits, athletes)
  assert.equal(result.dataHora, '25/09/2026, 17:55:27')
  assert.equal(result.operadorNome, 'Operador B')
  assert.equal(result.operadorEmail, '')
  assert.equal(result.atletaChip, '7775')
})
