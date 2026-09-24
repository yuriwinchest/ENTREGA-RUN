/**
 * Conector Oficial Appwrite para Entregas-run (server-only).
 *
 * Estrutura Relacional no Appwrite (db.largadabrasil.com):
 * - Database: entregas_run_db
 * - Coleções:
 *   - events: metadados do evento (nome, data, local, total, entregues, status)
 *   - athletes: cadastro individual de atletas com número de peito, chip, equipe, etc.
 *   - user_profiles: operadores, supervisores e administradores
 *   - audit_logs: histórico e comprovantes de entrega de kits
 *
 * Princípio Arquitetural: Write-through com Resiliência Local.
 * - Leitura/escrita síncrona no disco local garante 0ms de latência e operação offline na tenda.
 * - Sincronização automática para o Appwrite consolida a base central em nuvem.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// Garante leitura de .env em qualquer ambiente (Node 20.6+)
try {
  const rootEnv = path.resolve(process.cwd(), '.env')
  const parentEnv = path.resolve(process.cwd(), '..', '.env')
  if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(rootEnv)
  } else if (fs.existsSync(parentEnv) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(parentEnv)
  }
} catch {}

function getEnv() {
  return {
    endpoint: (process.env.APPWRITE_ENDPOINT || '').replace(/\/+$/, ''),
    projectId: process.env.APPWRITE_PROJECT_ID || '',
    apiKey: process.env.APPWRITE_API_KEY || '',
    databaseId: process.env.APPWRITE_DATABASE_ID || 'entregas_run_db',
    eventsCol: process.env.APPWRITE_COLLECTION_EVENTS || 'events',
    athletesCol: process.env.APPWRITE_COLLECTION_ATHLETES || 'athletes',
    usersCol: process.env.APPWRITE_COLLECTION_USERS || 'user_profiles',
    auditsCol: process.env.APPWRITE_COLLECTION_AUDITS || 'audit_logs',
  }
}

export function isAppwriteEnabled() {
  const { endpoint, projectId, apiKey } = getEnv()
  return Boolean(endpoint && projectId && apiKey)
}

function headers() {
  const { projectId, apiKey } = getEnv()
  return {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
    'Content-Type': 'application/json',
  }
}

async function api(apiPath, options = {}) {
  const { endpoint } = getEnv()
  if (!endpoint) return { status: 0, data: null, error: 'Endpoint ausente' }

  const controller = new AbortController()
  const timeoutMs = options.timeoutMs || 10000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${endpoint}${apiPath}`, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) },
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  } catch (err) {
    return { status: 0, data: null, error: err.message || String(err) }
  } finally {
    clearTimeout(timer)
  }
}

function formatQueries(queries) {
  if (!Array.isArray(queries) || queries.length === 0) return ''
  return '?' + queries
    .map((q, idx) => `queries[${idx}]=${encodeURIComponent(typeof q === 'string' ? q : JSON.stringify(q))}`)
    .join('&')
}

/**
 * Gera um ID de documento determinístico de 32 caracteres (MD5 hex),
 * respeitando os limites estritos do Appwrite (<= 36 caracteres alfanuméricos).
 */
export function getAthleteDocId(eventId, bibNumber) {
  const cleanEvent = String(eventId || '').trim().toLowerCase()
  const cleanBib = String(bibNumber || '').trim().toLowerCase()
  return crypto.createHash('md5').update(`ath:${cleanEvent}:${cleanBib}`).digest('hex')
}

export function getEventDocId(eventId) {
  const cleanEvent = String(eventId || '').trim().toLowerCase()
  return crypto.createHash('md5').update(`ev:${cleanEvent}`).digest('hex')
}

// ============================================================
// STATUS E SAÚDE DO APPWRITE
// ============================================================
export async function appwriteStatus() {
  if (!isAppwriteEnabled()) {
    return {
      enabled: false,
      reason: 'APPWRITE_API_KEY, ENDPOINT ou PROJECT_ID não configurados no ambiente.',
    }
  }

  const { endpoint, projectId, databaseId, eventsCol, athletesCol } = getEnv()

  try {
    const { status, data, error } = await api(`/databases/${encodeURIComponent(databaseId)}/collections`, { timeoutMs: 5000 })
    if (status !== 200) {
      return {
        enabled: true,
        connected: false,
        endpoint,
        projectId,
        databaseId,
        error: error || data?.message || `HTTP ${status}`,
      }
    }

    const cols = Array.isArray(data.collections) ? data.collections.map((c) => ({ id: c.$id, name: c.name })) : []

    // Consulta contagem de eventos e atletas
    const q1 = formatQueries([{ method: 'limit', values: [1] }])
    const [eventsRes, athletesRes] = await Promise.all([
      api(`/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents${q1}`),
      api(`/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents${q1}`),
    ])

    return {
      enabled: true,
      connected: true,
      endpoint,
      projectId,
      databaseId,
      collections: cols,
      counts: {
        events: eventsRes?.data?.total ?? 0,
        athletes: athletesRes?.data?.total ?? 0,
      },
    }
  } catch (err) {
    return {
      enabled: true,
      connected: false,
      endpoint,
      projectId,
      databaseId,
      error: err.message || String(err),
    }
  }
}

