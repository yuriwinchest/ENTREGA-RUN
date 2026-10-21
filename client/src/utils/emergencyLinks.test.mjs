import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEmergencyCode } from './emergencyLinks.js'
import { filterEvents, getEventStatusCounts } from './eventFilter.js'

test('aceita QR antigo conhecido e código, recusa endereço externo e caminhos inválidos', () => {
  const origin = 'http://localhost:5173'
  assert.equal(parseEmergencyCode('event-123', origin), 'event-123')
  assert.equal(parseEmergencyCode('https://entregasrunning.com.br/emergencia/event-123', origin), 'event-123')
  assert.equal(parseEmergencyCode('/emergencia/qr-123', origin), 'qr-123')
  for (const value of ['', 'https://outro.com/emergencia/event-123', 'javascript:alert(1)', '../event', '/emergencia/../etc', '/emergencia/%2Fetc', '/emergencia/event/a']) assert.equal(parseEmergencyCode(value, origin), null)
})

test('arquivo fica separado dos eventos normais, inclusive quando chegou com active antigo', () => {
  const archived = { id: 'old', name: 'Antigo', status: 'ARQUIVADO', active: true }
  const current = { id: 'new', name: 'Atual', status: 'PLANEJADO' }
  const events = [archived, current]
  for (const statusFilter of ['ATIVOS', 'PLANEJADO', 'FINALIZADO', 'TODOS']) assert.ok(!filterEvents(events, { statusFilter }).includes(archived))
  assert.deepEqual(filterEvents(events, { statusFilter: 'ARQUIVADO' }), [archived])
  assert.equal(getEventStatusCounts(events).arquivados, 1)
  assert.equal(getEventStatusCounts(events).todos, 1)
})
