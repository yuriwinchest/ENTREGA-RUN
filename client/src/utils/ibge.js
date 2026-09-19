// ibge.js — Serviço de busca e autocompletar de municípios brasileiros
// Utiliza a base oficial do IBGE completa (5.571 municípios) empacotada localmente
// com fallback resiliente e indexação rápida em memória.

import MUNICIPIOS_RAW from '../data/municipios.js'

let memoryCache = null

export function normalizeText(str) {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Inicializa e formata a lista de municípios em memória com chaves pré-normalizadas
 * para busca instantânea em tempo real (< 1ms).
 */
export function getMunicipios() {
  if (memoryCache && memoryCache.length > 0) {
    return memoryCache
  }

  const rawList = Array.isArray(MUNICIPIOS_RAW) ? MUNICIPIOS_RAW : []

  memoryCache = rawList.map((str, idx) => {
    const lastSlash = str.lastIndexOf('/')
    const nome = lastSlash !== -1 ? str.slice(0, lastSlash) : str
    const uf = lastSlash !== -1 ? str.slice(lastSlash + 1) : ''
    return {
      id: idx + 1,
      nome,
      uf,
      label: str,
      nomeNorm: normalizeText(nome),
      searchKey: normalizeText(nome + ' ' + uf),
    }
  })

  return memoryCache
}

/**
 * Retorna a lista de municípios. Como os dados já estão empacotados,
 * a resolução é praticamente instantânea, garantindo funcionamento offline
 * e 100% imune a bloqueios de CSP (Content Security Policy) ou falhas de rede.
 */
export async function fetchMunicipiosIBGE() {
  const localList = getMunicipios()
  if (localList.length > 0) {
    return localList
  }

  // Contingência caso o bundle venha vazio
  try {
    const res = await fetch('/municipios.json')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        memoryCache = data.map((str, idx) => {
          const lastSlash = str.lastIndexOf('/')
          const nome = lastSlash !== -1 ? str.slice(0, lastSlash) : str
          const uf = lastSlash !== -1 ? str.slice(lastSlash + 1) : ''
          return {
            id: idx + 1,
            nome,
            uf,
            label: str,
            nomeNorm: normalizeText(nome),
            searchKey: normalizeText(nome + ' ' + uf),
          }
        })
        return memoryCache
      }
    }
  } catch (err) {
    console.warn('Falha na contingência local de municípios:', err)
  }

  return memoryCache || []
}

/**
 * Filtra municípios brasileiros com priorização inteligente:
 * 1. Municípios cujo nome inicia com a busca (ex: "rec" -> "Recife/PE")
 * 2. Municípios cujo label/UF inicia com a busca
 * 3. Municípios que contenham todas as palavras digitadas (ex: "sao bento", "recife pe")
 */
export function filterMunicipios(municipios, query, limit = 80) {
  if (!query || !query.trim()) return []
  const normQuery = normalizeText(query)
  if (!normQuery) return []

  const tokens = normQuery.split(' ').filter(Boolean)

  const exactStarts = []
  const startsKey = []
  const containsMatches = []

  for (let i = 0; i < municipios.length; i++) {
    const m = municipios[i]
    if (m.nomeNorm.startsWith(normQuery)) {
      exactStarts.push(m)
    } else if (tokens.every((t) => m.searchKey.includes(t))) {
      if (m.searchKey.startsWith(normQuery)) {
        startsKey.push(m)
      } else {
        containsMatches.push(m)
      }
    }
  }

  const all = [...exactStarts, ...startsKey, ...containsMatches]
  const results = all.slice(0, limit)
  results.totalMatches = all.length
  return results
}
