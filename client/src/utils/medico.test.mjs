import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildHealthFields,
  canBeHealthColumn,
  countByStatus,
  isIdentifyingColumn,
  prefillHealthSelection,
  elapsedLabel,
  emergencyUrl,
  formatPhone,
  mapsUrl,
  maskPhoneInput,
  newArrivals,
  sortQueue,
} from './medico.js'

test('fila: abertas antes, mais grave primeiro, empate pela mais antiga', () => {
  const queue = sortQueue([
    { id: 'a', status: 'ENCERRADA', gravidade: 'CRITICA', criadaEm: '2026-10-20T10:00:00Z' },
    { id: 'b', status: 'ABERTA', gravidade: 'LEVE', criadaEm: '2026-10-20T09:00:00Z' },
    { id: 'c', status: 'EM_ATENDIMENTO', gravidade: 'CRITICA', criadaEm: '2026-10-20T09:00:00Z' },
    { id: 'd', status: 'ABERTA', gravidade: 'GRAVE', criadaEm: '2026-10-20T09:30:00Z' },
    { id: 'e', status: 'ABERTA', gravidade: 'GRAVE', criadaEm: '2026-10-20T09:10:00Z' },
  ])
  assert.deepEqual(queue.map((item) => item.id), ['e', 'd', 'b', 'c', 'a'])
  assert.deepEqual(countByStatus(queue), { ABERTA: 3, EM_ATENDIMENTO: 1, ENCERRADA: 1 })
})

test('alerta só para ocorrência que não estava na leitura anterior', () => {
  assert.deepEqual(newArrivals(null, [{ id: 'a' }]), [], 'primeira carga não toca alarme')
  assert.deepEqual(newArrivals(new Set(['a']), [{ id: 'a' }, { id: 'b' }]), ['b'])
})

test('tempo de espera legível', () => {
  const now = Date.parse('2026-10-20T10:00:00Z')
  assert.equal(elapsedLabel('2026-10-20T09:59:40Z', now), 'agora')
  assert.equal(elapsedLabel('2026-10-20T09:48:00Z', now), 'há 12 min')
  assert.equal(elapsedLabel('2026-10-20T08:00:00Z', now), 'há 2 h')
  assert.equal(elapsedLabel('2026-10-20T08:45:00Z', now), 'há 1 h 15 min')
  assert.equal(elapsedLabel('lixo', now), '')
})

test('telefone e links', () => {
  assert.equal(formatPhone('51999990000'), '(51) 99999-0000')
  assert.equal(formatPhone('5551999990000'), '(51) 99999-0000')
  assert.equal(formatPhone('5133334444'), '(51) 3333-4444')
  assert.equal(maskPhoneInput('5199999'), '(51) 9999-9')
  assert.equal(maskPhoneInput('51999990000123'), '(51) 99999-0000')
  assert.equal(mapsUrl({ lat: -30.03, lng: -51.22 }), 'https://www.google.com/maps/search/?api=1&query=-30.03,-51.22')
  assert.equal(mapsUrl(null), '')
  assert.equal(emergencyUrl('https://app.entregasrun.com.br/', 'event-1'), 'https://app.entregasrun.com.br/emergencia/event-1')
})

test('importação: colunas de saúde, públicas e reimportação', () => {
  const headers = ['NOME', 'ALERGIA', 'TELEFONE EMERGÊNCIA', 'Remédio controlado', 'OBS']
  const mapping = { 0: 'nome', 1: 'custom:ALERGIA', 2: 'custom:TELEFONE EMERGÊNCIA', 3: 'custom:Remédio controlado', 4: 'ignore' }
  const selection = {
    0: { saude: true, publico: true },
    1: { saude: true, publico: true },
    2: { saude: true, publico: true },
    3: { saude: true, publico: false },
    4: { saude: true, publico: true },
  }
  assert.deepEqual(buildHealthFields(headers, mapping, selection), [
    { key: 'ALERGIA', label: 'ALERGIA', publico: true },
    { key: 'TELEFONE EMERGÊNCIA', label: 'TELEFONE EMERGÊNCIA', publico: false },
    { key: 'Remédio controlado', label: 'Remédio controlado', publico: false },
  ])
  assert.equal(canBeHealthColumn('nome'), false)
  assert.equal(canBeHealthColumn('ignore'), true)
  assert.equal(canBeHealthColumn('custom:X'), true)
  assert.equal(isIdentifyingColumn('E-mail do atleta'), true)
  assert.equal(isIdentifyingColumn('Doença celíaca'), false)
  assert.deepEqual(
    prefillHealthSelection(['alergia', 'remedio controlado', 'EQUIPE'], [{ key: 'ALERGIA', publico: true }, { key: 'Remédio controlado', publico: false }]),
    { 0: { saude: true, publico: true }, 1: { saude: true, publico: false } },
  )
})
