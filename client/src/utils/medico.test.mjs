import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildHealthFields,
  calculateAge,
  canBeHealthColumn,
  countByStatus,
  isIdentifyingColumn,
  formatAge,
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

test('cálculo e formatação de idade: explícita, nascimento e fallbacks', () => {
  const ref = new Date(2026, 9, 21) // 21 de Outubro de 2026

  // Aniversário já passou este ano
  assert.equal(calculateAge({ nascimento: '22/08/1995' }, ref), 31)
  // Aniversário ainda não chegou este ano
  assert.equal(calculateAge({ nascimento: '22/12/1995' }, ref), 30)
  // Aniversário é exatamente hoje
  assert.equal(calculateAge({ nascimento: '21/10/1995' }, ref), 31)
  // Formato ISO
  assert.equal(calculateAge({ nascimento: '1990-05-15' }, ref), 36)
  // Idade explícita numérica tem prioridade
  assert.equal(calculateAge({ idade: 42, nascimento: '22/08/1995' }, ref), 42)
  // Idade explícita em string
  assert.equal(calculateAge({ idade: ' 50 anos ' }, ref), 50)
  // Campo de nascimento em customFields
  assert.equal(calculateAge({ customFields: { 'DATA DE NASCIMENTO': '10/01/2000' } }, ref), 26)
  // Idade em customFields
  assert.equal(calculateAge({ customFields: { IDADE: 28 } }, ref), 28)
  // Data inválida ou vazia retorna null
  assert.equal(calculateAge(null, ref), null)
  assert.equal(calculateAge({}, ref), null)
  assert.equal(calculateAge({ nascimento: 'invalido' }, ref), null)
  assert.equal(calculateAge({ nascimento: '32/13/2000' }, ref), null)
  // Data futura retorna null
  assert.equal(calculateAge({ nascimento: '01/01/2030' }, ref), null)

  // Formatação
  assert.equal(formatAge(31), '31 anos')
  assert.equal(formatAge(1), '1 ano')
  assert.equal(formatAge(0), '0 anos')
  assert.equal(formatAge(null), '')
  assert.equal(formatAge(''), '')
})
