import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import test from 'node:test'
import { hashPassword } from './passwords.js'
import { apiFetchAthletes, apiGetAthleteListRevision, apiSaveAthletes } from '../client/src/utils/eventsApi.js'

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

test('cliente preserva intenção e revisão capturada nos chunks, fallback e conflito', async (t) => {
  const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data })
  const largeList = Array.from({ length: 301 }, (_, id) => ({ id }))
  const calls = []
  let revision = 5
  let fallback = false
  let error = ''
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (!options?.method) return response(200, { ok: true, listRevision: revision, athletes: [] })
    const body = JSON.parse(options.body)
    calls.push(body)
    if (fallback && url.endsWith('/chunks')) {
      revision = 8
      await apiFetchAthletes('client-import-test')
      return response(404, {})
    }
    if (fallback) return response(409, { ok: false, message: 'Lista substituída em outra sessão.' })
    return response(200, { ok: true, ...(body.chunkIndex === 0 ? {} : { listRevision: 6 }) })
  })

  await apiFetchAthletes('client-import-test')
  const capturedRevision = apiGetAthleteListRevision('client-import-test')
  assert.equal(await apiSaveAthletes('client-import-test', largeList, [], [], null, { importMode: 'replace' }), true)
  assert.deepEqual(calls.map((body) => [body.listRevision, body.importMode, body.athletesChunk.length]), [
    [5, 'replace', 250], [5, 'replace', 51],
  ])
  assert.equal(apiGetAthleteListRevision('client-import-test'), 6)

  // Mesmo com polling novo, a confirmação antiga continua enviando sua revisão.
  calls.length = 0
  revision = 7
  await apiFetchAthletes('client-import-test')
  assert.equal(apiGetAthleteListRevision('client-import-test'), 7)
  await apiSaveAthletes('client-import-test', [{ id: 'one' }], [], [], null, { listRevision: capturedRevision, importMode: 'replace' })
  assert.equal(calls[0].listRevision, 5)

  calls.length = 0
  revision = 7
  await apiFetchAthletes('client-import-test')
  fallback = true
  assert.equal(await apiSaveAthletes('client-import-test', largeList, [], [], null, {
    importMode: 'replace', onError: (message) => { error = message },
  }), false)
  assert.deepEqual(calls.map((body) => [body.listRevision, body.importMode]), [[7, 'replace'], [7, 'replace']])
  assert.equal(error, 'Lista substituída em outra sessão.')
  assert.equal(apiGetAthleteListRevision('client-import-test'), 8)
})

