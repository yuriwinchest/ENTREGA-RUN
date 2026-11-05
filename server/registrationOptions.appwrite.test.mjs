import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import * as appwrite from './appwrite.js'

const ENV_KEYS = ['APPWRITE_ENABLED', 'APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_DATABASE_ID', 'APPWRITE_COLLECTION_ATHLETES', 'APPWRITE_COLLECTION_REGISTRATION_OPTIONS']

async function withFakeAppwrite(respond, run) {
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  const calls = []
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const raw = Buffer.concat(chunks).toString()
      const call = { method: req.method, url: new URL(req.url, 'http://localhost'), body: raw ? JSON.parse(raw) : {} }
      calls.push(call)
      const result = await respond(call)
      if (result.disconnect) { req.socket.destroy(); return }
      res.writeHead(result.status ?? 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result.data ?? {}))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: error.message }))
    }
  })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    Object.assign(process.env, {
      APPWRITE_ENABLED: 'true', APPWRITE_ENDPOINT: `http://127.0.0.1:${server.address().port}/v1`,
      APPWRITE_PROJECT_ID: 'isolated-options-test', APPWRITE_API_KEY: 'local-fake-key',
      APPWRITE_DATABASE_ID: 'isolated-options-db', APPWRITE_COLLECTION_ATHLETES: 'athletes',
      APPWRITE_COLLECTION_REGISTRATION_OPTIONS: 'registration_options',
    })
    await run(calls)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  }
}

function queries(url) {
  return [...url.searchParams.entries()].filter(([key]) => key.startsWith('queries')).map(([, value]) => JSON.parse(value))
}

async function runProvision(args = []) {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/prepare-registration-options.mjs', import.meta.url)), ...args], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk.toString() })
  child.stderr.on('data', (chunk) => { output += chunk.toString() })
  const code = await new Promise((resolve) => child.once('exit', resolve))
  return { code, output }
}

test('catálogo Appwrite: ID Unicode canônico, documento privado e conflito idempotente', async () => {
  const docs = new Map()
  await withFakeAppwrite(({ method, url, body }) => {
    if (method === 'POST') {
      if (docs.has(body.documentId)) return { status: 409, data: { message: 'Document already exists' } }
      const doc = { $id: body.documentId, ...body.data }
      docs.set(body.documentId, doc)
      return { status: 201, data: doc }
    }
    return { data: docs.get(url.pathname.split('/').at(-1)) }
  }, async (calls) => {
    const first = await appwrite.persistRegistrationOptionToAppwrite('org-a', 'equipe', 'Café Run')
    assert.equal(first.ok, true)
    assert.equal(first.created, true)
    assert.equal(first.value, 'Café Run')
    const duplicate = await appwrite.persistRegistrationOptionToAppwrite('org-a', 'equipe', '  CAFE\u0301   RUN  ')
    assert.equal(duplicate.ok, true)
    assert.equal(duplicate.created, false)
    assert.equal(duplicate.value, 'Café Run', '409 recupera a grafia canônica já persistida')
    assert.equal(docs.size, 1)
    const create = calls.find((call) => call.method === 'POST')
    assert.deepEqual(create.body.permissions, [])
    assert.equal(create.body.data.scope_id, 'org-a')
    assert.equal(create.body.data.field, 'equipe')
    assert.equal(create.body.data.value, 'Café Run')
    const id = appwrite.getRegistrationOptionDocId('org-a', 'equipe', 'Café Run')
    assert.match(id, /^[a-f0-9]{36}$/)
    assert.equal(appwrite.getRegistrationOptionDocId('org-a', 'equipe', 'ＣＡＦÉ　ＲＵＮ'), id)
    assert.notEqual(appwrite.getRegistrationOptionDocId('org-b', 'equipe', 'Café Run'), id)
    assert.notEqual(appwrite.getRegistrationOptionDocId('org-a', 'categoria', 'Café Run'), id)
  })
})

test('catálogo Appwrite: 409 incompatível e falha de banco não confirmam gravação', async () => {
  let fail = false
  await withFakeAppwrite(({ method, url }) => {
    if (fail) return { status: 503, data: { message: 'Local fake temporarily unavailable' } }
    if (method === 'POST') return { status: 409, data: { message: 'Conflict' } }
    return { data: { $id: url.pathname.split('/').at(-1), scope_id: 'org-b', field: 'equipe', value: 'Equipe A' } }
  }, async () => {
    assert.equal((await appwrite.persistRegistrationOptionToAppwrite('org-a', 'equipe', 'Equipe A')).ok, false)
    fail = true
    assert.equal((await appwrite.persistRegistrationOptionToAppwrite('org-a', 'equipe', 'Equipe B')).ok, false)
    assert.equal((await appwrite.fetchRegistrationOptionsFromAppwrite('org-a')).ok, false)
  })
})

