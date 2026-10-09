import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

// O servidor grava as sessões ao receber SIGTERM: limpar a pasta antes de ele
// sair dá ENOTEMPTY no Linux. Espera o processo encerrar de fato.
async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  await new Promise((resolve) => {
    child.once('exit', resolve)
    child.kill()
  })
}


const serverFile = fileURLToPath(new URL('./server.js', import.meta.url))

async function startServer(dataDir, port, extraEnv = {}) {
  const child = spawn(process.execPath, [serverFile], {
    env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), ADMIN_PASSWORD: 'test-admin-123456', ...extraEnv },
    stdio: 'ignore',
  })
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Servidor encerrou antes de iniciar')
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (response.ok) return child
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  child.kill()
  throw new Error('Servidor não iniciou')
}

async function request(port, route, method = 'GET', body, token) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: response.status, data: await response.json() }
}

test('senha manual persiste e exclusão respeita autoria do sub-admin', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-admin-test-'))
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([{
    id: 'admin_pacetime', name: 'Admin Teste', email: 'pacetime@entregas.com',
    passwordHash: hashPassword('test-admin-123456'), role: 'ADMIN', eventId: 'all', status: 'ATIVO',
  }]))
  fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify([
    { id: 'event-alpha', name: 'Corrida Alpha', status: 'EM OPERAÇÃO' },
    { id: 'event-beta', name: 'Corrida Beta', status: 'EM OPERAÇÃO' }
  ]))
  const port = 4400 + Math.floor(Math.random() * 1000)
  let child
  try {
    child = await startServer(dataDir, port)
    const adminLogin = await request(port, '/api/login', 'POST', { email: 'pacetime@entregas.com', password: 'test-admin-123456' })
    assert.equal(adminLogin.status, 200)
    const adminToken = adminLogin.data.token
    const subCreate = await request(port, '/api/users', 'POST', {
      name: 'Sub Admin', email: 'sub@example.com', password: '123456', role: 'SUB_ADMIN', eventId: 'all',
    }, adminToken)
    assert.equal(subCreate.status, 201)
    assert.equal(subCreate.data.user.password, undefined)
    assert.equal(subCreate.data.user.passwordHash, undefined)
    const subLogin = await request(port, '/api/login', 'POST', { email: 'sub@example.com', password: '123456' })
    assert.equal(subLogin.status, 200)
    const subToken = subLogin.data.token

    // Operador com eventId: 'all' deve ser rejeitado (400)
    const rejectedOperator = await request(port, '/api/users', 'POST', {
      name: 'Operador Global Inválido', email: 'global@example.com', password: '123', role: 'OPERADOR', eventId: 'all',
    }, subToken)
    assert.equal(rejectedOperator.status, 400)

    // Operador com evento específico deve ser aceito (201)
    const own = await request(port, '/api/users', 'POST', {
      name: 'Criado Pelo Sub', email: 'own@example.com', password: '654321', role: 'OPERADOR', eventId: 'event-alpha',
    }, subToken)
    assert.equal(own.status, 201)
    assert.equal(own.data.user.createdBy, subCreate.data.user.id)
    assert.equal(own.data.user.eventId, 'event-alpha')

    const other = await request(port, '/api/users', 'POST', {
      name: 'Criado Pelo Admin', email: 'other@example.com', password: '654321', role: 'OPERADOR', eventId: 'event-beta',
    }, adminToken)
    assert.equal(other.status, 201)
    assert.equal((await request(port, `/api/users/${other.data.user.id}`, 'DELETE', undefined, subToken)).status, 403)
    assert.equal((await request(port, `/api/users/${own.data.user.id}`, 'DELETE', undefined, subToken)).status, 200)

    // Re-cria operador para testar isolamento de rotas e entrega de kits
    const opUser = await request(port, '/api/users', 'POST', {
      name: 'Operador Alpha', email: 'opalpha@example.com', password: '123456', role: 'OPERADOR', eventId: 'event-alpha',
    }, adminToken)
    assert.equal(opUser.status, 201)

    const opLogin = await request(port, '/api/login', 'POST', { email: 'opalpha@example.com', password: '123456' })
    assert.equal(opLogin.status, 200)
    const opToken = opLogin.data.token

    // Operador só vê o seu evento atribuído
    const opEvents = await request(port, '/api/events', 'GET', undefined, opToken)
    assert.equal(opEvents.status, 200)
    assert.equal(opEvents.data.events.length, 1)
    assert.equal(opEvents.data.events[0].id, 'event-alpha')

    // Operador tentando acessar atletas de outro evento toma 403
    const foreignAthletes = await request(port, '/api/events/event-beta/athletes', 'GET', undefined, opToken)
    assert.equal(foreignAthletes.status, 403)

    // Operador tentando alterar kit em outro evento toma 403
    const foreignStatus = await request(port, '/api/events/event-beta/athletes/100/status', 'PUT', { status: 'ENTREGUE' }, opToken)
    assert.equal(foreignStatus.status, 403)

    // Operador operando no seu próprio evento tem acesso
    const ownAthletes = await request(port, '/api/events/event-alpha/athletes', 'GET', undefined, opToken)
    assert.equal(ownAthletes.status, 200)

    const operatorsRes = await request(port, '/api/events/event-alpha/operators', 'GET', undefined, subToken)
    assert.equal(operatorsRes.status, 200)
    assert.ok(Array.isArray(operatorsRes.data.operators))
    assert.ok(operatorsRes.data.operators.some((u) => u.name === 'Admin Teste'))
    assert.ok(operatorsRes.data.operators.every((u) => !u.password && !u.passwordHash))

    assert.equal((await request(port, '/api/users', 'POST', {
      name: 'Escalada', email: 'admin2@example.com', password: '123456', role: 'ADMIN', eventId: 'all',
    }, subToken)).status, 403)
    const reset = await request(port, `/api/users/${subCreate.data.user.id}`, 'PUT', { password: 'minha-senha-fixa' }, adminToken)
    assert.equal(reset.status, 200)
    assert.equal((await request(port, '/api/login', 'POST', { email: 'sub@example.com', password: '123456' })).status, 401)
    assert.equal((await request(port, '/api/login', 'POST', { email: 'sub@example.com', password: 'minha-senha-fixa' })).status, 200)
    const diskUsers = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'))
    assert.ok(diskUsers.every((user) => !Object.hasOwn(user, 'password')))
    assert.ok(diskUsers.find((user) => user.id === subCreate.data.user.id).passwordHash)
    child.kill()
    await new Promise((resolve) => child.once('exit', resolve))
    child = await startServer(dataDir, port)
    assert.equal((await request(port, '/api/login', 'POST', { email: 'sub@example.com', password: 'minha-senha-fixa' })).status, 200)
  } finally {
    await stopServer(child)
    if (!path.resolve(dataDir).startsWith(`${path.resolve(os.tmpdir(), 'entregas-admin-test-')}`)) {
      throw new Error('Diretório temporário fora do prefixo esperado')
    }
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})

