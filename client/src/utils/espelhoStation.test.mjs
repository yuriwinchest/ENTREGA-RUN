import test from 'node:test'
import assert from 'node:assert/strict'
import {
  espelhoChannelFromSearch,
  espelhoStationUrl,
  getEspelhoStationId,
  isEspelhoStationMessage,
} from './espelhoStation.js'
import { publishEspelhoState } from './espelhoSync.js'

const CANAL_A = 'a'.repeat(64)
const CANAL_B = 'b'.repeat(64)

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = String(value) }, data }
}

test('aparelho guarda um guichê estável e recusa valor adulterado no armazenamento', () => {
  const storage = memoryStorage({ entregas_run_posto_id: 'nao-e-uuid' })
  const id = getEspelhoStationId(storage, () => '6da73bcb-e925-498a-917d-d785b1d20251')
  assert.equal(id, '6da73bcb-e925-498a-917d-d785b1d20251')
  assert.equal(getEspelhoStationId(storage, () => 'outro'), id)
})

test('link do guichê leva o canal; link antigo segue sem canal', () => {
  assert.equal(espelhoStationUrl('https://app.example', 'ev 1', CANAL_A), `https://app.example/espelho/ev%201?canal=${CANAL_A}`)
  assert.equal(espelhoChannelFromSearch(`?canal=${CANAL_A}`), CANAL_A)
  assert.equal(espelhoChannelFromSearch('?canal=forjado'), '')
  assert.equal(espelhoChannelFromSearch(''), '')
})

test('tela do guichê ignora a ficha de outro guichê aberta no mesmo navegador', () => {
  const message = { type: 'STATE_CHANGE', eventId: 'ev', canalId: CANAL_A }
  assert.equal(isEspelhoStationMessage(message, 'ev', CANAL_A), true)
  assert.equal(isEspelhoStationMessage(message, 'ev', CANAL_B), false)
  assert.equal(isEspelhoStationMessage(message, 'outro', CANAL_A), false)
  // O link antigo acompanha qualquer guichê do mesmo evento.
  assert.equal(isEspelhoStationMessage(message, 'ev', ''), true)
  assert.equal(isEspelhoStationMessage(message, 'outro', ''), false)
})

test('atendimento só é publicado com o canal do guichê', async () => {
  const calls = []
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url) => { calls.push(url); return { ok: true, json: async () => ({ ok: true }) } }
  try {
    assert.equal(await publishEspelhoState('ev', { status: 'ATENDENDO', atleta: { nome: 'X' } }), false)
    assert.equal(calls.length, 0)
    assert.equal(await publishEspelhoState('ev', { status: 'ATENDENDO', atleta: { nome: 'X' } }, CANAL_A), true)
    assert.equal(calls[0], `/api/espelho/ev/estado?canal=${CANAL_A}`)
  } finally {
    globalThis.fetch = realFetch
  }
})
