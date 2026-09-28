// Seleção e ordem de colunas para exportar planilhas. A escolha é lembrada por
// evento e por tipo de planilha, pelo nome da coluna (a posição muda entre eventos).

export function exportColumnsStorageKey(eventId, kind) {
  return `entregas_run_export_cols_${eventId || 'sem_evento'}_${kind}`
}

// Colunas salvas vêm primeiro, na ordem salva; colunas novas da planilha entram
// no fim, desmarcadas quando já existe uma escolha salva (para não "vazar" campo).
export function resolveColumnSelection(availableHeaders, saved) {
  const available = [...new Set((availableHeaders || []).map(String))]
  if (!Array.isArray(saved) || saved.length === 0) {
    return available.map((header) => ({ header, selected: true }))
  }
  const known = new Set(available)
  const fromSaved = saved
    .filter((item) => item && known.has(String(item.header)))
    .map((item) => ({ header: String(item.header), selected: Boolean(item.selected) }))
  const seen = new Set(fromSaved.map((item) => item.header))
  const added = available.filter((header) => !seen.has(header)).map((header) => ({ header, selected: false }))
  const resolved = [...fromSaved, ...added]
  return resolved.some((item) => item.selected) ? resolved : available.map((header) => ({ header, selected: true }))
}

export function moveColumn(columns, index, delta) {
  const target = index + delta
  if (index < 0 || index >= columns.length || target < 0 || target >= columns.length) return columns
  const next = [...columns]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

export function toggleColumn(columns, index) {
  return columns.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
}

export function setAllColumns(columns, selected) {
  return columns.map((item) => ({ ...item, selected }))
}

// Monta a planilha só com as colunas marcadas, na ordem escolhida.
export function projectTable({ headers, rows }, columns) {
  const indexByHeader = new Map((headers || []).map((header, i) => [String(header), i]))
  const picked = (columns || [])
    .filter((item) => item.selected && indexByHeader.has(item.header))
    .map((item) => ({ header: item.header, index: indexByHeader.get(item.header) }))
  return {
    headers: picked.map((item) => item.header),
    rows: (rows || []).map((row) => picked.map((item) => row?.[item.index] ?? '')),
  }
}

export function sampleValue({ headers, rows }, header) {
  const index = (headers || []).findIndex((item) => String(item) === header)
  if (index < 0) return ''
  const row = (rows || []).find((item) => String(item?.[index] ?? '').trim() !== '')
  return row ? String(row[index]).trim() : ''
}

export function readSavedColumns(eventId, kind) {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(exportColumnsStorageKey(eventId, kind)) || 'null')
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveColumns(eventId, kind, columns) {
  try {
    globalThis.localStorage?.setItem(
      exportColumnsStorageKey(eventId, kind),
      JSON.stringify(columns.map(({ header, selected }) => ({ header, selected })))
    )
  } catch {
    // Sem storage a exportação funciona; só não lembra a escolha.
  }
}