test('retry após commit remoto com resposta perdida recupera documento canônico sem duplicar', async () => {
  let saved
  await withFakeAppwrite(({ method, body }) => {
    if (method === 'POST' && !saved) {
      saved = { $id: body.documentId, ...body.data }
      return { disconnect: true }
    }
    if (method === 'POST') return { status: 409 }
    return { data: saved }
  }, async () => {
    assert.equal((await appwrite.persistRegistrationOptionToAppwrite('org-retry', 'equipe', 'Equipe Única')).ok, false)
    const recovered = await appwrite.persistRegistrationOptionToAppwrite('org-retry', 'equipe', 'EQUIPE ÚNICA')
    assert.equal(recovered.ok, true)
    assert.equal(recovered.created, false)
    assert.equal(recovered.value, 'Equipe Única')
  })
})

test('catálogo Appwrite: paginação recupera mais de 100 opções só do escopo solicitado', async () => {
  const docs = Array.from({ length: 205 }, (_, index) => ({
    $id: `option-${String(index).padStart(4, '0')}`, scope_id: 'org-a', field: 'equipe', value: `Equipe ${index}`,
  }))
  await withFakeAppwrite(({ url }) => {
    const query = queries(url)
    assert.ok(query.some((entry) => entry.method === 'equal' && entry.attribute === 'scope_id' && entry.values[0] === 'org-a'))
    const cursor = query.find((entry) => entry.method === 'cursorAfter')?.values[0]
    const start = cursor ? docs.findIndex((doc) => doc.$id === cursor) + 1 : 0
    return { data: { documents: docs.slice(start, start + 100) } }
  }, async (calls) => {
    const result = await appwrite.fetchRegistrationOptionsFromAppwrite('org-a')
    assert.equal(result.ok, true)
    assert.equal(result.options.length, 205)
    assert.equal(new Set(result.options.map((option) => option.value)).size, 205)
    assert.equal(calls.length, 3, 'paginação não depende do campo total da API')
  })
})

test('catálogo Appwrite não aceita documento de outra organização na resposta', async () => {
  await withFakeAppwrite(() => ({ data: { documents: [{ $id: 'foreign-option', scope_id: 'org-b', field: 'equipe', value: 'NÃO VAZAR' }] } }), async () => {
    const result = await appwrite.fetchRegistrationOptionsFromAppwrite('org-a')
    assert.equal((result.options || []).some((option) => option.value === 'NÃO VAZAR'), false)
  })
})

test('atleta Appwrite preserva equipe e extras de cadastro na ida e volta, sem saúde ou identificação nos extras', async () => {
  let saved
  const schema = [
    { key: 'custom:BATERIA', customKey: 'BATERIA', label: 'Bateria', type: 'custom' },
    { key: 'custom:ALERGIA', customKey: 'ALERGIA', label: 'Alergia', type: 'custom' },
    { key: 'custom:CPF', customKey: 'CPF', label: 'CPF', type: 'custom' },
  ]
  await withFakeAppwrite(({ method, body }) => {
    if (method === 'PATCH') { saved = body.data; return { data: {} } }
    return { data: { documents: [{ $id: 'remote-athlete', ...saved }], total: 1 } }
  }, async () => {
    const result = await appwrite.persistAthletesToAppwrite('extras-roundtrip', [{
      id: 'ath-extra', numero: '10', nome: 'ATLETA DE TESTE', equipe: 'Café Run', nacionalidade: 'PORTUGAL',
      customFields: { BATERIA: '09:00', ALERGIA: 'DADO DE SAÚDE SINTÉTICO', CPF: 'IDENTIFICAÇÃO SINTÉTICA', PCD: 'SIM' },
    }], { schema, healthFields: [{ key: 'ALERGIA', label: 'Alergia' }] })
    assert.equal(result.successCount, 1)
    assert.equal(saved.team, 'Café Run')
    const extras = JSON.parse(saved.registration_fields)
    assert.equal(extras.nacionalidade, 'PORTUGAL')
    assert.deepEqual(extras.customFields, { BATERIA: '09:00' })
    assert.equal(saved.registration_fields.includes('SAÚDE'), false)
    assert.equal(saved.registration_fields.includes('IDENTIFICAÇÃO'), false)
    const fetched = await appwrite.fetchAthletesFromAppwrite('extras-roundtrip')
    assert.equal(fetched.athletes[0].equipe, 'Café Run')
    assert.equal(fetched.athletes[0].nacionalidade, 'PORTUGAL')
    assert.deepEqual(fetched.athletes[0].customFields, { BATERIA: '09:00' })
  })
})

