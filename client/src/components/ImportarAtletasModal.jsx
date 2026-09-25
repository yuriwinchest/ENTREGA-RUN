import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import readXlsxFile from 'read-excel-file/browser'
import CustomSelect from './CustomSelect.jsx'
import {
  buildImportColumnSchema,
  isReservedAthleteCustomField,
} from '../utils/athleteTable.js'
import './ImportarAtletasModal.css'

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function FileTextIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff5200" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function UploadTrayIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff5200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function DownloadSmallIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CheckCircleLargeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

const AVAILABLE_FIELDS = [
  { value: 'ignore', label: 'Não importar' },
  { value: 'numero', label: 'NUMERO DE PEITO' },
  { value: 'chip', label: 'CHIP CRONO' },
  { value: 'nome', label: 'INSCRITO' },
  { value: 'nome_peito', label: 'NOME DE PEITO' },
  { value: 'doc', label: 'CPF' },
  { value: 'sexo', label: 'SEXO' },
  { value: 'camiseta', label: 'CAMISETA' },
  { value: 'equipe', label: 'EQUIPE' },
  { value: 'cidade', label: 'CIDADE' },
  { value: 'nascimento', label: 'DATA NASCIMENTO' },
  { value: 'modalidade', label: 'MODALIDADE' },
  { value: 'categoria', label: 'CATEGORIA' },
  { value: 'morador', label: 'MORADOR/VISITANTE' },
  { value: 'contato', label: 'CONTATO' },
  { value: 'nacionalidade', label: 'NACIONALIDADE' },
  { value: 'kit', label: 'KIT' },
]

