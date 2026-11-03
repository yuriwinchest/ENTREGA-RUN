import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'
import { CLIENT_DIR_NAME } from './clientBase.js'

test('excluir atleta em operação: não volta por aba antiga, guarda na base de clientes, kit entregue recusa', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atleta-excluir-'))
  const password = 'isolated-athlete-delete-123'
  const adminEmail = 'excluir-admin@example.test'
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify([
    { id: 'ad-admin', name: 'ADMIN', email: adminEmail, passwordHash: hashPassword(password), role: 'ADMIN', eventId: 'all', status: 'ATIVO' },
  ]))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([
    { id: 'ad-ev', name: 'CORRIDA DA EXCLUSÃO', date: '08/11/2026', status: 'EM OPERAÇÃO' },
  ]))
  let child, base
  const stop = async () => { if (child && child.exitCode === null) await new Promise((resolve) => { child.once('exit', resolve); child.kill() }) }
  const start = async () => {
    const socket = net.createServer()
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
    const port = socket.address().port
    await new Promise((resolve) => socket.close(resolve))
    base = `http://127.0.0.1:${port}`
    child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], { env: { ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: password, APPWRITE_API_KEY: '' }, stdio: 'ignore' })
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Servidor encerrou')
      try { if ((await fetch(base + '/api/health')).ok) return } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error('Servidor não iniciou')
  }
  const request = async (route, method = 'GET', body, token) => {
    const r = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: r.status, data: await r.json() }
  }
  const ids = async (token) => (await request('/api/events/ad-ev/athletes', 'GET', undefined, token)).data.athletes.map((a) => a.id)
  try {
    await start()
    let admin = (await request('/api/login', 'POST', { email: adminEmail, password })).data.token
    const athletes = [
      { id: 'a1', nome: 'ATLETA UM', numero: '10', status: 'PENDENTE', customFields: { EMAIL: 'um@example.test', ALERGIA: 'Dipirona' } },
      { id: 'a2', nome: 'ATLETA DOIS', numero: '11', chip: 'C11', status: 'ENTREGUE' },
      { id: 'a3', nome: 'ATLETA SEM PEITO', numero: '', status: 'PENDENTE' },
    ]
    assert.equal((await request('/api/events/ad-ev/athletes', 'POST', {
      athletes, schema: [], healthFields: [{ key: 'ALERGIA', label: 'Alergia', publico: false }],
    }, admin)).status, 200)
    assert.deepEqual(await ids(admin), ['a1', 'a2', 'a3'], 'atleta sem número é aceito')

    assert.equal((await request('/api/events/ad-ev/athletes/a1', 'DELETE')).status, 401)
    const delivered = await request('/api/events/ad-ev/athletes/a2', 'DELETE', undefined, admin)
    assert.equal(delivered.status, 409)
    assert.match(delivered.data.message, /desfaça a entrega/)
    assert.equal((await request('/api/events/ad-ev/athletes/nao-existe', 'DELETE', undefined, admin)).status, 404)

    const removed = await request('/api/events/ad-ev/athletes/a1', 'DELETE', undefined, admin)
    assert.equal(removed.status, 200)
    assert.equal(removed.data.count, 2)
    assert.deepEqual(await ids(admin), ['a2', 'a3'])
    const event = (await request('/api/events', 'GET', undefined, admin)).data.events.find((e) => e.id === 'ad-ev')
    assert.equal(event.total, 2)

    // Aba antiga ainda com a1 na memória salva a lista inteira.
    assert.equal((await request('/api/events/ad-ev/athletes', 'POST', { athletes, schema: [] }, admin)).status, 200)
    assert.deepEqual(await ids(admin), ['a2', 'a3'], 'aba antiga não ressuscita o excluído')

    const clientDir = path.join(dir, CLIENT_DIR_NAME)
    const files = fs.readdirSync(clientDir)
    assert.equal(files.length, 1)
    assert.match(files[0], /^atleta-excluido_ad-ev_a1_/)
    const kept = JSON.parse(fs.readFileSync(path.join(clientDir, files[0]), 'utf8'))
    assert.equal(kept.eventName, 'CORRIDA DA EXCLUSÃO')
    assert.equal(kept.athletes[0].customFields.EMAIL, 'um@example.test')
    assert.equal(kept.athletes[0].customFields.ALERGIA, undefined, 'saúde não vai para a base de clientes')

    await stop()
    await start()
    admin = (await request('/api/login', 'POST', { email: adminEmail, password })).data.token
    assert.equal((await request('/api/events/ad-ev/athletes', 'POST', { athletes, schema: [] }, admin)).status, 200)
    assert.deepEqual(await ids(admin), ['a2', 'a3'], 'a exclusão sobrevive ao reinício')
  } finally { await stop(); fs.rmSync(dir, { recursive: true, force: true }) }
})
