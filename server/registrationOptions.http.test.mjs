import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

test('opções de cadastro no HTTP: autorização, catálogo por organização, integração e reinício', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registration-options-http-'))
  const password = 'registration-options-local-test-123'
  const principalEmail = 'options-principal@example.test'
  const passwordHash = hashPassword(password)
  const users = [
    { id: 'principal', role: 'ADMIN', email: principalEmail, eventId: 'all' },
    { id: 'legacy-admin', role: 'ADMIN', eventId: 'all' },
    { id: 'leader-a', role: 'TEAM_ADMIN', teamId: 'org-a', eventId: 'all' },
    { id: 'leader-b', role: 'TEAM_ADMIN', teamId: 'org-b', eventId: 'all' },
    { id: 'sub-a', role: 'SUB_ADMIN', teamId: 'org-a', eventId: 'a-1' },
    { id: 'supervisor-a', role: 'SUPERVISOR', teamId: 'org-a', eventId: 'a-1' },
    { id: 'operator-a', role: 'OPERADOR', teamId: 'org-a', eventId: 'a-1' },
    { id: 'doctor-a', role: 'MEDICO', teamId: 'org-a', eventId: 'a-1' },
  ].map((user) => ({ name: user.id.toUpperCase(), status: 'ATIVO', email: `${user.id}@example.test`, ...user, passwordHash }))
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify(users))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([
    { id: 'legacy', name: 'ACERVO PRINCIPAL', status: 'PLANEJADO' },
    { id: 'a-1', name: 'EVENTO A UM', teamId: 'org-a', status: 'EM OPERAÇÃO' },
    { id: 'a-2', name: 'EVENTO A DOIS', teamId: 'org-a', status: 'PLANEJADO' },
    { id: 'b-1', name: 'EVENTO B', teamId: 'org-b', status: 'PLANEJADO' },
    { id: 'archived', name: 'ARQUIVADO', teamId: 'org-a', status: 'ARQUIVADO' },
  ]))
  const initialAthletes = [
    { id: 'athlete-a', numero: '10', nome: 'ATLETA DE TESTE', equipe: 'ANTIGA', categoria: 'GERAL', camiseta: 'M', modalidade: '5 KM', kit: 'PADRÃO', status: 'PENDENTE', customFields: { BATERIA: '08:00', ALERGIA: 'DADO DE SAÚDE DE TESTE' } },
  ]
  const schema = [
    { key: 'numero', label: 'Número', type: 'standard' },
    { key: 'nome', label: 'Nome', type: 'standard' },
    { key: 'custom:BATERIA', customKey: 'BATERIA', label: 'Bateria', type: 'custom' },
    { key: 'custom:ALERGIA', customKey: 'ALERGIA', label: 'Alergia', type: 'custom' },
  ]
  fs.writeFileSync(path.join(dir, 'athletes_a-1.json'), JSON.stringify({ eventId: 'a-1', athletes: initialAthletes, schema, healthFields: [{ key: 'ALERGIA', label: 'Alergia', publico: false }], listRevision: 0 }))
  const appwriteCalls = []
  const fakeAppwrite = http.createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks).toString()
    appwriteCalls.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : {} })
    res.writeHead(req.method === 'POST' ? 201 : 200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(req.method === 'GET' ? { documents: [], collections: [], total: 0 } : {}))
  })
  let child, base
  const stop = async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => { child.once('exit', resolve); child.kill() })
    }
  }
  const start = async () => {
    const socket = net.createServer()
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
    const port = socket.address().port
    await new Promise((resolve) => socket.close(resolve))
    base = `http://127.0.0.1:${port}`
    let startupError = ''
    child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: {
        ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: principalEmail, ADMIN_PASSWORD: password,
        APPWRITE_ENABLED: 'true', APPWRITE_ENDPOINT: `http://127.0.0.1:${fakeAppwrite.address().port}/v1`,
        APPWRITE_PROJECT_ID: 'isolated-test', APPWRITE_API_KEY: 'fake-key-only-for-local-tests',
        APPWRITE_DATABASE_ID: 'options-test', APPWRITE_COLLECTION_ATHLETES: 'athletes', APPWRITE_COLLECTION_EVENTS: 'events',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (chunk) => { startupError = (startupError + chunk.toString()).slice(-3000) })
    child.stderr.on('data', (chunk) => { startupError = (startupError + chunk.toString()).slice(-3000) })
    for (let i = 0; i < 150; i++) {
      if (child.exitCode !== null) throw new Error(`Servidor isolado encerrou antes de iniciar: ${startupError}`)
      try { if ((await fetch(base + '/api/health')).ok) return } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(`Servidor isolado não iniciou: ${startupError}`)
  }
  const request = async (route, method = 'GET', body, token) => {
    const response = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }
  const login = async (id) => {
    const user = users.find((item) => item.id === id)
    const result = await request('/api/login', 'POST', { email: user.email, password })
    assert.equal(result.status, 200, `login ${id}`)
    return result.data.token
  }
  const route = (eventId = 'a-1') => `/api/events/${eventId}/registration-options`
  const tokens = {}
  try {
    await new Promise((resolve) => fakeAppwrite.listen(0, '127.0.0.1', resolve))
    await start()
    for (const user of users) tokens[user.id] = await login(user.id)

    await t.test('autenticação e autorização equivalentes à edição de atleta', async () => {
      assert.equal((await request(route())).status, 401)
      assert.equal((await request(route(), 'POST', { field: 'equipe', value: 'NEGADA' })).status, 401)
      for (const id of ['operator-a', 'doctor-a']) {
        assert.equal((await request(route(), 'POST', { field: 'equipe', value: 'NEGADA' }, tokens[id])).status, 403, id)
      }
      for (const id of ['principal', 'leader-a', 'sub-a', 'supervisor-a']) {
        const result = await request(route(), 'POST', { field: 'equipe', value: `Criada por ${id}` }, tokens[id])
        assert.equal(result.status, 201, `${id}: ${JSON.stringify(result.data)}`)
        assert.equal(result.data.created, true)
      }
      assert.equal((await request(route('a-2'), 'POST', { field: 'equipe', value: 'FORA DO EVENTO' }, tokens['supervisor-a'])).status, 403)
      assert.equal((await request(route('b-1'), 'POST', { field: 'equipe', value: 'FORA DA ORGANIZAÇÃO' }, tokens['leader-a'])).status, 403)
      assert.equal((await request(route('b-1'), 'GET', undefined, tokens['leader-a'])).status, 403)
      assert.equal((await request(route('a-1'), 'GET', undefined, tokens['legacy-admin'])).status, 403)
      assert.equal((await request(route('archived'), 'POST', { field: 'equipe', value: 'NÃO GRAVAR' }, tokens['leader-a'])).status, 409)
      assert.equal((await request(route('missing'), 'POST', { field: 'equipe', value: 'NÃO GRAVAR' }, tokens.principal)).status, 404)
    })

    await t.test('opção é global na organização e principal usa o catálogo do evento, sem aceitar escopo forjado', async () => {
      const added = await request(route(), 'POST', { field: 'equipe', value: 'Café Run', teamId: 'org-b', scope: 'org-b' }, tokens.principal)
      assert.equal(added.status, 201)
      assert.ok((await request(route('a-2'), 'GET', undefined, tokens['leader-a'])).data.options.equipe.includes('Café Run'))
      for (const [id, token] of [['b-1', tokens['leader-b']], ['legacy', tokens.principal]]) {
        const result = await request(route(id), 'GET', undefined, token)
        assert.equal(result.status, 200)
        assert.equal((result.data.options.equipe || []).includes('Café Run'), false)
      }
      const duplicate = await request(route(), 'POST', { field: 'equipe', value: '  CAFE\u0301   RUN  ' }, tokens['supervisor-a'])
      assert.equal(duplicate.status, 200)
      assert.equal(duplicate.data.created, false)
      assert.equal(duplicate.data.value, 'Café Run')
      assert.equal((await request(route(), 'POST', { field: 'equipe', value: 'Ｃａｆé　Ｒｕｎ' }, tokens['leader-a'])).status, 200)
      assert.equal((await request('/api/events/a-1/athletes', 'GET', undefined, tokens['leader-a'])).data.athletes[0].equipe, 'ANTIGA', 'criar opção não altera atleta existente')
    })

    await t.test('enums permanecem fechados e custom exige campo do evento que não seja de saúde', async () => {
      for (const field of ['status', 'role', 'sexo', '__proto__', 'custom:INEXISTENTE', 'custom:ALERGIA']) {
        assert.equal((await request(route(), 'POST', { field, value: 'NÃO GRAVAR' }, tokens['leader-a'])).status, 400, field)
      }
      const listed = await request(route(), 'GET', undefined, tokens['leader-a'])
      assert.ok(listed.data.customFields.includes('BATERIA'))
      assert.equal(listed.data.customFields.includes('ALERGIA'), false)
      assert.equal((await request(route(), 'POST', { field: 'custom:BATERIA', value: '09:00' }, tokens['supervisor-a'])).status, 201)
      assert.equal((await request(route('a-2'), 'POST', { field: 'custom:BATERIA', value: '10:00' }, tokens['leader-a'])).status, 400, 'evento sem esse campo não pode cadastrá-lo')
      for (const value of ['', '—', 'SEM EQUIPE', 'NOME\nINDEVIDO', 'X'.repeat(129)]) {
        assert.equal((await request(route(), 'POST', { field: 'equipe', value }, tokens['leader-a'])).status, 400)
      }
    })

    await t.test('gravações concorrentes preservam todas as opções e uma única duplicata', async () => {
      const values = ['Equipe Um', 'Equipe Dois', 'Equipe Três', 'EQUIPE UM']
      const results = await Promise.all(values.map((value) => request(route(), 'POST', { field: 'equipe', value }, tokens['leader-a'])))
      assert.equal(results.filter((result) => result.status === 201).length, 3)
      assert.equal(results.filter((result) => result.status === 200).length, 1)
      const options = (await request(route('a-2'), 'GET', undefined, tokens['leader-a'])).data.options.equipe
      for (const value of values.slice(0, 3)) assert.ok(options.includes(value), value)
    })

    await t.test('salvar atleta percorre persistência operacional e espelho Appwrite com a nova equipe', async () => {
      const chosen = (await request(route(), 'GET', undefined, tokens['leader-a'])).data.options.equipe.find((value) => value === 'Café Run')
      const saved = await request('/api/events/a-1/athletes', 'POST', {
        athletes: [{ ...initialAthletes[0], equipe: chosen, customFields: { ...initialAthletes[0].customFields, BATERIA: '09:00' } }],
        schema, listRevision: 0,
      }, tokens['supervisor-a'])
      assert.equal(saved.status, 200)
      const persisted = (await request('/api/events/a-1/athletes', 'GET', undefined, tokens['leader-a'])).data.athletes[0]
      assert.equal(persisted.equipe, 'Café Run')
      assert.equal(persisted.customFields.BATERIA, '09:00')
      assert.equal(persisted.status, 'PENDENTE')
      for (let i = 0; i < 100 && !appwriteCalls.some((call) => call.method === 'PATCH' && /\/collections\/athletes\/documents\//.test(call.url) && call.body.data?.team === 'Café Run'); i++) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
      const mirrored = appwriteCalls.find((call) => call.method === 'PATCH' && /\/collections\/athletes\/documents\//.test(call.url) && call.body.data?.team === 'Café Run')
      assert.ok(mirrored, 'nova equipe chegou ao Appwrite simulado pelo salvamento normal do atleta')
      assert.equal(mirrored.body.data.event_id, 'a-1')
      assert.equal(mirrored.body.data.bib_number, '10')
      assert.equal(mirrored.body.data.status, 'PENDENTE')
    })

    await t.test('catálogo e atleta sobrevivem ao reinício sem criar outra inscrição', async () => {
      await stop()
      await start()
      tokens['leader-a'] = await login('leader-a')
      const listed = await request(route('a-2'), 'GET', undefined, tokens['leader-a'])
      assert.ok(listed.data.options.equipe.includes('Café Run'))
      assert.ok(listed.data.options.equipe.includes('Equipe Dois'))
      const athletes = (await request('/api/events/a-1/athletes', 'GET', undefined, tokens['leader-a'])).data.athletes
      assert.equal(athletes.length, 1)
      assert.equal(athletes[0].equipe, 'Café Run')
    })

    await t.test('catálogo corrompido retorna indisponibilidade sem sobrescrever dados ou derrubar a API', async () => {
      await stop()
      const file = path.join(dir, 'registration_options.json')
      const corrupted = '{ arquivo incompleto'
      fs.writeFileSync(file, corrupted)
      await start()
      tokens['leader-a'] = await login('leader-a')
      assert.equal((await request(route(), 'GET', undefined, tokens['leader-a'])).status, 503)
      assert.equal((await request(route(), 'POST', { field: 'equipe', value: 'NÃO GRAVAR' }, tokens['leader-a'])).status, 503)
      assert.equal(fs.readFileSync(file, 'utf8'), corrupted)
      assert.equal((await request('/api/health')).status, 200)
      assert.equal((await request('/api/events/a-1/athletes', 'GET', undefined, tokens['leader-a'])).data.athletes.length, 1)
    })
  } finally {
    await stop()
    await new Promise((resolve) => fakeAppwrite.close(resolve))
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
