import { useRef, useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import CustomSelect from './CustomSelect.jsx'
import {
  buildImportColumnSchema,
  isReservedAthleteCustomField,
} from '../utils/athleteTable.js'
import './AssociarPlanilhasModal.css'

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff5200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CpuChipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 14h3" />
      <path d="M1 9h3" />
      <path d="M1 14h3" />
    </svg>
  )
}

function LinkChainIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function UploadTrayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
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

// Helpers de formatação e parsing
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

async function extractSpreadsheetData(file) {
  if (!file) return { headers: [], rows: [] }

  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    let rawRows = await readXlsxFile(file)
    if (Array.isArray(rawRows) && rawRows.length > 0 && !Array.isArray(rawRows[0]) && Array.isArray(rawRows[0]?.data)) {
      const sheetWithData = rawRows.find((s) => Array.isArray(s?.data) && s.data.length > 0)
      rawRows = sheetWithData ? sheetWithData.data : (rawRows[0]?.data || [])
    }
    const validRows = (rawRows || []).filter((r) => Array.isArray(r) && r.some((c) => c !== null && c !== undefined && String(c).trim() !== ''))
    if (validRows.length === 0) return { headers: [], rows: [] }

    const headers = validRows[0].map((cell) => formatCellValue(cell))
    const rows = validRows.slice(1).map((r) => r.map((c) => formatCellValue(c)))
    return { headers, rows }
  } else {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = String(e.target?.result || '')
        resolve(parseCsvContent(content))
      }
      reader.readAsText(file)
    })
  }
}

