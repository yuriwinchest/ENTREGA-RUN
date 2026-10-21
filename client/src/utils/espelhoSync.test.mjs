import test from 'node:test'
import assert from 'node:assert/strict'
import { getEspelhoConfig, saveEspelhoConfig, getEspelhoEditor, publishEspelhoState } from './espelhoSync.js'

const realFetch = globalThis.fetch
const storage = new Map()
globalThis.localStorage = { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) }
const ok = () => ({ ok: true, json: async () => ({ ok: true }) })
test.after(() => { globalThis.fetch = realFetch; delete globalThis.localStorage })

test('quota failure retains both images without deleting unrelated storage', () => {
  globalThis.localStorage.setItem = () => { throw new DOMException('quota', 'QuotaExceededError') }
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    saveEspelhoConfig('quota-test', { bgImage: 'photo', logo: 'logo' }, false)
    assert.equal(getEspelhoConfig('quota-test').bgImage, 'photo')
    assert.equal(getEspelhoConfig('quota-test').logo, 'logo')
  } finally { console.warn = originalWarn; globalThis.localStorage.setItem = (k, v) => storage.set(k, v) }
})

test('appearance publish does not clear live athlete or status', async () => {
  let payload
  globalThis.fetch = async (_url, options) => { payload = JSON.parse(options.body); return ok() }
  assert.equal(await publishEspelhoState('config-only', { config: { mensagem: 'Bem-vindo' } }), true)
  assert.equal(Object.hasOwn(payload, 'status'), false)
  assert.equal(Object.hasOwn(payload, 'atleta'), false)
})

test('queue survives closing, isolates events and never marks pending save complete on remote load', async () => {
  let complete
  globalThis.fetch = (_url, options) => options.method === 'POST'
    ? new Promise((resolve) => { complete = resolve })
    : Promise.resolve({ ok: true, json: async () => ({ state: null }) })
  const a = getEspelhoEditor('event-a')
  a.applyRemote({ config: { mensagem: 'Original' } })
  const stop = a.subscribe(() => {})
  const saving = a.update({ bgImage: 'new-photo' }, 'A')
  await Promise.resolve()
  stop()
  const b = getEspelhoEditor('event-b')
  b.applyRemote({ config: { mensagem: 'Evento B' } })
  assert.equal(getEspelhoEditor('event-a'), a)
  await a.load()
  a.applyRemote({ config: { mensagem: 'Stale GET' } })
  assert.equal(a.snapshot().status, 'saving')
  assert.equal(a.snapshot().config.bgImage, 'new-photo')
  complete(ok())
  assert.equal(await saving, true)
  assert.equal(a.snapshot().status, 'saved')
  assert.equal(getEspelhoConfig('event-a').bgImage, 'new-photo')
  assert.equal(b.snapshot().config.mensagem, 'Evento B')
})

test('failed patch stays visible until explicit retry and retry recovers all edits', async () => {
  const calls = []
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body).config)
    return calls.length === 1 ? { ok: false, json: async () => ({ ok: false }) } : ok()
  }
  const editor = getEspelhoEditor('retry')
  editor.applyRemote({ config: { mensagem: 'Original' } })
  const first = editor.update({ bgImage: 'photo' })
  const second = editor.update({ logo: 'logo' })
  assert.deepEqual(await Promise.all([first, second]), [false, true])
  assert.equal(editor.snapshot().status, 'error')
  await editor.load()
  editor.applyRemote({ config: { bgImage: null } })
  assert.equal(editor.snapshot().config.bgImage, 'photo')
  await editor.retry()
  assert.equal(editor.snapshot().status, 'saved')
  assert.equal(calls[2].bgImage, 'photo')
  assert.equal(calls[2].logo, 'logo')
  assert.equal(Object.hasOwn(calls[2], 'mensagem'), false)
})

test('SSE newer than initial GET wins even when GET finishes late', async () => {
  let complete
  globalThis.fetch = () => new Promise((resolve) => { complete = resolve })
  const editor = getEspelhoEditor('late-get')
  const load = editor.load()
  editor.applyRemote({ config: { mensagem: 'New SSE' } })
  complete({ ok: true, json: async () => ({ state: { config: { mensagem: 'Old GET' } } }) })
  await load
  assert.equal(editor.snapshot().config.mensagem, 'New SSE')
})


test('partial appearance broadcast preserves media and field choices in another modal', () => {
  const editor = getEspelhoEditor('partial-local')
  editor.applyRemote({ config: { bgImage: 'background', logo: 'logo', visibleFields: ['nome'] } })
  const patch = { mensagem: 'Novo texto' }
  editor.applyRemote({ config: { ...editor.snapshot().config, ...patch } })
  assert.equal(editor.snapshot().config.bgImage, 'background')
  assert.equal(editor.snapshot().config.logo, 'logo')
  assert.deepEqual(editor.snapshot().config.visibleFields, ['nome'])
})


test('settled save reconciles remote fields changed concurrently on another device', async () => {
  const editor = getEspelhoEditor('concurrent-reconcile')
  editor.applyRemote({ config: { bgImage: 'old-background' } })
  globalThis.fetch = async (_url, options) => options.method === 'POST' ? ok() : ({
    ok: true,
    json: async () => ({ state: { config: { bgImage: 'new-background-remote', mensagem: 'Local message' } } }),
  })
  await editor.update({ mensagem: 'Local message' })
  assert.equal(editor.snapshot().config.bgImage, 'new-background-remote')
  assert.equal(editor.snapshot().config.mensagem, 'Local message')
})

test('foto de celular: limite do arquivo bruto e tipos HEIC/vazio deixados para a decodificação', async () => {
  const { checkImageFile, MAX_RAW_IMAGE_BYTES } = await import('./espelhoSync.js')
  assert.equal(checkImageFile({ type: 'image/jpeg', size: 8 * 1024 * 1024 }), '', 'foto de 8 MB passa')
  assert.equal(checkImageFile({ type: 'image/heic', size: 3 * 1024 * 1024 }), '', 'HEIC tenta decodificar')
  assert.equal(checkImageFile({ type: '', size: 3 * 1024 * 1024 }), '', 'tipo vazio tenta decodificar')
  assert.ok(checkImageFile({ type: 'application/pdf', size: 1000 }))
  assert.ok(checkImageFile({ type: 'image/jpeg', size: MAX_RAW_IMAGE_BYTES + 1 }))
  assert.ok(checkImageFile(null))
})
