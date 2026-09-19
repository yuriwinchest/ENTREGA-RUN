// Helpers puros da Auditoria: filtros, relatórios e exportação segura de CSV.

export function generateDefaultAudits() {
  return []
}

function normalizeComparable(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseAuditDate(item) {
  if (Number.isFinite(Number(item?.timestamp))) {
    const date = new Date(Number(item.timestamp))
    if (!Number.isNaN(date.getTime())) return date
  }

  const raw = String(item?.dataHora ?? '').trim()
  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  )
  if (!match) return null

  const [, day, month, year, hour = '0', minute = '0', second = '0'] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  )
  return Number.isNaN(date.getTime()) ? null : date
}

export function getAuditTimestamp(item) {
  return parseAuditDate(item)?.getTime() ?? null
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function matchesSearch(value, query, mode) {
  if (!query) return false
  const comparable = normalizeComparable(value)
  if (mode === 'exato') return comparable === query
  if (mode === 'inicia') return comparable.startsWith(query)
  return comparable.includes(query)
}

export function enrichAuditRecords(audits, athletes) {
  const athleteByNumber = new Map()
  for (const athlete of athletes ?? []) {
    const keys = [athlete?.numero, athlete?.id]
      .map((value) => normalizeComparable(value))
      .filter(Boolean)
    for (const key of keys) athleteByNumber.set(key, athlete)
  }

  return (audits ?? []).map((audit) => {
    const athlete = athleteByNumber.get(normalizeComparable(audit?.atletaNumero))
    return {
      ...audit,
      atletaChip: audit?.atletaChip ?? athlete?.chip ?? '',
    }
  })
}

export function getAuditOperatorOptions(audits, operators = []) {
  const names = new Map()
  const addName = (value) => {
    const display = String(value ?? '').trim()
    const key = normalizeComparable(display)
    if (key && !names.has(key)) names.set(key, display)
  }

  for (const operator of operators) addName(operator?.name)
  for (const audit of audits ?? []) addName(audit?.operadorNome)

  return Array.from(names.values()).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  )
}

export function filterAuditRecords({
  audits,
  search = '',
  operator = 'TODOS',
  type = 'TODOS',
  period = 'TODOS',
  matchMode = 'contem',
  now = new Date(),
}) {
  const query = normalizeComparable(search)
  const operatorKey = normalizeComparable(operator)
  const typeKey = normalizeComparable(type)
  const todayStart = startOfDay(now)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const sevenDaysStart = new Date(todayStart)
  sevenDaysStart.setDate(sevenDaysStart.getDate() - 6)

  return (audits ?? []).filter((item) => {
    if (query) {
      const cpfDigits = String(item?.atletaCpf ?? '').replace(/\D/g, '')
      const queryDigits = String(search).replace(/\D/g, '')
      const textMatch = [
        item?.atletaNome,
        item?.atletaNumero,
        item?.atletaChip,
        item?.retiradoPor,
      ].some((value) => matchesSearch(value, query, matchMode))
      const cpfMatch = queryDigits
        ? matchesSearch(cpfDigits, queryDigits, matchMode)
        : false
      if (!textMatch && !cpfMatch) return false
    }

    if (operatorKey !== 'todos' && normalizeComparable(item?.operadorNome) !== operatorKey) {
      return false
    }

    if (typeKey !== 'todos' && normalizeComparable(item?.tipo) !== typeKey) {
      return false
    }

    if (period !== 'TODOS') {
      const itemDate = parseAuditDate(item)
      if (!itemDate) return false
      if (period === 'HOJE' && !(itemDate >= todayStart && itemDate < tomorrowStart)) return false
      if (period === 'ONTEM' && !(itemDate >= yesterdayStart && itemDate < todayStart)) return false
      if (period === 'ÚLTIMOS 7 DIAS' && !(itemDate >= sevenDaysStart && itemDate < tomorrowStart)) {
        return false
      }
    }

    return true
  })
}

function neutralizeSpreadsheetFormula(value) {
  const text = String(value ?? '')
  return /^[\t\r ]*[=+\-@]/.test(text) || /^[\t\r]/.test(text) ? `'${text}` : text
}

