import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

test('Espelho por posto: três canais, capacidade pública, dono, configuração comum e reinício', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'espelho-channels-'))
  const password = 'espelho-channel-test-123'
  const principalEmail = 'channels-principal@example.test'
  const users = [
    { id: 'principal', email: principalEmail, role: 'ADMIN' },
    { id: 'team-admin', email: 'team@example.test', role: 'TEAM_ADMIN', teamId: 'team-one' },
    { id: 'operator-one', email: 'one@example.test', role: 'OPERADOR', teamId: 'team-one', eventId: 'event-one' },
    { id: 'operator-two', email: 'two@example.test', role: 'OPERADOR', teamId: 'team-one', eventId: 'event-one' },
    { id: 'other-team', email: 'other@example.test', role: 'TEAM_ADMIN', teamId: 'team-two' },
  ].map((user) => ({ eventId: 'all', ...user, name: user.id.toUpperCase(), status: 'ATIVO', passwordHash: hashPassword(password) }))
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify(users))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([
    { id: 'event-one', name: 'EVENTO UM', teamId: 'team-one', status: 'PLANEJADO' },
    { id: 'event-two', name: 'EVENTO DOIS', teamId: 'team-two', status: 'PLANEJADO' },
  ]))
  let child, base, one, two, principal, other, channels
  const stationOne = crypto.randomUUID()
  const stationTwo = crypto.randomUUID()
  const streams = []
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
      if (child.exitCode !== null) throw new Error('Servidor de canais encerrou')
      try { if ((await fetch(`${base}/api/health`)).ok) return } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error('Servidor de canais não iniciou')
  }
  const request = async (route, method = 'GET', body, token) => {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, data: await response.json() }
  }
  const login = async (email) => {
    const response = await request('/api/login', 'POST', { email, password })
    assert.equal(response.status, 200)
    return response.data.token
  }
  const open = (stationId, token, event = 'event-one', extra = {}) => request(`/api/espelho/${event}/canais`, 'POST', { stationId, ...extra }, token)
  const route = (channel, action = 'estado', event = 'event-one') => `/api/espelho/${event}/${action}?canal=${channel}`
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKasAAAAASUVORK5CYII='
  const connect = async (channel) => {
    const controller = new AbortController()
    const response = await fetch(base + route(channel, 'stream'), { signal: controller.signal })
    assert.equal(response.status, 200)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let pending = ''
    const next = async () => {
      for (;;) {
        const boundary = pending.indexOf('\n\n')
        if (boundary >= 0) {
          const frame = pending.slice(0, boundary)
          pending = pending.slice(boundary + 2)
          if (frame.startsWith('data: ')) return JSON.parse(frame.slice(6)).state
        } else {
          const result = await reader.read()
          if (result.done) throw new Error('SSE encerrado antes do estado')
          pending += decoder.decode(result.value, { stream: true })
        }
      }
    }
    const stream = { next, close: () => { controller.abort(); return reader.cancel().catch(() => {}) } }
    streams.push(stream)
    return stream
  }
  try {
    await start()
    one = await login('one@example.test')
    two = await login('two@example.test')
    principal = await login(principalEmail)
    other = await login('other@example.test')

    await t.test('criação idempotente por evento, login e posto; nenhuma sessão ou autoria exposta', async () => {
      assert.equal((await open(stationOne)).status, 401)
      assert.equal((await open('fake', one)).status, 400)
      assert.equal((await open(stationOne, one, 'event-two')).status, 403)
      const first = await open(stationOne, one, 'event-one', { ownerUserId: 'operator-two', canalId: 'forged' })
      assert.equal(first.status, 200)
      assert.match(first.data.canalId, /^[a-f0-9]{64}$/)
      assert.deepEqual(Object.keys(first.data).sort(), ['canalId', 'ok'])
      const second = await open(stationTwo, one)
      const third = await open(stationOne, two)
      channels = [first.data.canalId, second.data.canalId, third.data.canalId]
      assert.equal(new Set(channels).size, 3)
      assert.equal((await open(stationOne, one)).data.canalId, channels[0])
      const saved = JSON.parse(fs.readFileSync(path.join(dir, 'espelho_canais.json'), 'utf8'))
      assert.equal(saved.length, 3)
      assert.equal(saved.find((item) => item.canalId === channels[0]).ownerUserId, 'operator-one')
      assert.ok(saved.every((item) => !('token' in item) && !('atleta' in item)))
    })

    await t.test('cada ficha é independente e nenhum canal novo herda atendimento anterior', async () => {
      for (const [index, channel] of channels.entries()) {
        const before = await request(route(channel))
        assert.equal(before.status, 200)
        assert.equal(before.data.state.atleta, null)
        assert.equal(before.data.state.status, 'LIVRE')
        assert.equal((await request(route(channel), 'POST', { status: 'ATENDENDO', atleta: { nome: `FICHA ${index + 1}`, numero: String(index + 1) } }, index < 2 ? one : two)).status, 200)
      }
      for (const [index, channel] of channels.entries()) assert.equal((await request(route(channel))).data.state.atleta.nome, `FICHA ${index + 1}`)
      assert.equal((await request('/api/espelho/event-one/estado')).data.state, null)
      assert.equal((await request('/api/espelho/event-one/estado', 'POST', { status: 'ATENDENDO', atleta: { nome: 'LEGADO' }, config: { mensagem: 'NAO SALVAR' } }, one)).status, 409)
      assert.equal((await request(route(channels[0]))).data.state.config, null)
    })

    await t.test('capacidade é restrita ao evento; escrita exige dono mesmo para principal', async () => {
      for (const token of [two, principal, other]) assert.equal((await request(route(channels[0]), 'POST', { status: 'LIVRE' }, token)).status, 403)
      assert.equal((await request(route(channels[0]), 'POST', { status: 'LIVRE' })).status, 401)
      for (const action of ['estado', 'stream']) {
        assert.equal((await request(route(channels[0], action, 'event-two'))).status, 404)
        assert.equal((await request(route('f'.repeat(64), action))).status, 404)
        assert.equal((await request(route('forged', action))).status, 404)
      }
      assert.equal((await request(route('f'.repeat(64)), 'POST', { status: 'LIVRE' }, one)).status, 404)
    })

    await t.test('SSE separa atualizações ao vivo e distribui aparência comum sem trocar atletas', async () => {
      const connected = []
      for (const [index, channel] of channels.entries()) {
        const stream = await connect(channel)
        assert.equal((await stream.next()).atleta.nome, `FICHA ${index + 1}`)
        connected.push(stream)
      }
      assert.equal((await request(route(channels[0]), 'POST', { status: 'ENTREGUE', atleta: { nome: 'FICHA 1 ENTREGUE' } }, one)).status, 200)
      assert.equal((await connected[0].next()).atleta.nome, 'FICHA 1 ENTREGUE')
      assert.equal((await request('/api/espelho/event-one/estado', 'POST', { config: { bgImage: image, logo: image, mensagem: 'APARENCIA COMUM' } }, one)).status, 200)
      for (const [index, stream] of connected.entries()) {
        const state = await stream.next()
        assert.equal(state.atleta.nome, index === 0 ? 'FICHA 1 ENTREGUE' : `FICHA ${index + 1}`)
        assert.equal(state.config.bgImage, image)
        assert.equal(state.config.logo, image)
        const get = await request(route(channels[index]))
        assert.deepEqual(get.data.state.config, state.config)
      }
      assert.equal((await request('/api/espelho/event-one/estado')).data.state.atleta, null)
      for (const stream of connected) await stream.close()
    })

    await t.test('reinício conserva identidade e aparência; atendimento não vai ao disco', async () => {
      const persisted = fs.readFileSync(path.join(dir, 'espelho_canais.json'), 'utf8')
      assert.ok(!persisted.includes('FICHA'))
      await stop()
      await start()
      one = await login('one@example.test')
      assert.equal((await open(stationOne, one)).data.canalId, channels[0])
      assert.equal(fs.readFileSync(path.join(dir, 'espelho_canais.json'), 'utf8'), persisted)
      for (const channel of channels) {
        const state = (await request(route(channel))).data.state
        assert.equal(state.status, 'LIVRE')
        assert.equal(state.atleta, null)
        assert.equal(state.config.logo, image)
        assert.equal(state.config.bgImage, image)
      }
    })
  } finally {
    for (const stream of streams) await stream.close()
    await stop()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
