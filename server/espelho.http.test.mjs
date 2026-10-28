import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import test from 'node:test'

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  await new Promise((resolve) => { child.once('exit', resolve); child.kill() })
}

test('espelho images persist across restart, SSE and independent clients; disk failure is not acknowledged', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'espelho-http-'))
  fs.writeFileSync(path.join(dir, 'events.json'), '[]')
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  let child
  let token
  const start = async () => {
    child = spawn(process.execPath, ['server/server.js'], {
      cwd: path.resolve(import.meta.dirname, '..'), stdio: 'ignore',
      env: { ...process.env, PORT: String(port), DATA_DIR: dir, APPWRITE_ENABLED: 'false', APPWRITE_API_KEY: '', ADMIN_EMAIL: 'espelho@test.local', ADMIN_PASSWORD: 'espelho-local-test-only' },
    })
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(`${base}/api/health`)).ok) {
          const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'espelho@test.local', password: 'espelho-local-test-only' }) })
          token = (await login.json()).token
          return
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error('local test server did not start')
  }
  const route = `${base}/api/espelho/qa-event/estado`
  const get = async () => (await (await fetch(route)).json()).state
  const post = (body) => fetch(route, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKasAAAAASUVORK5CYII='
  try {
    await start()
    assert.equal((await post({ status: 'ATENDENDO', atleta: { nome: 'ATLETA TESTE', numero: '123' }, updatedAt: Date.now() + 60000 })).status, 200)
    assert.equal((await post({ config: { bgImage: image, logo: image }, updatedAt: 1 })).status, 200)
    let state = await get()
    assert.equal(state.atleta.nome, 'ATLETA TESTE')
    assert.equal(state.status, 'ATENDENDO')
    assert.equal(state.config.bgImage, image)
    assert.equal(state.config.logo, image)
    const stream = await fetch(`${base}/api/espelho/qa-event/stream`)
    const reader = stream.body.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    assert.ok(first.includes(image))
    await reader.cancel()
    await stop(child)
    await start()
    state = await get()
    assert.equal(state.config.bgImage, image)
    assert.equal(state.config.logo, image)
    assert.equal((await get()).config.showEventName, true, 'nome da corrida aparece por padrão')
    assert.equal((await post({ config: { showEventName: false } })).status, 200)
    assert.equal((await post({ config: { mensagem: 'Novo texto' } })).status, 200)
    assert.equal((await get()).config.bgImage, image)
    assert.equal((await get()).config.showEventName, false, 'outra alteração não religa o nome')
    assert.equal((await post({ config: { logo: 'data:image/svg+xml;base64,PHN2Zz4=' } })).status, 400)
    assert.equal((await get()).config.logo, image)
    const file = path.join(dir, 'espelho_configs.json')
    const original = fs.readFileSync(file, 'utf8')
    fs.renameSync(file, `${file}.backup`)
    fs.mkdirSync(file) // destino inválido reproduz falha de rename em Windows e Linux
    assert.equal((await post({ config: { mensagem: 'Não pode confirmar' } })).status, 503)
    assert.equal((await get()).config.mensagem, 'Novo texto')
    assert.equal(fs.readFileSync(`${file}.backup`, 'utf8'), original)
    fs.rmdirSync(file)
    fs.renameSync(`${file}.backup`, file)
    assert.equal((await post({ config: { bgImage: null } })).status, 200)
    assert.equal((await get()).config.bgImage, null)
    assert.equal((await get()).config.logo, image)
  } finally {
    await stop(child)
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