export default function ImportarAtletasModal({
  isOpen,
  onClose,
  existingAthletes = [],
  onImportSuccess,
}) {
  // Step 1: Upload / Colar, Step 2: Mapear Colunas, Step 3: Resumo
  const [step, setStep] = useState(1)
  const [rawText, setRawText] = useState('')
  const [parsedHeaders, setParsedHeaders] = useState([])
  const [parsedRows, setParsedRows] = useState([])
  const [columnMapping, setColumnMapping] = useState({})
  const [importStats, setImportStats] = useState({ imported: 0, warnings: [] })
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Campos personalizados dinâmicos (ex: PCD MEMBROS INFERIORES)
  const [customFields, setCustomFields] = useState([])
  const [createFieldModal, setCreateFieldModal] = useState({
    isOpen: false,
    columnIndex: null,
    inputValue: '',
  })

  if (!isOpen) return null

  // Auto detect delimitador (ponto e vírgula ou vírgula)
  function parseCsvContent(content) {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return { headers: [], rows: [] }

    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : ','

    const headers = firstLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim())
    const rows = lines.slice(1).map((line) => {
      return line.split(delimiter).map((cell) => cell.replace(/^["']|["']$/g, '').trim())
    })

    return { headers, rows }
  }

  // Formata célula com suporte a Date, boolean e números
  function formatCellValue(cell) {
    if (cell === null || cell === undefined) return ''
    if (cell instanceof Date && !isNaN(cell.getTime())) {
      const d = String(cell.getUTCDate()).padStart(2, '0')
      const m = String(cell.getUTCMonth() + 1).padStart(2, '0')
      const y = cell.getUTCFullYear()
      return `${d}/${m}/${y}`
    }
    return String(cell).trim()
  }

  // Extrair automaticamente colunas da planilha que não são campos padrão
  function extractDetectedCustomFields(headers) {
    const custom = []
    headers.forEach((h) => {
      const clean = String(h || '').trim()
      if (!clean) return
      const isStandard = AVAILABLE_FIELDS.some(
        (f) =>
          f.value !== 'ignore' &&
          (f.label.toLowerCase() === clean.toLowerCase() || f.value.toLowerCase() === clean.toLowerCase())
      )
      if (!isStandard && !custom.includes(clean)) {
        custom.push(clean)
      }
    })
    return custom
  }

  // Pre-mapping inteligente baseado em nomes comuns de colunas e PCD
  function autoGuessMapping(headers, currentCustom = []) {
    const mapping = {}
    headers.forEach((h, idx) => {
      const lower = String(h || '').toLowerCase().trim()
      const colClean = String(h || '').trim()
      if (lower.includes('peito') && lower.includes('nome')) {
        mapping[idx] = 'nome_peito'
      } else if (lower.includes('peito') || lower.includes('numero') || lower === 'num' || lower.includes('número')) {
        mapping[idx] = 'numero'
      } else if (lower.includes('chip')) {
        mapping[idx] = 'chip'
      } else if (lower.includes('completo') || lower.includes('inscrito') || lower.includes('atleta') || lower === 'nome') {
        mapping[idx] = 'nome'
      } else if (lower.includes('cpf') || lower.includes('doc') || lower.includes('documento')) {
        mapping[idx] = 'doc'
      } else if (lower.includes('sexo') || lower === 'sex' || lower.includes('gênero') || lower.includes('genero')) {
        mapping[idx] = 'sexo'
      } else if (lower.includes('camis') || lower.includes('tamanho')) {
        mapping[idx] = 'camiseta'
      } else if (lower.includes('equipe') || lower.includes('time') || lower.includes('assessoria')) {
        mapping[idx] = 'equipe'
      } else if (lower.includes('cidade') || lower.includes('municipio')) {
        mapping[idx] = 'cidade'
      } else if (lower.includes('nasc') || lower.includes('data')) {
        mapping[idx] = 'nascimento'
      } else if (lower.includes('kit')) {
        mapping[idx] = 'kit'
      } else if (lower.includes('mod') || lower.includes('dist') || lower.includes('percurso') || lower.includes('prova') || lower.includes('corrida') || lower.includes('circuito')) {
        mapping[idx] = 'modalidade'
      } else if (lower.includes('cat') || lower.includes('faixa')) {
        mapping[idx] = 'categoria'
      } else if (lower.includes('morador') || lower.includes('visitante')) {
        mapping[idx] = 'morador'
      } else if (lower.includes('contato') || lower.includes('tel') || lower.includes('cel') || lower.includes('fone')) {
        mapping[idx] = 'contato'
      } else if (lower.includes('pais') || lower.includes('nacionalidade')) {
        mapping[idx] = 'nacionalidade'
      } else if (lower.includes('pcd') || lower.includes('defic') || lower.includes('membro') || lower.includes('especial')) {
        mapping[idx] = `custom:${colClean}`
      } else if (colClean && currentCustom.includes(colClean)) {
        mapping[idx] = `custom:${colClean}`
      } else {
        mapping[idx] = 'ignore'
      }
    })
    return mapping
  }

  function handleCreateCustomField(nameToUse) {
    const name = String(nameToUse || '').trim().toUpperCase()
    if (!name) return ''
    if (isReservedAthleteCustomField(name)) {
      alert(`“${name}” é um campo interno do sistema. Use outro nome para o campo personalizado.`)
      return ''
    }
    setCustomFields((prev) => Array.from(new Set([...prev, name])))
    return name
  }

  function handleConfirmCreateField() {
    const name = createFieldModal.inputValue.trim().toUpperCase()
    if (!name) return
    const cleanName = handleCreateCustomField(name)
    if (!cleanName) return
    if (createFieldModal.columnIndex !== null) {
      setColumnMapping((prev) => ({
        ...prev,
        [createFieldModal.columnIndex]: `custom:${cleanName}`,
      }))
    }
    setCreateFieldModal({ isOpen: false, columnIndex: null, inputValue: '' })
  }

  function handleCancelCreateField() {
    setCreateFieldModal({ isOpen: false, columnIndex: null, inputValue: '' })
  }

  // Download do Modelo CSV
  function handleDownloadModelo() {
    const csvHeader = 'NUMERO;CHIP;NOME;CPF;NASCIMENTO;SEXO;MODALIDADE;CATEGORIA;EQUIPE;CAMISETA;CIDADE;MORADOR;KIT\n'
    const csvRow1 = '101;6001;CARLOS SILVA;123.456.789-00;15/05/1990;Masculino;5 KM;GERAL;RUNNERS;M;SURUBIM;Morador;Kit Padrão\n'
    const csvRow2 = '102;6002;MARIANA COSTA;987.654.321-11;22/08/1995;Feminino;5 KM;GERAL;AVULSO;P;SURUBIM;Morador;Kit Padrão\n'
    const blob = new Blob([csvHeader + csvRow1 + csvRow2], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_importacao_atletas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Leitura de Arquivo (.csv ou .xlsx)
  async function handleFileSelected(file) {
    if (!file) return

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      try {
        let rawRows = await readXlsxFile(file)

        // Se readXlsxFile retornar array de abas [{ sheet: '...', data: [...] }]
        if (Array.isArray(rawRows) && rawRows.length > 0 && !Array.isArray(rawRows[0]) && Array.isArray(rawRows[0]?.data)) {
          const sheetWithData = rawRows.find((s) => Array.isArray(s?.data) && s.data.length > 0)
          rawRows = sheetWithData ? sheetWithData.data : (rawRows[0]?.data || [])
        }

        if (Array.isArray(rawRows) && rawRows.length > 0) {
          // Filtra linhas vazias
          const validRows = rawRows.filter((r) => Array.isArray(r) && r.some((c) => c !== null && c !== undefined && String(c).trim() !== ''))

          if (validRows.length > 0) {
            const headers = validRows[0].map((cell) => formatCellValue(cell))
            const dataRows = validRows.slice(1).map((r) => r.map((c) => formatCellValue(c)))

            // Converte para texto amigável para exibição
            const textPreview = [headers.join(';'), ...dataRows.map((r) => r.join(';'))].join('\n')
            setRawText(textPreview)
            setParsedHeaders(headers)
            setParsedRows(dataRows)
            const detected = extractDetectedCustomFields(headers)
            setCustomFields((prev) => Array.from(new Set([...prev, ...detected])))
            setColumnMapping(autoGuessMapping(headers, detected))
            setStep(2)
          } else {
            alert('A planilha selecionada está vazia.')
          }
        } else {
          alert('Não foi possível extrair dados da planilha Excel.')
        }
      } catch (err) {
        console.error('Erro ao ler Excel:', err)
        alert('Erro ao ler arquivo Excel: ' + (err.message || 'formato inválido'))
      }
    } else {
      // CSV ou texto
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = String(e.target?.result || '')
        setRawText(content)
        const { headers, rows } = parseCsvContent(content)
        setParsedHeaders(headers)
        setParsedRows(rows)
        const detected = extractDetectedCustomFields(headers)
        setCustomFields((prev) => Array.from(new Set([...prev, ...detected])))
        setColumnMapping(autoGuessMapping(headers, detected))
        if (rows.length > 0) {
          setStep(2)
        }
      }
      reader.readAsText(file)
    }
  }

  // Avançar para Etapa 2 (Escolher Colunas)
  function handleGoToStep2() {
    let headers = parsedHeaders
    let rows = parsedRows

    if (headers.length === 0 && rawText.trim()) {
      const parsed = parseCsvContent(rawText)
      headers = parsed.headers
      rows = parsed.rows
      setParsedHeaders(headers)
      setParsedRows(rows)
      const detected = extractDetectedCustomFields(headers)
      setCustomFields((prev) => Array.from(new Set([...prev, ...detected])))
      setColumnMapping(autoGuessMapping(headers, detected))
    }

    if (headers.length === 0) {
      alert('Por favor, selecione um arquivo ou cole o conteúdo da planilha.')
      return
    }

    setStep(2)
  }

  // Executar Importação na Etapa 2
  async function handleExecuteImport() {
    if (importing) return
    setImportError('')
    const warnings = []
    const importedAthletes = []
    const existingMap = new Set(existingAthletes.map((a) => String(a.id)))
    const importId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    parsedRows.forEach((row, rowIdx) => {
      const lineNum = rowIdx + 2 // Linha 1 é cabeçalho

      const athlete = {
        id: '',
        numero: '',
        chip: '',
        nome: '',
        doc: '',
        sexo: '',
        camiseta: '',
        equipe: '',
        cidade: '',
        nascimento: '',
        modalidade: '',
        categoria: '',
        morador: '',
        contato: '',
        nacionalidade: '',
        kit: '',
        status: 'PENDENTE',
        createdAt: new Date().toISOString(),
        customFields: {},
      }

      // Preenche os campos de acordo com o mapeamento
      Object.entries(columnMapping).forEach(([colIdxStr, fieldKey]) => {
        const colIdx = Number(colIdxStr)
        const val = row[colIdx] !== undefined ? String(row[colIdx]).trim() : ''
        const headerLabel = String(parsedHeaders[colIdx] || '').trim()

        if (fieldKey === 'ignore') {
          // PO: nenhum campo da planilha anexada pode ser perdido — a coluna
          // marcada como "Não importar" vira campo personalizado com o nome
          // original do cabeçalho e aparece na grade da aba Atletas.
          if (headerLabel && !isReservedAthleteCustomField(headerLabel)) {
            athlete.customFields[headerLabel] = val
          }
          return
        }

        if (fieldKey.startsWith('custom:')) {
          const customKey = fieldKey.replace('custom:', '').trim()
          if (isReservedAthleteCustomField(customKey)) return
          athlete.customFields[customKey] = val
          if (customKey.toUpperCase().includes('PCD')) {
            athlete.pcd = val
          }
        } else if (val && fieldKey === 'nome') {
          athlete.nome = val.toUpperCase()
        } else if (val && fieldKey === 'nome_peito') {
          athlete.nome_peito = val.toUpperCase()
        } else if (val) {
          athlete[fieldKey] = val
        }
      })

      // Validações
      if (!athlete.nome) {
        warnings.push(`Linha ${lineNum}: Nome ausente.`)
        return
      }

      athlete.id = `${importId}-${lineNum}`
      if (existingMap.has(athlete.id)) {
        warnings.push(`Linha ${lineNum}: identificador de atleta duplicado — ignorada.`)
        return
      }

      existingMap.add(athlete.id)
      importedAthletes.push(athlete)
    })

    if (importedAthletes.length === 0) {
      setImportError(warnings[0] || 'Nenhum atleta válido foi encontrado. Confira o mapeamento das colunas.')
      return
    }

    setImporting(true)
    let saved = false
    try {
      saved = Boolean(await onImportSuccess?.(importedAthletes, {
        isInitialImport: true,
        columns: buildImportColumnSchema(parsedHeaders, columnMapping),
      }))
    } catch {
      saved = false
    } finally {
      setImporting(false)
    }
    if (!saved) {
      setImportError('Não foi possível salvar a planilha no servidor. Confira a conexão e tente novamente.')
      return
    }

    setImportStats({
      imported: importedAthletes.length,
      warnings,
    })

    setStep(4)
  }

  // Concluir e persistir
  function handleFinish() {
    onClose()
  }

  // Reiniciar fluxo para importar outro
  function handleReset() {
    setStep(1)
    setRawText('')
    setParsedHeaders([])
    setParsedRows([])
    setColumnMapping({})
    setImportStats({ imported: 0, warnings: [] })
    setImportError('')
  }

  return (
    <div className="importar-modal-backdrop" onClick={onClose}>
      <div className="importar-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO */}
        <div className="importar-modal-header">
          <div>
            <h2 className="importar-modal-title">IMPORTAR ATLETAS</h2>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginTop: '2px' }}>
              {step === 1 && 'Etapa 1 de 4 — Enviar ou colar arquivo da planilha'}
              {step === 2 && 'Etapa 2 de 4 — Mapeamento de Colunas'}
              {step === 3 && 'Etapa 3 de 4 — Pré-visualização Completa dos Dados'}
              {step === 4 && 'Etapa 4 de 4 — Conclusão da Importação'}
            </span>
          </div>
          <button
            type="button"
            className="importar-close-btn"
            onClick={onClose}
            title="Fechar"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ETAPA 1: SELEÇÃO / COLAGEM (FOTOS 2 E 3) */}
        {step === 1 && (
          <div className="importar-modal-body">
            {/* Box Informativo de Formato */}
            <div className="importar-info-alert">
              <div className="alert-icon-box">
                <FileTextIcon />
              </div>
              <div className="alert-content">
                <strong className="alert-title">
                  Formato aceito: CSV ou XLSX com cabeçalho.
                </strong>
                <p className="alert-desc">
                  No próximo passo você escolhe, coluna por coluna, o que é NÚMERO, CHIP, NOME ATLETA, DATA DE NASCIMENTO, SEXO, DOCUMENTO, CIDADE, MODALIDADE, CATEGORIA, EQUIPE, CAMISA, MORADOR/VISITANTE, CONTATO, NACIONALIDADE e KIT.
                </p>
                <button
                  type="button"
                  className="btn-baixar-modelo"
                  onClick={handleDownloadModelo}
                >
                  <DownloadSmallIcon />
                  <span>BAIXAR MODELO</span>
                </button>
              </div>
            </div>

            {/* Dropzone de Arquivo */}
            <div
              className={`importar-dropzone ${isDragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) handleFileSelected(file)
              }}
            >
              <UploadTrayIcon />
              <span className="dropzone-title">SELECIONAR ARQUIVO CSV OU XLSX</span>
              <span className="dropzone-subtitle">ou cole o conteúdo abaixo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelected(file)
                }}
              />
            </div>

            {/* Textarea para Colar ou Prévia do Conteúdo */}
            <div className="importar-textarea-wrap">
              <textarea
                className="importar-raw-textarea"
                placeholder="Exemplo: NÚMERO;NOME;CPF;MODALIDADE&#10;101;JOÃO SILVA;123.456.789-00;5 KM"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value)
                  const parsed = parseCsvContent(e.target.value)
                  setParsedHeaders(parsed.headers)
                  setParsedRows(parsed.rows)
                  setColumnMapping(autoGuessMapping(parsed.headers))
                }}
              />
            </div>

            {/* Rodapé da Etapa 1 */}
            <div className="importar-modal-actions">
              <button
                type="button"
                className="btn-importar-cancel"
                onClick={onClose}
              >
                CANCELAR
              </button>
              <button
                type="button"
                className="btn-importar-primary"
                onClick={handleGoToStep2}
                disabled={!rawText.trim()}
              >
                <span>ESCOLHER COLUNAS</span>
                <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: MAPEAMENTO DE COLUNAS (FOTO 4) */}
        {step === 2 && (
          <div className="importar-modal-body">
            <p className="mapping-intro-text">
              Associe cada coluna detectada na planilha ao campo correspondente no sistema:
            </p>

            {/* BARRA DE ADICIONAR NOVO CAMPO / PCD */}
            <div className="custom-fields-toolbar">
              <div className="custom-fields-toolbar-info">
                <span className="toolbar-icon">⚡</span>
                <div>
                  <strong>Campos Personalizados & PCD:</strong>
                  <p>Colunas como PCD ou categorias extras podem ser mapeadas diretamente para não perder nenhum dado da planilha.</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-add-custom-field-btn"
                onClick={() =>
                  setCreateFieldModal({
                    isOpen: true,
                    columnIndex: null,
                    inputValue: '',
                  })
                }
              >
                + ADICIONAR NOVO CAMPO / CATEGORIA
              </button>
            </div>

            <div className="columns-mapping-grid">
              {parsedHeaders.map((headerName, idx) => {
                const sampleVal = parsedRows[0]?.[idx] || parsedRows[1]?.[idx] || '—'
                return (
                  <div key={idx} className="column-map-card">
                    <span className="column-source-name">
                      Coluna {idx + 1}: <strong>{headerName || `(sem nome)`}</strong>
                    </span>

                    <CustomSelect
                      className="column-select-field"
                      value={columnMapping[idx] || 'ignore'}
                      onChange={(val) => {
                        if (val === '__ADD_NEW__') {
                          setCreateFieldModal({
                            isOpen: true,
                            columnIndex: idx,
                            inputValue: '',
                          })
                          return
                        }
                        setColumnMapping({
                          ...columnMapping,
                          [idx]: val,
                        })
                      }}
                      groups={[
                        {
                          label: 'Campos Principais do Sistema',
                          options: AVAILABLE_FIELDS.map((opt) => ({
                            value: opt.value,
                            label: opt.label,
                          })),
                        },
                        {
                          label: 'Campos Personalizados / Categorias Extras',
                          options: [
                            ...(headerName && headerName.trim()
                              ? [{ value: `custom:${headerName.trim()}`, label: `✓ Salvar como campo "${headerName.trim()}"` }]
                              : []),
                            ...customFields
                              .filter((cf) => cf !== headerName?.trim())
                              .map((cf) => ({
                                value: `custom:${cf}`,
                                label: `${cf} (Personalizado)`,
                              })),
                          ],
                        },
                        {
                          label: 'Ações',
                          options: [
                            { value: '__ADD_NEW__', label: '+ Criar outro campo personalizado...', isAction: true },
                          ],
                        },
                      ]}
                    />

                    <span className="column-sample-val">
                      Ex.: {sampleVal}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Rodapé da Etapa 2 */}
            <div className="importar-modal-actions">
              <button
                type="button"
                className="btn-importar-cancel"
                onClick={() => setStep(1)}
              >
                VOLTAR
              </button>
              <button
                type="button"
                className="btn-importar-primary"
                onClick={() => setStep(3)}
              >
                <span>AVANÇAR PARA PRÉVIA</span>
                <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: PRÉ-VISUALIZAÇÃO COMPLETA DOS DADOS */}
        {step === 3 && (
          <div className="importar-modal-body">
            <div className="importar-full-preview-header">
              <div className="live-preview-title-row">
                <span className="live-preview-title" style={{ fontSize: '14px' }}>
                  PRÉ-VISUALIZAÇÃO COMPLETA DOS DADOS ({parsedRows.length} atletas detectados)
                </span>
                <span className="live-preview-sub">
                  Confira como as colunas mapeadas serão importadas no sistema antes de confirmar:
                </span>
              </div>
            </div>

            <div className="importar-table-responsive full-screen-preview" style={{ maxHeight: 'calc(75vh - 160px)', minHeight: '320px' }}>
              <table className="importar-preview-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px', position: 'sticky', top: 0, zIndex: 2 }}>#</th>
                    {parsedHeaders.map((header, idx) => {
                      const mapping = columnMapping[idx]
                      const targetLabel = (() => {
                        if (!mapping || mapping === 'ignore') return 'IGNORADA'
                        if (mapping.startsWith('custom:')) return mapping.slice(7)
                        const found = AVAILABLE_FIELDS.find((f) => f.value === mapping)
                        return found ? found.label : mapping
                      })()

                      return (
                        <th key={idx} style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                          <div>{header || `Coluna ${idx + 1}`}</div>
                          <div style={{ fontSize: '10px', color: '#ff5200', marginTop: '2px', fontWeight: 700 }}>
                            → {targetLabel}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 50).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td style={{ fontWeight: 800, color: '#64748b' }}>{rowIdx + 1}</td>
                      {parsedHeaders.map((_, colIdx) => (
                        <td key={colIdx}>
                          {row[colIdx] !== undefined && String(row[colIdx]).trim() !== ''
                            ? String(row[colIdx])
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 50 && (
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                Exibindo os primeiros 50 registros de um total de {parsedRows.length} atletas.
              </p>
            )}

            {/* Rodapé da Etapa 3 */}
            {importError && <p className="kit-scanner-feedback" role="alert">{importError}</p>}
            <div className="importar-modal-actions">
              <button
                type="button"
                className="btn-importar-cancel"
                onClick={() => setStep(2)}
              >
                ← VOLTAR AO MAPEAMENTO
              </button>
              <button
                type="button"
                className="btn-importar-primary"
                onClick={handleExecuteImport}
                disabled={importing}
              >
                <span>{importing ? 'SALVANDO PLANILHA…' : 'CONFIRMAR E IMPORTAR ATLETAS'}</span>
                <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 4: RESUMO DA IMPORTAÇÃO */}
        {step === 4 && (
          <div className="importar-modal-body">
            {/* Card Verde de Sucesso */}
            <div className="import-success-card">
              <div className="success-icon-wrap">
                <CheckCircleLargeIcon />
              </div>
              <div className="success-content">
                <h3 className="success-heading">
                  {importStats.imported} ATLETA(S) IMPORTADO(S)
                </h3>
                <p className="success-subtext">
                  A gravação foi confirmada e os atletas já aparecem na consulta.
                </p>
              </div>
            </div>

            {/* Card Âmbar de Avisos */}
            {importStats.warnings.length > 0 && (
              <div className="import-warnings-card">
                <div className="warnings-header">
                  <AlertTriangleIcon />
                  <span className="warnings-title">
                    {importStats.warnings.length} AVISO(S)
                  </span>
                </div>

                <ul className="warnings-list-scroll">
                  {importStats.warnings.map((warn, i) => (
                    <li key={i} className="warning-list-item">
                      • {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rodapé da Etapa 4 */}
            <div className="importar-modal-actions">
              <button
                type="button"
                className="btn-importar-cancel"
                onClick={handleReset}
              >
                IMPORTAR OUTRO
              </button>
              <button
                type="button"
                className="btn-importar-primary"
                onClick={handleFinish}
              >
                CONCLUIR
              </button>
            </div>
          </div>
        )}
      </div>

      {createFieldModal.isOpen &&
        createPortal(
          <div
            className="custom-field-modal-backdrop"
            onClick={handleCancelCreateField}
          >
            <div
              className="custom-field-modal-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cfm-title"
            >
              <div className="cfm-header">
                <div className="cfm-title-wrap">
                  <div className="cfm-icon-badge">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5200" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <h3 id="cfm-title" className="cfm-title">NOVA CATEGORIA / CAMPO</h3>
                    <span className="cfm-subtitle">Personalize uma coluna para importar</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="cfm-close-btn"
                  onClick={handleCancelCreateField}
                  aria-label="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="cfm-body">
                <label className="cfm-label" htmlFor="cfm-input">
                  Nome do campo ou categoria extra:
                </label>
                <input
                  id="cfm-input"
                  type="text"
                  className="cfm-input"
                  placeholder="Ex: PCD MEMBROS INFERIORES"
                  value={createFieldModal.inputValue}
                  onChange={(e) =>
                    setCreateFieldModal((prev) => ({
                      ...prev,
                      inputValue: e.target.value.toUpperCase(),
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleConfirmCreateField()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      handleCancelCreateField()
                    }
                  }}
                  autoFocus
                />

                <div className="cfm-suggestions">
                  <span className="cfm-suggestions-title">Sugestões rápidas:</span>
                  <div className="cfm-pills">
                    {['PCD', 'TAMANHO TÊNIS', 'CIDADE NATAL', 'GRUPO SANGUÍNEO', 'CATEGORIA EXTRA'].map((pill) => (
                      <button
                        key={pill}
                        type="button"
                        className="cfm-pill-btn"
                        onClick={() =>
                          setCreateFieldModal((prev) => ({
                            ...prev,
                            inputValue: pill,
                          }))
                        }
                      >
                        + {pill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cfm-footer">
                <button
                  type="button"
                  className="cfm-btn-cancel"
                  onClick={handleCancelCreateField}
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  className="cfm-btn-confirm"
                  disabled={!createFieldModal.inputValue.trim()}
                  onClick={handleConfirmCreateField}
                >
                  <span>CRIAR E APLICAR</span>
                  <span className="cfm-btn-arrow">→</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