test('administrador principal segue ADMIN_EMAIL: o antigo vira removível e o novo fica protegido', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-principal-test-'))
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([
    { id: 'admin_pacetime', name: 'Felipe Admin', email: 'pacetime@entregas.com', passwordHash: hashPassword('senha-felipe-1'), role: 'ADMIN', eventId: 'all', status: 'ATIVO' },
    { id: 'agner', name: 'AGNER ARAUJO', email: 'agneraraujo@hotmail.com', passwordHash: hashPassword('senha-agner-1'), role: 'ADMIN', eventId: 'all', status: 'ATIVO' },
  ]))
  fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify([]))
  const port = 5400 + Math.floor(Math.random() * 1000)
  let child
  try {
    child = await startServer(dataDir, port, { ADMIN_EMAIL: 'agneraraujo@hotmail.com' })
    const login = await request(port, '/api/login', 'POST', { email: 'agneraraujo@hotmail.com', password: 'senha-agner-1' })
    assert.equal(login.status, 200, 'o novo principal entra com a própria senha')
    const token = login.data.token

    const list = await request(port, '/api/users', 'GET', undefined, token)
    const principal = Object.fromEntries(list.data.users.map((u) => [u.id, u.isPrincipal]))
    assert.deepEqual(principal, { admin_pacetime: false, agner: true })
    assert.equal(list.data.users.some((u) => 'passwordHash' in u), false)

    assert.equal((await request(port, '/api/users/agner', 'PUT', { status: 'INATIVO' }, token)).status, 400)
    assert.equal((await request(port, '/api/users/agner', 'PUT', { role: 'SUB_ADMIN' }, token)).status, 400)
    assert.equal((await request(port, '/api/users/agner', 'DELETE', undefined, token)).status, 400)

    assert.equal((await request(port, '/api/users/admin_pacetime', 'DELETE', undefined, token)).status, 200)
    const after = await request(port, '/api/users', 'GET', undefined, token)
    assert.deepEqual(after.data.users.map((u) => u.id), ['agner'])
  } finally {
    await stopServer(child)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})

