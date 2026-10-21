import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './passwords.js'

const serverFile = fileURLToPath(new URL('./server.js', import.meta.url))
const ADMIN_EMAIL = 'admin-medico@entregas.com'
const ADMIN_PASSWORD = 'test-admin-123456'

// O servidor grava as sessões ao receber SIGTERM: limpar a pasta antes de ele
// sair dá ENOTEMPTY no Linux. Espera o processo encerrar de fato.
async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  await new Promise((resolve) => {
    child.once('exit', resolve)
    child.kill()
  })
}

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function startServer(dataDir, port) {
  const child = spawn(process.execPath, [serverFile], {
    env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), ADMIN_EMAIL, ADMIN_PASSWORD, APPWRITE_API_KEY: '' },
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

test('fluxo completo: colunas de saúde da planilha, busca pública, ocorrência e painel do médico', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-medico-http-'))
  fs.writeFileSync(path.join(dataDir, 'events.json'), '[]')
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([{
    id: 'admin-1', name: 'ADMIN', email: ADMIN_EMAIL, passwordHash: hashPassword(ADMIN_PASSWORD),
    role: 'ADMIN', eventId: 'all', status: 'ATIVO',
  }]))
  const port = await freePort()
  const child = await startServer(dataDir, port)
  const request = async (route, method = 'GET', body, token) => {
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
  const login = async (email, password) => (await request('/api/login', 'POST', { email, password })).data.token

  try {
    const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert.ok(admin)
    for (const id of ['ev-poa', 'ev-outro']) {
      assert.equal((await request('/api/events', 'POST', { id, name: id, status: 'PLANEJADO' }, admin)).status, 201)
    }
    const athletes = [
      {
        id: 'imp-1', numero: '1', nome: 'ELIUD KIPCHOGE', doc: '123.456.789-09', contato: '(51) 98888-7777', modalidade: '42K', status: 'PENDENTE',
        customFields: { ALERGIA: 'Sim, dipirona', 'REMÉDIO CONTROLADO': 'Não', 'OBS MÉDICA': 'Marcapasso', 'TELEFONE EMERGÊNCIA': '51977776666', EQUIPE2: 'Pace' },
      },
      { id: 'imp-2', numero: '2', nome: 'ATLETA ESTRANGEIRA', doc: '', modalidade: '10K', status: 'PENDENTE', customFields: { ALERGIA: '' } },
    ]
    const healthFields = [
      { key: 'ALERGIA', label: 'Alergia', publico: true },
      { key: 'REMÉDIO CONTROLADO', label: 'Remédio controlado', publico: true },
      { key: 'OBS MÉDICA', label: 'Observação médica', publico: false },
      { key: 'TELEFONE EMERGÊNCIA', label: 'Telefone de emergência', publico: true },
    ]
    assert.equal((await request('/api/events/ev-poa/athletes', 'POST', { athletes, schema: [], healthFields }, admin)).status, 200)

    // A escolha volta para a tela de importação; o telefone não ficou público.
    const stored = await request('/api/events/ev-poa/athletes', 'GET', undefined, admin)
    assert.deepEqual(stored.data.healthFields.map((f) => [f.key, f.publico]), [
      ['ALERGIA', true], ['REMÉDIO CONTROLADO', true], ['OBS MÉDICA', false], ['TELEFONE EMERGÊNCIA', false],
    ])

    // Salvar de novo sem healthFields (autosave da operação) mantém a escolha.
    assert.equal((await request('/api/events/ev-poa/athletes', 'POST', { athletes, schema: [] }, admin)).status, 200)
    assert.equal((await request('/api/events/ev-poa/athletes', 'GET', undefined, admin)).data.healthFields.length, 4)

    // Validação pública do kit não mostra coluna de saúde.
    const kit = await request('/api/public/events/ev-poa/athletes/1')
    assert.deepEqual(kit.data.athlete.customFields, { EQUIPE2: 'Pace' })
    // Nem o espelho do guichê (segunda tela pública).
    await request('/api/espelho/ev-poa/estado', 'POST', { status: 'ATENDENDO', atleta: { numero: '1', nome: 'ELIUD', customFields: athletes[0].customFields } })
    const espelho = await request('/api/espelho/ev-poa/estado')
    assert.deepEqual(espelho.data.state.atleta.customFields, { EQUIPE2: 'Pace' })

    // Página pública de emergência: só colunas públicas preenchidas, sem CPF nem telefone.
    const info = await request('/api/public/emergencia/ev-poa')
    assert.equal(info.data.event.atletas, 2)
    const byBib = await request('/api/public/emergencia/ev-poa/busca?q=1')
    assert.equal(byBib.data.results.length, 1)
    const ref = byBib.data.results[0].ref
    assert.equal((await request('/api/public/emergencia/ev-poa/busca?q=12345678909')).data.results[0].ref, ref)
    assert.equal((await request('/api/public/emergencia/ev-poa/busca?q=kipchoge')).data.results[0].ref, ref)
    const card = await request(`/api/public/emergencia/ev-poa/atleta/${ref}`)
    assert.deepEqual(card.data.athlete.saude.map((r) => [r.label, r.value, r.alerta]), [
      ['Alergia', 'Sim, dipirona', true],
      ['Remédio controlado', 'Não', false],
    ])
    assert.equal(card.data.athlete.saudeConfigurada, true)
    const publicText = JSON.stringify(card.data)
    for (const secret of ['12345678909', '123.456.789', '98888', '977776666', 'Marcapasso']) {
      assert.equal(publicText.includes(secret), false, secret)
    }
    assert.equal((await request('/api/public/emergencia/ev-poa/atleta/ffffffffffffffffffff')).status, 404)
    assert.equal((await request('/api/public/emergencia/nao-existe')).status, 404)

    // Ocorrências: atleta identificado e pessoa não identificada.
    const invalid = await request('/api/public/emergencia/ev-poa/ocorrencias', 'POST', { gravidade: 'GRAVE' })
    assert.equal(invalid.status, 400)
    const first = await request('/api/public/emergencia/ev-poa/ocorrencias', 'POST', {
      athleteRef: ref, gravidade: 'GRAVE', solicitanteNome: 'Fiscal Km 12', solicitanteTelefone: '51999990000',
      descricao: 'Desmaiou após a curva', localTexto: 'Km 12', geo: { lat: -30.03, lng: -51.22, accuracy: 15 },
    })
    assert.equal(first.status, 201)
    assert.equal(first.data.protocolo, 1)
    const anon = await request('/api/public/emergencia/ev-poa/ocorrencias', 'POST', {
      gravidade: 'LEVE', solicitanteNome: 'Voluntária', solicitanteTelefone: '51999990001', descricao: 'Pessoa com cãibra',
    })
    assert.equal(anon.data.protocolo, 2)

    // Médico do evento: só o painel, só o próprio evento.
    const createdMedico = await request('/api/users', 'POST', {
      name: 'Dra. Ana', email: 'medica@entregas.com', password: 'medica-123', role: 'MEDICO', eventId: 'ev-poa', eventName: 'ev-poa',
    }, admin)
    assert.equal(createdMedico.status, 201)
    const unbound = await request('/api/users', 'POST', {
      name: 'Sem evento', email: 'sem@entregas.com', password: 'medica-123', role: 'MEDICO', eventId: 'all',
    }, admin)
    assert.equal(unbound.status, 400)
    const medico = await login('medica@entregas.com', 'medica-123')
    assert.ok(medico)
    assert.equal((await request('/api/events', 'GET', undefined, medico)).status, 403)
    assert.equal((await request('/api/users', 'GET', undefined, medico)).status, 403)
    assert.equal((await request('/api/events/ev-poa/athletes', 'GET', undefined, medico)).status, 403)
    assert.equal((await request('/api/medico/ev-outro/ocorrencias', 'GET', undefined, medico)).status, 403)
    assert.equal((await request('/api/session', 'GET', undefined, medico)).status, 200)
    assert.equal((await request('/api/medico/ev-poa/ocorrencias')).status, 401)

    const queue = await request('/api/medico/ev-poa/ocorrencias', 'GET', undefined, medico)
    assert.equal(queue.status, 200)
    assert.equal(queue.data.ocorrencias.length, 2)
    const grave = queue.data.ocorrencias.find((item) => item.protocolo === 1)
    assert.equal(grave.atleta.contato, '(51) 98888-7777')
    assert.equal(grave.atleta.doc, '123.456.789-09')
    assert.deepEqual(grave.atleta.saude.map((r) => r.key), ['ALERGIA', 'REMÉDIO CONTROLADO', 'OBS MÉDICA', 'TELEFONE EMERGÊNCIA'])
    assert.equal(grave.atleta.saude[2].value, 'Marcapasso')
    assert.equal(grave.geo.lat, -30.03)
    assert.equal('athleteKey' in grave, false)
    assert.equal(queue.data.ocorrencias.find((item) => item.protocolo === 2).atleta, null)

    // Reimportar a planilha (ids novos) não perde o vínculo da ocorrência com o atleta.
    const reimported = athletes.map((a, i) => ({ ...a, id: `imp-novo-${i}` }))
    assert.equal((await request('/api/events/ev-poa/athletes', 'POST', { athletes: reimported, schema: [] }, admin)).status, 200)
    const afterReimport = await request('/api/medico/ev-poa/ocorrencias', 'GET', undefined, medico)
    assert.equal(afterReimport.data.ocorrencias.find((item) => item.protocolo === 1).atleta.saude[0].value, 'Sim, dipirona')

    const unchanged = await request(`/api/medico/ev-poa/ocorrencias?v=${queue.data.version}`, 'GET', undefined, medico)
    assert.equal(unchanged.data.unchanged, true)
    assert.equal((await request(`/api/medico/ev-poa/ocorrencias/${grave.id}`, 'PATCH', { status: 'X' }, medico)).status, 400)
    const moved = await request(`/api/medico/ev-poa/ocorrencias/${grave.id}`, 'PATCH', { status: 'EM_ATENDIMENTO' }, medico)
    assert.equal(moved.data.status, 'EM_ATENDIMENTO')
    const after = await request(`/api/medico/ev-poa/ocorrencias?v=${queue.data.version}`, 'GET', undefined, medico)
    assert.equal(after.data.unchanged, undefined)
    const history = after.data.ocorrencias.find((item) => item.id === grave.id).historico
    assert.deepEqual(history.map((h) => [h.status, h.por]), [['ABERTA', 'Página pública'], ['EM_ATENDIMENTO', 'DRA. ANA']])

    // Admin também acompanha; excluir o evento apaga as ocorrências.
    assert.equal((await request('/api/medico/ev-poa/ocorrencias', 'GET', undefined, admin)).status, 200)
    assert.equal((await request('/api/events/ev-poa', 'DELETE', { confirmQrInvalidation: true }, admin)).status, 200)
    assert.deepEqual(fs.readdirSync(path.join(dataDir, 'medico')).filter((f) => f.includes('ev-poa')), [])
    assert.equal(fs.existsSync(path.join(dataDir, 'athletes_ev-poa.json')), false)
  } finally {
    await stopServer(child)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
