import path from 'node:path'
import { pathToFileURL } from 'node:url'

// APIs legadas de coleções, compatíveis com a integração existente:
// https://appwrite.io/docs/references/1.6.x/server-rest/databases
export const REGISTRATION_OPTION_SCHEMA = Object.freeze([
  { key: 'scope_id', type: 'string', size: 256, required: true },
  { key: 'field', type: 'string', size: 160, required: true },
  { key: 'value', type: 'string', size: 128, required: true },
  { key: 'created_at', type: 'datetime', required: true },
])
const ATHLETE_REGISTRATION_FIELDS = { key: 'registration_fields', type: 'string', size: 16384, required: false }
const SCOPE_INDEX = { key: 'scope_id', type: 'key', attributes: ['scope_id'], orders: ['ASC'] }

function configuration(env) {
  const endpoint = String(env.APPWRITE_ENDPOINT || '').replace(/\/+$/, '')
  if (env.APPWRITE_ENABLED === 'false' || !endpoint || !env.APPWRITE_PROJECT_ID || !env.APPWRITE_API_KEY) {
    throw new Error('Configure a integração Appwrite no ambiente do servidor antes de preparar o banco.')
  }
  const url = new URL(endpoint)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Endpoint Appwrite inválido.')
  return {
    endpoint,
    headers: { 'X-Appwrite-Project': env.APPWRITE_PROJECT_ID, 'X-Appwrite-Key': env.APPWRITE_API_KEY, 'Content-Type': 'application/json' },
    database: env.APPWRITE_DATABASE_ID || 'entregas_run_db',
    catalog: env.APPWRITE_COLLECTION_REGISTRATION_OPTIONS || 'registration_options',
    athletes: env.APPWRITE_COLLECTION_ATHLETES || 'athletes',
  }
}

