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
    if (!mappedField || mappedField === 'ignore') return

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
  const standard = STANDARD_COLUMNS.filter(
    (column) => column.required || athletes.some((athlete) => hasValue(athlete?.[column.key]))
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

  return mergeAthleteColumnSchemas(
    standard,
    mergeAthleteColumnSchemas(savedSchema, discoveredCustom)
  )
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
