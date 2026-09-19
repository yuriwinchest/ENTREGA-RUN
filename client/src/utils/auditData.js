// auditData.js — Helpers de auditoria e exportação de dados com suporte a campos dinâmicos e PCD

export function generateDefaultAudits() {
  return []
}

export function exportCsvFile(arg1, arg2, arg3) {
  let filename = 'planilha_atletas.csv'
  let headers = []
  let rows = []

  if (Array.isArray(arg1) && (typeof arg2 === 'string' || !arg2)) {
    // Chamada no formato: exportCsvFile(athletesList, filename)
    const athletes = arg1
    filename = arg2 || 'planilha_atletas.csv'

    const standardHeaders = [
      'NUMERO',
      'CHIP',
      'NOME',
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
      'KIT',
      'STATUS',
    ]

    // Mapear dinamicamente todos os campos personalizados / PCD existentes nos atletas
    const customHeadersSet = new Set()
    athletes.forEach((a) => {
      if (a.pcd) customHeadersSet.add('PCD')
      if (a.customFields && typeof a.customFields === 'object') {
        Object.keys(a.customFields).forEach((k) => customHeadersSet.add(k))
      }
      // Verificar também propriedades extras diretamente no objeto
      Object.keys(a).forEach((key) => {
        const standardKeys = [
          'id', 'numero', 'chip', 'nome', 'nome_peito', 'doc', 'sexo', 'camiseta',
          'equipe', 'cidade', 'nascimento', 'modalidade', 'categoria', 'morador',
          'contato', 'nacionalidade', 'kit', 'status', 'createdAt', 'entregueEm',
          'entreguePor', 'entreguePara', 'customFields', 'pcd', '_hasCollision'
        ]
        if (!standardKeys.includes(key)) {
          customHeadersSet.add(key)
        }
      })
    })

    const customHeaders = Array.from(customHeadersSet)
    headers = [...standardHeaders, ...customHeaders]

    rows = athletes.map((a) => {
      const standardRow = [
        a.numero || '',
        a.chip || '',
        a.nome || '',
        a.doc || '',
        a.sexo || '',
        a.camiseta || '',
        a.modalidade || '',
        a.categoria || '',
        a.equipe || '',
        a.cidade || '',
        a.nascimento || '',
        a.morador || '',
        a.contato || '',
        a.kit || '',
        a.status || '',
      ]

      const customRow = customHeaders.map((header) => {
        if (header === 'PCD') return a.pcd || a.customFields?.['PCD'] || ''
        return a.customFields?.[header] || a[header] || ''
      })

      return [...standardRow, ...customRow]
    })
  } else if (typeof arg1 === 'string' && Array.isArray(arg2) && Array.isArray(arg3)) {
    // Chamada no formato: exportCsvFile(filename, headers, rows)
    filename = arg1
    headers = arg2
    rows = arg3
  }

  const csvContent =
    '\uFEFF' +
    headers.join(';') +
    '\n' +
    rows.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(';')).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
