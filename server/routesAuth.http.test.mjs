import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { readDeployCheckToken } from './deployCheck.js'

// O servidor grava as sessões ao receber SIGTERM: limpar a pasta antes de ele
// sair dá ENOTEMPTY no Linux. Espera o processo encerrar de fato.
async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  await new Promise((resolve) => {
    child.once('exit', resolve)
    child.kill()
  })
}

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

test('rotas de eventos e atletas exigem login; públicas seguem abertas', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-auth-'))
  fs.writeFileSync(path.join(dataDir, 'events.json'), '[]')
  const port = await freePort()
  const adminPassword = `t-${Date.now()}-senha`
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      APPWRITE_ENABLED: 'false',
      APPWRITE_API_KEY: '',
      APPWRITE_ENDPOINT: '',
      ADMIN_EMAIL: 'admin@teste.local',
      ADMIN_PASSWORD: adminPassword,
    },
    stdio: 'ignore',
  })
  const base = `http://127.0.0.1:${port}`
  const call = async (method, route, body, headers = {}) => {
    const response = await fetch(`${base}${route}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json().catch(() => null) }
  }
  const bearer = (token) => ({ authorization: `Bearer ${token}` })

  try {
    let ready = false
    for (let attempt = 0; attempt < 50 && !ready; attempt += 1) {
      try { ready = (await call('GET', '/api/health')).status === 200 } catch { /* subindo */ }
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.equal(ready, true, 'servidor local não subiu')

    const eventId = 'evt-auth'
    const athletes = [{ id: 'a1', numero: '101', nome: 'ANA', doc: '12345678900', status: 'PENDENTE' }]
    const closed = [
      ['GET', '/api/events'],
      ['POST', '/api/events', { id: eventId, name: 'AUTH' }],
      ['PUT', `/api/events/${eventId}`, { name: 'INVASOR' }],
      ['DELETE', `/api/events/${eventId}`],
      ['POST', '/api/events/sync', { events: [{ id: 'evt-intruso', name: 'INTRUSO' }] }],
      ['GET', `/api/events/${eventId}/athletes`],
      ['POST', `/api/events/${eventId}/athletes`, { athletes }],
      ['POST', `/api/events/${eventId}/athletes/chunks`, { uploadId: 'u1', chunkIndex: 0, totalChunks: 1, athletesChunk: athletes }],
      ['PUT', `/api/events/${eventId}/athletes/101/status`, { status: 'ENTREGUE' }],
    ]
    for (const [method, route, body] of closed) {
      assert.equal((await call(method, route, body)).status, 401, `${method} ${route} sem token`)
      assert.equal((await call(method, route, body, bearer('token-falso'))).status, 401, `${method} ${route} token falso`)
    }

    const login = await call('POST', '/api/login', { email: 'admin@teste.local', password: adminPassword })
    assert.equal(login.status, 200)
    const admin = bearer(login.body.token)

    assert.equal((await call('POST', '/api/events', { id: eventId, name: 'AUTH' }, admin)).status, 201)
    assert.equal((await call('PUT', `/api/events/${eventId}`, { location: 'RECIFE/PE' }, admin)).status, 200)
    assert.equal((await call('POST', `/api/events/${eventId}/athletes`, { athletes }, admin)).status, 200)
    assert.equal((await call('POST', `/api/events/${eventId}/athletes/chunks`, {
      uploadId: 'u1', chunkIndex: 0, totalChunks: 1, athletesChunk: athletes,
    }, admin)).status, 200)
    assert.equal((await call('PUT', `/api/events/${eventId}/athletes/101/status`, { status: 'ENTREGUE' }, admin)).status, 200)
    const list = await call('GET', `/api/events/${eventId}/athletes`, undefined, admin)
    assert.equal(list.status, 200)
    assert.equal(list.body.athletes[0].status, 'ENTREGUE')
    const events = await call('GET', '/api/events', undefined, admin)
    assert.equal(events.status, 200)
    assert.ok(events.body.events.some((event) => event.id === eventId))
    const sync = await call('POST', '/api/events/sync', { events: [{ id: 'evt-sync', name: 'SYNC' }] }, admin)
    assert.equal(sync.status, 200)
    assert.equal((await call('DELETE', '/api/events/evt-sync', { confirmQrInvalidation: true }, admin)).status, 200)

    // Nada do que foi tentado sem login chegou ao disco.
    assert.ok(!events.body.events.some((event) => event.id === 'evt-intruso'))
    assert.notEqual(events.body.events.find((event) => event.id === eventId).name, 'INVASOR')

    // Operador não cria eventos nem pela sincronização em lote.
    assert.equal((await call('POST', '/api/users', {
      name: 'Operador', email: 'op@teste.local', password: '123456', role: 'OPERADOR', eventId,
    }, admin)).status, 201)
    const op = await call('POST', '/api/login', { email: 'op@teste.local', password: '123456' })
    assert.equal((await call('POST', '/api/events/sync', { events: [{ id: 'evt-op', name: 'OP' }] }, bearer(op.body.token))).status, 403)
    assert.equal((await call('GET', `/api/events/${eventId}/athletes`, undefined, bearer(op.body.token))).status, 200)

    // Rotas públicas legítimas continuam sem token.
    assert.equal((await call('GET', '/api/health')).status, 200)
    assert.equal((await call('GET', `/api/public/events/${eventId}/athletes/101`)).status, 200)
    assert.equal((await call('GET', `/api/espelho/${eventId}/estado`)).status, 200)

    // Gate de deploy: token do boot só lê, e só as rotas que confere.
    const check = { 'x-deploy-check': readDeployCheckToken(port) }
    assert.ok(check['x-deploy-check'], 'token do gate não foi gravado')
    assert.equal((await call('GET', '/api/events', undefined, check)).status, 200)
    assert.equal((await call('GET', `/api/events/${eventId}/athletes`, undefined, check)).status, 200)
    assert.equal((await call('GET', '/api/events', undefined, { 'x-deploy-check': 'f'.repeat(64) })).status, 401)
    assert.equal((await call('POST', `/api/events/${eventId}/athletes`, { athletes }, check)).status, 401)
    assert.equal((await call('GET', '/api/users', undefined, check)).status, 401)
  } finally {
    await stopServer(child)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
