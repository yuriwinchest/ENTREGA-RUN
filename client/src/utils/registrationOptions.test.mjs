import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeRegistrationOptions, optionIdentity, optionValueLimit } from './registrationOptions.js'
import { createRegistrationOption, fetchRegistrationOptions } from './registrationOptionsApi.js'

test('mesclar opções preserva ordem/grafia local, deduplica Unicode/espaços/caixa e não altera entradas', () => {
  const local = ['Invictus Race', '5 KM', '—', '']
  const remote = ['  INVICTUS   RACE ', '５ KM', 'Nova equipe']
  assert.deepEqual(mergeRegistrationOptions(local, remote), ['Invictus Race', '5 KM', 'Nova equipe'])
  assert.deepEqual(local, ['Invictus Race', '5 KM', '—', ''])
  assert.equal(optionIdentity('  Equipe   Ágil '), 'EQUIPE ÁGIL')
})

test('limites do editor respeitam os campos integrados e não consultam propriedades herdadas', () => {
  assert.equal(optionValueLimit('equipe'), 128)
  assert.equal(optionValueLimit('camiseta'), 32)
  for (const key of ['modalidade', 'categoria', 'kit', 'nacionalidade']) assert.equal(optionValueLimit(key), 64)
  assert.equal(optionValueLimit('custom:BATERIA'), 128)
  assert.equal(optionValueLimit('constructor'), 128)
})

test('API usa token operacional, codifica evento e transmite inclusão individual; falhas não viram sucesso', async () => {
  const previous = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, window: globalThis.window }
  const calls = []
  const expired = []
  try {
    globalThis.localStorage = { getItem(key) { assert.equal(key, 'entregas_run_token'); return 'local-test-token' } }
    globalThis.window = { dispatchEvent(event) { expired.push(event.type) } }
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options })
      return new Response(JSON.stringify({ ok: true, value: 'Equipe Nova', options: { equipe: ['Equipe Nova'] } }), { status: 201 })
    }
    assert.equal((await createRegistrationOption('ev/a', 'equipe', 'Equipe Nova')).value, 'Equipe Nova')
    assert.equal(calls[0].url, '/api/events/ev%2Fa/registration-options')
    assert.equal(calls[0].options.headers.Authorization, 'Bearer local-test-token')
    assert.deepEqual(JSON.parse(calls[0].options.body), { field: 'equipe', value: 'Equipe Nova' })
    await fetchRegistrationOptions('ev-a')
    assert.equal(calls[1].options.method, 'GET')
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, message: 'Catálogo indisponível' }), { status: 503 })
    await assert.rejects(createRegistrationOption('ev-a', 'equipe', 'Nova'), /Catálogo indisponível/)
    globalThis.fetch = async () => new Response('{}', { status: 401 })
    await assert.rejects(fetchRegistrationOptions('ev-a'))
    assert.deepEqual(expired, ['entregas-run:sessao-expirada'])
    globalThis.fetch = async () => { throw new Error('Sem conexão') }
    await assert.rejects(createRegistrationOption('ev-a', 'equipe', 'Nova'), /Sem conexão/)
  } finally { Object.assign(globalThis, previous) }
})
