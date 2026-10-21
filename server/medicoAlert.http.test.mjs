import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'
import { createMedicoStore } from './medico.js'

test('alerta médico: reconhecimento global por ID, autorização, concorrência e persistência', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medico-alert-http-'))
  const password = 'isolated-medico-alert-123'
  const passwordHash = hashPassword(password)
  const users = [
    ['admin', 'ADMIN', 'all'], ['ana', 'MEDICO', 'race'], ['bia', 'MEDICO', 'race'],
    ['outro', 'MEDICO', 'other'], ['operador', 'OPERADOR', 'race'],
  ].map(([id, role, eventId]) => ({ id, name: id.toUpperCase(), email: `${id}@alert.example.test`, passwordHash, role, eventId, status: 'ATIVO' }))
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify(users))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify(['race', 'other'].map((id) => ({ id, name: id, status: 'PLANEJADO' }))))
  let child
  let base
  const stop = async () => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return
    await new Promise((resolve) => { child.once('exit', resolve); child.kill() })
  }
  const start = async () => {
    const socket = net.createServer()
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
    const port = socket.address().port
    await new Promise((resolve) => socket.close(resolve))
    base = `http://127.0.0.1:${port}`
    child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], {
      env: { ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: users[0].email, ADMIN_PASSWORD: password, APPWRITE_API_KEY: '', APPWRITE_ENABLED: 'false' },
      stdio: 'ignore',
    })
    for (let i = 0; i < 100; i += 1) {
      if (child.exitCode !== null) throw new Error('Servidor isolado encerrou antes de iniciar')
      try { if ((await fetch(`${base}/api/health`)).ok) return } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error('Servidor isolado não iniciou')
  }
  const request = async (route, method = 'GET', body, token) => {
    const res = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: res.status, data: await res.json() }
  }
  const login = async (id) => {
    const res = await request('/api/login', 'POST', { email: `${id}@alert.example.test`, password })
    assert.equal(res.status, 200)
    assert.ok(res.data.token)
    return res.data.token
  }
  const queue = (token, version) => request(`/api/medico/race/ocorrencias${version === undefined ? '' : `?v=${version}`}`, 'GET', undefined, token)
  const ackRoute = (id, event = 'race') => `/api/medico/${event}/ocorrencias/${id}/silenciar`
  const open = (code, descricao) => request(`/api/public/emergencia/${encodeURIComponent(code)}/ocorrencias`, 'POST', {
    gravidade: 'GRAVE', solicitanteNome: 'Fiscal sintético', solicitanteTelefone: '81999990000', descricao,
  })
  try {
    await start()
    const admin = await login('admin')
    let ana = await login('ana')
    let bia = await login('bia')
    const other = await login('outro')
    const operator = await login('operador')
    const issue = await request('/api/events/race/emergency-links', 'POST', undefined, admin)
    assert.equal(issue.status, 200)
    const code = issue.data.primaryCode
    assert.ok(code)
    const otherIssue = await request('/api/events/other/emergency-links', 'POST', undefined, admin)
    assert.equal((await open(otherIssue.data.primaryCode, 'Ocorrência de outro evento')).status, 201)
    const otherQueue = await request('/api/medico/other/ocorrencias', 'GET', undefined, other)
    const foreignId = otherQueue.data.ocorrencias[0].id
    assert.equal((await open(code, 'Ocorrência X')).status, 201)
    const firstA = await queue(ana)
    const firstB = await queue(bia)
    assert.equal(firstA.status, 200)
    assert.deepEqual(firstB.data, firstA.data, 'dois clientes recebem a mesma fila inicial')
    const x = firstA.data.ocorrencias[0]
    assert.ok(!x.alertaReconhecidoEm, 'existente ao abrir permanece sem reconhecimento')
    assert.equal((await request(ackRoute(x.id), 'POST')).status, 401)
    assert.equal((await request(ackRoute(x.id), 'POST', undefined, operator)).status, 403)
    assert.equal((await request(ackRoute(x.id), 'POST', undefined, other)).status, 403)
    assert.equal((await request(ackRoute(foreignId), 'POST', undefined, ana)).status, 404)
    assert.equal((await request(ackRoute('inexistente'), 'POST', undefined, ana)).status, 404)
    assert.equal((await queue(ana)).data.version, firstA.data.version, 'negações não modificam a fila')

    const [ackX, newY] = await Promise.all([
      request(ackRoute(x.id), 'POST', undefined, ana), open(code, 'Ocorrência Y concorrente'),
    ])
    assert.equal(ackX.status, 200)
    assert.equal(newY.status, 201)
    assert.deepEqual(Object.keys(ackX.data).sort(), ['alertaReconhecidoEm', 'id', 'ok', 'version'])
    assert.equal(ackX.data.id, x.id)
    assert.ok(Number.isFinite(Date.parse(ackX.data.alertaReconhecidoEm)))
    const fromB = await queue(bia, firstB.data.version)
    assert.equal(fromB.data.unchanged, undefined)
    const savedX = fromB.data.ocorrencias.find((item) => item.id === x.id)
    const y = fromB.data.ocorrencias.find((item) => item.id !== x.id)
    assert.equal(savedX.alertaReconhecidoEm, ackX.data.alertaReconhecidoEm)
    assert.equal(savedX.status, x.status)
    assert.deepEqual(savedX.historico, x.historico, 'silenciar não altera histórico clínico')
    assert.equal('alertaReconhecidoPor' in savedX, false)
    assert.ok(!y.alertaReconhecidoEm, 'ACK de X não alcança Y concorrente')
    const repeat = await request(ackRoute(x.id), 'POST', undefined, bia)
    assert.equal(repeat.data.alertaReconhecidoEm, ackX.data.alertaReconhecidoEm)
    assert.equal(repeat.data.version, fromB.data.version, 'repetição preserva versão')
    assert.equal((await queue(ana, repeat.data.version)).data.unchanged, true)
    assert.deepEqual((await queue(ana)).data.ocorrencias, fromB.data.ocorrencias, 'refresh sem versão preserva reconhecimento')

    const yRoute = `/api/medico/race/ocorrencias/${y.id}`
    assert.equal((await request(yRoute, 'PATCH', { status: 'ENCERRADA', reconhecerAlerta: true }, ana)).status, 400)
    const attending = await request(yRoute, 'PATCH', { status: 'EM_ATENDIMENTO', reconhecerAlerta: true }, ana)
    assert.equal(attending.status, 200)
    assert.equal(attending.data.version, fromB.data.version + 1, 'atendimento e ACK têm uma única gravação')
    const attendingQueue = await queue(bia)
    const savedY = attendingQueue.data.ocorrencias.find((item) => item.id === y.id)
    assert.equal(savedY.status, 'EM_ATENDIMENTO')
    assert.ok(savedY.alertaReconhecidoEm)
    assert.deepEqual(savedY.historico.map((item) => item.status), ['ABERTA', 'EM_ATENDIMENTO'])
    const attendingAgain = await request(yRoute, 'PATCH', { status: 'EM_ATENDIMENTO', reconhecerAlerta: true }, bia)
    assert.equal(attendingAgain.data.version, attending.data.version)
    const disk = JSON.parse(fs.readFileSync(path.join(dir, 'medico', 'ocorrencias_race.json'), 'utf8'))
    assert.equal(disk.ocorrencias.find((item) => item.id === x.id).alertaReconhecidoPor, 'ana')

    await stop()
    await start()
    ana = await login('ana')
    bia = await login('bia')
    const restarted = await queue(bia)
    assert.deepEqual(restarted.data.ocorrencias, attendingQueue.data.ocorrencias, 'reinício preserva ACK e status de ambos')
    assert.equal(restarted.data.version, attending.data.version)
    assert.equal((await open(code, 'Ocorrência Z após reinício')).status, 201)
    const rearmed = await queue(ana, restarted.data.version)
    assert.equal(rearmed.data.unchanged, undefined)
    assert.deepEqual(rearmed.data.ocorrencias.filter((item) => !item.alertaReconhecidoEm).map((item) => item.descricao), ['Ocorrência Z após reinício'])
  } finally {
    await stop()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('falha de persistência do ACK não reconhece alerta no cache nem avança versão', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medico-alert-disk-'))
  try {
    const store = createMedicoStore(dir)
    const x = store.addOcorrencia('race', { descricao: 'Sintética' })
    const beforeVersion = store.version('race')
    fs.renameSync(path.join(dir, 'medico'), path.join(dir, 'medico-backup'))
    fs.writeFileSync(path.join(dir, 'medico'), 'obstáculo de gravação sintético')
    assert.throws(() => store.recognizeAlert('race', x.id, 'ana'))
    assert.equal(store.version('race'), beforeVersion)
    assert.ok(!store.listOcorrencias('race')[0].alertaReconhecidoEm)
    fs.unlinkSync(path.join(dir, 'medico'))
    fs.renameSync(path.join(dir, 'medico-backup'), path.join(dir, 'medico'))
    assert.ok(!createMedicoStore(dir).listOcorrencias('race')[0].alertaReconhecidoEm)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
