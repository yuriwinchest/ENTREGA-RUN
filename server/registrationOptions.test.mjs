import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createRegistrationOptionsStore, eligibleCustomOptionFields, isEligibleCustomOptionField, STANDARD_OPTION_LIMITS } from './registrationOptions.js'

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registration-options-unit-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return { dir, store: createRegistrationOptionsStore(dir), file: path.join(dir, 'registration_options.json') }
}

test('catálogo mantém a primeira grafia, deduplica Unicode, caixa e espaços, e sobrevive ao reinício', (t) => {
  const { dir, store, file } = fixture(t)
  assert.deepEqual(store.add('org-a', 'equipe', '  Café   Run  '), { field: 'equipe', value: 'Café Run', created: true })
  assert.deepEqual(store.add('org-a', 'equipe', 'CAFE\u0301 RUN'), { field: 'equipe', value: 'Café Run', created: false })
  assert.equal(store.add('org-a', 'equipe', 'Ｃａｆé　Ｒｕｎ').created, false)
  assert.deepEqual(store.list('org-a', ['equipe']), { equipe: ['Café Run'] })
  assert.deepEqual(createRegistrationOptionsStore(dir).list('org-a', ['equipe']), { equipe: ['Café Run'] })
  assert.ok(fs.statSync(file).isFile())
})

test('catálogos e campos são isolados e somente os campos pedidos são lidos', (t) => {
  const { store } = fixture(t)
  store.add('', 'equipe', 'ACERVO PRINCIPAL')
  store.add('org-a', 'equipe', 'EQUIPE A')
  store.add('org-a', 'categoria', 'MASTERS')
  store.add('org-b', 'equipe', 'EQUIPE B')
  assert.deepEqual(store.list('org-a', ['equipe']), { equipe: ['EQUIPE A'] })
  assert.deepEqual(store.list('org-b', ['equipe']), { equipe: ['EQUIPE B'] })
  assert.deepEqual(store.list('', ['equipe']), { equipe: ['ACERVO PRINCIPAL'] })
  assert.throws(() => store.list('org-a', ['constructor', '__proto__']), (error) => error.status === 400)
})

test('limites acompanham os campos integrados; enums e valores inválidos são recusados', (t) => {
  const { store } = fixture(t)
  assert.equal(STANDARD_OPTION_LIMITS.equipe, 128)
  assert.equal(STANDARD_OPTION_LIMITS.camiseta, 32)
  for (const field of ['modalidade', 'categoria', 'kit']) assert.equal(STANDARD_OPTION_LIMITS[field], 64)
  for (const [field, value] of [
    ['equipe', ''], ['equipe', '   '], ['equipe', '—'], ['equipe', 'SEM EQUIPE'],
    ['equipe', 'Nome\nOutro'], ['equipe', 'Nome\tOutro'], ['equipe', 'a\u0000b'],
    ['equipe', {}], ['equipe', 123], ['status', 'NOVO'], ['role', 'ADMIN'],
    ['sexo', 'X'], ['constructor', 'X'], ['__proto__', 'X'], ['camiseta', 'X'.repeat(33)],
    ['equipe', 'X'.repeat(129)], ['categoria', 'X'.repeat(65)],
  ]) assert.throws(() => store.add('', field, value), (error) => error.status === 400, `${field}: ${String(value)}`)
  assert.equal(store.add('', 'camiseta', 'X'.repeat(32)).created, true)
  assert.equal(store.add('', 'equipe', 'X'.repeat(128)).created, true)
})

test('campos personalizados elegíveis excluem dados de saúde e campos técnicos', () => {
  const columns = [
    { key: 'custom:BATERIA', customKey: 'BATERIA', label: 'Bateria', type: 'custom' },
    { key: 'custom:ALERGIA', customKey: 'ALERGIA', label: 'Alergia', type: 'custom' },
    { key: 'nome', label: 'Nome', type: 'standard' },
  ]
  const healthFields = [{ key: 'ALERGIA', label: 'Alergia', publico: false }]
  assert.equal(isEligibleCustomOptionField(columns[0], healthFields), true)
  assert.equal(isEligibleCustomOptionField(columns[1], healthFields), false)
  assert.equal(isEligibleCustomOptionField(columns[2], healthFields), false)
  assert.deepEqual(eligibleCustomOptionFields({ schema: columns, healthFields }), ['BATERIA'])
})

test('arquivo corrompido falha fechado sem ser sobrescrito', (t) => {
  const { dir, file } = fixture(t)
  const corrupted = '{ isto não é JSON'
  fs.writeFileSync(file, corrupted)
  const store = createRegistrationOptionsStore(dir)
  assert.throws(() => store.list('', ['equipe']), (error) => error.status === 503)
  assert.throws(() => store.add('', 'equipe', 'NÃO GRAVAR'), (error) => error.status === 503)
  assert.equal(fs.readFileSync(file, 'utf8'), corrupted)
})

test('falha de escrita não confirma a opção nem altera o catálogo em memória', (t) => {
  const { store, file } = fixture(t)
  store.add('', 'equipe', 'ANTERIOR')
  const before = fs.readFileSync(file, 'utf8')
  const rename = fs.renameSync
  try {
    fs.renameSync = () => { throw Object.assign(new Error('falha de rename simulada'), { code: 'EACCES' }) }
    assert.throws(() => store.add('', 'equipe', 'NÃO GRAVAR'), (error) => error.status === 503)
  } finally {
    fs.renameSync = rename
  }
  assert.equal(fs.readFileSync(file, 'utf8'), before)
  assert.equal(store.add('', 'equipe', 'GRAVADA').created, true)
  assert.deepEqual(store.list('', ['equipe']), { equipe: ['ANTERIOR', 'GRAVADA'] })
  assert.equal(fs.readdirSync(path.dirname(file)).some((name) => name.endsWith('.tmp')), false)
})

test('reidratação mescla lote remoto sem apagar adições locais ou outra organização', (t) => {
  const { store, file } = fixture(t)
  store.add('org-a', 'equipe', 'LOCAL')
  store.add('org-b', 'equipe', 'OUTRA ORGANIZAÇÃO')
  assert.equal(store.merge('org-a', [{ field: 'equipe', value: 'REMOTA' }, { field: 'equipe', value: ' remota ' }, { field: 'categoria', value: 'MASTER' }]), 2)
  assert.deepEqual(store.list('org-a', ['equipe', 'categoria']), { equipe: ['LOCAL', 'REMOTA'], categoria: ['MASTER'] })
  assert.deepEqual(store.list('org-b', ['equipe']), { equipe: ['OUTRA ORGANIZAÇÃO'] })
  const before = fs.readFileSync(file, 'utf8')
  assert.throws(() => store.merge('org-a', [{ field: 'equipe', value: 'NOVA' }, { field: 'status', value: 'LIVRE' }]))
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'lote inválido não grava parcialmente')
})