// ============================================================
// OPERAÇÕES DE EVENTOS (events)
// ============================================================
export async function persistEventToAppwrite(event) {
  if (!isAppwriteEnabled() || !event || !event.id) return { ok: false, skipped: true }

  const { databaseId, eventsCol } = getEnv()
  const docId = getEventDocId(event.id)

  const payload = {
    name: String(event.name || '').slice(0, 255),
    date: String(event.date || event.dateInput || '').slice(0, 64),
    location: String(event.location || 'RECIFE/PE').slice(0, 255),
    city: String(event.city || '').slice(0, 128),
    status: String(event.status || 'PLANEJADO').slice(0, 32),
    modalities: String(event.modalities || '').slice(0, 500),
    total_athletes: Number(event.total || event.total_athletes || 0),
    delivered_count: Number(event.entregues || event.delivered_count || 0),
    banner_url: String(event.banner_url || '').slice(0, 500),
  }

  try {
    // Tenta atualizar documento existente (PATCH)
    const patchRes = await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents/${encodeURIComponent(docId)}`,
      { method: 'PATCH', body: JSON.stringify({ data: payload }) }
    )

    if (patchRes.status === 200) {
      return { ok: true, action: 'updated', id: docId }
    }

    // Se não existe (404), cria com ID determinístico
    if (patchRes.status === 404) {
      const createRes = await api(
        `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents`,
        {
          method: 'POST',
          body: JSON.stringify({ documentId: docId, data: payload }),
        }
      )
      if (createRes.status === 201) {
        return { ok: true, action: 'created', id: docId }
      }
    }

    return { ok: false, status: patchRes.status }
  } catch (err) {
    console.warn('[appwrite] Falha ao persistir evento no Appwrite:', err.message)
    return { ok: false, error: err.message }
  }
}

export async function deleteEventFromAppwrite(eventId) {
  if (!isAppwriteEnabled() || !eventId) return { ok: false, skipped: true }

  const { databaseId, eventsCol, athletesCol } = getEnv()
  const docId = getEventDocId(eventId)

  try {
    await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents/${encodeURIComponent(docId)}`,
      { method: 'DELETE' }
    )

    // Remove atletas associados ao evento em background
    void deleteEventAthletesFromAppwrite(eventId)
    return { ok: true }
  } catch (err) {
    console.warn(`[appwrite] Falha ao excluir evento ${eventId}:`, err.message)
    return { ok: false, error: err.message }
  }
}

async function deleteEventAthletesFromAppwrite(eventId) {
  const { databaseId, athletesCol } = getEnv()
  const safeId = String(eventId || '').trim()

  try {
    const qDel = formatQueries([
      { method: 'equal', attribute: 'event_id', values: [safeId] },
      { method: 'limit', values: [100] },
    ])
    while (true) {
      const res = await api(
        `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents${qDel}`
      )
      const docs = res?.data?.documents || []
      if (!Array.isArray(docs) || docs.length === 0) break

      await Promise.all(
        docs.map((d) =>
          api(
            `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents/${encodeURIComponent(d.$id)}`,
            { method: 'DELETE' }
          )
        )
      )
    }
  } catch (err) {
    console.warn('[appwrite] Erro na limpeza de atletas de evento excluído:', err.message)
  }
}

