import assert from 'node:assert/strict'
import test from 'node:test'
import { isAppwriteEnabled, persistEventToAppwrite } from './appwrite.js'

test('APPWRITE_ENABLED=false bloqueia o conector mesmo quando existem credenciais no ambiente', async () => {
  const keys = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_ENABLED']
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  const fetch = globalThis.fetch
  try {
    Object.assign(process.env, { APPWRITE_ENDPOINT: 'https://invalid.example.test/v1', APPWRITE_PROJECT_ID: 'test', APPWRITE_API_KEY: 'fake-test-key', APPWRITE_ENABLED: 'false' })
    globalThis.fetch = () => { throw new Error('Teste tentou usar rede externa') }
    assert.equal(isAppwriteEnabled(), false)
    assert.deepEqual(await persistEventToAppwrite({ id: 'blocked-test' }), { ok: false, skipped: true })
  } finally {
    globalThis.fetch = fetch
    for (const key of keys) if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]
  }
})
