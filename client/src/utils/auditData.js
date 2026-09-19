// auditData.js — Helpers de auditoria e exportação de dados

export function generateDefaultAudits() {
  return []
}

export function exportCsvFile(filename, headers, rows) {
  const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
