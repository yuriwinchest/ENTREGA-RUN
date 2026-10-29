import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

test('Super admin secundário: acesso total e gerencia todos, menos a conta dona; só o dono cria Super admin', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'super-admin-'))
  const password = 'isolated-super-admin-123'
  const passwordHash = hashPassword(password)
  const user = (id, role, eventId, extra = {}) => ({ id, name: id.toUpperCase(), email: `${id}@super.example.test`, passwordHash, role, eventId, status: 'ATIVO', ...extra })
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify([
    user('dono', 'ADMIN', 'all'),
    user('equipe', 'TEAM_ADMIN', 'all', { teamId: 'team-x' }),
    user('antigo', 'SUB_ADMIN', 'all'),
  ]))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([
    { id: 'ev-principal', name: 'PRINCIPAL', status: 'PLANEJADO' },
    { id: 'ev-equipe', name: 'EQUIPE', status: 'PLANEJADO', teamId: 'team-x' },
  ]))
  const socket = net.createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], {
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: 'dono@super.example.test', ADMIN_PASSWORD: password, APPWRITE_API_KEY: '', APPWRITE_ENABLED: 'false' },
    stdio: 'ignore',
  })
  const request = async (route, method = 'GET', body, token) => {
    const res = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: res.status, data: await res.json() }
  }
  const login = async (email) => (await request('/api/login', 'POST', { email, password: email.startsWith('chefe') || email.startsWith('outro') ? 'senha-do-chefe' : password })).data
  const novoSuper = (name, email) => ({ name, email, password: 'senha-do-chefe', role: 'ADMIN', superAdmin: true, eventId: 'all' })
  try {
    for (let i = 0; i < 100; i += 1) {
      if (child.exitCode !== null) throw new Error('Servidor isolado encerrou antes de iniciar')
      try { if ((await fetch(`${base}/api/health`)).ok) break } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const dono = (await login('dono@super.example.test')).token
    const equipe = (await login('equipe@super.example.test')).token

    // Só o dono cria Super admin.
    assert.equal((await request('/api/users', 'POST', novoSuper('Intruso', 'intruso@super.example.test'), equipe)).status, 403)
    const criado = await request('/api/users', 'POST', novoSuper('Chefe', 'chefe@super.example.test'), dono)
    assert.equal(criado.status, 201)
    const chefeId = criado.data.user.id
    assert.equal(criado.data.user.superAdmin, true)

    // Mesmo acesso do dono: vê tudo, cria sub-admin, isola antigo.
    const chefeLogin = await login('chefe@super.example.test')
    const chefe = chefeLogin.token
    assert.equal(chefeLogin.user.isPrincipal, true)
    assert.equal(chefeLogin.user.isOwner, false)
    assert.deepEqual((await request('/api/events', 'GET', undefined, chefe)).data.events.map((e) => e.id).sort(), ['ev-equipe', 'ev-principal'])
    assert.equal((await request('/api/users', 'GET', undefined, chefe)).data.users.length, 4)
    const sessao = await request('/api/session', 'GET', undefined, chefe)
    assert.deepEqual([sessao.data.user.isPrincipal, sessao.data.user.isOwner], [true, false])
    assert.equal((await request('/api/users', 'POST', { name: 'Sub novo', email: 'subnovo@super.example.test', password: 'senha-123', role: 'TEAM_ADMIN', eventId: 'all' }, chefe)).status, 201)
    assert.equal((await request('/api/users/antigo/isolar', 'POST', { eventIds: ['ev-principal'] }, chefe)).status, 200)

    // Suspende, troca senha e exclui todos, inclusive outro Super admin.
    const segundo = await request('/api/users', 'POST', novoSuper('Segundo', 'segundo@super.example.test'), dono)
    assert.equal(segundo.status, 201)
    assert.equal((await request(`/api/users/${segundo.data.user.id}`, 'PUT', { status: 'INATIVO' }, chefe)).status, 200)
    assert.equal((await request('/api/users/equipe', 'PUT', { password: 'nova-senha-123' }, chefe)).status, 200)
    assert.equal((await request('/api/users/equipe', 'PUT', { status: 'INATIVO' }, chefe)).status, 200)
    assert.equal((await request(`/api/users/${segundo.data.user.id}`, 'DELETE', undefined, chefe)).status, 200)

    // Mas não cria Super admin nem mexe na conta dona.
    assert.equal((await request('/api/users', 'POST', novoSuper('Outro', 'outro@super.example.test'), chefe)).status, 403)
    assert.equal((await request('/api/users/dono', 'PUT', { status: 'INATIVO' }, chefe)).status, 403)
    assert.equal((await request('/api/users/dono', 'PUT', { password: 'trocada-123' }, chefe)).status, 403)
    assert.equal((await request('/api/users/dono', 'DELETE', undefined, chefe)).status, 403)
    const rebaixa = await request(`/api/users/${chefeId}`, 'PUT', { role: 'OPERADOR', eventId: 'ev-principal' }, dono)
    assert.equal(rebaixa.status, 400, rebaixa.data.message)

    // O dono desativa e remove o Super admin; o dono segue intocável.
    assert.equal((await request(`/api/users/${chefeId}`, 'PUT', { status: 'INATIVO' }, dono)).status, 200)
    assert.equal((await request('/api/events', 'GET', undefined, chefe)).status, 401)
    assert.equal((await request(`/api/users/${chefeId}`, 'DELETE', undefined, dono)).status, 200)
    assert.equal((await request('/api/users/dono', 'DELETE', undefined, dono)).status, 400)
    const travaDono = await request('/api/users/dono', 'PUT', { status: 'INATIVO' }, dono)
    assert.equal(travaDono.status, 400, travaDono.data.message)
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => { child.once('exit', resolve); child.kill() })
    }
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
