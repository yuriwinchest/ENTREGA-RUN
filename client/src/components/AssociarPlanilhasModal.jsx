import { useRef, useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import CustomSelect from './CustomSelect.jsx'
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

function AlertTriangleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ShuffleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.7" />
      <path d="m18 14 4 4-4 4" />
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
  })

  // Planilha 2: Chips
  const [chipsFile, setChipsFile] = useState(null)
  const [chipsHeaders, setChipsHeaders] = useState([])
  const [chipsRows, setChipsRows] = useState([])
  const [chipColIdx, setChipColIdx] = useState(0)

  // Configurações de Associação
  const [modoAssociacao, setModoAssociacao] = useState('sequencial') // 'sequencial' | 'aleatorio'
  const [regraNumeroPeito, setRegraNumeroPeito] = useState('usar_chip') // 'usar_chip' | 'sequencial' | 'manter_planilha'

  // Dados pareados e prévia
  const [associatedList, setAssociatedList] = useState([])
  const [previewFilter, setPreviewFilter] = useState('')
  const [previewPage, setPreviewPage] = useState(1)
  const previewPerPage = 15

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
      } else if (!mapping.numero && (lower.includes('peito') || lower.includes('numero') || lower.includes('número') || lower === 'num')) {
        mapping.numero = String(idx)
      }
    })

    return mapping
  }

  // Auto-detecção de coluna de chips
  function guessChipColumn(headers) {
    let bestIdx = 0
    headers.forEach((h, idx) => {
      const lower = String(h || '').toLowerCase()
      if (lower.includes('chip') || lower.includes('rfid') || lower.includes('tag') || lower.includes('código') || lower.includes('codigo')) {
        bestIdx = idx
      }
    })
    return bestIdx
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
      setChipColIdx(guessChipColumn(data.headers))
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

    // Extrair lista de chips válidos
    const extractedChips = chipsRows
      .map((r) => (r[chipColIdx] !== undefined ? String(r[chipColIdx]).trim() : ''))
      .filter(Boolean)

    if (extractedChips.length === 0) {
      alert('Nenhum chip válido foi encontrado na coluna selecionada da planilha de chips.')
      return
    }

    // Prepara os chips conforme modo (sequencial ou aleatório)
    let chipsPool = [...extractedChips]
    if (modoAssociacao === 'aleatorio') {
      // Fisher-Yates shuffle
      for (let i = chipsPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[chipsPool[i], chipsPool[j]] = [chipsPool[j], chipsPool[i]]
      }
    }

    const nameCol = Number(atletasMapping.nome)
    const docCol = atletasMapping.doc !== '' ? Number(atletasMapping.doc) : -1
    const modCol = atletasMapping.modalidade !== '' ? Number(atletasMapping.modalidade) : -1
    const catCol = atletasMapping.categoria !== '' ? Number(atletasMapping.categoria) : -1
    const sexCol = atletasMapping.sexo !== '' ? Number(atletasMapping.sexo) : -1
    const camCol = atletasMapping.camiseta !== '' ? Number(atletasMapping.camiseta) : -1
    const eqCol = atletasMapping.equipe !== '' ? Number(atletasMapping.equipe) : -1
    const numCol = atletasMapping.numero !== '' ? Number(atletasMapping.numero) : -1

    const existingNums = new Set(existingAthletes.map((a) => String(a.numero || a.id)))
    const pairedAthletes = []

    atletasRows.forEach((row, idx) => {
      const nomeVal = row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : ''
      if (!nomeVal) return // Linha sem nome ignorada

      const assignedChip = chipsPool[idx] || ''

      // Determinar número de peito
      let numeroPeito = ''
      if (numCol >= 0 && row[numCol]) {
        numeroPeito = String(row[numCol]).trim()
      } else if (regraNumeroPeito === 'usar_chip' && assignedChip) {
        numeroPeito = assignedChip
      } else if (regraNumeroPeito === 'sequencial') {
        numeroPeito = String(idx + 1)
      } else {
        numeroPeito = assignedChip || String(idx + 1)
      }

      const athleteObj = {
        id: numeroPeito || `atl-${Date.now()}-${idx + 1}`,
        numero: numeroPeito,
        chip: assignedChip,
        nome: nomeVal,
        doc: docCol >= 0 && row[docCol] ? String(row[docCol]).trim() : '',
        sexo: sexCol >= 0 && row[sexCol] ? String(row[sexCol]).trim() : 'Masculino',
        camiseta: camCol >= 0 && row[camCol] ? String(row[camCol]).trim() : 'M',
        equipe: eqCol >= 0 && row[eqCol] ? String(row[eqCol]).trim() : '—',
        cidade: '',
        nascimento: '',
        modalidade: modCol >= 0 && row[modCol] ? String(row[modCol]).trim() : '5 KM',
        categoria: catCol >= 0 && row[catCol] ? String(row[catCol]).trim() : 'GERAL',
        morador: 'Visitante',
        contato: '',
        nacionalidade: 'BRASIL',
        kit: 'Kit Padrão',
        status: 'PENDENTE',
        createdAt: new Date().toISOString(),
        customFields: {},
        _hasCollision: existingNums.has(String(numeroPeito)),
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
          colI !== numCol
        ) {
          const val = row[colI] !== undefined ? String(row[colI]).trim() : ''
          if (val && h) {
            const hClean = h.trim()
            athleteObj.customFields[hClean] = val
            athleteObj[hClean] = val
            if (hClean.toUpperCase().includes('PCD')) {
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
    setPreviewPage(1)
    setStep(2)
  }

  // Concluir e persistir
  function handleConfirmImport() {
    if (associatedList.length === 0) return

    // Limpar propriedades temporárias
    const cleanList = associatedList.map(({ _hasCollision, ...rest }) => rest)

    if (onImportSuccess) {
      onImportSuccess(cleanList)
    }

    setStep(3)
  }

  // Filtragem de prévia
  const filteredPreview = associatedList.filter((item) => {
    if (!previewFilter.trim()) return true
    const q = previewFilter.trim().toLowerCase()
    return (
      item.nome.toLowerCase().includes(q) ||
      item.chip.toLowerCase().includes(q) ||
      String(item.numero).toLowerCase().includes(q) ||
      item.doc.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filteredPreview.length / previewPerPage) || 1
  const currentPageItems = filteredPreview.slice((previewPage - 1) * previewPerPage, previewPage * previewPerPage)

  const countAtletas = atletasRows.length
  const countChips = chipsRows.length
  const countAssociados = associatedList.filter((a) => a.chip).length

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
              <h2 className="associar-modal-title">ASSOCIAR PLANILHAS (ATLETAS + CHIPS)</h2>
              <p className="associar-modal-subtitle">
                Junte a planilha de corredores com a lista de chips de cronometragem de forma automática.
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
                  <strong>Como funciona a associação:</strong> Você carrega uma planilha contendo os dados dos atletas (nomes, CPFs, modalidades) e outra planilha com os números/códigos dos chips. O sistema associa cada chip a um atleta sequencialmente ou por sorteio.
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

                      {/* Mapeamento de colunas principais de atletas */}
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
                          <label>Coluna de Nº de Peito (Se já existir):</label>
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
                      <h4 className="dual-card-title">2. PLANILHA DE CHIPS</h4>
                      <p className="dual-card-desc">Números de chips, tags RFID ou sequências</p>
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
                      <div className="dropzone-text-primary">SELECIONAR ARQUIVO DE CHIPS</div>
                      <div className="dropzone-text-sub">Arraste ou clique para enviar (.xlsx, .xls, .csv)</div>
                    </div>
                  ) : (
                    <div className="file-loaded-box">
                      <div className="file-loaded-info">
                        <span className="file-name">{chipsFile.name}</span>
                        <span className="badge-count indigo">✓ {chipsRows.length} chips detectados</span>
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
                                  #{r[chipColIdx] || '—'}
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

              {/* OPÇÕES DE REGRAS DE ASSOCIAÇÃO */}
              <div className="association-settings-card">
                <h4 className="settings-title">CONFIGURAÇÕES DA JUNÇÃO</h4>
                <div className="settings-grid">
                  <div className="setting-option">
                    <span className="setting-label">Ordem de Associação:</span>
                    <div className="radio-group">
                      <label className="radio-card">
                        <input
                          type="radio"
                          name="modoAssociacao"
                          value="sequencial"
                          checked={modoAssociacao === 'sequencial'}
                          onChange={() => setModoAssociacao('sequencial')}
                        />
                        <div className="radio-card-content">
                          <strong>Sequencial (1 para 1)</strong>
                          <span>O 1º atleta recebe o 1º chip, o 2º recebe o 2º chip, etc.</span>
                        </div>
                      </label>

                      <label className="radio-card">
                        <input
                          type="radio"
                          name="modoAssociacao"
                          value="aleatorio"
                          checked={modoAssociacao === 'aleatorio'}
                          onChange={() => setModoAssociacao('aleatorio')}
                        />
                        <div className="radio-card-content">
                          <strong>
                            <ShuffleIcon /> Sorteio / Aleatório
                          </strong>
                          <span>Embaralha os chips antes de associá-los aos corredores.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="setting-option">
                    <span className="setting-label">Número de Peito (se não constar na lista):</span>
                    <div className="radio-group">
                      <label className="radio-card">
                        <input
                          type="radio"
                          name="regraNumeroPeito"
                          value="usar_chip"
                          checked={regraNumeroPeito === 'usar_chip'}
                          onChange={() => setRegraNumeroPeito('usar_chip')}
                        />
                        <div className="radio-card-content">
                          <strong>Mesmo valor do Chip</strong>
                          <span>O atleta recebe o número do próprio chip como número de peito.</span>
                        </div>
                      </label>

                      <label className="radio-card">
                        <input
                          type="radio"
                          name="regraNumeroPeito"
                          value="sequencial"
                          checked={regraNumeroPeito === 'sequencial'}
                          onChange={() => setRegraNumeroPeito('sequencial')}
                        />
                        <div className="radio-card-content">
                          <strong>Sequencial (1, 2, 3...)</strong>
                          <span>Gera número de peito em sequência crescente a partir de 1.</span>
                        </div>
                      </label>
                    </div>
                  </div>
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
          {/* ETAPA 2: PRÉ-VISUALIZAÇÃO & VALIDAÇÃO                    */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className="associar-step-container">
              {/* STATS CARDS */}
              <div className="preview-metrics-grid">
                <div className="preview-metric-card">
                  <span className="metric-label">ATLETAS NA PLANILHA</span>
                  <span className="metric-value">{countAtletas}</span>
                </div>
                <div className="preview-metric-card">
                  <span className="metric-label">CHIPS NA PLANILHA</span>
                  <span className="metric-value">{countChips}</span>
                </div>
                <div className="preview-metric-card highlight">
                  <span className="metric-label">PARES ASSOCIADOS</span>
                  <span className="metric-value">{countAssociados}</span>
                </div>
              </div>

              {/* ALERTA DE DIFERENÇA DE QUANTIDADES */}
              {countAtletas > countChips && (
                <div className="preview-alert-warning">
                  <AlertTriangleIcon />
                  <div>
                    <strong>Atenção: Existem mais atletas do que chips!</strong>
                    <p>
                      A planilha possui {countAtletas} atletas e apenas {countChips} chips. Os últimos{' '}
                      <strong>{countAtletas - countChips} atletas</strong> ficarão com o chip em branco (poderá ser atribuído manualmente na entrega).
                    </p>
                  </div>
                </div>
              )}

              {countChips > countAtletas && (
                <div className="preview-alert-info">
                  <div className="info-icon-badge">ℹ</div>
                  <div>
                    <strong>Chips sobressalentes disponíveis</strong>
                    <p>
                      Existem {countChips} chips para {countAtletas} atletas. Os {countChips - countAtletas} chips restantes não serão atribuídos nesta importação.
                    </p>
                  </div>
                </div>
              )}

              {/* BARRA DE BUSCA NA PRÉVIA */}
              <div className="preview-table-header-bar">
                <div className="preview-search-wrap">
                  <input
                    type="text"
                    placeholder="Filtrar atletas na pré-visualização (nome, chip, doc)..."
                    value={previewFilter}
                    onChange={(e) => {
                      setPreviewFilter(e.target.value)
                      setPreviewPage(1)
                    }}
                  />
                </div>
                <span className="preview-count-label">
                  Exibindo {currentPageItems.length} de {filteredPreview.length} registros
                </span>
              </div>

              {/* TABELA DE PRÉ-VISUALIZAÇÃO */}
              <div className="preview-table-wrap">
                <table className="associar-preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px' }}>#</th>
                      <th>ATLETA</th>
                      <th>DOCUMENTO / CPF</th>
                      <th>MODALIDADE</th>
                      <th>Nº PEITO</th>
                      <th>CHIP VINCULADO</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageItems.map((item, idx) => {
                      const globalIdx = (previewPage - 1) * previewPerPage + idx + 1
                      return (
                        <tr key={idx} className={item._hasCollision ? 'has-collision' : ''}>
                          <td className="idx-col">{globalIdx}</td>
                          <td className="nome-col">
                            <strong>{item.nome}</strong>
                          </td>
                          <td>{item.doc || '—'}</td>
                          <td>
                            <span className="mod-pill">{item.modalidade}</span>
                          </td>
                          <td>
                            <span className="peito-pill">{item.numero || '—'}</span>
                          </td>
                          <td>
                            {item.chip ? (
                              <span className="chip-badge-linked">
                                <CpuChipIcon />
                                <strong>{item.chip}</strong>
                              </span>
                            ) : (
                              <span className="chip-badge-empty">Sem chip</span>
                            )}
                          </td>
                          <td>
                            {item._hasCollision ? (
                              <span className="status-pill warning" title="Número de peito já existe na base">
                                Atualizará existente
                              </span>
                            ) : (
                              <span className="status-pill ok">Novo atleta</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINAÇÃO */}
              {totalPages > 1 && (
                <div className="preview-pagination-row">
                  <button
                    type="button"
                    className="btn-page"
                    disabled={previewPage === 1}
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <span className="page-indicator">
                    Página {previewPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-page"
                    disabled={previewPage === totalPages}
                    onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Próxima
                  </button>
                </div>
              )}

              {/* AÇÕES DA PRÉVIA */}
              <div className="associar-modal-actions">
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
                <h3 className="conclusion-title">ASSOCIAÇÃO CONCLUÍDA COM SUCESSO!</h3>
                <p className="conclusion-desc">
                  <strong>{associatedList.length} atletas</strong> foram importados e vinculados aos respectivos chips de cronometragem.
                </p>

                <div className="conclusion-details-box">
                  <div className="detail-row">
                    <span>Atletas com chip atribuído:</span>
                    <strong>{countAssociados}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Modo utilizado:</span>
                    <strong>{modoAssociacao === 'aleatorio' ? 'Sorteio / Aleatório' : 'Sequencial Direto (1 para 1)'}</strong>
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
