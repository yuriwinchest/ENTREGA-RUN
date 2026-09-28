import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDailyDeliveries,
  deliveryDayKey,
  raceDayKey,
  suggestDailyTarget,
  todayKey,
} from './dailyDeliveries.js'

test('lê a data da entrega no formato gravado pelo sistema e em ISO', () => {
  assert.equal(deliveryDayKey('28/09/2026, 14:08:47'), '2026-09-28')
  assert.equal(deliveryDayKey('2026-09-28T17:08:47.000Z'), '2026-09-28')
  assert.equal(deliveryDayKey('Entregue'), null)
  assert.equal(raceDayKey({ date: '04/10/2026' }), '2026-10-04')
})

test('hoje é calculado no fuso de Brasília', () => {
  assert.equal(todayKey(Date.UTC(2026, 8, 29, 2, 30)), '2026-09-28')
  assert.equal(todayKey(Date.UTC(2026, 8, 29, 3, 30)), '2026-09-29')
})

test('agrupa entregas por dia com quem entregou, em ordem cronológica', () => {
  const days = buildDailyDeliveries([
    { status: 'ENTREGUE', entregueEm: '29/09/2026, 09:00:00', entreguePor: 'Bia' },
    { status: 'ENTREGUE', entregueEm: '28/09/2026, 10:00:00', entreguePor: 'Ana' },
    { status: 'ENTREGUE', entregueEm: '28/09/2026, 11:00:00', entreguePor: 'Bia' },
    { status: 'ENTREGUE', entregueEm: '28/09/2026, 12:00:00', entreguePor: 'BIA' },
    { status: 'ENTREGUE', entregueEm: '28/09/2026, 13:00:00' },
    { status: 'PENDENTE' },
    { status: 'ENTREGUE', entregueEm: 'sem data' },
  ])
  assert.deepEqual(days.map((d) => [d.label, d.total]), [['28/09', 4], ['29/09', 1]])
  assert.deepEqual(days[0].operators, [
    { name: 'BIA', count: 2 },
    { name: 'ANA', count: 1 },
    { name: 'NÃO INFORMADO', count: 1 },
  ])
})

test('meta diária divide os pendentes pelos dias até a véspera da corrida', () => {
  assert.deepEqual(suggestDailyTarget({ pending: 300, raceKey: '2026-10-04', today: '2026-09-28' }), { status: 'ativo', daysLeft: 6, target: 50 })
  assert.deepEqual(suggestDailyTarget({ pending: 301, raceKey: '2026-10-04', today: '2026-09-28' }), { status: 'ativo', daysLeft: 6, target: 51 })
  assert.deepEqual(suggestDailyTarget({ pending: 40, raceKey: '2026-10-04', today: '2026-10-04' }), { status: 'ativo', daysLeft: 1, target: 40 })
  assert.equal(suggestDailyTarget({ pending: 40, raceKey: '2026-10-04', today: '2026-10-05' }).status, 'encerrado')
  assert.equal(suggestDailyTarget({ pending: 0, raceKey: '2026-10-04', today: '2026-09-28' }).status, 'concluido')
  assert.equal(suggestDailyTarget({ pending: 10, raceKey: null, today: '2026-09-28' }).status, 'sem-data')
})