test('snapshot legado omite registration_fields para preservar extras válidos já existentes no banco', async () => {
  await withFakeAppwrite(() => ({ data: {} }), async (calls) => {
    assert.equal((await appwrite.persistAthletesToAppwrite('extras-legacy', [{ id: 'legacy', numero: '10', nome: 'LEGADO', equipe: 'EQUIPE' }])).successCount, 1)
    const payload = calls.find((call) => call.method === 'PATCH').body.data
    assert.equal(Object.hasOwn(payload, 'registration_fields'), false)
  })
})

test('extras inválidos ou acima do tamanho do atributo não são truncados nem enviados ao banco', async () => {
  const schema = Array.from({ length: 160 }, (_, index) => ({ key: `custom:OPCAO${index}`, customKey: `OPCAO${index}`, label: `Opção ${index}`, type: 'custom' }))
  const oversized = Object.fromEntries(schema.map((column) => [column.customKey, 'X'.repeat(128)]))
  await withFakeAppwrite(() => ({ data: {} }), async (calls) => {
    assert.equal(appwrite.REGISTRATION_FIELDS_MAX_LENGTH, 16384)
    for (const [index, extra] of [
      { nacionalidade: { invalid: true } },
      { customFields: ['invalid'] },
      { customFields: { OPCAO0: { nested: true } } },
      { customFields: oversized },
    ].entries()) {
      const result = await appwrite.persistAthletesToAppwrite(`extras-invalid-local-${index}`, [{ id: 'invalid', numero: '10', nome: 'SINTÉTICO', ...extra }], { schema })
      assert.equal(result.successCount, 0)
      assert.equal(result.errorCount, 1)
    }
    assert.equal(calls.length, 0, 'valor inválido não produz payload parcial ou truncado')
  })
})

test('extras remotos inválidos ou de saúde não são reidratados como cadastro', async () => {
  const cases = [
    '{invalid json',
    JSON.stringify({ nacionalidade: { invalid: true }, customFields: ['invalid'] }),
    JSON.stringify({ nacionalidade: 'X'.repeat(65), customFields: { ALERGIA: 'NÃO VAZAR', CPF: 'NÃO VAZAR', BATERIA: 'X'.repeat(129) } }),
  ]
  await withFakeAppwrite(() => ({ data: { documents: cases.map((registration_fields, index) => ({ $id: `remote-${index}`, event_id: 'extras-invalid', bib_number: String(index + 1), name: 'SINTÉTICO', registration_fields })), total: cases.length } }), async () => {
    const result = await appwrite.fetchAthletesFromAppwrite('extras-invalid')
    assert.equal(result.athletes.length, 3)
    for (const athlete of result.athletes) {
      assert.equal(Boolean(athlete.nacionalidade), false)
      assert.deepEqual(athlete.customFields || {}, {})
    }
  })
})

function schemaMock() {
  const collections = new Map([['athletes', { $id: 'athletes', name: 'Athletes', documentSecurity: true, $permissions: [], permissions: [], attributes: [], indexes: [] }]])
  const respond = ({ method, url, body }) => {
    const parts = url.pathname.split('/').filter(Boolean)
    const index = parts.indexOf('collections')
    if (index < 0) return { status: 404 }
    const id = parts[index + 1]
    const rest = parts.slice(index + 2)
    if (!id) {
      if (method === 'GET') return { data: { collections: [...collections.values()], total: collections.size } }
      if (method === 'POST') {
        const collection = { $id: body.collectionId, ...body, $permissions: body.permissions || [], attributes: [], indexes: [] }
        collections.set(body.collectionId, collection)
        return { status: 201, data: collection }
      }
    }
    const collection = collections.get(id)
    if (!collection) return { status: 404, data: { message: 'Collection not found' } }
    if (!rest.length) return { data: collection }
    if (rest[0] === 'attributes') {
      if (method === 'POST') {
        const attribute = { ...body, type: rest[1] === 'datetime' ? 'datetime' : 'string', status: 'available' }
        collection.attributes.push(attribute)
        return { status: 202, data: attribute }
      }
      if (!rest[1]) return { data: { attributes: collection.attributes, total: collection.attributes.length } }
      const attribute = collection.attributes.find((entry) => entry.key === rest[1])
      return attribute ? { data: attribute } : { status: 404 }
    }
    if (rest[0] === 'indexes') {
      if (method === 'POST') {
        const entry = { ...body, status: 'available' }
        collection.indexes.push(entry)
        return { status: 202, data: entry }
      }
      if (!rest[1]) return { data: { indexes: collection.indexes, total: collection.indexes.length } }
      const entry = collection.indexes.find((item) => item.key === rest[1])
      return entry ? { data: entry } : { status: 404 }
    }
    return { status: 404 }
  }
  return { collections, respond }
}