function client(config, fetchImpl) {
  const collectionPath = (id) => `/databases/${encodeURIComponent(config.database)}/collections/${encodeURIComponent(id)}`
  async function request(apiPath, { method = 'GET', body } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetchImpl(`${config.endpoint}${apiPath}`, {
        method, headers: config.headers, signal: controller.signal,
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      const data = await response.json().catch(() => ({}))
      return { status: response.status, data }
    } catch {
      throw new Error('Falha de conexão com o Appwrite durante a preparação do schema.')
    } finally { clearTimeout(timer) }
  }
  return { collectionPath, request }
}

function assertStatus(result, allowed, operation) {
  if (!allowed.includes(result.status)) throw new Error(`${operation}: HTTP ${result.status}. Nenhuma exclusão ou substituição foi executada.`)
}

function attributeMetadata(attribute) {
  return {
    exists: true, key: attribute.key, type: attribute.type,
    format: attribute.format || '', status: attribute.status,
    required: attribute.required, array: attribute.array === true,
    ...(typeof attribute.size === 'number' ? { size: attribute.size } : {}),
    hasDefault: attribute.default !== undefined && attribute.default !== null,
  }
}

function indexMetadata(index) {
  return { exists: true, key: index.key, type: index.type, status: index.status, attributes: index.attributes, orders: index.orders || [] }
}

async function readCollection(api, id, attributeDefinitions, indexDefinitions = []) {
  const base = api.collectionPath(id)
  const collection = await api.request(base)
  assertStatus(collection, [200, 404], 'Leitura da coleção')
  if (collection.status === 404) {
    return {
      exists: false,
      attributes: Object.fromEntries(attributeDefinitions.map((definition) => [definition.key, { exists: false }])),
      indexes: Object.fromEntries(indexDefinitions.map((definition) => [definition.key, { exists: false }])),
    }
  }
  const attributes = {}
  for (const definition of attributeDefinitions) {
    const result = await api.request(`${base}/attributes/${encodeURIComponent(definition.key)}`)
    assertStatus(result, [200, 404], 'Leitura de atributo')
    attributes[definition.key] = result.status === 200 ? attributeMetadata(result.data) : { exists: false }
  }
  const indexes = {}
  for (const definition of indexDefinitions) {
    const result = await api.request(`${base}/indexes/${encodeURIComponent(definition.key)}`)
    assertStatus(result, [200, 404], 'Leitura de índice')
    indexes[definition.key] = result.status === 200 ? indexMetadata(result.data) : { exists: false }
  }
  return {
    exists: true,
    permissions: collection.data.$permissions ?? collection.data.permissions,
    documentSecurity: collection.data.documentSecurity,
    attributes, indexes,
  }
}

async function readSchema(config, api) {
  return {
    capturedAt: new Date().toISOString(),
    collections: {
      catalog: await readCollection(api, config.catalog, REGISTRATION_OPTION_SCHEMA, [SCOPE_INDEX]),
      athletes: await readCollection(api, config.athletes, [ATHLETE_REGISTRATION_FIELDS]),
    },
  }
}

export async function snapshotRegistrationOptionsSchema({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const config = configuration(env)
  const schema = await readSchema(config, client(config, fetchImpl))
  return { ok: true, kind: 'registration-options-schema', ...schema }
}

function checkAttribute(attribute, definition, label) {
  if (!attribute.exists) return
  const sameType = definition.type === 'datetime'
    ? attribute.type === 'datetime' || (attribute.type === 'string' && attribute.format === 'datetime')
    : attribute.type === 'string' && !attribute.format
  if (attribute.key !== definition.key || !sameType || attribute.required !== definition.required || attribute.array ||
    (definition.size && (!Number.isFinite(attribute.size) || attribute.size < definition.size)) || attribute.hasDefault) {
    throw new Error(`Schema incompatível em ${label}.${definition.key}; revisar manualmente antes de publicar.`)
  }
  if (['failed', 'stuck', 'deleting'].includes(attribute.status)) {
    throw new Error(`Atributo ${label}.${definition.key} está ${attribute.status}; diagnosticar antes de publicar.`)
  }
}

function checkIndex(index) {
  if (!index.exists) return
  if (index.key !== SCOPE_INDEX.key || index.type !== SCOPE_INDEX.type || JSON.stringify(index.attributes) !== JSON.stringify(SCOPE_INDEX.attributes) ||
    (index.orders.length && JSON.stringify(index.orders) !== JSON.stringify(SCOPE_INDEX.orders))) {
    throw new Error('Índice scope_id incompatível; revisar manualmente antes de publicar.')
  }
  if (['failed', 'stuck', 'deleting'].includes(index.status)) throw new Error(`Índice scope_id está ${index.status}; diagnosticar antes de publicar.`)
}

export async function prepareRegistrationOptions({ env = process.env, fetchImpl = globalThis.fetch, apply = false, waitMs = 60000, pollMs = 1000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const changes = []
  const mode = apply ? 'apply' : 'check'
  try {
    const config = configuration(env)
    const api = client(config, fetchImpl)
    const schema = await readSchema(config, api)
    const { catalog, athletes } = schema.collections
    if (!athletes.exists) throw new Error('A coleção de atletas não existe; conferir a configuração antes de publicar.')
    // Toda incompatibilidade conhecida é verificada antes da primeira criação.
    if (catalog.exists && (!Array.isArray(catalog.permissions) || catalog.permissions.length || catalog.documentSecurity !== true)) {
      throw new Error('A coleção de opções deve ser server-only, com permissões vazias e documentSecurity=true. Revisar manualmente.')
    }
    for (const definition of REGISTRATION_OPTION_SCHEMA) checkAttribute(catalog.attributes[definition.key], definition, 'registration_options')
    checkAttribute(athletes.attributes.registration_fields, ATHLETE_REGISTRATION_FIELDS, 'athletes')
    checkIndex(catalog.indexes.scope_id)

    if (!apply) {
      const issues = []
      if (!catalog.exists) issues.push('Coleção registration_options ausente.')
      for (const definition of REGISTRATION_OPTION_SCHEMA) {
        const attribute = catalog.attributes[definition.key]
        if (!attribute.exists || attribute.status !== 'available') issues.push(`registration_options.${definition.key} ainda não está disponível.`)
      }
      if (!athletes.attributes.registration_fields.exists || athletes.attributes.registration_fields.status !== 'available') issues.push('athletes.registration_fields ainda não está disponível.')
      if (!catalog.indexes.scope_id.exists || catalog.indexes.scope_id.status !== 'available') issues.push('Índice scope_id ainda não está disponível.')
      return { ok: issues.length === 0, mode, changes, issues }
    }

    if (!catalog.exists) {
      const created = await api.request(`/databases/${encodeURIComponent(config.database)}/collections`, {
        method: 'POST',
        body: { collectionId: config.catalog, name: 'Opções de cadastro', permissions: [], documentSecurity: true, enabled: true },
      })
      assertStatus(created, [201, 409], 'Criação da coleção de opções')
      const confirmed = await api.request(api.collectionPath(config.catalog))
      assertStatus(confirmed, [200], 'Confirmação da coleção de opções')
      const permissions = confirmed.data.$permissions ?? confirmed.data.permissions
      if (!Array.isArray(permissions) || permissions.length || confirmed.data.documentSecurity !== true) throw new Error('A coleção criada não está protegida como server-only.')
      if (created.status === 201) changes.push('Coleção registration_options criada sem permissões de cliente.')
    }

    async function waitAvailable(apiPath, kind, validate) {
      const deadline = Date.now() + waitMs
      while (true) {
        const result = await api.request(apiPath)
        assertStatus(result, [200], `Confirmação de ${kind}`)
        validate(result.data)
        if (result.data.status === 'available') return
        if (Date.now() >= deadline) throw new Error(`${kind} ainda não está disponível; repetir --check antes de publicar.`)
        await sleep(pollMs)
      }
    }

    async function ensureAttribute(collectionId, definition, existing) {
      const base = `${api.collectionPath(collectionId)}/attributes`
      if (!existing.exists) {
        const { type, ...body } = definition
        const created = await api.request(`${base}/${type}`, { method: 'POST', body: { ...body, array: false } })
        assertStatus(created, [201, 202, 409], `Criação do atributo ${definition.key}`)
        if (created.status !== 409) changes.push(`Atributo ${definition.key} criado.`)
      }
      await waitAvailable(`${base}/${encodeURIComponent(definition.key)}`, `atributo ${definition.key}`, (attribute) => checkAttribute(attributeMetadata(attribute), definition, collectionId))
    }

    for (const definition of REGISTRATION_OPTION_SCHEMA) await ensureAttribute(config.catalog, definition, catalog.attributes[definition.key])
    await ensureAttribute(config.athletes, ATHLETE_REGISTRATION_FIELDS, athletes.attributes.registration_fields)
    if (!catalog.indexes.scope_id.exists) {
      const created = await api.request(`${api.collectionPath(config.catalog)}/indexes`, { method: 'POST', body: SCOPE_INDEX })
      assertStatus(created, [201, 202, 409], 'Criação do índice scope_id')
      if (created.status !== 409) changes.push('Índice scope_id criado.')
    }
    await waitAvailable(`${api.collectionPath(config.catalog)}/indexes/scope_id`, 'índice scope_id', (index) => checkIndex(indexMetadata(index)))
    return { ok: true, mode, changes, issues: [] }
  } catch (error) {
    return { ok: false, mode, changes, issues: [error.message] }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2)
  const allowed = new Set(['--check', '--apply', '--snapshot-json', '--help'])
  if (args.some((arg) => !allowed.has(arg)) || args.length > 1) {
    process.stderr.write('Uso: node scripts/prepare-registration-options.mjs [--check | --apply | --snapshot-json]\n')
    process.exitCode = 2
  } else if (args.includes('--help')) {
    process.stdout.write('--check: somente leitura (padrão). --snapshot-json: metadata privada, sem documentos. --apply: cria somente schema ausente; exige autorização operacional.\n')
  } else {
    try {
      const result = args.includes('--snapshot-json') ? await snapshotRegistrationOptionsSchema() : await prepareRegistrationOptions({ apply: args.includes('--apply') })
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      if (!result.ok) process.exitCode = 1
    } catch {
      process.stderr.write('Não foi possível consultar o schema Appwrite. Confira configuração e conectividade sem expor credenciais.\n')
      process.exitCode = 1
    }
  }
}