test('contagem de entregas por usuário reflete entregas em tempo real e anti-cache presente', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-counts-test-'))
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([
    { id: 'admin_pacetime', name: 'Felipe Admin', email: 'pacetime@entregas.com', passwordHash: hashPassword('test-admin-123456'), role: 'ADMIN', eventId: 'all', status: 'ATIVO' },
    { id: 'op1', name: 'Operador 1', email: 'op1@example.com', passwordHash: hashPassword('123456'), role: 'OPERADOR', eventId: 'event-alpha', status: 'ATIVO' },
  ]))
  fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify([
    { id: 'event-alpha', name: 'Corrida Alpha', status: 'EM OPERAÇÃO' },
  ]))
  fs.writeFileSync(path.join(dataDir, 'athletes_event-alpha.json'), JSON.stringify({
    eventId: 'event-alpha',
    athletes: [
      { id: '1', numero: '10', status: 'ENTREGUE', entreguePor: 'Operador 1', entregueEm: '09/10/2026, 12:00:00' },
      { id: '2', numero: '11', status: 'ENTREGUE', entreguePor: 'Operador 1', entregueEm: '09/10/2026, 12:05:00' },
      { id: '3', numero: '12', status: 'ENTREGUE', entreguePor: 'Felipe Admin', entregueEm: '09/10/2026, 12:10:00' },
      { id: '4', numero: '13', status: 'PENDENTE' },
    ],
  }))
  const port = 5500 + Math.floor(Math.random() * 1000)
  let child
  try {
    child = await startServer(dataDir, port)
    const login = await request(port, '/api/login', 'POST', { email: 'pacetime@entregas.com', password: 'test-admin-123456' })
    assert.equal(login.status, 200)
    const token = login.data.token

    const rawRes = await fetch(`http://127.0.0.1:${port}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(rawRes.headers.get('cache-control')?.includes('no-store'), true, 'headers de API contêm no-store')
    const usersData = await rawRes.json()
    assert.equal(usersData.ok, true)

    const op1 = usersData.users.find((u) => u.id === 'op1')
    const admin = usersData.users.find((u) => u.id === 'admin_pacetime')
    assert.equal(op1?.deliveries, 2, 'operador 1 tem 2 entregas')
    assert.equal(admin?.deliveries, 1, 'admin tem 1 entrega')

    const eventsRes = await request(port, '/api/events', 'GET', undefined, token)
    assert.equal(eventsRes.status, 200)
    const ev = eventsRes.data.events.find((e) => e.id === 'event-alpha')
    assert.equal(ev?.entregues, 3, 'evento tem 3 entregues')
    assert.equal(ev?.operadoresAtivos, 2, 'evento tem 2 operadores ativos')
    assert.deepEqual(ev?.operadores?.sort(), ['Felipe Admin', 'Operador 1'].sort())
  } finally {
    await stopServer(child)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
