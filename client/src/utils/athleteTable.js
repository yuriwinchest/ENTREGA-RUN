const STANDARD_COLUMNS = [
  { key: 'numero', label: 'NÚMERO', required: true },
  { key: 'nome', label: 'NOME', required: true },
  { key: 'nome_peito', label: 'NOME DE PEITO' },
  { key: 'doc', label: 'DOCUMENTO' },
  { key: 'chip', label: 'CHIP' },
  { key: 'nascimento', label: 'NASCIMENTO' },
  { key: 'sexo', label: 'SEXO' },
  { key: 'modalidade', label: 'MODALIDADE' },
  { key: 'categoria', label: 'CATEGORIA' },
  { key: 'camiseta', label: 'CAMISETA' },
  { key: 'equipe', label: 'EQUIPE' },
  { key: 'cidade', label: 'CIDADE' },
  { key: 'morador', label: 'MORADOR/VISITANTE' },
  { key: 'contato', label: 'CONTATO' },
  { key: 'nacionalidade', label: 'NACIONALIDADE' },
  { key: 'kit', label: 'KIT' },
  { key: 'status', label: 'STATUS' },
  { key: 'entregueEm', label: 'ENTREGUE EM' },
  { key: 'entreguePor', label: 'ENTREGUE POR' },
  { key: 'entreguePara', label: 'ENTREGUE PARA' },
]