function serializeCsvCell(value) {
  const safeValue = neutralizeSpreadsheetFormula(value)
  return `"${safeValue.replace(/"/g, '""')}"`
}

export function createCsvContent(headers, rows) {
  return (
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((value) => serializeCsvCell(value)).join(';'))
      .join('\r\n')
  )
}

function sanitizeFilename(filename, fallback) {
  const safe = String(filename || fallback)
    .split('')
    .filter((character) => character.charCodeAt(0) > 31)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
  return safe || fallback
}

function buildAthleteCsvData(athletes) {
  const standardHeaders = [
    'NUMERO',
    'CHIP',
    'NOME',
    'NOME_DE_PEITO',
    'CPF',
    'SEXO',
    'CAMISETA',
    'MODALIDADE',
    'CATEGORIA',
    'EQUIPE',
    'CIDADE',
    'NASCIMENTO',
    'MORADOR',
    'CONTATO',
    'NACIONALIDADE',
    'KIT',
    'STATUS_DA_ENTREGA',
    'ENTREGUE_EM',
    'ENTREGUE_POR',
    'ENTREGUE_PARA',
  ]

  const customHeadersSet = new Set()
  for (const athlete of athletes) {
    if (athlete?.pcd) customHeadersSet.add('PCD')
    if (athlete?.customFields && typeof athlete.customFields === 'object') {
      Object.keys(athlete.customFields).forEach((key) => customHeadersSet.add(key))
    }

    Object.keys(athlete ?? {}).forEach((key) => {
      const standardKeys = [
        'id', 'numero', 'chip', 'nome', 'nome_peito', 'doc', 'sexo', 'camiseta',
        'equipe', 'cidade', 'nascimento', 'modalidade', 'categoria', 'morador',
        'contato', 'nacionalidade', 'kit', 'status', 'createdAt', 'entregueEm',
        'entreguePor', 'entreguePara', 'customFields', 'pcd', '_hasCollision',
      ]
      if (!standardKeys.includes(key)) customHeadersSet.add(key)
    })
  }

  const customHeaders = Array.from(customHeadersSet)
  const headers = [...standardHeaders, ...customHeaders]
  const rows = athletes.map((athlete) => {
    const status = normalizeComparable(athlete?.status) === 'entregue' ? 'ENTREGUE' : 'PENDENTE'
    const standardRow = [
      athlete?.numero ?? '',
      athlete?.chip ?? '',
      athlete?.nome ?? '',
      athlete?.nome_peito ?? '',
      athlete?.doc ?? '',
      athlete?.sexo ?? '',
      athlete?.camiseta ?? '',
      athlete?.modalidade ?? '',
      athlete?.categoria ?? '',
      athlete?.equipe ?? '',
      athlete?.cidade ?? '',
      athlete?.nascimento ?? '',
      athlete?.morador ?? '',
      athlete?.contato ?? '',
      athlete?.nacionalidade ?? '',
      athlete?.kit ?? '',
      status,
      athlete?.entregueEm ?? '',
      athlete?.entreguePor ?? '',
      athlete?.entreguePara ?? '',
    ]
    const customRow = customHeaders.map((header) => {
      if (header === 'PCD') return athlete?.pcd ?? athlete?.customFields?.PCD ?? ''
      return athlete?.customFields?.[header] ?? athlete?.[header] ?? ''
    })
    return [...standardRow, ...customRow]
  })

  return { headers, rows }
}

function triggerCsvDownload(filename, csvContent) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { filename, content: csvContent }
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  return { filename, content: csvContent }
}