export async function fetchEventsFromAppwrite() {
  if (!isAppwriteEnabled()) return null

  const { databaseId, eventsCol } = getEnv()
  try {
    const qEvents = formatQueries([
      { method: 'limit', values: [100] },
      { method: 'orderDesc', attribute: '$updatedAt' },
    ])
    const { status, data } = await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(eventsCol)}/documents${qEvents}`
    )
    if (status !== 200 || !Array.isArray(data?.documents)) return null

    return data.documents.map((doc) => ({
      id: doc.$id,
      name: doc.name,
      date: doc.date,
      dateInput: doc.date,
      location: doc.location || 'RECIFE/PE',
      city: doc.city || '',
      status: doc.status || 'PLANEJADO',
      active: doc.status === 'EM OPERAÇÃO',
      modalities: doc.modalities || '',
      total: Number(doc.total_athletes || 0),
      entregues: Number(doc.delivered_count || 0),
      pendentes: Math.max(0, Number(doc.total_athletes || 0) - Number(doc.delivered_count || 0)),
      concl:
        doc.total_athletes > 0
          ? `${((doc.delivered_count / doc.total_athletes) * 100).toFixed(1)}%`
          : '0.0%',
      banner_url: doc.banner_url || '',
    }))
  } catch {
    return null
  }
}

// ============================================================
// OPERAÇÕES DE ATLETAS (athletes)
// ============================================================

function mapLocalAthleteToAppwrite(eventId, atleta) {
  const safeNumero = String(atleta.numero ?? atleta.bib_number ?? '').trim()
  const safeNome = String(atleta.nome ?? atleta.name ?? '').trim().toUpperCase()

  return {
    event_id: String(eventId || '').trim(),
    bib_number: safeNumero || 'S/N',
    name: safeNome || 'ATLETA SEM NOME',
    chip_code: String(atleta.chip ?? atleta.chip_code ?? '').slice(0, 64),
    bib_name: String(atleta.nome_peito ?? atleta.bib_name ?? '').slice(0, 128),
    document: String(atleta.doc ?? atleta.document ?? '').slice(0, 64),
    gender: String(atleta.sexo ?? atleta.gender ?? 'Masculino').slice(0, 32),
    shirt_size: String(atleta.camiseta ?? atleta.shirt_size ?? 'M').slice(0, 32),
    team: String(atleta.equipe ?? atleta.team ?? '—').slice(0, 128),
    city: String(atleta.cidade ?? atleta.city ?? '').slice(0, 128),
    birth_date: String(atleta.nascimento ?? atleta.birth_date ?? '').slice(0, 32),
    modality: String(atleta.modalidade ?? atleta.modality ?? '5 KM').slice(0, 64),
    category: String(atleta.categoria ?? atleta.category ?? 'GERAL').slice(0, 64),
    resident_type: String(atleta.morador ?? atleta.resident_type ?? 'Visitante').slice(0, 32),
    kit_type: String(atleta.kit ?? atleta.kit_type ?? 'Kit Padrão').slice(0, 64),
    status: atleta.status === 'ENTREGUE' ? 'ENTREGUE' : 'PENDENTE',
    delivered_at: atleta.entregueEm || atleta.delivered_at || '',
    operator_id: String(atleta.operator_id || '').slice(0, 64),
    operator_name: String(atleta.entreguePor || atleta.operator_name || '').slice(0, 128),
    collected_by: atleta.entreguePara ? 'TERCEIRO' : (atleta.collected_by || 'PROPRIO_ATLETA'),
    third_party_name: String(atleta.entreguePara || atleta.third_party_name || '').slice(0, 128),
    third_party_doc: String(atleta.terceiroDoc || atleta.third_party_doc || '').slice(0, 64),
  }
}

function mapAppwriteDocToLocalAthlete(doc) {
  return {
    id: doc.$id,
    numero: doc.bib_number,
    nome: doc.name,
    nome_peito: doc.bib_name || '',
    doc: doc.document || '',
    sexo: doc.gender || '',
    camiseta: doc.shirt_size || '',
    equipe: doc.team || '',
    cidade: doc.city || '',
    nascimento: doc.birth_date || '',
    modalidade: doc.modality || '',
    categoria: doc.category || '',
    morador: doc.resident_type || '',
    kit: doc.kit_type || '',
    chip: doc.chip_code || '',
    status: doc.status || 'PENDENTE',
    entregueEm: doc.delivered_at || '',
    entreguePor: doc.operator_name || '',
    entreguePara: doc.third_party_name || '',
    terceiroDoc: doc.third_party_doc || '',
  }
}

/**
 * Sincroniza a lista completa de atletas para o Appwrite.
 * Utiliza pool concorrente de 10 requisições simultâneas para
 * manter performance excelente sem saturar a rede.
 */
export async function persistAthletesToAppwrite(eventId, athletes) {
  if (!isAppwriteEnabled() || !eventId || !Array.isArray(athletes) || athletes.length === 0) {
    return { ok: false, skipped: true }
  }

  const { databaseId, athletesCol } = getEnv()
  const safeEventId = String(eventId || '').trim()

  console.log(`[appwrite] Iniciando sincronização de ${athletes.length} atletas para o evento ${safeEventId}...`)

  let successCount = 0
  let errorCount = 0
  const CONCURRENCY = 10

  for (let i = 0; i < athletes.length; i += CONCURRENCY) {
    const chunk = athletes.slice(i, i + CONCURRENCY)

    await Promise.all(
      chunk.map(async (atleta) => {
        const payload = mapLocalAthleteToAppwrite(safeEventId, atleta)
        const docId = getAthleteDocId(safeEventId, payload.bib_number)

        try {
          // Tenta atualizar registro existente
          const patchRes = await api(
            `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents/${encodeURIComponent(docId)}`,
            { method: 'PATCH', body: JSON.stringify({ data: payload }) }
          )

          if (patchRes.status === 200) {
            successCount++
            return
          }

          // Se não existe, cria novo documento
          if (patchRes.status === 404) {
            const createRes = await api(
              `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents`,
              {
                method: 'POST',
                body: JSON.stringify({ documentId: docId, data: payload }),
              }
            )
            if (createRes.status === 201) {
              successCount++
              return
            }
          }

          errorCount++
        } catch {
          errorCount++
        }
      })
    )
  }

  console.log(`[appwrite] Sincronização concluída: ${successCount} salvos, ${errorCount} erros.`)
  return { ok: true, total: athletes.length, successCount, errorCount }
}

/**
 * Atualiza o status da entrega do atleta no Appwrite e registra no audit_logs.
 */
export async function updateAthleteStatusInAppwrite(eventId, bibNumber, updates = {}) {
  if (!isAppwriteEnabled() || !eventId || !bibNumber) return { ok: false, skipped: true }

  const { databaseId, athletesCol, auditsCol } = getEnv()
  const safeEventId = String(eventId || '').trim()
  const safeBib = String(bibNumber || '').trim()
  const docId = getAthleteDocId(safeEventId, safeBib)

  const payload = {
    status: updates.status || 'ENTREGUE',
    delivered_at: updates.entregueEm || new Date().toISOString(),
    operator_name: String(updates.entreguePor || '').slice(0, 128),
    collected_by: updates.entreguePara ? 'TERCEIRO' : 'PROPRIO_ATLETA',
    third_party_name: String(updates.entreguePara || '').slice(0, 128),
    third_party_doc: String(updates.terceiroDoc || '').slice(0, 64),
  }

  try {
    const patchRes = await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents/${encodeURIComponent(docId)}`,
      { method: 'PATCH', body: JSON.stringify({ data: payload }) }
    )

    // Registra log de auditoria
    void createAuditLog(safeEventId, safeBib, updates, payload)

    return { ok: patchRes.status === 200 }
  } catch (err) {
    console.warn(`[appwrite] Falha ao atualizar status do atleta #${safeBib}:`, err.message)
    return { ok: false, error: err.message }
  }
}

