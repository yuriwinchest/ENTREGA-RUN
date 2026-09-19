// ibge.js — Serviço de busca e cache de municípios brasileiros via API do IBGE

let memoryCache = null
let fetchPromise = null

export function normalizeText(str) {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export async function fetchMunicipiosIBGE() {
  if (memoryCache && memoryCache.length > 0) {
    return memoryCache
  }

  // Tentar ler do sessionStorage
  try {
    const sessionData = sessionStorage.getItem('entregas_run_ibge_municipios')
    if (sessionData) {
      const parsed = JSON.parse(sessionData)
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache = parsed
        return memoryCache
      }
    }
  } catch {
    // ignore
  }

  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
    .then((res) => {
      if (!res.ok) throw new Error('Falha ao consultar API do IBGE')
      return res.json()
    })
    .then((data) => {
      const mapped = data.map((item) => {
        const uf =
          item.microrregiao?.mesorregiao?.UF?.sigla ||
          item['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ||
          ''
        const label = `${item.nome}/${uf}`
        return {
          id: item.id,
          nome: item.nome,
          uf,
          label,
          searchKey: normalizeText(label),
        }
      })

      memoryCache = mapped
      try {
        sessionStorage.setItem('entregas_run_ibge_municipios', JSON.stringify(mapped))
      } catch {
        // storage quota excedido — mantém na memória
      }
      return mapped
    })
    .catch((err) => {
      console.warn('Erro ao carregar municípios do IBGE:', err)
      return memoryCache || []
    })
    .finally(() => {
      fetchPromise = null
    })

  return fetchPromise
}

export function filterMunicipios(municipios, query, limit = 20) {
  if (!query || !query.trim()) return []
  const normQuery = normalizeText(query)

  const startsWithMatches = []
  const containsMatches = []

  for (const m of municipios) {
    if (m.searchKey.startsWith(normQuery)) {
      startsWithMatches.push(m)
      if (startsWithMatches.length >= limit) break
    } else if (m.searchKey.includes(normQuery)) {
      containsMatches.push(m)
    }
  }

  const combined = [...startsWithMatches, ...containsMatches].slice(0, limit)
  return combined
}
