// auditData.js — Geração de registros de auditoria e helpers de exportação

export function generateDefaultAudits() {
  const topRows = [
    {
      id: 'aud-1',
      dataHora: '17/09/2026 09:32:42',
      numero: 1,
      atleta: 'ADAN SANTOS OLIVEIRA',
      documento: '12445389989',
      retiradoPor: 'ADAN SANTOS OLIVEIRA',
      tipo: 'ATLETA',
      operador: 'entregas1',
    },
    {
      id: 'aud-2',
      dataHora: '17/09/2026 09:31:34',
      numero: 9,
      atleta: 'ALE MANSO',
      documento: '14371059885',
      retiradoPor: 'ALE MANSO',
      tipo: 'ATLETA',
      operador: 'entregas1',
    },
    {
      id: 'aud-3',
      dataHora: '17/09/2026 08:20:47',
      numero: 318,
      atleta: '—',
      documento: '-',
      retiradoPor: 'NADYNE BRAGA',
      tipo: 'ATLETA',
      operador: 'entregas1',
    },
    {
      id: 'aud-4',
      dataHora: '16/09/2026 21:17:18',
      numero: 28,
      atleta: '—',
      documento: '-',
      retiradoPor: 'ANDRESA FIQUEREDO FERREIRA',
      tipo: 'ATLETA',
      operador: 'entregas1',
    },
    {
      id: 'aud-5',
      dataHora: '16/09/2026 21:12:44',
      numero: 268,
      atleta: 'MARCOS ALBERTO MANSO DA SILVA',
      documento: '19232233384',
      retiradoPor: 'MARCOS ALBERTO MANSO DA SILVA',
      tipo: 'ATLETA',
      operador: 'entregas1',
    },
    {
      id: 'aud-6',
      dataHora: '16/09/2026 20:15:37',
      numero: 400,
      atleta: 'DAVI VILELA',
      documento: '78496238493',
      retiradoPor: 'DAVI VILELA',
      tipo: 'ATLETA',
      operador: 'entregas1',
    },
    {
      id: 'aud-7',
      dataHora: '16/09/2026 20:14:31',
      numero: 168,
      atleta: 'JANAINA DA SILVA MOTA MANSO',
      documento: '10156287455',
      retiradoPor: 'JANAINA DA SILVA MOTA MANSO',
      tipo: 'ATLETA',
      operador: 'entregas1',
    },
    {
      id: 'aud-8',
      dataHora: '16/09/2026 20:12:33',
      numero: 204,
      atleta: 'JOSE SOARES DA SILVA',
      documento: '24954450889',
      retiradoPor: 'JOSE SOARES DA SILVA',
      tipo: 'ATLETA',
      operador: 'entregas1',
    },
  ]

  const audits = [...topRows]

  // Gera o restante até totalizar 416 registros (394 pelo atleta, 22 por terceiro)
  // Atualmente topRows tem 8 registros (todos ATLETA).
  // Faltam: 386 ATLETA e 22 TERCEIRO.
  const nomesComuns = [
    'LUCAS BEZERRA', 'CARLOS SILVA', 'MARIANA COSTA', 'FERNANDO ALMEIDA',
    'BEATRIZ LIMA', 'RODRIGO OLIVEIRA', 'PATRICIA SOUZA', 'GABRIEL PEREIRA',
    'CAMILA RODRIGUES', 'THIAGO CARVALHO', 'JULIANA GOMES', 'RAFAEL MARTINS',
    'AMANDA BARBOSA', 'LEANDRO RIBEIRO', 'VANESSA SANTOS', 'BRUNO DIAS',
    'LETICIA CASTRO', 'DIEGO NUNES', 'ALINE CARDOSO', 'MARCELO VIEIRA'
  ]

  let atletaCount = 8
  let terceiroCount = 0

  for (let i = 9; i <= 416; i++) {
    const isTerceiro = terceiroCount < 22 && (i % 18 === 0 || atletaCount >= 394)
    const baseName = nomesComuns[(i - 1) % nomesComuns.length]
    const nomeAtleta = `${baseName} ${Math.floor(i / nomesComuns.length) > 0 ? Math.floor(i / nomesComuns.length) + 1 : ''}`.trim()
    const peito = i <= 409 ? i : (i % 400) + 1
    const docNum = String(10000000000 + (i * 739174)).slice(0, 11)

    if (isTerceiro) {
      terceiroCount++
      audits.push({
        id: `aud-${i}`,
        dataHora: '16/09/2026 19:40:00',
        numero: peito,
        atleta: nomeAtleta,
        documento: docNum,
        retiradoPor: `${baseName} (REPRESENTANTE)`,
        tipo: 'TERCEIRO',
        operador: 'entregas1',
      })
    } else {
      atletaCount++
      audits.push({
        id: `aud-${i}`,
        dataHora: '16/09/2026 18:20:00',
        numero: peito,
        atleta: nomeAtleta,
        documento: docNum,
        retiradoPor: nomeAtleta,
        tipo: 'ATLETA',
        operador: 'entregas1',
      })
    }
  }

  return audits
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
