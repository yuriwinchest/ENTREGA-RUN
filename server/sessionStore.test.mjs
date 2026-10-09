import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createSessionStore } from './sessionStore.js'

test('sessão sobrevive a um restart e o arquivo não guarda o token', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sessoes-'))
  const file = path.join(dir, 'sessions.json')
  const token = 'token-secreto-abc'
  const first = createSessionStore(file)
  first.set(token, { userId: 'u1', role: 'OPERADOR', expiresAt: Date.now() + 60_000 })
  first.flushNow()

  const raw = fs.readFileSync(file, 'utf8')
  assert.equal(raw.includes(token), false)

  const restarted = createSessionStore(file)
  assert.equal(restarted.get(token)?.userId, 'u1')
  assert.equal(restarted.get('outro-token'), null)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('expiradas, logout e revogação por usuário somem também do disco', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sessoes-'))
  const file = path.join(dir, 'sessions.json')
  const store = createSessionStore(file)
  store.set('velha', { userId: 'u1', expiresAt: Date.now() - 1 })
  store.set('ativa', { userId: 'u1', expiresAt: Date.now() + 60_000 })
  store.set('outra', { userId: 'u2', expiresAt: Date.now() + 60_000 })
  assert.equal(store.get('velha'), null)
  store.revokeUser('u1')
  store.delete('outra')
  store.flushNow()
  const reloaded = createSessionStore(file)
  assert.equal(reloaded.size, 0)
  fs.rmSync(dir, { recursive: true, force: true })
})
