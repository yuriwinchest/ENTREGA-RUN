import test from 'node:test'
import assert from 'node:assert/strict'
import {
  moveColumn,
  projectTable,
  resolveColumnSelection,
  sampleValue,
  setAllColumns,
  toggleColumn,
} from './exportColumns.js'

const table = {
  headers: ['NUMERO', 'CHIP', 'QR_CODE', 'NOME'],
  rows: [
    ['101', 'CH101', 'QR101', 'ANA'],
    ['102', '', 'QR102', 'BIA'],
  ],
}

test('sem escolha salva, todas as colunas vêm marcadas na ordem original', () => {
  assert.deepEqual(resolveColumnSelection(table.headers, null).map((c) => [c.header, c.selected]), [
    ['NUMERO', true], ['CHIP', true], ['QR_CODE', true], ['NOME', true],
  ])
})

test('escolha salva mantém ordem, descarta coluna sumida e acrescenta nova desmarcada', () => {
  const saved = [
    { header: 'QR_CODE', selected: true },
    { header: 'CHIP', selected: true },
    { header: 'ANTIGA', selected: true },
    { header: 'NUMERO', selected: false },
  ]
  assert.deepEqual(resolveColumnSelection(table.headers, saved).map((c) => [c.header, c.selected]), [
    ['QR_CODE', true], ['CHIP', true], ['NUMERO', false], ['NOME', false],
  ])
})

test('escolha salva sem nenhuma coluna válida marcada volta ao padrão', () => {
  const saved = [{ header: 'NUMERO', selected: false }]
  assert.ok(resolveColumnSelection(table.headers, saved).every((c) => c.selected))
})

test('ordena, marca e desmarca colunas', () => {
  let columns = resolveColumnSelection(table.headers, null)
  columns = moveColumn(columns, 2, -2)
  assert.deepEqual(columns.map((c) => c.header), ['QR_CODE', 'NUMERO', 'CHIP', 'NOME'])
  assert.equal(moveColumn(columns, 0, -1), columns)
  columns = toggleColumn(columns, 3)
  assert.equal(columns[3].selected, false)
  assert.ok(setAllColumns(columns, false).every((c) => !c.selected))
})

test('planilha final traz só as colunas marcadas, na ordem escolhida', () => {
  const columns = [
    { header: 'QR_CODE', selected: true },
    { header: 'CHIP', selected: true },
    { header: 'NUMERO', selected: true },
    { header: 'NOME', selected: false },
  ]
  assert.deepEqual(projectTable(table, columns), {
    headers: ['QR_CODE', 'CHIP', 'NUMERO'],
    rows: [['QR101', 'CH101', '101'], ['QR102', '', '102']],
  })
})

test('exemplo de valor pula células vazias', () => {
  assert.equal(sampleValue(table, 'CHIP'), 'CH101')
  assert.equal(sampleValue({ headers: ['X'], rows: [[''], ['  y ']] }, 'X'), 'y')
  assert.equal(sampleValue(table, 'INEXISTENTE'), '')
})

test('planilha de atletas traz QR_CODE próprio e esconde campos internos', async () => {
  const { buildAthleteCsvData } = await import('./auditData.js')
  const { headers, rows } = buildAthleteCsvData([
    { id: 'a1', numero: '101', chip: 'CH101', qrCode: 'QR101', nome: 'ANA', _kitPreviousNumero: '', updatedAt: 1, customFields: { PELOTAO: 'A' } },
  ])
  assert.equal(headers[2], 'QR_CODE')
  assert.equal(rows[0][2], 'QR101')
  assert.ok(headers.includes('PELOTAO'))
  assert.ok(!headers.some((h) => h.startsWith('_') || h === 'qrCode' || h === 'updatedAt'))
})

test('auditoria sem comprovante não desloca as colunas', async () => {
  const { buildAuditCsvData } = await import('./auditData.js')
  const record = { comprovanteId: 'C1', dataHora: '28/09', atletaNumero: '101', atletaChip: 'CH101' }
  const semComprovante = buildAuditCsvData([record], { includeComprovantes: false })
  assert.equal(semComprovante.headers[0], 'DATA_HORA')
  assert.equal(semComprovante.rows[0][0], '28/09')
  assert.equal(semComprovante.rows[0].length, semComprovante.headers.length)
  const comComprovante = buildAuditCsvData([record])
  assert.deepEqual([comComprovante.headers[0], comComprovante.rows[0][0]], ['COMPROVANTE', 'C1'])
})