test('provisionamento do schema: padrão somente leitura, apply explícito e check pronto sem mutações', async () => {
  const { collections, respond } = schemaMock()
  await withFakeAppwrite(respond, async (calls) => {
    const missing = await runProvision()
    assert.notEqual(missing.code, 0, missing.output)
    assert.ok(calls.every((call) => call.method === 'GET'), 'invocação padrão não altera schema')
    const applied = await runProvision(['--apply'])
    assert.equal(applied.code, 0, applied.output)
    const catalog = collections.get('registration_options')
    assert.ok(catalog)
    assert.equal(catalog.documentSecurity, true)
    assert.deepEqual(catalog.permissions, [])
    for (const [key, size] of [['scope_id', 256], ['field', 160], ['value', 128]]) {
      const attribute = catalog.attributes.find((entry) => entry.key === key)
      assert.equal(attribute.size, size, key)
      assert.equal(attribute.required, true, key)
    }
    assert.equal(catalog.attributes.find((entry) => entry.key === 'created_at').type, 'datetime')
    assert.ok(catalog.indexes.some((entry) => entry.attributes.includes('scope_id')))
    const extras = collections.get('athletes').attributes.find((entry) => entry.key === 'registration_fields')
    assert.equal(extras.size, 16384)
    assert.equal(extras.required, false)
    const before = calls.length
    const checked = await runProvision(['--check'])
    assert.equal(checked.code, 0, checked.output)
    assert.ok(calls.slice(before).every((call) => call.method === 'GET'), 'check pronto continua somente leitura')
  })
})

test('provisionamento recusa schema incompatível sem sobrescrever atributo ou remover dados', async () => {
  const { collections, respond } = schemaMock()
  collections.get('athletes').attributes.push({ key: 'registration_fields', type: 'string', size: 32, required: false, status: 'available' })
  await withFakeAppwrite(respond, async (calls) => {
    const result = await runProvision(['--apply'])
    assert.notEqual(result.code, 0, result.output)
    assert.equal(collections.get('athletes').attributes.find((entry) => entry.key === 'registration_fields').size, 32)
    assert.equal(calls.some((call) => ['DELETE', 'PATCH', 'PUT'].includes(call.method)), false)
  })
})


test('extras legados escalares e texto longo preservam dados sem impedir o espelhamento do atleta', async () => {
  const schema = ['BATERIA', 'OPCAO', 'CONFIRMADO'].map(key => ({ key: `custom:${key}`, customKey: key, label: key, type: 'custom' }))
  let saved
  await withFakeAppwrite(({method,body}) => {
    if (method === 'PATCH') { saved = body.data; return {data:{}} }
    return {data:{documents:[{$id:'legacy-scalars',...saved}],total:1}}
  }, async () => {
    const result=await appwrite.persistAthletesToAppwrite('legacy-scalars',[{id:'legacy',numero:'11',nome:'LEGADO',customFields:{BATERIA:9,OPCAO:'Texto '.repeat(50),CONFIRMADO:true}}],{schema})
    assert.equal(result.successCount,1)
    const extras=JSON.parse(saved.registration_fields)
    assert.equal(extras.customFields.BATERIA,'9')
    assert.equal(extras.customFields.CONFIRMADO,'true')
    assert.equal(extras.customFields.OPCAO,'Texto '.repeat(50).trim())
    const restored=await appwrite.fetchAthletesFromAppwrite('legacy-scalars')
    assert.deepEqual(restored.athletes[0].customFields,extras.customFields)
  })
})

test('catálogo principal usa escopo não vazio e continua isolado dos demais eventos', async () => {
  const docs=[]
  await withFakeAppwrite(({method,body,url}) => {
    if(method==='POST') { const doc={$id:body.documentId,...body.data}; docs.push(doc); return {status:201,data:doc} }
    const scope=queries(url).find(q=>q.attribute==='scope_id')?.values[0]
    return {data:{documents:docs.filter(doc=>doc.scope_id===scope)}}
  }, async () => {
    assert.equal((await appwrite.persistRegistrationOptionToAppwrite('','equipe','Equipe Principal')).ok,true)
    assert.equal(docs[0].scope_id,'__principal__')
    assert.equal((await appwrite.fetchRegistrationOptionsFromAppwrite('')).options[0].value,'Equipe Principal')
    assert.deepEqual((await appwrite.fetchRegistrationOptionsFromAppwrite('org-a')).options,[])
  })
})
