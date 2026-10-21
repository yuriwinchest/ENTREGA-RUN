import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  athleteKey,
  athleteRef,
  createMedicoStore,
  healthView,
  isIdentifyingColumn,
  isNegativeAnswer,
  MAX_HEALTH_FIELDS,
  sanitizeHealthFields,
  searchAthletes,
  validateOcorrencia,
  withoutHealthFields,
} from './medico.js'

const athletes = [
  { id: 'import-1-2', numero: '1', nome: 'ELIUD KIPCHOGE', doc: '123.456.789-09', modalidade: '42K' },
  { id: 'import-1-3', numero: '0007', nome: 'JOÃO DA SILVA', doc: '', modalidade: '10K' },
  ...Array.from({ length: 8 }, (_, i) => ({ id: `x-${i}`, numero: String(100 + i), nome: `MARIA SOUZA ${i}`, doc: '', modalidade: '5K' })),
]

test('colunas de saúde: identificação nunca fica pública', () => {
  const fields = sanitizeHealthFields([
    { key: 'ALERGIA', label: 'Alergia a medicamento', publico: true },
    { key: 'ALERGIA', label: 'Duplicada', publico: true },
    { key: 'TELEFONE EMERGÊNCIA', publico: true },
    { key: 'CONTATO DE EMERGÊNCIA', publico: true },
    { key: 'E-mail', publico: true },
    { key: 'Endereço', publico: true },
    { key: 'Data de nascimento', publico: true },
    { key: 'CPF do responsável', publico: true },
    { key: 'Doença celíaca?', publico: true },
    { key: 'Tipo sanguíneo', publico: false },
    { key: '' },
    'lixo',
  ])
  assert.deepEqual(fields.map((f) => [f.key, f.publico]), [
    ['ALERGIA', true],
    ['TELEFONE EMERGÊNCIA', false],
    ['CONTATO DE EMERGÊNCIA', false],
    ['E-mail', false],
    ['Endereço', false],
    ['Data de nascimento', false],
    ['CPF do responsável', false],
    ['Doença celíaca?', true],
    ['Tipo sanguíneo', false],
  ])
  assert.equal(fields[0].label, 'Alergia a medicamento')
  assert.equal(isIdentifyingColumn('Hotel'), false)
  assert.equal(sanitizeHealthFields(Array.from({ length: 60 }, (_, i) => ({ key: `C${i}` }))).length, MAX_HEALTH_FIELDS)
})

test('visão de saúde: pública só com marcadas e preenchidas; médico vê todas', () => {
  const fields = sanitizeHealthFields([
    { key: 'ALERGIA', publico: true },
    { key: 'REMEDIO', publico: true },
    { key: 'DOENCA', publico: true },
    { key: 'OBS MEDICA', publico: false },
  ])
  const athlete = { customFields: { ALERGIA: 'Sim, dipirona', REMEDIO: '', DOENCA: 'Não', 'OBS MEDICA': 'Marcapasso', EQUIPE: 'X' } }
  assert.deepEqual(healthView(athlete, fields, { publicOnly: true }).map((r) => [r.key, r.value, r.alerta]), [
    ['ALERGIA', 'Sim, dipirona', true],
    ['DOENCA', 'Não', false],
  ])
  assert.deepEqual(healthView(athlete, fields).map((r) => r.key), ['ALERGIA', 'REMEDIO', 'DOENCA', 'OBS MEDICA'])
  assert.deepEqual(withoutHealthFields(athlete.customFields, fields), { EQUIPE: 'X' })
  assert.deepEqual(withoutHealthFields(null, fields), {})
})

test('resposta negativa não ganha destaque', () => {
  for (const value of ['Não', 'nao', 'N', 'Nenhuma', 'nada consta', '-', '', 'Sem alergia', 'N/A']) {
    assert.equal(isNegativeAnswer(value), true, value)
  }
  for (const value of ['Sim', 'Dipirona', 'Nefrite', 'Asma leve']) {
    assert.equal(isNegativeAnswer(value), false, value)
  }
})

