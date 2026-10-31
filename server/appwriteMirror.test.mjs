import assert from 'node:assert/strict'
import test from 'node:test'
import { persistAthletesToAppwrite, updateAthleteStatusInAppwrite } from './appwrite.js'

const keys = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_ENABLED']

async function withFakeAppwrite(respond, run) {
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  const fetch = globalThis.fetch
  const log = console.log
  const calls = []
  try {
    Object.assign(process.env, { APPWRITE_ENDPOINT: 'https://appwrite.invalid.test/v1', APPWRITE_PROJECT_ID: 'test', APPWRITE_API_KEY: 'fake-test-key' })
    delete process.env.APPWRITE_ENABLED
    console.log = () => {}
    globalThis.fetch = async (url, options) => {
      const body = options.body ? JSON.parse(options.body) : {}
      calls.push({ method: options.method, url, body })
      const status = respond({ method: options.method, url, body })
      return new Response('{}', { status })
    }
    await run(calls)
  } finally {
    globalThis.fetch = fetch
    console.log = log
    for (const key of keys) if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]
  }
}

const patches = (calls) => calls.filter((call) => call.method === 'PATCH').length
const athletes = () => [
  { id: 'a1', numero: '1', nome: 'UM', status: 'PENDENTE' },
  { id: 'a2', numero: '2', nome: 'DOIS', status: 'PENDENTE' },
  { id: 'a3', numero: '3', nome: 'TRES', status: 'PENDENTE' },
]

test('uma entrega grava só o atleta que mudou, não o evento inteiro', async () => {
  await withFakeAppwrite(() => 200, async (calls) => {
    const list = athletes()
    assert.equal((await persistAthletesToAppwrite('ev-diff', list)).successCount, 3)
    assert.equal(patches(calls), 3)

    await persistAthletesToAppwrite('ev-diff', athletes())
    assert.equal(patches(calls), 3, 'lista igual não grava nada')

    const delivered = athletes()
    delivered[1] = { ...delivered[1], status: 'ENTREGUE', entreguePor: 'OPERADOR' }
    await persistAthletesToAppwrite('ev-diff', delivered)
    assert.equal(patches(calls), 4)
    assert.equal(calls.at(-1).body.data.status, 'ENTREGUE')
  })
})

test('gravação que falhou volta no próximo envio', async () => {
  let fail = true
  await withFakeAppwrite(({ body }) => (fail && body.data?.bib_number === '2' ? 500 : 200), async (calls) => {
    const result = await persistAthletesToAppwrite('ev-retry', athletes())
    assert.equal(result.errorCount, 1)
    fail = false
    await persistAthletesToAppwrite('ev-retry', athletes())
    assert.deepEqual(calls.slice(3).map((call) => call.body.data.bib_number), ['2'])
  })
})

test('atualização parcial do status obriga a regravar o atleta no envio seguinte', async () => {
  await withFakeAppwrite(() => 200, async (calls) => {
    await persistAthletesToAppwrite('ev-status', athletes())
    await updateAthleteStatusInAppwrite('ev-status', '3', { status: 'ENTREGUE' })
    const before = patches(calls)
    await persistAthletesToAppwrite('ev-status', athletes())
    assert.equal(patches(calls) - before, 1)
  })
})

test('dois atletas com o mesmo nº gravam um documento só, o último da lista', async () => {
  await withFakeAppwrite(() => 200, async (calls) => {
    const list = [...athletes(), { id: 'a4', numero: '3', nome: 'QUATRO', status: 'PENDENTE' }]
    await persistAthletesToAppwrite('ev-repetido', list)
    assert.equal(patches(calls), 3)
    assert.ok(calls.some((call) => call.body.data?.name === 'QUATRO'))
    await persistAthletesToAppwrite('ev-repetido', list)
    assert.equal(patches(calls), 3)
  })
})
