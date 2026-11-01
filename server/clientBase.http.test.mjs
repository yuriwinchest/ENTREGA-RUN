import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'
import { CLIENT_DIR_NAME, preserveDeletedEventAthletes } from './clientBase.js'

test('evento sem atletas não cria registro na base de clientes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clientes-unit-'))
  try {
    assert.equal(preserveDeletedEventAthletes(dir, { id: 'vazio' }, null), null)
    assert.equal(preserveDeletedEventAthletes(dir, { id: 'vazio' }, { athletes: [] }), null)
    assert.equal(fs.existsSync(path.join(dir, CLIENT_DIR_NAME)), false)
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('arquivar mantém a planilha; excluir guarda atletas e contato na base de clientes, sem saúde', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clientes-http-'))
  const password = 'isolated-client-base-123'
  const adminEmail = 'clientes-admin@example.test'
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify([
    { id: 'cb-admin', name: 'ADMIN', email: adminEmail, passwordHash: hashPassword(password), role: 'ADMIN', eventId: 'all', status: 'ATIVO' },
  ]))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([
    { id: 'cb-ev', name: 'CORRIDA DOS CLIENTES', date: '20/10/2026', status: 'PLANEJADO' },
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
  const sheet = path.join(dir, 'athletes_cb-ev.json')
  const clientDir = path.join(dir, CLIENT_DIR_NAME)
  try {
    await start()
    let admin = (await request('/api/login', 'POST', { email: adminEmail, password })).data.token
    const athletes = [
      { id: 'c1', nome: 'CLIENTE UM', numero: '10', doc: '12345678909', contato: '(81) 90000-0001', customFields: { EMAIL: 'um@example.test', ALERGIA: 'Dipirona' } },
      { id: 'c2', nome: 'CLIENTE DOIS', numero: '11', doc: '98765432100', contato: '(81) 90000-0002', customFields: { EMAIL: 'dois@example.test' } },
    ]
    const saved = await request('/api/events/cb-ev/athletes', 'POST', {
      athletes, schema: [], originalSheet: { rows: [['ALERGIA'], ['Dipirona']] },
      healthFields: [{ key: 'ALERGIA', label: 'Alergia', publico: true }],
    }, admin)
    assert.equal(saved.status, 200)

    const before = fs.readFileSync(sheet, 'utf8')
    assert.equal((await request('/api/events/cb-ev/archive', 'POST', { archived: true }, admin)).data.event.status, 'ARQUIVADO')
    assert.equal(fs.readFileSync(sheet, 'utf8'), before, 'arquivar não mexe na planilha')
    assert.equal(fs.existsSync(clientDir), false, 'arquivar não usa a base de clientes')
    assert.equal((await request('/api/events/cb-ev/athletes', 'GET', undefined, admin)).data.athletes.length, 2)
    assert.equal((await request('/api/events/cb-ev/archive', 'POST', { archived: false }, admin)).data.event.status, 'PLANEJADO')

    assert.equal((await request('/api/events/cb-ev', 'DELETE', { confirmQrInvalidation: true }, admin)).status, 200)
    assert.equal(fs.existsSync(sheet), false, 'o evento excluído deixa de ter planilha ativa')
    const files = fs.readdirSync(clientDir)
    assert.equal(files.length, 1)
    const kept = JSON.parse(fs.readFileSync(path.join(clientDir, files[0]), 'utf8'))
    assert.equal(kept.eventName, 'CORRIDA DOS CLIENTES')
    assert.deepEqual(kept.athletes.map((a) => [a.doc, a.contato, a.customFields.EMAIL]), [
      ['12345678909', '(81) 90000-0001', 'um@example.test'],
      ['98765432100', '(81) 90000-0002', 'dois@example.test'],
    ])
    assert.equal(kept.athletes[0].customFields.ALERGIA, undefined, 'saúde não vai para a base de clientes')
    assert.equal(kept.originalSheet, undefined)
    assert.equal(kept.healthFields, undefined)

    await stop()
    await start()
    admin = (await request('/api/login', 'POST', { email: adminEmail, password })).data.token
    assert.deepEqual((await request('/api/events', 'GET', undefined, admin)).data.events, [], 'evento excluído não volta pela base de clientes')
    assert.equal(fs.readdirSync(clientDir).length, 1)
  } finally { await stop(); fs.rmSync(dir, { recursive: true, force: true }) }
})