export default function AssociarPlanilhasModal({
  isOpen,
  onClose,
  existingAthletes = [],
  onImportSuccess,
}) {
  // Passos: 1 (Uploads & Config), 2 (Pré-visualização), 3 (Concluído)
  const [step, setStep] = useState(1)

  // Planilha 1: Atletas
  const [atletasFile, setAtletasFile] = useState(null)
  const [atletasHeaders, setAtletasHeaders] = useState([])
  const [atletasRows, setAtletasRows] = useState([])
  const [atletasMapping, setAtletasMapping] = useState({
    nome: '',
    doc: '',
    modalidade: '',
    categoria: '',
    sexo: '',
    camiseta: '',
    equipe: '',
    numero: '',
    nascimento: '',
    cidade: '',
  })

  // Planilha 2: Chips
  const [chipsFile, setChipsFile] = useState(null)
  const [chipsHeaders, setChipsHeaders] = useState([])
  const [chipsRows, setChipsRows] = useState([])
  const [chipColIdx, setChipColIdx] = useState(0)
  const [qrColIdx, setQrColIdx] = useState(0)
  const [numeroColIdx, setNumeroColIdx] = useState(0)
  const [kitRows, setKitRows] = useState([])

  // Dados pareados e prévia
  const [associatedList, setAssociatedList] = useState([])

  // Drag states
  const [isDraggingAtletas, setIsDraggingAtletas] = useState(false)
  const [isDraggingChips, setIsDraggingChips] = useState(false)

  const atletasInputRef = useRef(null)
  const chipsInputRef = useRef(null)

  if (!isOpen) return null

  // Auto-detecção de colunas de atletas
  function guessAtletasMapping(headers) {
    const mapping = {
      nome: '',
      doc: '',
      modalidade: '',
      categoria: '',
      sexo: '',
      camiseta: '',
      equipe: '',
      numero: '',
      nascimento: '',
      cidade: '',
    }

    headers.forEach((h, idx) => {
      const lower = String(h || '').toLowerCase()
      if (!mapping.nome && (lower.includes('inscrito') || lower.includes('atleta') || lower.includes('nome'))) {
        mapping.nome = String(idx)
      } else if (!mapping.doc && (lower.includes('cpf') || lower.includes('doc') || lower.includes('documento'))) {
        mapping.doc = String(idx)
      } else if (!mapping.modalidade && (lower.includes('mod') || lower.includes('dist') || lower.includes('percurso') || lower.includes('prova') || lower.includes('corrida') || lower.includes('circuito'))) {
        mapping.modalidade = String(idx)
      } else if (!mapping.categoria && (lower.includes('cat') || lower.includes('faixa'))) {
        mapping.categoria = String(idx)
      } else if (!mapping.sexo && (lower.includes('sex') || lower.includes('gênero') || lower.includes('genero'))) {
        mapping.sexo = String(idx)
      } else if (!mapping.camiseta && (lower.includes('camis') || lower.includes('tamanho'))) {
        mapping.camiseta = String(idx)
      } else if (!mapping.equipe && (lower.includes('equipe') || lower.includes('time') || lower.includes('assessoria'))) {
        mapping.equipe = String(idx)
      } else if (!mapping.nascimento && (lower.includes('nasc') || lower.includes('data') || lower.includes('nascimento') || lower.includes('dt'))) {
        mapping.nascimento = String(idx)
      } else if (!mapping.cidade && (lower.includes('cidade') || lower.includes('municipio') || lower.includes('localidade'))) {
        mapping.cidade = String(idx)
      } else if (!mapping.numero && (lower.includes('peito') || lower.includes('numero') || lower.includes('número') || lower === 'num')) {
        mapping.numero = String(idx)
      }
    })

    return mapping
  }

  // Auto-detecção de coluna de chips e kits
  function guessKitColumn(headers, kind) {
    const normalized = headers.map((h) => String(h || '').toLowerCase())
    if (kind === 'qr') {
      const qrIdx = normalized.findIndex((h) => ['qr', 'código', 'codigo', 'kit'].some((term) => h.includes(term)))
      if (qrIdx >= 0) return qrIdx
      // Se não houver coluna com "qr", sugere a coluna de número de peito por padrão
      const numIdx = normalized.findIndex((h) => ['peito', 'número', 'numero', 'num'].some((term) => h.includes(term)))
      if (numIdx >= 0) return numIdx
      return 0
    }
    if (kind === 'numero') {
      const numIdx = normalized.findIndex((h) => ['peito', 'número', 'numero', 'num'].some((term) => h.includes(term)))
      return numIdx >= 0 ? numIdx : 0
    }
    const chipIdx = normalized.findIndex((h) => ['chip', 'rfid', 'tag', 'crono'].some((term) => h.includes(term)))
    return chipIdx >= 0 ? chipIdx : 0
  }

  // Handle upload Planilha 1 (Atletas)
  async function handleSelectAtletasFile(file) {
    if (!file) return
    try {
      const data = await extractSpreadsheetData(file)
      if (data.headers.length === 0 || data.rows.length === 0) {
        alert('A planilha de atletas selecionada está vazia ou sem dados válidos.')
        return
      }
      setAtletasFile(file)
      setAtletasHeaders(data.headers)
      setAtletasRows(data.rows)
      setAtletasMapping(guessAtletasMapping(data.headers))
    } catch (err) {
      console.error('Erro ao ler planilha de atletas:', err)
      alert('Erro ao carregar planilha de atletas: ' + (err.message || 'formato inválido'))
    }
  }

  // Handle upload Planilha 2 (Chips)
  async function handleSelectChipsFile(file) {
    if (!file) return
    try {
      const data = await extractSpreadsheetData(file)
      if (data.headers.length === 0 || data.rows.length === 0) {
        alert('A planilha de chips selecionada está vazia ou sem dados válidos.')
        return
      }
      setChipsFile(file)
      setChipsHeaders(data.headers)
      setChipsRows(data.rows)
      setChipColIdx(guessKitColumn(data.headers, 'chip'))
      setQrColIdx(guessKitColumn(data.headers, 'qr'))
      setNumeroColIdx(guessKitColumn(data.headers, 'numero'))
    } catch (err) {
      console.error('Erro ao ler planilha de chips:', err)
      alert('Erro ao carregar planilha de chips: ' + (err.message || 'formato inválido'))
    }
  }

  // Executar Associação e Ir para Passo 2 (Prévia)
  function handleGenerateAssociation() {
    if (atletasRows.length === 0) {
      alert('Por favor, carregue a Planilha de Atletas.')
      return
    }
    if (chipsRows.length === 0) {
      alert('Por favor, carregue a Planilha de Chips.')
      return
    }
    if (atletasMapping.nome === '') {
      alert('Selecione a coluna que contém o Nome do Atleta.')
      return
    }

    if (qrColIdx < 0 || numeroColIdx < 0 || chipColIdx < 0) {
      alert('Selecione as colunas correspondentes para a planilha de kits.')
      return
    }

    const importedKits = []
    chipsRows.forEach((row) => {
      const qrVal = String(row[qrColIdx] ?? '').trim()
      const numVal = String(row[numeroColIdx] ?? '').trim()
      const chipVal = String(row[chipColIdx] ?? '').trim()

      // Ignora linha completamente vazia
      if (!qrVal && !numVal && !chipVal) return

      // Se não houver QR code explicitamente separado mas houver número de peito, o QR code é o próprio número
      const finalNum = numVal || qrVal
      const finalQr = qrVal || finalNum
      const finalChip = chipVal || finalNum

      if (finalNum || finalQr) {
        importedKits.push({
          qrCode: finalQr,
          numero: finalNum,
          chip: finalChip,
        })
      }
    })

    if (importedKits.length === 0) {
      alert('Nenhum kit válido encontrado na planilha de kits.')
      return
    }

    const nameCol = Number(atletasMapping.nome)
    const docCol = atletasMapping.doc !== '' ? Number(atletasMapping.doc) : -1
    const modCol = atletasMapping.modalidade !== '' ? Number(atletasMapping.modalidade) : -1
    const catCol = atletasMapping.categoria !== '' ? Number(atletasMapping.categoria) : -1
    const sexCol = atletasMapping.sexo !== '' ? Number(atletasMapping.sexo) : -1
    const camCol = atletasMapping.camiseta !== '' ? Number(atletasMapping.camiseta) : -1
    const eqCol = atletasMapping.equipe !== '' ? Number(atletasMapping.equipe) : -1
    const numCol = atletasMapping.numero !== '' ? Number(atletasMapping.numero) : -1
    const nascCol = atletasMapping.nascimento !== '' ? Number(atletasMapping.nascimento) : -1
    const cidCol = atletasMapping.cidade !== '' ? Number(atletasMapping.cidade) : -1
    const importId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const existingIds = new Set(existingAthletes.map((a) => String(a.id)))
    const pairedAthletes = []

    atletasRows.forEach((row, idx) => {
      const nomeVal = row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : ''
      if (!nomeVal) return // Linha sem nome ignorada

      const id = `${importId}-${idx + 1}`
      const athleteObj = {
        id,
        numero: numCol >= 0 && row[numCol] ? String(row[numCol]).trim() : '',
        chip: '',
        nome: nomeVal,
        doc: docCol >= 0 && row[docCol] ? String(row[docCol]).trim() : '',
        sexo: sexCol >= 0 && row[sexCol] ? String(row[sexCol]).trim() : '',
        camiseta: camCol >= 0 && row[camCol] ? String(row[camCol]).trim() : '',
        equipe: eqCol >= 0 && row[eqCol] ? String(row[eqCol]).trim() : '',
        cidade: cidCol >= 0 && row[cidCol] ? String(row[cidCol]).trim() : '',
        nascimento: nascCol >= 0 && row[nascCol] ? String(row[nascCol]).trim() : '',
        modalidade: modCol >= 0 && row[modCol] ? String(row[modCol]).trim() : '',
        categoria: catCol >= 0 && row[catCol] ? String(row[catCol]).trim() : '',
        morador: '',
        contato: '',
        nacionalidade: '',
        kit: '',
        status: 'PENDENTE',
        createdAt: new Date().toISOString(),
        customFields: {},
        _hasCollision: existingIds.has(id),
      }

      // Preserva automaticamente qualquer coluna adicional da planilha de atletas (como PCD)
      atletasHeaders.forEach((h, colI) => {
        if (
          colI !== nameCol &&
          colI !== docCol &&
          colI !== modCol &&
          colI !== catCol &&
          colI !== sexCol &&
          colI !== camCol &&
          colI !== eqCol &&
          colI !== numCol &&
          colI !== nascCol &&
          colI !== cidCol
        ) {
          const val = row[colI] !== undefined ? String(row[colI]).trim() : ''
          if (h) {
            const hClean = h.trim()
            if (isReservedAthleteCustomField(hClean)) return
            athleteObj.customFields[hClean] = val
            if (val && hClean.toUpperCase().includes('PCD')) {
              athleteObj.pcd = val
            }
          }
        }
      })

      pairedAthletes.push(athleteObj)
    })

    if (pairedAthletes.length === 0) {
      alert('Nenhum atleta pôde ser montado a partir dos dados fornecidos.')
      return
    }

    setAssociatedList(pairedAthletes)
    setKitRows(importedKits)
    setPreviewPage(1)
    setStep(2)
  }

  // Concluir e persistir
  function handleConfirmImport() {
    if (associatedList.length === 0) return

    // Limpar propriedades temporárias
    const cleanList = associatedList.map(({ _hasCollision, ...rest }) => rest)

    if (onImportSuccess) {
      const mappingByColumn = {}
      const standardMappings = {
        nome: 'nome',
        doc: 'doc',
        modalidade: 'modalidade',
        categoria: 'categoria',
        sexo: 'sexo',
        camiseta: 'camiseta',
        equipe: 'equipe',
        numero: 'numero',
        nascimento: 'nascimento',
        cidade: 'cidade',
      }
      Object.entries(standardMappings).forEach(([mappingKey, fieldKey]) => {
        const columnIndex = atletasMapping[mappingKey]
        if (columnIndex !== '') mappingByColumn[Number(columnIndex)] = fieldKey
      })
      atletasHeaders.forEach((header, columnIndex) => {
        if (mappingByColumn[columnIndex] || !header || isReservedAthleteCustomField(header)) return
        mappingByColumn[columnIndex] = `custom:${String(header).trim()}`
      })

      onImportSuccess(cleanList, {
        columns: buildImportColumnSchema(atletasHeaders, mappingByColumn),
        kits: kitRows,
      })
    }

    setStep(3)
  }

  const countAtletas = atletasRows.length
  const countChips = chipsRows.length

  return (
    <div className="associar-modal-backdrop" onClick={onClose}>
      <div className="associar-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="associar-modal-header">
          <div className="associar-header-title-wrap">
            <div className="associar-title-badge">
              <LinkChainIcon />
            </div>
            <div>
              <h2 className="associar-modal-title">IMPORTAR ATLETAS E KITS</h2>
              <p className="associar-modal-subtitle">
                Cadastre atletas e kits separadamente. A associação acontece na leitura do QR Code.
              </p>
            </div>
          </div>
          <button type="button" className="associar-close-btn" onClick={onClose} title="Fechar modal">
            <CloseIcon />
          </button>
        </div>

        {/* STEPPER PILLS */}
        <div className="associar-stepper">
          <div className={`step-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
            <span className="step-num">{step > 1 ? '✓' : '1'}</span>
            <span className="step-label">Arquivos & Colunas</span>
          </div>
          <div className="step-divider" />
          <div className={`step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <span className="step-num">{step > 2 ? '✓' : '2'}</span>
            <span className="step-label">Pré-visualização</span>
          </div>
          <div className="step-divider" />
          <div className={`step-item ${step === 3 ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-label">Conclusão</span>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="associar-modal-body">
          {/* ======================================================== */}
          {/* ETAPA 1: CARREGAR ARQUIVOS & MAPEAMENTO                  */}
          {/* ======================================================== */}
          {step === 1 && (
            <div className="associar-step-container">
              <div className="associar-helper-box">
                <p>
                  <strong>Como funciona:</strong> Importe os dados dos atletas e a planilha de kits com QR Code, número de peito e chip. Nenhum kit será atribuído nesta etapa.
                </p>
              </div>

              {/* DUAL CARDS: ATLETAS vs CHIPS */}
              <div className="associar-dual-grid">
                {/* LADO 1: ATLETAS */}
                <div className="dual-card atletas-card">
                  <div className="dual-card-header">
                    <div className="dual-card-icon users">
                      <UsersIcon />
                    </div>
                    <div>
                      <h4 className="dual-card-title">1. PLANILHA DE ATLETAS</h4>
                      <p className="dual-card-desc">Nomes, CPFs, modalidades e categorias</p>
                    </div>
                  </div>

                  {!atletasFile ? (
                    <div
                      className={`associar-dropzone ${isDraggingAtletas ? 'dragging' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDraggingAtletas(true)
                      }}
                      onDragLeave={() => setIsDraggingAtletas(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDraggingAtletas(false)
                        if (e.dataTransfer.files?.[0]) handleSelectAtletasFile(e.dataTransfer.files[0])
                      }}
                      onClick={() => atletasInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={atletasInputRef}
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleSelectAtletasFile(e.target.files[0])
                        }}
                      />
                      <div className="dropzone-icon">
                        <UploadTrayIcon />
                      </div>
                      <div className="dropzone-text-primary">SELECIONAR ARQUIVO DE ATLETAS</div>
                      <div className="dropzone-text-sub">Arraste ou clique para enviar (.xlsx, .xls, .csv)</div>
                    </div>
                  ) : (
                    <div className="file-loaded-box">
                      <div className="file-loaded-info">
                        <span className="file-name">{atletasFile.name}</span>
                        <span className="badge-count green">✓ {atletasRows.length} atletas detectados</span>
                      </div>
                      <button
                        type="button"
                        className="btn-change-file"
                        onClick={() => {
                          setAtletasFile(null)
                          setAtletasHeaders([])
                          setAtletasRows([])
                        }}
                      >
                        Trocar arquivo
                      </button>

                      {/* Mapeamento de todas as colunas de atletas */}
                      <div className="inline-mapping-area">
                        <div className="mapping-field-item">
                          <label>Coluna do Nome (Obrigatória):</label>
                          <CustomSelect
                            value={atletasMapping.nome}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, nome: val })}
                            options={[
                              { value: '', label: '-- Selecione a coluna --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de CPF / Doc (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.doc}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, doc: val })}
                            options={[
                              { value: '', label: '-- Não mapear CPF --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de Modalidade (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.modalidade}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, modalidade: val })}
                            options={[
                              { value: '', label: '-- Não mapear (usar padrão) --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de Categoria / Faixa (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.categoria}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, categoria: val })}
                            options={[
                              { value: '', label: '-- Não mapear Categoria --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de Camiseta / Tamanho (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.camiseta}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, camiseta: val })}
                            options={[
                              { value: '', label: '-- Não mapear Camiseta --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de Sexo / Gênero (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.sexo}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, sexo: val })}
                            options={[
                              { value: '', label: '-- Não mapear Sexo --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de Equipe / Assessoria (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.equipe}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, equipe: val })}
                            options={[
                              { value: '', label: '-- Não mapear Equipe --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de Nº de Peito (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.numero}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, numero: val })}
                            options={[
                              { value: '', label: '-- Não tem nº de peito ainda --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de Data de Nascimento (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.nascimento}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, nascimento: val })}
                            options={[
                              { value: '', label: '-- Não mapear Nascimento --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        <div className="mapping-field-item">
                          <label>Coluna de Cidade (Opcional):</label>
                          <CustomSelect
                            value={atletasMapping.cidade}
                            onChange={(val) => setAtletasMapping({ ...atletasMapping, cidade: val })}
                            options={[
                              { value: '', label: '-- Não mapear Cidade --' },
                              ...atletasHeaders.map((h, idx) => ({
                                value: String(idx),
                                label: `Coluna ${idx + 1}: ${h || '(Sem título)'}`,
                              })),
                            ]}
                          />
                        </div>

                        {atletasHeaders.length > 0 && (
                          <div className="detected-columns-summary">
                            <span className="sample-label">Todas as colunas da planilha ({atletasHeaders.length}):</span>
                            <div className="detected-columns-tags">
                              {atletasHeaders.map((h, idx) => (
                                <span key={idx} className="detected-col-tag" title={`Coluna ${idx + 1}: ${h}`}>
                                  {h || `Coluna ${idx + 1}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* LADO 2: CHIPS */}
                <div className="dual-card chips-card">
                  <div className="dual-card-header">
                    <div className="dual-card-icon chips">
                      <CpuChipIcon />
                    </div>
                    <div>
                      <h4 className="dual-card-title">2. PLANILHA DE KITS</h4>
                      <p className="dual-card-desc">QR Code, número de peito e chip por linha</p>
                    </div>
                  </div>

                  {!chipsFile ? (
                    <div
                      className={`associar-dropzone ${isDraggingChips ? 'dragging' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDraggingChips(true)
                      }}
                      onDragLeave={() => setIsDraggingChips(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDraggingChips(false)
                        if (e.dataTransfer.files?.[0]) handleSelectChipsFile(e.dataTransfer.files[0])
                      }}
                      onClick={() => chipsInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={chipsInputRef}
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleSelectChipsFile(e.target.files[0])
                        }}
                      />
                      <div className="dropzone-icon">
                        <UploadTrayIcon />
                      </div>
                      <div className="dropzone-text-primary">SELECIONAR ARQUIVO DE KITS</div>
                      <div className="dropzone-text-sub">Arraste ou clique para enviar (.xlsx, .xls, .csv)</div>
                    </div>
                  ) : (
                    <div className="file-loaded-box">
                      <div className="file-loaded-info">
                        <span className="file-name">{chipsFile.name}</span>
                        <span className="badge-count indigo">✓ {chipsRows.length} kits detectados</span>
                      </div>
                      <button
                        type="button"
                        className="btn-change-file"
                        onClick={() => {
                          setChipsFile(null)
                          setChipsHeaders([])
                          setChipsRows([])
                        }}
                      >
                        Trocar arquivo
                      </button>

                      {/* Seleção de coluna do chip */}
                      <div className="inline-mapping-area">
                        <div className="mapping-field-item">
                          <label>Coluna do QR Code impresso no kit:</label>
                          <CustomSelect value={String(qrColIdx)} onChange={(val) => setQrColIdx(Number(val))}
                            options={chipsHeaders.map((h, idx) => ({ value: String(idx), label: `Coluna ${idx + 1}: ${h || `(Coluna ${idx + 1})`}` }))} />
                          <small style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                            (Pode selecionar a mesma coluna do número de peito se o QR Code for o próprio número)
                          </small>
                        </div>
                        <div className="mapping-field-item">
                          <label>Coluna do número de peito:</label>
                          <CustomSelect value={String(numeroColIdx)} onChange={(val) => setNumeroColIdx(Number(val))}
                            options={chipsHeaders.map((h, idx) => ({ value: String(idx), label: `Coluna ${idx + 1}: ${h || `(Coluna ${idx + 1})`}` }))} />
                        </div>
                        <div className="mapping-field-item">
                          <label>Coluna com o Número/Código do Chip:</label>
                          <CustomSelect
                            value={String(chipColIdx)}
                            onChange={(val) => setChipColIdx(Number(val))}
                            options={chipsHeaders.map((h, idx) => ({
                              value: String(idx),
                              label: `Coluna ${idx + 1}: ${h || `(Coluna ${idx + 1})`}`,
                            }))}
                          />
                        </div>

                        {/* Amostra dos primeiros 3 chips */}
                        {chipsRows.length > 0 && (
                          <div className="chip-sample-preview">
                            <span className="sample-label">Amostra dos primeiros chips:</span>
                            <div className="sample-chips-row">
                              {chipsRows.slice(0, 4).map((r, i) => (
                                <span key={i} className="sample-chip-badge">
                                  {r[chipColIdx] || '—'}
                                </span>
                              ))}
                              {chipsRows.length > 4 && <span className="sample-more">+{chipsRows.length - 4} mais</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="associar-modal-actions">
                <button type="button" className="btn-associar-cancel" onClick={onClose}>
                  CANCELAR
                </button>
                <button
                  type="button"
                  className="btn-associar-primary"
                  disabled={!atletasFile || !chipsFile || atletasMapping.nome === ''}
                  onClick={handleGenerateAssociation}
                >
                  <span>AVANÇAR PARA PRÉ-VISUALIZAÇÃO</span>
                  <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 2: PRÉ-VISUALIZAÇÃO COMPLETA DOS DADOS (LAYOUT AMPLO) */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className="associar-step-container">
              {/* STATS CARDS RESUMIDOS */}
              <div className="preview-metrics-grid">
                <div className="preview-metric-card">
                  <span className="metric-label">ATLETAS NA PLANILHA</span>
                  <span className="metric-value">{countAtletas}</span>
                </div>
                <div className="preview-metric-card">
                  <span className="metric-label">KITS NA PLANILHA</span>
                  <span className="metric-value">{countChips}</span>
                </div>
                <div className="preview-metric-card highlight">
                  <span className="metric-label">ASSOCIAÇÕES NESTA IMPORTAÇÃO</span>
                  <span className="metric-value">0 (Leitura no Guichê)</span>
                </div>
              </div>

              {/* CABEÇALHO DA PRÉ-VISUALIZAÇÃO */}
              <div className="importar-full-preview-header" style={{ marginBottom: '10px' }}>
                <div className="live-preview-title-row">
                  <span className="live-preview-title" style={{ fontSize: '13.5px' }}>
                    PRÉ-VISUALIZAÇÃO COMPLETA DOS DADOS ({countAtletas} atletas detectados · {countChips} kits)
                  </span>
                  <span className="live-preview-sub">
                    Confira como todas as colunas da planilha de atletas serão importadas antes de confirmar:
                  </span>
                </div>
              </div>

              {/* TABELA DE PRÉ-VISUALIZAÇÃO COMPLETA */}
              <div className="preview-table-wrap">
                <table className="associar-preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px', position: 'sticky', top: 0, zIndex: 2 }}>#</th>
                      {atletasHeaders.map((header, idx) => {
                        const targetLabel = (() => {
                          const standardMap = {
                            nome: 'NOME COMPLETO',
                            doc: 'DOCUMENTO / CPF',
                            modalidade: 'MODALIDADE',
                            categoria: 'CATEGORIA',
                            sexo: 'SEXO',
                            camiseta: 'CAMISETA',
                            equipe: 'EQUIPE',
                            numero: 'Nº PEITO',
                            nascimento: 'NASCIMENTO',
                            cidade: 'CIDADE',
                          }
                          for (const [key, label] of Object.entries(standardMap)) {
                            if (atletasMapping[key] === String(idx)) return label
                          }
                          return 'CAMPO ADICIONAL'
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
                    {atletasRows.slice(0, 50).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td style={{ fontWeight: 800, color: '#64748b' }}>{rowIdx + 1}</td>
                        {atletasHeaders.map((_, colIdx) => (
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

              {atletasRows.length > 50 && (
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                  Exibindo os primeiros 50 registros de um total de {countAtletas} atletas.
                </p>
              )}

              {/* AÇÕES DA PRÉVIA */}
              <div className="associar-modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="btn-associar-cancel" onClick={() => setStep(1)}>
                  ← VOLTAR E AJUSTAR
                </button>
                <button
                  type="button"
                  className="btn-associar-primary confirm-btn"
                  onClick={handleConfirmImport}
                >
                  <CheckCircleLargeIcon />
                  <span>CONFIRMAR E IMPORTAR {associatedList.length} ATLETAS</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 3: CONCLUSÃO / RESUMO                              */}
          {/* ======================================================== */}
          {step === 3 && (
            <div className="associar-step-container">
              <div className="conclusion-card">
                <div className="conclusion-icon-wrap">
                  <CheckCircleLargeIcon />
                </div>
                <h3 className="conclusion-title">IMPORTAÇÃO CONCLUÍDA!</h3>
                <p className="conclusion-desc">
                  <strong>{associatedList.length} atletas</strong> e <strong>{kitRows.length} kits</strong> foram importados separadamente. A associação será feita pela leitura do QR Code.
                </p>

                <div className="conclusion-details-box">
                  <div className="detail-row">
                    <span>Atletas associados nesta importação:</span>
                    <strong>0</strong>
                  </div>
                  <div className="detail-row">
                    <span>Kits disponíveis:</span>
                    <strong>{kitRows.length}</strong>
                  </div>
                </div>

                <button type="button" className="btn-associar-primary finish-btn" onClick={onClose}>
                  CONCLUIR E VISUALIZAR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
