import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

test('foto de retirada: exige login, valida JPEG, serve sem cache e apaga', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-fotos-'))
  const port = await freePort()
  const adminPassword = `t-${Date.now()}-senha`
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      APPWRITE_ENABLED: 'false',
      APPWRITE_ENDPOINT: '',
      ADMIN_EMAIL: 'admin@teste.local',
      ADMIN_PASSWORD: adminPassword,
    },
    stdio: 'ignore',
  })
  const base = `http://127.0.0.1:${port}`
  let token = ''
  const call = (method, route, body) => fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  try {
    let ready = false
    for (let attempt = 0; attempt < 50 && !ready; attempt += 1) {
      try { ready = (await call('GET', '/api/health')).status === 200 } catch { /* subindo */ }
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.equal(ready, true, 'servidor local não subiu')

    // A tela mostra a foto via URL blob:; sem isso na CSP a miniatura fica quebrada em produção.
    const csp = (await call('GET', '/api/health')).headers.get('content-security-policy') || ''
    assert.ok(/img-src[^;]* blob:/.test(csp), 'CSP img-src precisa liberar blob:')

    const login = await (await call('POST', '/api/login', { email: 'admin@teste.local', password: adminPassword })).json()
    assert.equal(login.ok, true)
    token = login.token

    const eventId = 'evt-fotos'
    assert.equal((await call('POST', '/api/events', { id: eventId, name: 'FOTOS', dateInput: '2099-01-10' })).status, 201)
    assert.equal((await call('POST', `/api/events/${eventId}/athletes`, {
      athletes: [{ id: 'a1', numero: '101', nome: 'ANA', status: 'ENTREGUE' }],
    })).status, 200)

    const route = `/api/events/${eventId}/athletes/a1/photo`
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
    const image = `data:image/jpeg;base64,${jpeg.toString('base64')}`

    const saved = await call('PUT', route, { image })
    assert.equal(saved.status, 200)
    const savedBody = await saved.json()
    assert.equal(new Date(savedBody.expiresAt).toISOString(), '2099-01-18T03:00:00.000Z')

    const got = await call('GET', route)
    assert.equal(got.status, 200)
    assert.equal(got.headers.get('content-type'), 'image/jpeg')
    assert.equal(got.headers.get('cache-control'), 'private, no-store')
    assert.deepEqual(Buffer.from(await got.arrayBuffer()), jpeg)
    assert.ok(fs.readdirSync(path.join(dataDir, 'fotos-retirada', eventId)).some((f) => f.endsWith('.jpg')))

    assert.equal((await call('PUT', route, { image: 'data:image/png;base64,iVBORw0KGgo=' })).status, 400)
    assert.equal((await call('PUT', `/api/events/${eventId}/athletes/inexistente/photo`, { image })).status, 404)

    const savedToken = token
    token = ''
    assert.equal((await call('GET', route)).status, 401)
    assert.equal((await call('PUT', route, { image })).status, 401)
    token = savedToken

    assert.equal((await (await call('DELETE', route)).json()).removed, true)
    assert.equal((await call('GET', route)).status, 404)
  } finally {
    child.kill()
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
