import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

test('QR impresso recuperado: permissões, arquivo, exclusão, busca/ficha/ocorrência, reinício e página antiga', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-http-'))
  const password = 'isolated-qr-test-123'
  const adminEmail = 'qr-admin@example.test'
  const passwordHash = hashPassword(password)
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify([
    { id: 'qr-admin', name: 'ADMIN', email: adminEmail, passwordHash, role: 'ADMIN', eventId: 'all', status: 'ATIVO' },
    { id: 'qr-sub', name: 'SUB', email: 'qr-sub@example.test', passwordHash, role: 'SUB_ADMIN', eventId: 'new', status: 'ATIVO' },
  ]))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([
    { id: 'old', name: 'CORRIDA ANTERIOR', date: '20/10/2026', status: 'PLANEJADO' },
    { id: 'new', name: 'CORRIDA RECRIADA', date: '21/10/2026', status: 'PLANEJADO' },
  ]))
  fs.writeFileSync(path.join(dir, 'deleted_events.json'), JSON.stringify(['legacy']))
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
  const login = async (email) => (await request('/api/login', 'POST', { email, password })).data.token
  try {
    await start()
    let admin = await login(adminEmail)
    const sub = await login('qr-sub@example.test')
    const issue = (id, token = admin) => request(`/api/events/${id}/emergency-links`, 'POST', undefined, token)
    assert.equal((await issue('old', sub)).status, 403)
    assert.equal((await issue('old', '')).status, 401)
    assert.equal((await issue('old')).data.primaryCode, 'old')
    assert.equal((await request('/api/events/new/athletes', 'POST', { athletes: [{ id: 'a1', nome: 'ATLETA NOVO', numero: '42', doc: '12345678909', customFields: { ALERGIA: 'Teste' } }], schema: [], healthFields: [{ key: 'ALERGIA', label: 'Alergia', publico: true }] }, admin)).status, 200)
    const bind = (code, revision, token = admin) => request('/api/emergency-links/binding', 'PUT', { code, targetEventId: 'new', expectedRevision: revision, confirmed: true }, token)
    assert.equal((await bind('old', 1)).status, 409)
    assert.equal((await bind('old', 1, sub)).status, 403)
    assert.equal((await request('/api/events/old/archive', 'POST', { archived: true }, sub)).status, 403)
    assert.equal((await request('/api/events/old/archive', 'POST', { archived: true }, admin)).status, 200)
    assert.equal((await request('/api/public/emergencia/old')).status, 404)
    assert.equal((await request('/api/events/old/athletes', 'POST', { athletes: [] }, admin)).status, 409)
    assert.equal((await bind('old', 0)).status, 409)
    assert.equal((await bind('old', 1)).status, 200)
    assert.equal((await request('/api/public/emergencia/old')).data.event.id, 'new')
    assert.equal((await request('/api/public/emergencia/old/busca?q=42&event=old')).status, 409)
    assert.equal((await request('/api/public/emergencia/old/ocorrencias', 'POST', { expectedEventId: 'old' })).status, 409)
    const search = await request('/api/public/emergencia/old/busca?q=42&event=new')
    assert.equal(search.data.results[0].nome, 'ATLETA NOVO')
    const ref = search.data.results[0].ref
    const card = await request(`/api/public/emergencia/old/atleta/${ref}?event=new`)
    assert.equal(card.data.athlete.saude[0].value, 'Teste')
    assert.equal((await request('/api/public/emergencia/old/ocorrencias', 'POST', { expectedEventId: 'new', athleteRef: ref, gravidade: 'LEVE', solicitanteNome: 'Fiscal teste', solicitanteTelefone: '81999990000', descricao: 'Verificação sintética' })).status, 201)
    assert.equal((await request('/api/medico/new/ocorrencias', 'GET', undefined, admin)).data.ocorrencias.length, 1)
    assert.equal((await request('/api/medico/old/ocorrencias', 'GET', undefined, admin)).data.ocorrencias.length, 0)
    assert.equal((await request('/api/events/old/archive', 'POST', { archived: false }, admin)).data.event.status, 'PLANEJADO')
    assert.notEqual((await issue('old')).data.primaryCode, 'old')
    assert.equal((await request('/api/events/old', 'DELETE', undefined, admin)).status, 409)
    assert.equal((await request('/api/events/old', 'DELETE', { confirmQrInvalidation: true }, admin)).status, 200)
    assert.equal((await request('/api/public/emergencia/old')).data.event.id, 'new')
    assert.equal((await request('/api/events', 'POST', { id: 'old', name: 'REUSO INDEVIDO' }, admin)).status, 409)
    assert.equal((await bind('unknown', 0)).status, 404)
    assert.equal((await bind('legacy', 0)).status, 200)
    await stop()
    await start()
    admin = await login(adminEmail)
    assert.equal((await request('/api/public/emergencia/old')).data.event.id, 'new')
    assert.equal((await request('/api/public/emergencia/legacy')).data.event.id, 'new')
    assert.equal((await request('/api/events/new', 'DELETE', { confirmQrInvalidation: true }, admin)).status, 200)
    assert.equal((await request('/api/public/emergencia/old')).status, 404)
    assert.equal((await request('/api/public/emergencia/legacy')).status, 404)
    assert.equal(fs.existsSync(path.join(dir, 'athletes_new.json')), false)
    assert.equal((await request('/api/events/new/athletes', 'POST', { athletes: [] }, admin)).status, 404)
    assert.ok(JSON.parse(fs.readFileSync(path.join(dir, 'emergency_links.json'))).history.length >= 4)
    await stop()
    await start()
    admin = await login(adminEmail)
    assert.deepEqual((await request('/api/events', 'GET', undefined, admin)).data.events, [])
    assert.equal((await request('/api/public/emergencia/old')).status, 404)
  } finally { await stop(); fs.rmSync(dir, { recursive: true, force: true }) }
})
