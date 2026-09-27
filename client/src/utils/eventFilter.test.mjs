import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isEventActive,
  isEventPlanejado,
  isEventFinalizado,
  getEventStatusCounts,
  filterEvents,
} from './eventFilter.js'

const MOCK_EVENTS = [
  { id: '1', name: 'TESTE', location: 'BELO HORIZONTE/MG', date: '25/09/2026', status: 'PLANEJADO', active: false },
  { id: '2', name: 'CORRIDA DA RENASCENÇA', location: 'POÇÃO/PE', date: '27/09/2026', status: 'FINALIZADO', active: false },
  { id: '3', name: 'MARATONA DO RECIFE', location: 'RECIFE/PE', date: '01/10/2026', status: 'EM OPERAÇÃO', active: true },
]

test('categorização de status de eventos', () => {
  assert.equal(isEventPlanejado(MOCK_EVENTS[0]), true)
  assert.equal(isEventActive(MOCK_EVENTS[0]), false)
  assert.equal(isEventFinalizado(MOCK_EVENTS[0]), false)

  assert.equal(isEventFinalizado(MOCK_EVENTS[1]), true)
  assert.equal(isEventActive(MOCK_EVENTS[1]), false)
  assert.equal(isEventPlanejado(MOCK_EVENTS[1]), false)

  assert.equal(isEventActive(MOCK_EVENTS[2]), true)
  assert.equal(isEventPlanejado(MOCK_EVENTS[2]), false)
  assert.equal(isEventFinalizado(MOCK_EVENTS[2]), false)
})

test('contagem de status de eventos', () => {
  const counts = getEventStatusCounts(MOCK_EVENTS)
  assert.equal(counts.planejados, 1)
  assert.equal(counts.finalizados, 1)
  assert.equal(counts.ativos, 1)
  assert.equal(counts.todos, 3)
})

test('filtro padrão ATIVOS exibe somente eventos em operação', () => {
  const result = filterEvents(MOCK_EVENTS, { statusFilter: 'ATIVOS' })
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'MARATONA DO RECIFE')
})

test('filtro PLANEJADO exibe somente eventos planejados', () => {
  const result = filterEvents(MOCK_EVENTS, { statusFilter: 'PLANEJADO' })
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'TESTE')
})

test('filtro FINALIZADO exibe somente eventos finalizados', () => {
  const result = filterEvents(MOCK_EVENTS, { statusFilter: 'FINALIZADO' })
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'CORRIDA DA RENASCENÇA')
})

test('filtro TODOS exibe todos os eventos cadastrados', () => {
  const result = filterEvents(MOCK_EVENTS, { statusFilter: 'TODOS' })
  assert.equal(result.length, 3)
})

test('filtro combinado com busca por texto', () => {
  const result = filterEvents(MOCK_EVENTS, { statusFilter: 'TODOS', search: 'renascença' })
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'CORRIDA DA RENASCENÇA')

  const noMatch = filterEvents(MOCK_EVENTS, { statusFilter: 'ATIVOS', search: 'renascença' })
  assert.equal(noMatch.length, 0)
})