const RESERVED_CUSTOM_KEYS = new Set([
  ...STANDARD_COLUMNS.map((column) => column.key.toLocaleLowerCase('pt-BR')),
  'id',
  'createdat',
  'customfields',
  'pcd',
  '_hascollision',
  '__proto__',
  'prototype',
  'constructor',
])

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function normalizeColumnKey(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function isReservedAthleteCustomField(value) {
  return RESERVED_CUSTOM_KEYS.has(normalizeColumnKey(value).replace(/[ _-]+/g, '')) ||
    RESERVED_CUSTOM_KEYS.has(normalizeColumnKey(value))
}

export function buildImportColumnSchema(headers = [], columnMapping = {}) {
  const schema = []
  const seen = new Set()

  headers.forEach((header, columnIndex) => {
    const mappedField = columnMapping[columnIndex]

    // Colunas marcadas como "Não importar" entram como campo personalizado
    // com o nome original — a grade sempre exibe todos os campos do arquivo.
    if (!mappedField || mappedField === 'ignore') {
      const cleanHeader = String(header || '').trim()
      if (!cleanHeader || isReservedAthleteCustomField(cleanHeader)) return
      const normalizedKey = normalizeColumnKey(`custom:${cleanHeader}`)
      if (!normalizedKey || seen.has(normalizedKey)) return
      seen.add(normalizedKey)
      schema.push({
        key: `custom:${cleanHeader}`,
        customKey: cleanHeader,
        label: cleanHeader.toLocaleUpperCase('pt-BR'),
        type: 'custom',
      })
      return
    }

    const isCustom = mappedField.startsWith('custom:')
    const customKey = isCustom ? mappedField.slice('custom:'.length).trim() : ''
    if (isCustom && isReservedAthleteCustomField(customKey)) return
    const key = isCustom ? `custom:${customKey}` : mappedField
    const normalizedKey = normalizeColumnKey(key)
    if (!normalizedKey || seen.has(normalizedKey)) return
    seen.add(normalizedKey)

    schema.push({
      key,
      ...(isCustom ? { customKey } : {}),
      label: String(header || customKey || mappedField).trim().toLocaleUpperCase('pt-BR'),
      type: isCustom ? 'custom' : 'standard',
    })
  })

  return schema
}

export function mergeAthleteColumnSchemas(current = [], incoming = []) {
  const merged = []
  const seen = new Set()

  ;[...current, ...incoming].forEach((column) => {
    if (!column?.key || !column?.label) return
    const normalizedKey = normalizeColumnKey(column.key)
    if (seen.has(normalizedKey)) return
    seen.add(normalizedKey)
    merged.push({ ...column })
  })

  return merged
}

export function getAthleteTableColumns(athletes = [], savedSchema = []) {
  // Se existe um schema explícito gravado pela importação da planilha,
  // a grade exibe ESTRITAMENTE as colunas da planilha (sem inventar colunas).
  if (Array.isArray(savedSchema) && savedSchema.length > 0) {
    const schemaKeys = new Set(savedSchema.map((c) => normalizeColumnKey(c.key)))

    const columns = [...savedSchema]

    // Garante que número e nome apareçam se existirem atletas
    if (!schemaKeys.has('numero')) {
      columns.unshift({ key: 'numero', label: 'NÚMERO', required: true, type: 'standard' })
      schemaKeys.add('numero')
    }
    if (!schemaKeys.has('nome')) {
      const numIdx = columns.findIndex((c) => c.key === 'numero')
      columns.splice(numIdx + 1, 0, { key: 'nome', label: 'NOME', required: true, type: 'standard' })
      schemaKeys.add('nome')
    }

    // Adiciona STATUS operacional no final se não estiver presente
    if (!schemaKeys.has('status')) {
      columns.push({ key: 'status', label: 'STATUS', type: 'standard' })
    }

    return columns
  }

  // Fallback para eventos sem schema salvo: apenas colunas que realmente possuem dados válidos
  // (ignora colunas fictícias como morador/nacionalidade se todos forem apenas o default falso)
  const isDefaultFictitious = (key) => {
    if (key === 'morador') {
      return athletes.every((a) => !a.morador || a.morador === 'Visitante' || a.morador === 'Morador')
    }
    if (key === 'nacionalidade') {
      return athletes.every((a) => !a.nacionalidade || a.nacionalidade === 'BRASIL')
    }
    return false
  }

  const standard = STANDARD_COLUMNS.filter(
    (column) =>
      column.required ||
      (athletes.some((athlete) => hasValue(athlete?.[column.key])) && !isDefaultFictitious(column.key))
  ).map((column) => ({ ...column, type: 'standard' }))

  const customKeys = []
  const seenCustomKeys = new Set()
  athletes.forEach((athlete) => {
    if (!athlete?.customFields || typeof athlete.customFields !== 'object') return
    Object.keys(athlete.customFields).forEach((key) => {
      const cleanKey = String(key).trim()
      const normalizedKey = cleanKey.toLocaleLowerCase('pt-BR')
      if (!cleanKey || seenCustomKeys.has(normalizedKey)) return
      seenCustomKeys.add(normalizedKey)
      customKeys.push(cleanKey)
    })
  })

  const discoveredCustom = customKeys.map((key) => ({
    key: `custom:${key}`,
    customKey: key,
    label: key.toLocaleUpperCase('pt-BR'),
    type: 'custom',
  }))

  return mergeAthleteColumnSchemas(standard, discoveredCustom)
}

const COLUMN_WIDTHS = {
  numero: 92,
  nome: 240,
  nome_peito: 200,
  doc: 172,
  chip: 120,
  nascimento: 142,
  sexo: 90,
  modalidade: 132,
  categoria: 132,
  camiseta: 118,
  equipe: 180,
  cidade: 160,
  morador: 176,
  contato: 160,
  nacionalidade: 152,
  kit: 142,
  status: 112,
  entregueEm: 176,
  entreguePor: 176,
  entreguePara: 176,
}

// Largura realista por coluna para o minWidth da grade — evita que a
// última coluna (ex.: CAMISETA) seja cortada pela borda do card.
export function getAthleteColumnWidth(column) {
  if (!column) return 150
  if (column.type === 'custom') {
    const labelLength = String(column.label || '').length
    return Math.min(240, Math.max(150, labelLength * 8 + 64))
  }
  return COLUMN_WIDTHS[column.key] || 150
}

export function getAthleteTableValue(athlete, column) {
  let value
  if (column.type === 'custom') {
    const customFields = athlete?.customFields || {}
    value = customFields[column.customKey]
    if (value === undefined) {
      const matchingKey = Object.keys(customFields).find(
        (key) => normalizeColumnKey(key) === normalizeColumnKey(column.customKey)
      )
      value = matchingKey ? customFields[matchingKey] : athlete?.[column.customKey]
    }
  } else {
    value = athlete?.[column.key]
  }

  if (value === null || value === undefined || String(value).trim() === '') return '—'
  if (typeof value === 'boolean') return value ? 'SIM' : 'NÃO'
  return String(value)
}

/**
 * Compara dois números de atleta para ordenação natural crescente (1, 2, 3... 10, 20).
 * Trata números inteiros, strings puramente numéricas e formatos alfanuméricos.
 */
export function compareAthleteNumbers(a, b) {
  const strA = String(a ?? '').trim()
  const strB = String(b ?? '').trim()

  const numA = Number(strA)
  const numB = Number(strB)
  const isNumA = strA !== '' && !Number.isNaN(numA)
  const isNumB = strB !== '' && !Number.isNaN(numB)

  if (isNumA && isNumB) {
    if (numA !== numB) return numA - numB
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
  }
  if (isNumA) return -1
  if (isNumB) return 1

  const digitsA = parseInt(strA.replace(/\D/g, ''), 10)
  const digitsB = parseInt(strB.replace(/\D/g, ''), 10)
  const hasDigitsA = !Number.isNaN(digitsA)
  const hasDigitsB = !Number.isNaN(digitsB)

  if (hasDigitsA && hasDigitsB && digitsA !== digitsB) {
    return digitsA - digitsB
  }

  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
}

