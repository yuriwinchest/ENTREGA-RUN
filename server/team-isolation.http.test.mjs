import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

test('equipes isoladas no HTTP: hierarquia, recursos, sync e sessões persistentes', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-teams-'))
  const password = 'teams-local-test-123'
  const principalEmail = 'teams-principal@example.test'
  const legacyUser = { id: 'legacy-sub', name: 'LEGADO', email: 'legacy-sub@example.test', passwordHash: hashPassword(password), role: 'SUB_ADMIN', eventId: 'all', status: 'ATIVO' }
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify([
    { id: 'principal', name: 'PRINCIPAL', email: principalEmail, passwordHash: hashPassword(password), role: 'ADMIN', eventId: 'all', status: 'ATIVO' }, legacyUser,
    { id: 'legacy-admin', name: 'ADMIN LEGADO', email: 'legacy-admin@example.test', passwordHash: hashPassword(password), role: 'ADMIN', eventId: 'all', status: 'ATIVO' },
  ]))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([{ id: 'legacy-event', name: 'ACERVO PRINCIPAL', status: 'PLANEJADO' }]))
  let child, base, principal, a, b, aToken, bToken, legacyToken, supervisor, supervisorToken, operator, operatorToken
  const stop = async () => {
    if (child && child.exitCode === null && child.signalCode === null) await new Promise((resolve) => { child.once('exit', resolve); child.kill() })
  }
  const start = async () => {
    const socket = net.createServer()
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
    const port = socket.address().port
    await new Promise((resolve) => socket.close(resolve))
    base = `http://127.0.0.1:${port}`
    child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], {
      env: { ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: principalEmail, ADMIN_PASSWORD: password, APPWRITE_ENABLED: 'false', APPWRITE_API_KEY: '' }, stdio: 'ignore',
    })
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Servidor de teste encerrou antes de iniciar')
      try { if ((await fetch(`${base}/api/health`)).ok) return } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error('Servidor de teste não iniciou')
  }
  const request = async (route, method = 'GET', body, token) => {
    const response = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const raw = await response.text()
    let data
    try { data = JSON.parse(raw) } catch { data = { invalidJson: true } }
    return { status: response.status, data }
  }
  const login = async (email) => {
    const result = await request('/api/login', 'POST', { email, password })
    assert.equal(result.status, 200, `login ${email}: ${JSON.stringify(result.data)}`)
    return result.data.token
  }
  const createUser = async (token, email, role, eventId = 'all', extra = {}) => {
    const result = await request('/api/users', 'POST', { name: email.split('@')[0], email, password, role, eventId, ...extra }, token)
    assert.equal(result.status, 201, `criar ${role}: ${JSON.stringify(result.data)}`)
    assert.equal(result.data.user.passwordHash, undefined)
    return result.data.user
  }
  const ids = (events) => events.map((item) => item.id).sort()
  try {
    await start()
    principal = await login(principalEmail)
    legacyToken = await login(legacyUser.email)
    await t.test('janela de release bloqueia nova equipe sem gravar usuário nem vínculo', async () => {
      const lock = path.join(dir, '.emergency-links-release-pending')
      const usersFile = path.join(dir, 'users.json')
      const beforeDisk = fs.readFileSync(usersFile, 'utf8')
      const beforeUsers = (await request('/api/users', 'GET', undefined, principal)).data.users
      fs.writeFileSync(lock, 'candidate-verification')
      try {
        const blocked = await request('/api/users', 'POST', {
          name: 'NAO GRAVAR', email: 'release-blocked@example.test', password, role: 'TEAM_ADMIN', eventId: 'all',
        }, principal)
        assert.equal(blocked.status, 503)
        assert.equal((await request(`/api/users/${legacyUser.id}`, 'PUT', { role: 'TEAM_ADMIN' }, principal)).status, 400)
        assert.equal(fs.readFileSync(usersFile, 'utf8'), beforeDisk)
        assert.deepEqual((await request('/api/users', 'GET', undefined, principal)).data.users, beforeUsers)
        assert.equal((await request('/api/health')).status, 200)
      } finally {
        fs.unlinkSync(lock)
      }
    })
    a = await createUser(principal, 'leader-a@example.test', 'TEAM_ADMIN', 'all', { teamId: 'forged', createdBy: 'forged' })
    b = await createUser(principal, 'leader-b@example.test', 'TEAM_ADMIN')
    aToken = await login(a.email)
    bToken = await login(b.email)

    await t.test('principal cria equipes distintas; acervo legado não é herdado; servidor atribui autoria', async () => {
      assert.ok(a.teamId.startsWith('team-'))
      assert.notEqual(a.teamId, 'forged')
      assert.notEqual(a.teamId, b.teamId)
      assert.equal(a.createdBy, 'principal')
      assert.deepEqual((await request('/api/events', 'GET', undefined, aToken)).data.events, [])
      assert.deepEqual((await request('/api/events', 'GET', undefined, bToken)).data.events, [])
      for (const [token, id] of [[aToken, 'team-a-event'], [bToken, 'team-b-event']]) {
        const result = await request('/api/events', 'POST', { id, name: id, status: 'PLANEJADO', teamId: 'forged', createdBy: 'forged' }, token)
        assert.equal(result.status, 201)
        assert.equal(result.data.event.teamId, token === aToken ? a.teamId : b.teamId)
        assert.equal(result.data.event.createdBy, token === aToken ? a.id : b.id)
      }
      assert.deepEqual(ids((await request('/api/events', 'GET', undefined, legacyToken)).data.events), ['legacy-event'])
      assert.deepEqual(ids((await request('/api/events', 'GET', undefined, principal)).data.events), ['legacy-event', 'team-a-event', 'team-b-event'])
    })

    await t.test('usuários menores herdam equipe e limites; supervisor cria projeto visto pelo líder', async () => {
      supervisor = await createUser(aToken, 'supervisor-a@example.test', 'SUPERVISOR', 'team-a-event', { teamId: b.teamId, createdBy: b.id })
      operator = await createUser(aToken, 'operator-a@example.test', 'OPERADOR', 'team-a-event')
      assert.equal(supervisor.teamId, a.teamId)
      assert.equal(supervisor.createdBy, a.id)
      supervisorToken = await login(supervisor.email)
      operatorToken = await login(operator.email)
      const created = await request('/api/events', 'POST', { id: 'supervisor-event', name: 'SUPERVISOR', teamId: b.teamId }, supervisorToken)
      assert.equal(created.status, 201)
      assert.equal(created.data.event.teamId, a.teamId)
      assert.equal(created.data.event.createdBy, supervisor.id)
      assert.deepEqual(ids((await request('/api/events', 'GET', undefined, aToken)).data.events), ['supervisor-event', 'team-a-event'])
      assert.deepEqual(ids((await request('/api/events', 'GET', undefined, operatorToken)).data.events), ['team-a-event'])
      assert.equal((await request('/api/events', 'POST', { id: 'operator-created', name: 'NEGADO' }, operatorToken)).status, 403)
      assert.equal((await request('/api/events/supervisor-event/athletes', 'GET', undefined, operatorToken)).status, 403)
      for (const role of ['ADMIN', 'TEAM_ADMIN']) assert.equal((await request('/api/users', 'POST', { name: 'ESCALADA', email: `${role.toLowerCase()}-forged@example.test`, password, role }, aToken)).status, 403)
      assert.equal((await request('/api/users', 'POST', { name: 'FORA', email: 'outside@example.test', password, role: 'OPERADOR', eventId: 'team-b-event' }, aToken)).status, 403)
      const users = (await request('/api/users', 'GET', undefined, aToken)).data.users
      assert.ok(users.some((user) => user.id === supervisor.id))
      assert.ok(users.every((user) => user.teamId === a.teamId))
      for (const [method, body] of [['PUT', { name: 'FORGED' }], ['DELETE', undefined]]) {
        assert.equal((await request(`/api/users/${b.id}`, method, body, aToken)).status, 403)
        assert.equal((await request(`/api/users/${legacyUser.id}`, method, body, aToken)).status, 403)
      }
      assert.equal((await request(`/api/users/${operator.id}`, 'PUT', { eventId: 'team-b-event' }, aToken)).status, 403)
      assert.equal((await request(`/api/users/${operator.id}`, 'PUT', { teamId: b.teamId }, aToken)).status, 400)
      const edited = await request('/api/events/team-a-event', 'PUT', { teamId: b.teamId, createdBy: b.id }, aToken)
      assert.equal(edited.status, 200)
      assert.equal(edited.data.event.teamId, a.teamId)
      assert.equal(edited.data.event.createdBy, a.id)
      const byPrincipal = await createUser(principal, 'principal-created-a@example.test', 'OPERADOR', 'team-a-event')
      assert.equal(byPrincipal.teamId, a.teamId)
      assert.equal(byPrincipal.createdBy, 'principal')
    })

    await t.test('ADMIN legado permanece no acervo principal sem poder criar administradores ou alterar o principal', async () => {
      const legacyAdminToken = await login('legacy-admin@example.test')
      assert.deepEqual(ids((await request('/api/events', 'GET', undefined, legacyAdminToken)).data.events), ['legacy-event'])
      assert.equal((await request('/api/events/team-a-event/athletes', 'GET', undefined, legacyAdminToken)).status, 403)
      for (const body of [{ password: 'another-local-password' }, { name: 'ALTERADO' }, { status: 'INATIVO' }]) {
        assert.equal((await request('/api/users/principal', 'PUT', body, legacyAdminToken)).status, 403)
      }
      for (const role of ['ADMIN', 'TEAM_ADMIN']) {
        assert.equal((await request('/api/users', 'POST', { name: 'ESCALADA LEGADO', email: `legacy-forged-${role.toLowerCase()}@example.test`, password, role }, legacyAdminToken)).status, 403)
      }
    })

    await t.test('administrador de equipe gerencia QR, arquivo, médico e exclusão dos próprios projetos', async () => {
      assert.equal((await request('/api/events/team-a-event/emergency-links', 'POST', undefined, aToken)).status, 200)
      assert.equal((await request('/api/medico/team-a-event/ocorrencias', 'GET', undefined, aToken)).status, 200)
      for (const archived of [true, false]) {
        assert.equal((await request('/api/events/team-a-event/archive', 'POST', { archived }, aToken)).status, 200)
      }
      assert.equal((await request('/api/events', 'POST', { id: 'disposable-a', name: 'DESCARTAVEL' }, aToken)).status, 201)
      assert.equal((await request('/api/events/disposable-a', 'DELETE', { confirmQrInvalidation: true }, aToken)).status, 200)
      assert.ok(!(await request('/api/events', 'GET', undefined, aToken)).data.events.some((event) => event.id === 'disposable-a'))
    })

    await t.test('IDs de outra equipe e legado bloqueados em todas as famílias privadas', async () => {
      const cases = [
        ['GET', '/athletes'], ['POST', '/athletes', { athletes: [] }], ['POST', '/athletes/chunks', {}],
        ['PUT', '/athletes/1/status', { status: 'ENTREGUE' }], ['PUT', '/athletes/athlete-1/photo', {}],
        ['GET', '/athletes/athlete-1/photo'], ['DELETE', '/athletes/athlete-1/photo'], ['GET', '/operators'],
        ['PUT', '', { name: 'FORGED' }], ['DELETE', '', { confirmQrInvalidation: true }],
        ['POST', '/archive', { archived: true }], ['POST', '/emergency-links'],
      ]
      for (const id of ['team-b-event', 'legacy-event']) {
        for (const [method, suffix, body] of cases) {
          const result = await request(`/api/events/${id}${suffix}`, method, body, aToken)
          assert.equal(result.status, 403, `${method} ${id}${suffix}`)
        }
        for (const [method, suffix, body] of [
          ['GET', '/ocorrencias'], ['PATCH', '/ocorrencias/fake', { status: 'ENCERRADA' }],
          ['POST', '/ocorrencias/fake/silenciar', {}], ['POST', '/ocorrencias/fake/registros', {}],
        ]) assert.equal((await request(`/api/medico/${id}${suffix}`, method, body, aToken)).status, 403, `${method} médico ${id}${suffix}`)
        assert.equal((await request(`/api/espelho/${id}/estado`, 'POST', { status: 'LIVRE' }, aToken)).status, 403)
      }
      assert.equal((await request('/api/espelho/team-a-event/estado', 'POST', { status: 'LIVRE' })).status, 401)
      assert.equal((await request('/api/espelho/team-a-event/estado', 'POST', { status: 'LIVRE' }, aToken)).status, 409)
      // A leitura do telão continua pública por contrato; apenas gestão exige sessão/equipe.
      assert.equal((await request('/api/espelho/team-a-event/estado')).status, 200)
      assert.equal((await request('/api/emergency-links/preview?code=team-b-event', 'GET', undefined, aToken)).status, 403)
      assert.equal((await request('/api/emergency-links/binding', 'PUT', { code: 'team-b-event', targetEventId: 'team-a-event', confirmed: true }, aToken)).status, 403)
      assert.equal((await request('/api/events/team-b-event/athletes', 'GET', undefined, principal)).status, 200)
      assert.equal((await request('/api/events/team-b-event/operators', 'GET', undefined, principal)).status, 200)
      assert.equal((await request('/api/events/team-b-event', 'PUT', { name: 'PRINCIPAL EDITOU B' }, principal)).status, 200)
    })

    await t.test('sync limita resposta e rejeita lote alheio inteiro antes de qualquer gravação', async () => {
      const synced = await request('/api/events/sync', 'POST', { events: [{ id: 'sync-a', name: 'SYNC A', teamId: b.teamId, createdBy: b.id }] }, aToken)
      assert.equal(synced.status, 200)
      assert.ok(synced.data.events.every((event) => event.teamId === a.teamId))
      assert.equal(synced.data.events.find((event) => event.id === 'sync-a').createdBy, a.id)
      const rejected = await request('/api/events/sync', 'POST', { events: [{ id: 'atomic-new', name: 'NAO GRAVAR' }, { id: 'team-b-event', name: 'COLISAO' }] }, aToken)
      assert.equal(rejected.status, 403)
      const all = (await request('/api/events', 'GET', undefined, principal)).data.events
      assert.ok(!all.some((event) => event.id === 'atomic-new'))
      assert.equal(all.find((event) => event.id === 'team-b-event').name, 'PRINCIPAL EDITOU B')
    })

    await t.test('homônimos e operadores de outra equipe não vazam por contagens', async () => {
      const homonymA = await createUser(aToken, 'homonym-a@example.test', 'OPERADOR', 'team-a-event', { name: 'MESMO NOME' })
      const homonymB = await createUser(bToken, 'homonym-b@example.test', 'OPERADOR', 'team-b-event', { name: 'MESMO NOME' })
      for (const [id, token, count] of [['team-a-event', aToken, 1], ['team-b-event', bToken, 3]]) {
        const athletes = Array.from({ length: count }, (_, i) => ({ id: `${id}-${i}`, numero: String(i + 1), nome: 'ATLETA SINTETICO', status: 'ENTREGUE', entreguePor: 'MESMO NOME' }))
        assert.equal((await request(`/api/events/${id}/athletes`, 'POST', { athletes, schema: [] }, token)).status, 200)
      }
      const usersA = (await request('/api/users', 'GET', undefined, aToken)).data.users
      assert.equal(usersA.find((user) => user.id === homonymA.id).deliveries, 1)
      const operatorsA = (await request('/api/events/team-a-event/operators', 'GET', undefined, aToken)).data.operators
      assert.ok(operatorsA.every((user) => user.teamId === a.teamId))
      assert.equal(operatorsA.find((user) => user.id === homonymA.id).deliveries, 1)
      const usersPrincipal = (await request('/api/users', 'GET', undefined, principal)).data.users
      assert.equal(usersPrincipal.find((user) => user.id === homonymA.id).deliveries, 1)
      assert.equal(usersPrincipal.find((user) => user.id === homonymB.id).deliveries, 3)
    })

    await t.test('reinício mantém vínculos; login e tokens anteriores preservam os limites', async () => {
      // A gravação de sessões tem debounce; aguarda sua persistência antes do encerramento no Windows.
      await new Promise((resolve) => setTimeout(resolve, 400))
      await stop()
      await start()
      for (const token of [aToken, bToken, supervisorToken, operatorToken]) {
        assert.equal((await request('/api/session', 'GET', undefined, token)).status, 200, 'token persistido antes do reinício')
      }
      assert.equal((await request('/api/events/team-b-event/athletes', 'GET', undefined, aToken)).status, 403)
      aToken = await login(a.email)
      bToken = await login(b.email)
      principal = await login(principalEmail)
      supervisorToken = await login(supervisor.email)
      operatorToken = await login(operator.email)
      const session = await request('/api/session', 'GET', undefined, aToken)
      assert.equal(session.data.user.teamId, a.teamId)
      assert.ok((await request('/api/events', 'GET', undefined, aToken)).data.events.every((event) => event.teamId === a.teamId))
      assert.equal((await request('/api/events/team-b-event/athletes', 'GET', undefined, supervisorToken)).status, 403)
      const disk = JSON.parse(fs.readFileSync(path.join(dir, 'events.json'), 'utf8'))
      assert.equal(disk.find((event) => event.id === 'supervisor-event').teamId, a.teamId)
    })

    await t.test('desativar subordinado revoga sessão; desativar líder suspende toda a equipe', async () => {
      assert.equal((await request(`/api/users/${operator.id}`, 'PUT', { status: 'INATIVO' }, aToken)).status, 200)
      assert.equal((await request('/api/session', 'GET', undefined, operatorToken)).status, 401)
      assert.equal((await request('/api/login', 'POST', { email: operator.email, password })).status, 403)
      assert.equal((await request(`/api/users/${a.id}`, 'PUT', { status: 'INATIVO' }, principal)).status, 200)
      for (const token of [aToken, supervisorToken]) {
        assert.equal((await request('/api/session', 'GET', undefined, token)).status, 401)
        assert.equal((await request('/api/events', 'GET', undefined, token)).status, 401)
      }
      assert.equal((await request('/api/login', 'POST', { email: supervisor.email, password })).status, 403)
      assert.equal((await request('/api/events', 'GET', undefined, bToken)).status, 200)
      assert.equal((await request('/api/events/team-a-event/athletes', 'GET', undefined, principal)).status, 200)
    })
  } finally {
    await stop()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
