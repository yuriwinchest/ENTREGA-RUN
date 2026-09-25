import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { hashPassword } from './passwords.js'

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function waitFor(predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await predicate()
    if (result) return result
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('Evento SSE não recebido no prazo')
}

async function openStream(base, token) {
  const controller = new AbortController()
  const response = await fetch(`${base}/api/events/stream`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal,
  })
  assert.equal(response.status, 200)
  const frames = []
  const reader = response.body.getReader()
  const pump = (async () => {
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          const type = frame.match(/^event:\s*(.+)$/m)?.[1]
          const data = frame.match(/^data:\s*(.+)$/m)?.[1]
          if (type && data) frames.push({ type, data: JSON.parse(data) })
          boundary = buffer.indexOf('\n\n')
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error
    }
  })()
  return { frames, close: async () => { controller.abort(); await pump } }
}

test('SSE autenticado avisa somente sessões autorizadas após salvar', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-live-'))
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  const adminPassword = 'test-admin-live'
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([
    { id: 'admin', name: 'Admin', email: 'admin@example.com', passwordHash: hashPassword(adminPassword), role: 'ADMIN', eventId: 'all', status: 'ATIVO' },
    { id: 'operator', name: 'Operador', email: 'operator@example.com', passwordHash: hashPassword('test-operator-live'), role: 'OPERADOR', eventId: 'event-a', status: 'ATIVO' },
  ]))
  fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify([
    { id: 'event-a', name: 'Evento A', status: 'EM OPERAÇÃO' },
    { id: 'event-b', name: 'Evento B', status: 'EM OPERAÇÃO' },
  ]))
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_PASSWORD: adminPassword, APPWRITE_ENABLED: 'false' },
    stdio: 'ignore',
  })
  const streams = []
  const request = async (route, method = 'GET', body, token) => {
    const response = await fetch(`${base}${route}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }
  try {
    await waitFor(() => child.exitCode === null && fetch(`${base}/api/health`).then((r) => r.ok).catch(() => false), 5000)
    assert.equal((await request('/api/events/stream')).status, 401)
    const admin = await request('/api/login', 'POST', { email: 'admin@example.com', password: adminPassword })
    const operator = await request('/api/login', 'POST', { email: 'operator@example.com', password: 'test-operator-live' })
    assert.equal(admin.status, 200)
    assert.equal(operator.status, 200)
    const adminStream = await openStream(base, admin.data.token)
    const operatorStream = await openStream(base, operator.data.token)
    streams.push(adminStream, operatorStream)
    await waitFor(() => adminStream.frames[0]?.type === 'ready' && operatorStream.frames[0]?.type === 'ready')

    const athlete = { id: 'one', numero: '1', nome: 'Pessoa Teste', status: 'ENTREGUE' }
    assert.equal((await request('/api/events/event-a/athletes', 'POST', { athletes: [athlete] }, operator.data.token)).status, 200)
    await waitFor(() => adminStream.frames.length === 2 && operatorStream.frames.length === 2)
    assert.deepEqual(Object.keys(adminStream.frames[1].data).sort(), ['eventId', 'revision'])
    assert.equal(adminStream.frames[1].data.eventId, 'event-a')
    assert.equal(operatorStream.frames[1].data.eventId, 'event-a')

    assert.equal((await request('/api/events/event-b/athletes', 'POST', { athletes: [athlete] }, admin.data.token)).status, 200)
    await waitFor(() => adminStream.frames.length === 3)
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(operatorStream.frames.length, 2)

    assert.equal((await request('/api/events/event-a/athletes', 'POST', { athletes: null }, operator.data.token)).status, 400)
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(adminStream.frames.length, 3)
    assert.equal(operatorStream.frames.length, 2)
  } finally {
    await Promise.all(streams.map((stream) => stream.close()))
    child.kill()
    if (!path.resolve(dataDir).startsWith(path.resolve(os.tmpdir(), 'entregas-live-'))) throw new Error('Diretório temporário inesperado')
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
