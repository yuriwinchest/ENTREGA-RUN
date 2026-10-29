import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

test('isolar sub-admin antigo: passa a ver só os eventos e usuários dele', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'subadmin-isolar-'))
  const password = 'isolated-subadmin-123'
  const passwordHash = hashPassword(password)
  const user = (id, role, eventId, extra = {}) => ({ id, name: id.toUpperCase(), email: `${id}@isolar.example.test`, passwordHash, role, eventId, status: 'ATIVO', ...extra })
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify([
    user('principal', 'ADMIN', 'all'),
    user('sub', 'SUB_ADMIN', 'all', { createdBy: 'principal' }),
    user('opa', 'OPERADOR', 'ev-a', { createdBy: 'sub' }),
    user('subdois', 'SUB_ADMIN', 'all', { createdBy: 'sub' }),
    user('opc', 'OPERADOR', 'ev-c', { createdBy: 'principal' }),
  ]))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify(['ev-a', 'ev-b', 'ev-c'].map((id) => ({ id, name: id.toUpperCase(), status: 'PLANEJADO' }))))
  const socket = net.createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], {
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: 'principal@isolar.example.test', ADMIN_PASSWORD: password, APPWRITE_API_KEY: '', APPWRITE_ENABLED: 'false' },
    stdio: 'ignore',
  })
  const request = async (route, method = 'GET', body, token) => {
    const res = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: res.status, data: await res.json() }
  }
  const login = async (id) => (await request('/api/login', 'POST', { email: `${id}@isolar.example.test`, password })).data.token
  const eventIds = async (token) => (await request('/api/events', 'GET', undefined, token)).data.events.map((e) => e.id).sort()
  try {
    for (let i = 0; i < 100; i += 1) {
      if (child.exitCode !== null) throw new Error('Servidor isolado encerrou antes de iniciar')
      try { if ((await fetch(`${base}/api/health`)).ok) break } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const principal = await login('principal')
    let sub = await login('sub')
    assert.deepEqual(await eventIds(sub), ['ev-a', 'ev-b', 'ev-c'], 'antes: sub-admin antigo vê tudo')

    // Só o principal isola; entrada inválida não muda nada.
    assert.equal((await request('/api/users/sub/isolar', 'POST', { eventIds: [] }, sub)).status, 403)
    assert.equal((await request('/api/users/sub/isolar', 'POST', {}, principal)).status, 400)
    assert.equal((await request('/api/users/sub/isolar', 'POST', { eventIds: ['nao-existe'] }, principal)).status, 400)
    assert.equal((await request('/api/users/opc/isolar', 'POST', { eventIds: [] }, principal)).status, 400, 'operador não vira sub-admin')
    assert.equal((await request('/api/users/principal/isolar', 'POST', { eventIds: [] }, principal)).status, 400)
    assert.deepEqual(await eventIds(sub), ['ev-a', 'ev-b', 'ev-c'], 'tentativas recusadas não alteram o acesso')

    const done = await request('/api/users/sub/isolar', 'POST', { eventIds: ['ev-a', 'ev-b'] }, principal)
    assert.equal(done.status, 200)
    assert.equal(done.data.user.role, 'TEAM_ADMIN')
    assert.deepEqual([done.data.eventos, done.data.usuarios], [2, 2], 'operador do ev-a e sub-admin criado por ele vão junto')

    // A sessão antiga cai; no novo login ele vê só o que é dele.
    assert.equal((await request('/api/events', 'GET', undefined, sub)).status, 401)
    sub = await login('sub')
    assert.deepEqual(await eventIds(sub), ['ev-a', 'ev-b'])
    const visibleUsers = (await request('/api/users', 'GET', undefined, sub)).data.users.map((u) => u.id).sort()
    assert.deepEqual(visibleUsers, ['opa', 'sub', 'subdois'])
    assert.equal((await request('/api/events/ev-c/athletes', 'GET', undefined, sub)).status, 403)
    const created = await request('/api/events', 'POST', { id: 'ev-novo', name: 'Novo do sub', status: 'PLANEJADO' }, sub)
    assert.equal(created.status, 201)
    assert.deepEqual(await eventIds(sub), ['ev-a', 'ev-b', 'ev-novo'])

    // O operador transferido também fica no âmbito do sub-admin.
    const opa = await login('opa')
    assert.deepEqual(await eventIds(opa), ['ev-a'])

    // O principal continua global; não dá para isolar de novo nem pegar evento de outro.
    assert.deepEqual(await eventIds(principal), ['ev-a', 'ev-b', 'ev-c', 'ev-novo'])
    assert.equal((await request('/api/users/sub/isolar', 'POST', { eventIds: [] }, principal)).status, 400)
    assert.equal((await request('/api/users/subdois/isolar', 'POST', { eventIds: ['ev-a'] }, principal)).status, 400, 'sub-admin já dentro de uma equipe')

    // Persistência em disco.
    const disk = JSON.parse(fs.readFileSync(path.join(dir, 'events.json'), 'utf8'))
    const team = disk.find((e) => e.id === 'ev-a').teamId
    assert.ok(team)
    assert.equal(disk.find((e) => e.id === 'ev-b').teamId, team)
    assert.equal(disk.find((e) => e.id === 'ev-c').teamId, undefined)
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => { child.once('exit', resolve); child.kill() })
    }
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