test('explicit imports replace or add with revision and delivery protection', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-sync-'))
  fs.writeFileSync(path.join(dataDir, 'events.json'), '[]')
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([{ id: 'admin-test', name: 'TESTE', email: 'admin@teste.local', passwordHash: hashPassword('senha-sync-teste'), role: 'ADMIN', eventId: 'all', status: 'ATIVO' }]))
  const port = await freePort()
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      APPWRITE_ENABLED: 'false',
      APPWRITE_API_KEY: '',
      ADMIN_EMAIL: 'admin@teste.local',
      ADMIN_PASSWORD: 'senha-sync-teste',
    },
    stdio: 'ignore',
  })
  const base = `http://127.0.0.1:${port}`
  let token = ''
  const request = async (method, route, body) => {
    const response = await fetch(`${base}${route}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json() }
  }
  try {
    let ready = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const health = await request('GET', '/api/health')
        if (health.status === 200) { ready = true; break }
      } catch { /* server is starting */ }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.equal(ready, true, 'local server did not start')
    token = (await request('POST', '/api/login', { email: 'admin@teste.local', password: 'senha-sync-teste' })).body.token
    assert.ok(token, 'admin login failed')


    const eventId = 'import-test'
    const route = '/api/events/' + eventId + '/athletes'
    await request('POST', '/api/events', { id: eventId, name: 'TESTE', status: 'EM OPERAÇÃO' })
    const old = [{ id: 'old', nome: 'ANTIGO', numero: '1', chip: '11', status: 'PENDENTE' }]
    assert.equal((await request('POST', route, { athletes: old, kits: [{numero:'1',chip:'11',qrCode:'1'}] })).status,200)
    const incoming = [{ id:'new',nome:'NOVO',status:'PENDENTE' }]
    const schema = [{key:'nome',label:'INSCRITO'}]
    const healthFields = [{key:'alergia',label:'ALERGIA',public:false}]
    const originalSheet = {fileName:'nova.xlsx',headers:['NOME'],rows:[['NOVO']]}
    const replacement = await request('POST',route,{athletes:incoming,importMode:'replace',schema,healthFields,originalSheet})
    assert.equal(replacement.status,200)
    assert.equal(replacement.body.listRevision,1)
    let saved=(await request('GET',route)).body
    assert.deepEqual(saved.athletes,incoming)
    assert.deepEqual(saved.kits,[])
    assert.deepEqual(saved.schema,schema)
    assert.deepEqual(saved.originalSheet,originalSheet)
    assert.equal(saved.healthFields[0].key,'alergia')
    assert.equal(saved.listRevision,1)
    assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir,'athletes_'+eventId+'.json'))).listRevision,1)
    assert.equal((await request('POST',route,{athletes:old})).status,409)
    assert.equal((await request('POST',route+'/chunks',{uploadId:'old',chunkIndex:0,totalChunks:1,athletesChunk:old})).status,409)
    assert.equal((await request('POST',route,{athletes:incoming,importMode:'replace',listRevision:1,kits:[{}]})).status,400)
    assert.equal((await request('POST',route,{athletes:incoming,listRevision:1,importMode:'bad'})).status,400)
    await request('PUT', '/api/events/' + eventId, { status: 'FINALIZADO' })
    const added={id:'extra',nome:'EXTRA',numero:'2',chip:'22',status:'PENDENTE'}
    assert.equal((await request('POST',route,{athletes:[added],importMode:'add',listRevision:1,schema:[{key:'numero',label:'NUMERO'}],kits:[{numero:'2',chip:'22',qrCode:'2'}],healthFields:[{key:'remedio',label:'REMEDIO'}]})).status,200)
    saved=(await request('GET',route)).body
    assert.equal(saved.athletes.length,2)
    assert.deepEqual(saved.schema.map(x=>x.key),['nome','numero'])
    assert.deepEqual(saved.healthFields.map(x=>x.key),['alergia','remedio'])
    assert.equal(saved.listRevision,1)
    const big=Array.from({length:301},(_,i)=>({id:'bulk-'+i,nome:'TESTE '+i,status:'PENDENTE'}))
    const first=await request('POST',route+'/chunks',{uploadId:'replace-big',chunkIndex:0,totalChunks:2,athletesChunk:big.slice(0,250),importMode:'replace',listRevision:1,schema,originalSheet})
    assert.equal(first.body.done,false)
    assert.equal((await request('GET',route)).body.athletes.length,2)
    const last=await request('POST',route+'/chunks',{uploadId:'replace-big',chunkIndex:1,totalChunks:2,athletesChunk:big.slice(250)})
    assert.equal(last.body.listRevision,2)
    saved=(await request('GET',route)).body
    assert.equal(saved.athletes.length,301)
    assert.deepEqual(saved.kits,[])
    assert.deepEqual(saved.schema,schema)
    assert.equal(saved.listRevision,2)
    // An upload started before another replacement must not restore its old list.
    assert.equal((await request('POST',route+'/chunks',{uploadId:'stale-pending',chunkIndex:0,totalChunks:2,athletesChunk:old,importMode:'replace',listRevision:2})).body.done,false)
    assert.equal((await request('POST',route,{athletes:incoming,importMode:'replace',listRevision:2})).body.listRevision,3)
    assert.equal((await request('POST',route+'/chunks',{uploadId:'stale-pending',chunkIndex:1,totalChunks:2,athletesChunk:old})).status,409)
    // A delivery after the first replacement slice blocks the final commit.
    assert.equal((await request('POST',route+'/chunks',{uploadId:'delivery-race',chunkIndex:0,totalChunks:2,athletesChunk:old,importMode:'replace',listRevision:3})).body.done,false)
    const delivered=[{...incoming[0],status:'ENTREGUE',entreguePor:'TESTE'}]
    assert.equal((await request('POST',route,{athletes:delivered,listRevision:3})).status,200)
    assert.equal((await request('POST',route+'/chunks',{uploadId:'delivery-race',chunkIndex:1,totalChunks:2,athletesChunk:old})).status,409)
    assert.equal((await request('POST',route,{athletes:old,importMode:'replace',listRevision:3})).status,409)
    assert.deepEqual((await request('GET',route)).body.athletes,delivered)
    assert.equal((await request('POST',route,{athletes:[added],importMode:'add',listRevision:3})).status,200)
    saved=(await request('GET',route)).body
    assert.equal(saved.athletes.length,2)
    assert.equal(saved.athletes.find(a=>a.id==='new').status,'ENTREGUE')
    const chunkAdd = await request('POST',route+'/chunks',{uploadId:'add-extra',chunkIndex:0,totalChunks:1,athletesChunk:[{id:'chunk-extra',nome:'EXTRA FATIADO',status:'PENDENTE'}],importMode:'add',listRevision:3})
    assert.equal(chunkAdd.status,200)
    assert.equal(chunkAdd.body.listRevision,3)
    saved=(await request('GET',route)).body
    assert.equal(saved.athletes.length,3)
    assert.equal(saved.athletes.find(a=>a.id==='new').status,'ENTREGUE')
  } finally {
    await stopServer(child)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
