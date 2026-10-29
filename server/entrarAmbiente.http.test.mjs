import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

test('Super admin entra no ambiente de um Sub-admin, age como ele e volta', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'entrar-ambiente-'))
  const password = 'isolated-visit-123'
  const passwordHash = hashPassword(password)
  const user = (id, role, eventId, extra = {}) => ({ id, name: id.toUpperCase(), email: `${id}@visita.example.test`, passwordHash, role, eventId, status: 'ATIVO', ...extra })
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify([
    user('dono', 'ADMIN', 'all'),
    user('chefe', 'ADMIN', 'all', { superAdmin: true }),
    user('joao', 'TEAM_ADMIN', 'all', { teamId: 'team-joao' }),
    user('op', 'OPERADOR', 'ev-joao', { teamId: 'team-joao' }),
  ]))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([
    { id: 'ev-principal', name: 'PRINCIPAL', status: 'PLANEJADO' },
    { id: 'ev-joao', name: 'DO JOAO', status: 'PLANEJADO', teamId: 'team-joao' },
  ]))
  const socket = net.createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], {
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: 'dono@visita.example.test', ADMIN_PASSWORD: password, APPWRITE_API_KEY: '', APPWRITE_ENABLED: 'false' },
    stdio: 'ignore',
  })
  const request = async (route, method = 'GET', body, token) => {
    const res = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: res.status, data: await res.json() }
  }
  const login = async (id) => (await request('/api/login', 'POST', { email: `${id}@visita.example.test`, password })).data.token
  try {
    for (let i = 0; i < 100; i += 1) {
      if (child.exitCode !== null) throw new Error('Servidor isolado encerrou antes de iniciar')
      try { if ((await fetch(`${base}/api/health`)).ok) break } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const dono = await login('dono')
    const joao = await login('joao')

    const entrada = await request('/api/users/joao/entrar', 'POST', {}, dono)
    assert.equal(entrada.status, 200, entrada.data.message)
    assert.deepEqual([entrada.data.user.role, entrada.data.user.isPrincipal, entrada.data.user.impersonatedBy.id], ['TEAM_ADMIN', false, 'dono'])
    const visita = entrada.data.token

    // Dentro do ambiente do João: vê e mexe só no que é dele.
    const sessao = await request('/api/session', 'GET', undefined, visita)
    assert.deepEqual([sessao.data.user.id, sessao.data.user.impersonatedBy.name], ['joao', 'DONO'])
    assert.deepEqual((await request('/api/events', 'GET', undefined, visita)).data.events.map((e) => e.id), ['ev-joao'])
    assert.deepEqual((await request('/api/users', 'GET', undefined, visita)).data.users.map((u) => u.id).sort(), ['joao', 'op'])
    const criado = await request('/api/users', 'POST', { name: 'Novo', email: 'novo@visita.example.test', password: 'senha-123', role: 'OPERADOR', eventId: 'ev-joao' }, visita)
    assert.equal(criado.status, 201)
    assert.equal(criado.data.user.teamId, 'team-joao')
    assert.equal((await request('/api/users/op', 'PUT', { status: 'INATIVO' }, visita)).status, 200)
    assert.equal((await request('/api/session', 'GET', undefined, joao)).data.user.impersonatedBy, null, 'o próprio João não vê sinal da visita')

    // Só Super admin entra, e só em Sub-admin; da visita não se entra de novo.
    assert.equal((await request('/api/users/joao/entrar', 'POST', {}, visita)).status, 403)
    assert.equal((await request('/api/users/joao/entrar', 'POST', {}, joao)).status, 403)
    assert.equal((await request('/api/users/op/entrar', 'POST', {}, dono)).status, 400)
    assert.equal((await request('/api/users/chefe/entrar', 'POST', {}, dono)).status, 400)

    // Voltar: a visita é encerrada e o token do dono continua valendo.
    assert.equal((await request('/api/logout', 'POST', {}, visita)).status, 200)
    assert.equal((await request('/api/session', 'GET', undefined, visita)).status, 401)
    assert.equal((await request('/api/session', 'GET', undefined, dono)).data.user.isOwner, true)

    // Super admin secundário também entra; perdeu o acesso, a visita cai junto.
    const chefe = await login('chefe')
    const visitaChefe = (await request('/api/users/joao/entrar', 'POST', {}, chefe)).data.token
    assert.equal((await request('/api/events', 'GET', undefined, visitaChefe)).status, 200)
    assert.equal((await request('/api/users/chefe', 'PUT', { status: 'INATIVO' }, dono)).status, 200)
    assert.equal((await request('/api/events', 'GET', undefined, visitaChefe)).status, 401)

    // Sub-admin desativado não recebe visita.
    assert.equal((await request('/api/users/joao', 'PUT', { status: 'INATIVO' }, dono)).status, 200)
    assert.equal((await request('/api/users/joao/entrar', 'POST', {}, dono)).status, 409)
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => { child.once('exit', resolve); child.kill() })
    }
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