async function createAuditLog(eventId, bibNumber, updates, payload) {
  const { databaseId, auditsCol } = getEnv()
  const logId = crypto.createHash('md5').update(`audit:${eventId}:${bibNumber}:${Date.now()}`).digest('hex')

  try {
    await api(
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(auditsCol)}/documents`,
      {
        method: 'POST',
        body: JSON.stringify({
          documentId: logId,
          data: {
            event_id: eventId,
            bib_number: bibNumber,
            athlete_name: String(updates.athleteName || `Atleta #${bibNumber}`).slice(0, 128),
            action: 'ENTREGA_KIT',
            collected_by: payload.collected_by || 'PROPRIO_ATLETA',
            operator_name: payload.operator_name || 'Operador',
            pickup_station: String(updates.pickupStation || 'Tenda Principal').slice(0, 64),
            kit_details: String(updates.kitDetails || '').slice(0, 1000),
            receipt_code: logId.slice(0, 16).toUpperCase(),
            created_at: payload.delivered_at,
          },
        }),
      }
    )
  } catch (err) {
    console.warn('[appwrite] Falha ao gravar log de auditoria:', err.message)
  }
}

/**
 * Busca todos os atletas de um evento no Appwrite com paginação automática.
 */
export async function fetchAthletesFromAppwrite(eventId) {
  if (!isAppwriteEnabled() || !eventId) return null

  const { databaseId, athletesCol } = getEnv()
  const safeId = String(eventId || '').trim()
  const allAthletes = []
  let offset = 0
  const limit = 100

  try {
    while (true) {
      const qAth = formatQueries([
        { method: 'equal', attribute: 'event_id', values: [safeId] },
        { method: 'limit', values: [limit] },
        { method: 'offset', values: [offset] },
      ])
      const { status, data } = await api(
        `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(athletesCol)}/documents${qAth}`
      )

      if (status !== 200 || !Array.isArray(data?.documents)) break

      const docs = data.documents
      if (docs.length === 0) break

      for (const doc of docs) {
        allAthletes.push(mapAppwriteDocToLocalAthlete(doc))
      }

      offset += docs.length
      if (allAthletes.length >= (data.total || 0) || docs.length < limit) break
    }

    if (allAthletes.length === 0) return null
    return { athletes: allAthletes, schema: [], kits: [] }
  } catch (err) {
    console.warn(`[appwrite] Falha ao carregar atletas do evento ${eventId}:`, err.message)
    return null
  }
}
