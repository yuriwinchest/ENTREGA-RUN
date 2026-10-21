import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'
import { validateDesfecho, validateRegistro } from './medico.js'

test('registro e desfecho: validação de texto livre e destinos', () => {
  assert.ok(validateRegistro({}).error)
  assert.ok(validateRegistro({ avaliacao: '   ', condutas: '' }).error)
  assert.deepEqual(validateRegistro({ condutas: ' Curativo ', extra: 'x' }).value, { avaliacao: '', condutas: 'Curativo', prescricoes: '' })
  assert.equal(validateRegistro({ prescricoes: 'x'.repeat(5000) }).value.prescricoes.length, 2000)
  assert.ok(validateDesfecho({}).error)
  assert.ok(validateDesfecho({ destino: 'INVENTADO' }).error)
  assert.equal(validateDesfecho({ destino: 'REMOVIDO_HOSPITAL' }).error, 'Informe para qual hospital/UPA.')
  assert.deepEqual(validateDesfecho({ destino: 'LIBERADO_LOCAL', observacao: ' Bem ' }).value, { destino: 'LIBERADO_LOCAL', detalhe: '', observacao: 'Bem' })
})

test('registro de atendimento: autoria do servidor, encerramento com desfecho, reabertura e isolamento', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medico-registro-http-'))
  const password = 'isolated-medico-registro-123'
  const passwordHash = hashPassword(password)
  const users = [
    ['admin', 'ADMIN', 'all'], ['ana', 'MEDICO', 'race'], ['outro', 'MEDICO', 'other'], ['operador', 'OPERADOR', 'race'],
  ].map(([id, role, eventId]) => ({ id, name: `DRA ${id.toUpperCase()}`, email: `${id}@registro.example.test`, passwordHash, role, eventId, status: 'ATIVO' }))
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify(users))
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify(['race', 'other'].map((id) => ({ id, name: id, status: 'PLANEJADO' }))))
  const socket = net.createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], {
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: users[0].email, ADMIN_PASSWORD: password, APPWRITE_API_KEY: '', APPWRITE_ENABLED: 'false' },
    stdio: 'ignore',
  })
  const request = async (route, method = 'GET', body, token) => {
    const res = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: res.status, data: await res.json() }
  }
  try {
    for (let i = 0; i < 100; i += 1) {
      if (child.exitCode !== null) throw new Error('Servidor isolado encerrou antes de iniciar')
      try { if ((await fetch(`${base}/api/health`)).ok) break } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const login = async (id) => (await request('/api/login', 'POST', { email: `${id}@registro.example.test`, password })).data.token
    const admin = await login('admin')
    const ana = await login('ana')
    const other = await login('outro')
    const operator = await login('operador')
    const code = (await request('/api/events/race/emergency-links', 'POST', undefined, admin)).data.primaryCode
    assert.ok(code)
    const opened = await request(`/api/public/emergencia/${encodeURIComponent(code)}/ocorrencias`, 'POST', {
      gravidade: 'GRAVE', solicitanteNome: 'Fiscal sintético', solicitanteTelefone: '81999990000', descricao: 'Queda no km 5',
    })
    assert.equal(opened.status, 201)
    const queue = async () => (await request('/api/medico/race/ocorrencias', 'GET', undefined, ana)).data
    const occ = (await queue()).ocorrencias[0]
    const regRoute = `/api/medico/race/ocorrencias/${occ.id}/registros`
    const statusRoute = `/api/medico/race/ocorrencias/${occ.id}`

    // Só a equipe médica do evento registra.
    const nota = { avaliacao: 'Consciente, PA 12x8', condutas: 'Imobilização do tornozelo', prescricoes: 'Dipirona 1 g VO às 10h05' }
    assert.equal((await request(regRoute, 'POST', nota)).status, 401)
    assert.equal((await request(regRoute, 'POST', nota, operator)).status, 403)
    assert.equal((await request(`/api/medico/other/ocorrencias/${occ.id}/registros`, 'POST', nota, other)).status, 404)
    assert.equal((await request(regRoute, 'POST', { avaliacao: ' ' }, ana)).status, 400)

    // Autor e hora vêm do servidor, nunca do corpo enviado.
    const saved = await request(regRoute, 'POST', { ...nota, por: 'Falsário', em: '2000-01-01T00:00:00Z' }, ana)
    assert.equal(saved.status, 201)
    assert.equal(saved.data.registro.por, 'DRA ANA')
    assert.notEqual(saved.data.registro.em, '2000-01-01T00:00:00Z')
    assert.equal(saved.data.registro.prescricoes, 'Dipirona 1 g VO às 10h05')
    let current = (await queue()).ocorrencias[0]
    assert.equal(current.registros.length, 1)
    assert.equal(current.status, 'ABERTA', 'registrar não muda o status')

    // Encerrar exige desfecho; detalhe obrigatório para remoção.
    assert.equal((await request(statusRoute, 'PATCH', { status: 'ENCERRADA' }, ana)).status, 400)
    assert.equal((await request(statusRoute, 'PATCH', { status: 'ENCERRADA', desfecho: { destino: 'REMOVIDO_HOSPITAL' } }, ana)).status, 400)
    assert.equal((await queue()).ocorrencias[0].status, 'ABERTA', 'tentativa inválida não encerra')
    const closed = await request(statusRoute, 'PATCH', {
      status: 'ENCERRADA',
      desfecho: { destino: 'REMOVIDO_HOSPITAL', detalhe: 'HPS Porto Alegre', observacao: 'Ambulância 2' },
      registro: { avaliacao: 'Estável na saída' },
    }, ana)
    assert.equal(closed.status, 200)
    current = (await queue()).ocorrencias[0]
    assert.equal(current.status, 'ENCERRADA')
    assert.deepEqual([current.desfecho.destino, current.desfecho.detalhe, current.desfecho.por], ['REMOVIDO_HOSPITAL', 'HPS Porto Alegre', 'DRA ANA'])
    assert.deepEqual(current.registros.map((r) => r.avaliacao), ['Consciente, PA 12x8', 'Estável na saída'], 'anotação final gravada junto')

    // Anotação depois de encerrar é acréscimo, não edição.
    assert.equal((await request(regRoute, 'POST', { condutas: 'Ligação ao hospital confirmou chegada' }, ana)).status, 201)

    // Reabrir guarda o desfecho anterior; encerrar de novo pede novo desfecho.
    assert.equal((await request(statusRoute, 'PATCH', { status: 'EM_ATENDIMENTO' }, ana)).status, 200)
    current = (await queue()).ocorrencias[0]
    assert.equal(current.desfecho, null)
    assert.equal(current.desfechosAnteriores[0].detalhe, 'HPS Porto Alegre')
    assert.equal((await request(statusRoute, 'PATCH', { status: 'ENCERRADA' }, ana)).status, 400)
    assert.equal((await request(statusRoute, 'PATCH', { status: 'ENCERRADA', desfecho: { destino: 'LIBERADO_LOCAL' } }, ana)).status, 200)
    assert.equal((await queue()).ocorrencias[0].registros.length, 3)

    // Nada clínico vaza para rotas públicas.
    const publicText = JSON.stringify((await request(`/api/public/emergencia/${encodeURIComponent(code)}`)).data)
    for (const secret of ['Dipirona', 'HPS', 'Imobilização']) assert.equal(publicText.includes(secret), false, secret)

    // Evento provisório "CARREGANDO..." (tela aberta antes da lista carregar) não
    // renomeia nem muda status do evento real; só as contagens valem.
    const placeholder = await request('/api/events/race', 'PUT', { id: 'race', name: 'CARREGANDO...', status: 'EM OPERAÇÃO', location: 'X', total: 7, entregues: 0 }, admin)
    assert.equal(placeholder.status, 200)
    assert.equal(placeholder.data.event.name, 'race', 'nome original preservado')
    assert.equal(placeholder.data.event.status, 'PLANEJADO')
    assert.equal(placeholder.data.event.total, 7)
    const rename = await request('/api/events/race', 'PUT', { name: 'Corrida Real' }, admin)
    assert.equal(rename.data.event.name, 'CORRIDA REAL', 'renomear de propósito continua funcionando')

    // Persistência após reiniciar o processo vem do arquivo do evento.
    const disk = JSON.parse(fs.readFileSync(path.join(dir, 'medico', 'ocorrencias_race.json'), 'utf-8'))
    assert.equal(disk.ocorrencias[0].registros.length, 3)
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => { child.once('exit', resolve); child.kill() })
    }
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