export function exportCsvFile(arg1, arg2, arg3) {
  let filename
  let headers
  let rows

  if (Array.isArray(arg1) && (typeof arg2 === 'string' || !arg2)) {
    filename = sanitizeFilename(arg2, 'planilha_geral_atletas.csv')
    const athleteData = buildAthleteCsvData(arg1)
    headers = athleteData.headers
    rows = athleteData.rows
  } else if (typeof arg1 === 'string' && Array.isArray(arg2) && Array.isArray(arg3)) {
    filename = sanitizeFilename(arg1, 'exportacao.csv')
    headers = arg2
    rows = arg3
  } else {
    throw new TypeError('Dados inválidos para exportação CSV.')
  }

  return triggerCsvDownload(filename, createCsvContent(headers, rows))
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildAuditReportHtml({
  eventName,
  records,
  filterSummary,
  includeComprovantes = true,
  generatedAt = new Date(),
}) {
  const safeEvent = escapeHtml(eventName || 'Evento')
  const safeSummary = escapeHtml(filterSummary || 'Todos os registros')
  const generatedLabel = generatedAt.toLocaleString('pt-BR')
  const receiptHeader = includeComprovantes ? '<th>COMPROVANTE</th>' : ''
  const rows = records.map((item) => {
    const receiptCell = includeComprovantes
      ? `<td>${escapeHtml(item?.comprovanteId || '—')}</td>`
      : ''
    return `<tr>
      ${receiptCell}
      <td>${escapeHtml(item?.dataHora || '—')}</td>
      <td><strong>${escapeHtml(item?.atletaNome || '—')}</strong><br><small>Nº ${escapeHtml(item?.atletaNumero || '—')} · CPF: ${escapeHtml(item?.atletaCpf || '—')}</small></td>
      <td>${escapeHtml(item?.tipo || '—')}</td>
      <td>${escapeHtml(item?.retiradoPor || '—')}</td>
      <td>${escapeHtml(item?.operadorNome || '—')}</td>
      <td>${escapeHtml(item?.pontoEntrega || '—')}</td>
      <td>${escapeHtml(item?.kit || '—')}${item?.camiseta ? ` · ${escapeHtml(item.camiseta)}` : ''}</td>
    </tr>`
  }).join('')

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório de entregas — ${safeEvent}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #0f172a; font: 11px Arial, sans-serif; }
    header { border-bottom: 3px solid #ff5200; margin-bottom: 14px; padding-bottom: 10px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { color: #475569; font-size: 13px; margin: 0; }
    .meta { display: grid; grid-template-columns: 1fr auto; gap: 12px; margin: 10px 0 14px; }
    .summary { background: #f1f5f9; border-radius: 6px; padding: 8px 10px; }
    .count { background: #0f274e; border-radius: 6px; color: #fff; font-weight: 700; padding: 8px 12px; }
    table { border-collapse: collapse; width: 100%; }
    thead { display: table-header-group; }
    th { background: #0f274e; color: #fff; font-size: 9px; letter-spacing: .3px; padding: 7px 6px; text-align: left; }
    td { border-bottom: 1px solid #cbd5e1; padding: 7px 6px; vertical-align: top; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    small { color: #64748b; }
    footer { color: #64748b; font-size: 9px; margin-top: 10px; text-align: right; }
  </style>
</head>
<body>
  <header>
    <h1>RELATÓRIO DE ENTREGAS FILTRADAS</h1>
    <h2>${safeEvent}</h2>
  </header>
  <div class="meta">
    <div class="summary"><strong>Filtros aplicados:</strong> ${safeSummary}<br><strong>Gerado em:</strong> ${escapeHtml(generatedLabel)}</div>
    <div class="count">${records.length} entrega(s)</div>
  </div>
  <table>
    <thead><tr>${receiptHeader}<th>DATA / HORA</th><th>ATLETA</th><th>TIPO</th><th>RETIRADO POR</th><th>OPERADOR</th><th>PONTO</th><th>DETALHES</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>Entregas Run · relatório administrativo do evento</footer>
</body>
</html>`
}

export function openAuditReportPrint(options) {
  if (typeof window === 'undefined') return false
  const reportWindow = window.open('', '_blank')
  if (!reportWindow) return false
  reportWindow.opener = null
  reportWindow.document.open()
  reportWindow.document.write(buildAuditReportHtml(options))
  reportWindow.document.close()
  reportWindow.focus()
  reportWindow.setTimeout(() => reportWindow.print(), 250)
  return true
}