test('chave do atleta sobrevive a reimportação; ref não expõe CPF', () => {
  const reimported = { ...athletes[0], id: 'import-2-9' }
  assert.equal(athleteKey('ev1', athletes[0]), athleteKey('ev1', reimported))
  assert.notEqual(athleteKey('ev1', athletes[0]), athleteKey('ev2', athletes[0]))
  const ref = athleteRef('ev1', athletes[0])
  assert.match(ref, /^[0-9a-f]{20}$/)
  assert.ok(!ref.includes('12345678909'))
})

test('busca: peito exato, CPF completo, nome limitado a 5', () => {
  assert.deepEqual(searchAthletes(athletes, '1').matches.map((a) => a.numero), ['1'])
  assert.deepEqual(searchAthletes(athletes, '7').matches.map((a) => a.numero), ['0007'])
  assert.equal(searchAthletes(athletes, '123.456.789-09').kind, 'cpf')
  assert.equal(searchAthletes(athletes, '12345678909').matches[0].nome, 'ELIUD KIPCHOGE')
  assert.equal(searchAthletes(athletes, '123456789').matches.length, 0, 'CPF parcial não encontra')
  assert.equal(searchAthletes(athletes, 'joao silva').matches[0].numero, '0007')
  const many = searchAthletes(athletes, 'maria souza')
  assert.equal(many.matches.length, 5)
  assert.equal(many.truncated, true)
  assert.equal(searchAthletes(athletes, 'ma').kind, 'curto')
  assert.equal(searchAthletes(athletes, '').kind, 'vazio')
})

test('ocorrência: valida campos obrigatórios e coordenadas', () => {
  const base = { gravidade: 'GRAVE', solicitanteNome: 'Ana', solicitanteTelefone: '(51) 99999-0000', descricao: 'Caiu no km 12' }
  assert.equal(validateOcorrencia({ ...base, gravidade: 'X' }).error, 'Selecione o nível de gravidade.')
  assert.ok(validateOcorrencia({ ...base, solicitanteTelefone: '9999' }).error)
  const ok = validateOcorrencia({ ...base, geo: { lat: -30.0346471, lng: -51.2176584, accuracy: 12.7 }, athleteRef: 'nao-hex' })
  assert.equal(ok.value.solicitanteTelefone, '51999990000')
  assert.deepEqual(ok.value.geo, { lat: -30.034647, lng: -51.217658, accuracy: 13 })
  assert.equal(ok.value.athleteRef, null)
  assert.equal(validateOcorrencia({ ...base, geo: { lat: 200, lng: 0 } }).value.geo, null)
})

test('ocorrências persistem, versão sobe e exclusão do evento apaga', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-medico-'))
  try {
    const store = createMedicoStore(dir)
    const created = store.addOcorrencia('ev1', { gravidade: 'LEVE', descricao: 'Bolha' })
    assert.equal(created.protocolo, 1)
    assert.equal(store.version('ev1'), 1)
    store.updateStatus('ev1', created.id, 'EM_ATENDIMENTO', 'DRA. ANA')

    const reopened = createMedicoStore(dir)
    const [saved] = reopened.listOcorrencias('ev1')
    assert.equal(saved.status, 'EM_ATENDIMENTO')
    assert.deepEqual(saved.historico.map((h) => h.status), ['ABERTA', 'EM_ATENDIMENTO'])
    assert.equal(reopened.version('ev1'), 2)
    assert.equal(reopened.addOcorrencia('ev1', { gravidade: 'LEVE' }).protocolo, 2)

    reopened.deleteEvent('ev1')
    assert.deepEqual(fs.readdirSync(path.join(dir, 'medico')), [])
    assert.deepEqual(createMedicoStore(dir).listOcorrencias('ev1'), [])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
