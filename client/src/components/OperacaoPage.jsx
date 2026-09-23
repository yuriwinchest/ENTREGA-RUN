import { useEffect, useState, useMemo, useRef } from 'react'
import Sidebar from './Sidebar.jsx'
import EspelhoModal from './EspelhoModal.jsx'
import ImportarAtletasModal from './ImportarAtletasModal.jsx'
import AssociarPlanilhasModal from './AssociarPlanilhasModal.jsx'
import CustomSelect from './CustomSelect.jsx'
import {
  enrichAuditRecords,
  exportCsvFile,
  filterAuditRecords,
  getAuditOperatorOptions,
  getAuditTimestamp,
  openAuditReportPrint,
} from '../utils/auditData.js'
import {
  buildAthleteDetailDraft,
  hasAthleteDetailChanges,
  matchesAthleteReference,
  normalizeAthleteDetail,
} from '../utils/athleteDetail.js'
import {
  compareAthleteNumbers,
  getAthleteColumnWidth,
  getAthleteTableColumns,
  getAthleteTableValue,
  mergeAthleteColumnSchemas,
} from '../utils/athleteTable.js'
import AthleteQrModal from './AthleteQrModal.jsx'
import { apiFetchAthletes, apiSaveAthletes } from '../utils/eventsApi.js'
import './OperacaoPage.css'

function QrCodeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
}

function getNextAthleteNumber(athleteList) {
  if (!Array.isArray(athleteList) || athleteList.length === 0) return '1'
  let max = 0
  for (const a of athleteList) {
    const raw = String(a?.numero || '').trim()
    const num = parseInt(raw.replace(/\D/g, ''), 10)
    if (!Number.isNaN(num) && num > max) {
      max = num
    }
  }
  return String(max + 1)
}

function HelpCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function UsersTabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BarChartTabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}


function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5200" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function PercentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5200" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function TrendingUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function CancelIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function PrinterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" />
    </svg>
  )
}

function TableSpreadsheetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="3" x2="21" y1="15" y2="15" />
      <line x1="9" x2="9" y1="3" y2="21" />
      <line x1="15" x2="15" y1="3" y2="21" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

function LinkSpreadsheetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function FilterFunnelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function FilePdfIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13v4" />
      <path d="M12 13v4" />
      <path d="M15 13v4" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1 .45-1 1v1h12v-1c0-.55-.45-1-1-1h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12a2 2 0 0 1 2 2v3a6 6 0 0 1-12 0V6a2 2 0 0 1 2-2Z" />
    </svg>
  )
}


const INITIAL_ATHLETE_FORM = {
  nome: '',
  cpf: '',
  nascimento: '',
  sexo: 'Masculino',
  modalidade: '5 KM',
  categoria: 'GERAL',
  equipe: '',
  camiseta: 'M',
  kit: 'Kit Padrão',
  numero: '',
  chip: '',
}

export default function OperacaoPage({
  event,
  user,
  onUpdateEvent,
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  const userRole = user?.role || 'ADMIN'
  const isOperator = userRole === 'OPERADOR'
  const isAdmin = userRole === 'ADMIN'

  const [activeTab, setActiveTab] = useState('entrega')
  const effectiveTab = (!isAdmin && activeTab === 'auditoria') ? 'entrega' : activeTab
  const [kitSearch, setKitSearch] = useState('')
  const [atletaSearch, setAtletaSearch] = useState('')
  const [atletaFilter, setAtletaFilter] = useState('TODOS')
  const [atletaPage, setAtletaPage] = useState(1)
  const ATHLETES_PER_PAGE = 10

  // Modal Novo Atleta
  const [showAddAthleteModal, setShowAddAthleteModal] = useState(false)
  const [athleteForm, setAthleteForm] = useState(INITIAL_ATHLETE_FORM)
  const [qrModalAthlete, setQrModalAthlete] = useState(null)

  // Modal Espelho (Acesso e Aparência)
  const [showEspelhoModal, setShowEspelhoModal] = useState(false)

  // Selected athlete for detailed kit delivery view (Photo reference)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [detailSourceTab, setDetailSourceTab] = useState(null)
  const [detailForm, setDetailForm] = useState(null)
  const [detailInitialForm, setDetailInitialForm] = useState(null)
  const [detailFeedback, setDetailFeedback] = useState('')
  const [detailActionInProgress, setDetailActionInProgress] = useState(false)
  const detailActionLockRef = useRef(false)
  const deliveryLocksRef = useRef(new Set())
  const tableResponsiveRef = useRef(null)
  const tableDragRef = useRef({ x: 0, y: 0, moved: false, time: 0 })

  function handleTablePointerDown(e) {
    const startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const startY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    tableDragRef.current = {
      x: startX,
      y: startY,
      moved: false,
      time: Date.now(),
    }

    function onMove(moveEvt) {
      const curX = moveEvt.clientX ?? moveEvt.touches?.[0]?.clientX ?? 0
      const curY = moveEvt.clientY ?? moveEvt.touches?.[0]?.clientY ?? 0
      if (Math.abs(curX - startX) > 6 || Math.abs(curY - startY) > 6) {
        tableDragRef.current.moved = true
      }
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('touchend', onUp)
      if (tableDragRef.current.moved) {
        window.setTimeout(() => {
          tableDragRef.current = { x: 0, y: 0, moved: false, time: 0 }
        }, 300)
      } else {
        tableDragRef.current.time = 0
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('touchend', onUp, { passive: true })
  }

  function handleRowClick(e, athleteNumero) {
    if (tableDragRef.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    handleOpenAthleteDetail(athleteNumero)
  }

  const detailHasChanges = useMemo(
    () => hasAthleteDetailChanges(detailInitialForm, detailForm),
    [detailInitialForm, detailForm]
  )

  const currentEvent = useMemo(() => event || {
    id: '',
    name: 'SELECIONE UM EVENTO',
    date: '',
    dateInput: '',
    location: '',
    total: 0,
    entregues: 0,
    pendentes: 0,
    concl: '0.0%',
  }, [event])

  // Load and manage athletes per event with localStorage persistence
  const [athletes, setAthletes] = useState(() => {
    try {
      if (!currentEvent.id) return []
      const saved = localStorage.getItem(`entregas_run_athletes_${currentEvent.id}`)
      if (saved) return JSON.parse(saved)
      return []
    } catch {
      return []
    }
  })

  const [athleteColumnSchema, setAthleteColumnSchema] = useState(() => {
    try {
      if (!currentEvent.id) return []
      const saved = localStorage.getItem(`entregas_run_athlete_columns_${currentEvent.id}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Save athletes to localStorage e sincroniza com o servidor central
  useEffect(() => {
    try {
      if (currentEvent.id) {
        localStorage.setItem(
          `entregas_run_athletes_${currentEvent.id}`,
          JSON.stringify(athletes)
        )
      }
    } catch {
      // ignore
    }

    if (currentEvent.id && Array.isArray(athletes) && athletes.length > 0) {
      const timer = setTimeout(() => {
        apiSaveAthletes(currentEvent.id, athletes, athleteColumnSchema).catch(() => {})
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [athletes, athleteColumnSchema, currentEvent.id])

  useEffect(() => {
    try {
      if (currentEvent.id) {
        localStorage.setItem(
          `entregas_run_athlete_columns_${currentEvent.id}`,
          JSON.stringify(athleteColumnSchema)
        )
      }
    } catch {
      // ignore
    }
  }, [athleteColumnSchema, currentEvent.id])

  // Se este navegador ainda não tem os atletas deste evento salvos localmente, busca da API central
  useEffect(() => {
    let isMounted = true
    if (currentEvent.id && athletes.length === 0) {
      apiFetchAthletes(currentEvent.id).then((result) => {
        if (isMounted && result && Array.isArray(result.athletes) && result.athletes.length > 0) {
          setAthletes(result.athletes)
          if (Array.isArray(result.schema) && result.schema.length > 0) {
            setAthleteColumnSchema(result.schema)
          }
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [currentEvent.id, athletes.length])

  const athleteTableColumns = useMemo(
    () => getAthleteTableColumns(athletes, athleteColumnSchema),
    [athletes, athleteColumnSchema]
  )

  const shirtOptions = useMemo(() => {
    const unique = new Set()
    athletes.forEach((a) => {
      if (a.camiseta && String(a.camiseta).trim() !== '' && a.camiseta !== '—') {
        unique.add(String(a.camiseta).trim().toUpperCase())
      }
    })
    if (unique.size === 0) {
      return ['PP', 'P', 'M', 'G', 'GG', 'XG', 'INFANTIL', 'BABY LOOK M']
    }
    return Array.from(unique)
  }, [athletes])

  const availableStandardColumns = useMemo(() => {
    const ignored = new Set(['status', 'entregueEm', 'entreguePor', 'entreguePara'])
    const standard = athleteTableColumns.filter(
      (col) => col.type === 'standard' && !ignored.has(col.key)
    )
    if (standard.length === 0) {
      return [
        { key: 'numero', label: 'NÚMERO', required: true, type: 'standard' },
        { key: 'nome', label: 'NOME COMPLETO', required: true, type: 'standard' },
        { key: 'doc', label: 'DOCUMENTO / CPF', type: 'standard' },
        { key: 'modalidade', label: 'MODALIDADE', type: 'standard' },
        { key: 'categoria', label: 'CATEGORIA', type: 'standard' },
        { key: 'camiseta', label: 'CAMISETA', type: 'standard' },
        { key: 'kit', label: 'KIT', type: 'standard' },
        { key: 'chip', label: 'CHIP', type: 'standard' },
      ]
    }
    return standard
  }, [athleteTableColumns])

  const availableCustomColumns = useMemo(() => {
    return athleteTableColumns.filter((col) => col.type === 'custom' && col.customKey)
  }, [athleteTableColumns])

  function handleOpenAddAthleteModal() {
    if (isOperator) return
    const nextNum = getNextAthleteNumber(athletes)
    const initialCustom = {}
    availableCustomColumns.forEach((c) => {
      initialCustom[c.customKey] = ''
    })

    setAthleteForm({
      numero: nextNum,
      nome: '',
      doc: '',
      chip: '',
      nascimento: '',
      sexo: 'Masculino',
      modalidade: athletes[0]?.modalidade || '5 KM',
      categoria: athletes[0]?.categoria || 'GERAL',
      camiseta: shirtOptions[0] || 'M',
      kit: athletes[0]?.kit || 'Kit Padrão',
      equipe: '',
      cidade: '',
      morador: 'Morador',
      contato: '',
      nome_peito: '',
      customFields: initialCustom,
    })
    setShowAddAthleteModal(true)
  }

  // Deliveries list: sempre ordenado de forma crescente por número de peito (1, 2, 3...)
  const [deliveries, setDeliveries] = useState(() => {
    try {
      if (!currentEvent.id) return []
      const saved = localStorage.getItem(`entregas_run_deliveries_${currentEvent.id}`)
      let list = []
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          list = parsed
        }
      }

      // Reconciliação imediata na montagem com atletas já entregues no storage
      const savedAthletes = localStorage.getItem(`entregas_run_athletes_${currentEvent.id}`)
      if (savedAthletes) {
        const athletesList = JSON.parse(savedAthletes)
        const existingIds = new Set(list.map((d) => String(d.id)))
        for (const a of athletesList) {
          if (a.status === 'ENTREGUE' && !existingIds.has(String(a.numero))) {
            list.push({
              id: a.numero,
              name: a.nome,
              doc: a.doc,
              category: a.categoria || 'GERAL',
              size: a.camiseta || 'M',
              kit: a.kit || 'Kit Padrão',
              time: a.entregueEm || 'Entregue',
              dataHora: a.entregueEm || new Date().toLocaleString('pt-BR'),
            })
            existingIds.add(String(a.numero))
          }
        }
      }

      return list.sort((a, b) => compareAthleteNumbers(a.id, b.id))
    } catch {
      return []
    }
  })

  // Save deliveries to localStorage
  useEffect(() => {
    try {
      if (currentEvent.id) {
        localStorage.setItem(
          `entregas_run_deliveries_${currentEvent.id}`,
          JSON.stringify(deliveries)
        )
      }
    } catch {
      // ignore
    }
  }, [deliveries, currentEvent.id])

  // Reactive, dynamic event metrics based on true athlete dataset
  const totalAthletes = athletes.length > 0 ? athletes.length : (currentEvent.total || 0)
  const deliveredAthletes = athletes.length > 0
    ? athletes.filter((a) => String(a.status || '').toUpperCase() === 'ENTREGUE').length
    : (currentEvent.entregues || 0)
  const pendingAthletes = Math.max(0, totalAthletes - deliveredAthletes)
  const percentDone = totalAthletes > 0
    ? ((deliveredAthletes / totalAthletes) * 100).toFixed(1) + '%'
    : '0.0%'

  // Synchronize event metrics with parent state / localStorage
  useEffect(() => {
    if (!currentEvent.id || !onUpdateEvent) return
    if (
      currentEvent.total !== totalAthletes ||
      currentEvent.entregues !== deliveredAthletes ||
      currentEvent.pendentes !== pendingAthletes ||
      currentEvent.concl !== percentDone
    ) {
      onUpdateEvent({
        ...currentEvent,
        total: totalAthletes,
        entregues: deliveredAthletes,
        pendentes: pendingAthletes,
        concl: percentDone,
      })
    }
  }, [
    totalAthletes,
    deliveredAthletes,
    pendingAthletes,
    percentDone,
    currentEvent,
    onUpdateEvent,
  ])

  // Dynamic breakdown of Camisetas (Total, Entregues, Pendentes)
  const camisetaStats = useMemo(() => {
    const map = {}
    athletes.forEach((a) => {
      const raw = (a.camiseta || a.tamanho || a['TAMANHO'] || a['CAMISETA'] || 'M').trim().toUpperCase()
      if (!map[raw]) {
        map[raw] = { size: raw, total: 0, entregues: 0, pendentes: 0, conclPercent: 0 }
      }
      map[raw].total++
      if (String(a.status || '').toUpperCase() === 'ENTREGUE') {
        map[raw].entregues++
      }
    })
    const order = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EXG', 'BL P', 'BL M', 'BL G', 'BL GG', 'INFANTIL', 'SEM CAMISETA']
    return Object.values(map)
      .map((item) => ({
        ...item,
        pendentes: Math.max(0, item.total - item.entregues),
        conclPercent: item.total > 0 ? Math.round((item.entregues / item.total) * 100) : 0,
      }))
      .sort((a, b) => {
        const idxA = order.indexOf(a.size)
        const idxB = order.indexOf(b.size)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.size.localeCompare(b.size)
      })
  }, [athletes])

  // Dynamic breakdown of Modalidades (Total, Entregues, Pendentes)
  const modalidadeStats = useMemo(() => {
    const map = {}
    athletes.forEach((a) => {
      const raw = (
        a.modalidade ||
        a.distancia ||
        a.percurso ||
        a.prova ||
        a['MODALIDADE'] ||
        a['DISTANCIA'] ||
        a['PERCURSO'] ||
        a['PROVA'] ||
        a.categoria ||
        'GERAL'
      ).trim().toUpperCase()

      if (!map[raw]) {
        map[raw] = { name: raw, total: 0, entregues: 0, pendentes: 0, conclPercent: 0 }
      }
      map[raw].total++
      if (String(a.status || '').toUpperCase() === 'ENTREGUE') {
        map[raw].entregues++
      }
    })
    return Object.values(map)
      .map((item) => ({
        ...item,
        pendentes: Math.max(0, item.total - item.entregues),
        conclPercent: item.total > 0 ? Math.round((item.entregues / item.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [athletes])

  // Operators state
  const [operators, setOperators] = useState(() => [
    {
      id: user?.id || 'admin_pacetime',
      name: user?.name || 'FELIPE',
      role: user?.role || 'ADMIN',
      avatar: (user?.name || 'F')[0].toUpperCase(),
      count: 0,
    },
  ])

  // Modal Importar Planilha
  const [showImportModal, setShowImportModal] = useState(false)

  // Modal Associar Planilhas (Atletas + Chips)
  const [showAssociarModal, setShowAssociarModal] = useState(false)

  // Auditoria state
  const [audits, setAudits] = useState(() => {
    try {
      if (!currentEvent.id) return []
      const saved = localStorage.getItem(`entregas_run_audits_${currentEvent.id}`)
      let list = saved ? JSON.parse(saved) : []

      // Reconciliação imediata na montagem: busca atletas já entregues no storage
      const savedAthletes = localStorage.getItem(`entregas_run_athletes_${currentEvent.id}`)
      if (savedAthletes) {
        const athletesList = JSON.parse(savedAthletes)
        const deliveredAthletes = athletesList.filter((a) => a.status === 'ENTREGUE')
        const existingAuditNums = new Set(list.map((item) => String(item.atletaNumero)))
        const missingAudits = []

        for (const athlete of deliveredAthletes) {
          if (!existingAuditNums.has(String(athlete.numero))) {
            missingAudits.push({
              id: `aud-${Date.now()}-${athlete.numero}`,
              comprovanteId: `CPR-${Math.floor(100000 + Math.random() * 900000)}`,
              dataHora: athlete.entregueEm || new Date().toLocaleString('pt-BR'),
              timestamp: getAuditTimestamp({ dataHora: athlete.entregueEm }) ?? Date.now(),
              atletaNumero: athlete.numero,
              atletaNome: athlete.nome,
              atletaCpf: athlete.doc || '—',
              atletaChip: athlete.chip || '',
              tipo: athlete.entreguePara && athlete.entreguePara.trim().toUpperCase() !== athlete.nome.trim().toUpperCase() ? 'TERCEIRO' : 'ATLETA',
              retiradoPor: athlete.entreguePara || athlete.nome,
              operadorNome: athlete.entreguePor || user?.name || 'Felipe Admin',
              operadorEmail: user?.email || 'pacetime@entregas.com',
              pontoEntrega: 'Guichê Principal',
              kit: athlete.kit || 'Kit Padrão',
              camiseta: athlete.camiseta || 'M',
              modalidade: athlete.modalidade || '5 KM',
              status: 'ENTREGUE',
              eventId: currentEvent.id,
            })
          }
        }
        if (missingAudits.length > 0) {
          list = [...missingAudits, ...list]
        }
      }
      return list
    } catch {
      return []
    }
  })

  // Sync audits to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`entregas_run_audits_${currentEvent.id}`, JSON.stringify(audits))
    } catch {
      // ignore
    }
  }, [audits, currentEvent.id])

  // Sincroniza e garante que qualquer atleta entregue possua registro na Auditoria
  useEffect(() => {
    if (!currentEvent.id || !athletes.length) return
    const deliveredAthletes = athletes.filter((a) => a.status === 'ENTREGUE')
    if (deliveredAthletes.length === 0) return

    // oxlint-disable-next-line react/set-state-in-effect
    setAudits((prev) => {
      const existingAuditNums = new Set(prev.map((item) => String(item.atletaNumero)))
      const missingAudits = []

      for (const athlete of deliveredAthletes) {
        if (!existingAuditNums.has(String(athlete.numero))) {
          const nowStr = athlete.entregueEm || new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })

          missingAudits.push({
            id: `aud-${Date.now()}-${athlete.numero}`,
            comprovanteId: `CPR-${Math.floor(100000 + Math.random() * 900000)}`,
            dataHora: nowStr,
            timestamp: getAuditTimestamp({ dataHora: nowStr }) ?? Date.now(),
            atletaNumero: athlete.numero,
            atletaNome: athlete.nome,
            atletaCpf: athlete.doc || '—',
            atletaChip: athlete.chip || '',
            tipo: athlete.entreguePara && athlete.entreguePara.trim().toUpperCase() !== athlete.nome.trim().toUpperCase() ? 'TERCEIRO' : 'ATLETA',
            retiradoPor: athlete.entreguePara || athlete.nome,
            operadorNome: athlete.entreguePor || user?.name || 'Felipe Admin',
            operadorEmail: user?.email || 'pacetime@entregas.com',
            pontoEntrega: 'Guichê Principal',
            kit: athlete.kit || 'Kit Padrão',
            camiseta: athlete.camiseta || 'M',
            modalidade: athlete.modalidade || '5 KM',
            status: 'ENTREGUE',
            eventId: currentEvent.id,
          })
        }
      }

      if (missingAudits.length > 0) {
        return [...missingAudits, ...prev]
      }
      return prev
    })
  }, [athletes, currentEvent.id, user])

  // Filter controls
  const [auditSearch, setAuditSearch] = useState('')
  const [auditOperatorFilter, setAuditOperatorFilter] = useState('TODOS')
  const [auditTypeFilter, setAuditTypeFilter] = useState('TODOS')
  const [auditPeriod, setAuditPeriod] = useState('TODOS')
  const [auditMatchMode, setAuditMatchMode] = useState('contem')
  const [auditIncludeComprovantes, setAuditIncludeComprovantes] = useState(true)
  const [auditPerPage, setAuditPerPage] = useState(50)
  const [auditPage, setAuditPage] = useState(1)

  // Selected comprovante modal / preview
  const [selectedComprovante, setSelectedComprovante] = useState(null)

  function handleImportSuccess(newAthletes, options = {}) {
    if (Array.isArray(options.columns) && options.columns.length > 0) {
      setAthleteColumnSchema((current) =>
        mergeAthleteColumnSchemas(current, options.columns)
      )
    }

    setAthletes((prev) => {
      const existingMap = new Map(prev.map((a) => [String(a.numero || a.id), a]))
      for (const a of newAthletes) {
        existingMap.set(String(a.numero || a.id), a)
      }
      const updated = Array.from(existingMap.values())
      try {
        localStorage.setItem(`entregas_run_athletes_${currentEvent.id}`, JSON.stringify(updated))
        if (options?.isInitialImport) {
          localStorage.setItem(`entregas_run_original_athletes_${currentEvent.id}`, JSON.stringify(updated))
        }
      } catch {
        // ignore
      }
      return updated
    })

    const importedDelivered = (newAthletes || []).filter((a) => a.status === 'ENTREGUE')
    if (importedDelivered.length > 0) {
      setDeliveries((prev) => {
        const existingIds = new Set(prev.map((d) => String(d.id)))
        const merged = [...prev]
        for (const a of importedDelivered) {
          if (!existingIds.has(String(a.numero))) {
            merged.push({
              id: a.numero,
              name: a.nome,
              doc: a.doc,
              category: a.categoria || 'GERAL',
              size: a.camiseta || 'M',
              kit: a.kit || 'Kit Padrão',
              time: a.entregueEm || 'Entregue',
              dataHora: a.entregueEm || new Date().toLocaleString('pt-BR'),
            })
            existingIds.add(String(a.numero))
          }
        }
        return merged.sort((a, b) => compareAthleteNumbers(a.id, b.id))
      })
    }
  }

  function handleRestoreOriginalAthletes() {
    try {
      const saved = localStorage.getItem(`entregas_run_original_athletes_${currentEvent.id}`)
      if (!saved) {
        alert('Nenhuma planilha base original arquivada para este evento.')
        return
      }
      const originalList = JSON.parse(saved)
      if (
        window.confirm(
          `Deseja restaurar a planilha base original com ${originalList.length} atletas? As alterações e associações atuais de chips serão revertidas para a planilha original.`
        )
      ) {
        setAthletes(originalList)
        localStorage.setItem(`entregas_run_athletes_${currentEvent.id}`, JSON.stringify(originalList))
        alert('Planilha base original restaurada com sucesso!')
      }
    } catch (err) {
      console.error('Erro ao restaurar planilha original:', err)
    }
  }

  function handleExportPlanilha() {
    const filename = `planilha_geral_${(currentEvent?.name || 'evento').toLowerCase().replace(/\s+/g, '_')}.csv`
    try {
      exportCsvFile(athletes, filename)
    } catch {
      window.alert('Não foi possível baixar a planilha geral. Tente novamente e verifique se o navegador bloqueou o download.')
    }
  }

  function handleExportAuditsCsv() {
    const filename = `auditoria_entregas_${(currentEvent?.name || 'evento').toLowerCase().replace(/\s+/g, '_')}.csv`
    const headers = [
      'DATA_HORA',
      'NUMERO',
      'CHIP',
      'ATLETA',
      'CPF',
      'TIPO',
      'RETIRADO_POR',
      'OPERADOR',
      'PONTO_ENTREGA',
      'KIT',
      'CAMISETA',
      'MODALIDADE',
    ]
    if (auditIncludeComprovantes) headers.unshift('COMPROVANTE')

    const rows = filteredAudits.map((a) => {
      const row = [
      a.dataHora || '',
      a.atletaNumero || '',
      a.atletaChip || '',
      a.atletaNome || '',
      a.atletaCpf || '',
      a.tipo || '',
      a.retiradoPor || '',
      a.operadorNome || '',
      a.pontoEntrega || '',
      a.kit || '',
      a.camiseta || '',
      a.modalidade || '',
      ]
      if (auditIncludeComprovantes) row.unshift(a.comprovanteId || '')
      return row
    })

    try {
      exportCsvFile(filename, headers, rows)
    } catch {
      window.alert('Não foi possível exportar as entregas filtradas. Tente novamente.')
    }
  }

  function handlePrintAuditPdf() {
    if (filteredAudits.length === 0) {
      window.alert('Não há entregas para gerar o relatório com os filtros atuais.')
      return
    }
    const opened = openAuditReportPrint({
      eventName: currentEvent?.name,
      records: filteredAudits,
      filterSummary: auditFilterSummary,
      includeComprovantes: auditIncludeComprovantes,
    })
    if (!opened) {
      window.alert('O navegador bloqueou a janela do relatório. Libere pop-ups para gerar o PDF.')
    }
  }

  const enrichedAudits = useMemo(
    () => enrichAuditRecords(audits, athletes),
    [audits, athletes]
  )

  const auditOperatorOptions = useMemo(
    () => getAuditOperatorOptions(enrichedAudits, operators),
    [enrichedAudits, operators]
  )

  // A tabela, os cards, o CSV e o PDF consomem exatamente o mesmo resultado.
  const filteredAudits = filterAuditRecords({
    audits: enrichedAudits,
    search: auditSearch,
    operator: auditOperatorFilter,
    type: auditTypeFilter,
    period: auditPeriod,
    matchMode: auditMatchMode,
  })

  const auditFilterSummary = [
    auditSearch.trim() ? `Busca: ${auditSearch.trim()}` : null,
    auditOperatorFilter !== 'TODOS' ? `Operador: ${auditOperatorFilter}` : 'Todos os operadores',
    auditPeriod !== 'TODOS' ? `Período: ${auditPeriod}` : 'Todo o período',
    auditTypeFilter !== 'TODOS' ? `Tipo: ${auditTypeFilter}` : null,
  ].filter(Boolean).join(' · ')

  // Metrics calculations
  const totalAuditsCount = filteredAudits.length
  const atletaAuditsCount = filteredAudits.filter((a) => a.tipo === 'ATLETA').length
  const terceiroAuditsCount = filteredAudits.filter((a) => a.tipo === 'TERCEIRO').length

  const atletaPercent = totalAuditsCount > 0 ? ((atletaAuditsCount / totalAuditsCount) * 100).toFixed(1) : '0.0'
  const terceiroPercent = totalAuditsCount > 0 ? ((terceiroAuditsCount / totalAuditsCount) * 100).toFixed(1) : '0.0'

  // Top operator
  const operatorCounts = {}
  for (const a of filteredAudits) {
    const op = a.operadorNome || 'OPERADOR'
    operatorCounts[op] = (operatorCounts[op] || 0) + 1
  }
  let topOperatorName = '—'
  let topOperatorCount = totalAuditsCount
  let topOperatorPercent = '100.0'
  const opEntries = Object.entries(operatorCounts).sort((a, b) => b[1] - a[1])
  if (opEntries.length > 0) {
    topOperatorName = opEntries[0][0]
    topOperatorCount = opEntries[0][1]
    topOperatorPercent = totalAuditsCount > 0 ? ((topOperatorCount / totalAuditsCount) * 100).toFixed(1) : '100.0'
  }

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAudits.length / auditPerPage))
  const currentPage = Math.min(auditPage, totalPages)
  const startIndex = (currentPage - 1) * auditPerPage
  const endIndex = Math.min(startIndex + auditPerPage, filteredAudits.length)
  const paginatedAudits = filteredAudits.slice(startIndex, endIndex)

  // Espelho público: publica a ficha aberta/entregue no servidor para
  // a segunda tela (/espelho/:id) exibir em qualquer aparelho.
  function publishEspelho(status, atleta = null) {
    publishEspelhoState(currentEvent.id, {
      status,
      eventName: currentEvent.name,
      atleta,
    })
  }

  // Open Athlete Detail View
  function handleOpenAthleteDetail(athleteId) {
    const athlete = athletes.find(
      (a) => String(a.numero) === String(athleteId) || String(a.id) === String(athleteId)
    )

    if (athlete) {
      setSelectedAthlete(athlete)
      const draft = buildAthleteDetailDraft(athlete)
      setDetailForm(draft)
      setDetailInitialForm(buildAthleteDetailDraft(athlete))
    } else {
      // Fallback if opened from delivery item not yet in athletes
      const deliveryItem = deliveries.find((d) => String(d.id) === String(athleteId))
      const fallbackAthlete = {
        id: String(athleteId),
        numero: String(athleteId),
        nome: deliveryItem?.name || 'ATLETA',
        doc: deliveryItem?.doc || '',
        nascimento: '',
        sexo: '',
        modalidade: deliveryItem?.modalidade || '',
        categoria: deliveryItem?.category || 'GERAL',
        equipe: '',
        nacionalidade: '',
        kit: deliveryItem?.kit || '',
        camiseta: deliveryItem?.size || '',
        chip: '',
        morador: '',
        contato: '',
        entreguePara: deliveryItem?.name || 'ATLETA',
        entregueEm: deliveryItem?.dataHora || '',
        entreguePor: '',
        status: deliveryItem ? 'ENTREGUE' : 'PENDENTE',
      }
      setSelectedAthlete(fallbackAthlete)
      setDetailForm(buildAthleteDetailDraft(fallbackAthlete))
      setDetailInitialForm(buildAthleteDetailDraft(fallbackAthlete))
    }
    setDetailFeedback('')
    setDetailSourceTab(activeTab)
    setActiveTab('entrega')
    publishEspelho('ATENDENDO', selectedAthlete)
  }

  function closeAthleteDetail({ force = false } = {}) {
    if (!force && detailHasChanges) {
      const shouldDiscard = window.confirm(
        'Existem alterações não salvas. Deseja descartar e voltar para a lista?'
      )
      if (!shouldDiscard) return false
    }

    const returnTab = detailSourceTab
    setSelectedAthlete(null)
    setDetailForm(null)
    setDetailInitialForm(null)
    setDetailFeedback('')
    setDetailSourceTab(null)
    if (returnTab && returnTab !== 'entrega') {
      setActiveTab(returnTab)
    }
    publishEspelho('LIVRE')
    return true
  }

  function handleGuardedNavigate(page, id) {
    if (!closeAthleteDetail()) return
    onNavigate(page, id)
  }

  function handleGuardedLogout() {
    if (!closeAthleteDetail()) return
    onLogout()
  }

  function handleOperationTabChange(tab) {
    if (tab !== 'entrega' && !closeAthleteDetail()) return
    setActiveTab(tab)
  }

  function persistDetailDraft({ showFeedback = true } = {}) {
    if (isOperator || !detailForm || !selectedAthlete) return null

    const normalized = normalizeAthleteDetail(selectedAthlete, detailForm)
    if (!normalized.nome) {
      window.alert('Informe o nome do atleta antes de salvar.')
      return null
    }
    if (!normalized.numero) {
      window.alert('Informe o número do atleta antes de salvar.')
      return null
    }

    const duplicatedNumber = athletes.some(
      (athlete) =>
        !matchesAthleteReference(athlete, selectedAthlete) &&
        String(athlete.numero) === String(normalized.numero)
    )
    if (duplicatedNumber) {
      window.alert(`O número ${normalized.numero} já pertence a outro atleta.`)
      return null
    }

    setAthletes((prev) => {
      let found = false
      const updated = prev.map((athlete) => {
        if (!matchesAthleteReference(athlete, selectedAthlete)) return athlete
        found = true
        return normalized
      })
      return found ? updated : [normalized, ...updated]
    })

    setDeliveries((prev) => {
      const updated = prev.map((delivery) => {
        if (String(delivery.id) !== String(selectedAthlete.numero)) return delivery
        return {
          ...delivery,
          id: normalized.numero,
          name: normalized.nome,
          doc: normalized.doc,
          category: normalized.categoria,
          size: normalized.camiseta,
          kit: normalized.kit,
        }
      })
      return updated.sort((a, b) => compareAthleteNumbers(a.id, b.id))
    })

    const recipient = normalized.entreguePara || normalized.nome
    setAudits((prev) =>
      prev.map((item) => {
        if (String(item.atletaNumero) !== String(selectedAthlete.numero)) return item
        return {
          ...item,
          atletaNumero: normalized.numero,
          atletaNome: normalized.nome,
          atletaCpf: normalized.doc || item.atletaCpf,
          atletaChip: normalized.chip,
          retiradoPor: recipient,
          tipo: recipient.trim().toUpperCase() !== normalized.nome.trim().toUpperCase()
            ? 'TERCEIRO'
            : 'ATLETA',
          kit: normalized.kit || item.kit,
          camiseta: normalized.camiseta || item.camiseta,
          modalidade: normalized.modalidade || item.modalidade,
        }
      })
    )

    const savedDraft = buildAthleteDetailDraft(normalized)
    setSelectedAthlete(normalized)
    setDetailForm(savedDraft)
    setDetailInitialForm(buildAthleteDetailDraft(normalized))
    publishEspelho(normalized.status === 'ENTREGUE' ? 'ENTREGUE' : 'ATENDENDO', normalized)
    if (showFeedback) {
      setDetailFeedback(
        normalized.status === 'ENTREGUE'
          ? 'Alterações salvas e histórico atualizado.'
          : 'Alterações salvas. O kit continua pendente.'
      )
    }
    return normalized
  }

  // Save changes from Detail View without recording a kit delivery.
  function handleSaveDetail(e) {
    if (e) e.preventDefault()
    if (detailActionLockRef.current || !detailHasChanges) return

    detailActionLockRef.current = true
    setDetailActionInProgress(true)
    try {
      persistDetailDraft()
    } finally {
      window.setTimeout(() => {
        detailActionLockRef.current = false
        setDetailActionInProgress(false)
      }, 0)
    }
  }

  // Fluxo definido pelo PO: ao editar qualquer campo, a entrega fica
  // bloqueada até salvar; sem alterações pendentes, a entrega é liberada.
  const detailHasPendingEdits = detailHasChanges
  const deliverBlockedByEdits = !isOperator && detailHasPendingEdits

  // Revert / Undo Delivery
  function handleUndoDelivery() {
    if (isOperator) return
    if (!selectedAthlete) return

    // Mark athlete as PENDENTE
    setAthletes((prev) =>
      prev.map((a) => {
        if (String(a.numero) === String(selectedAthlete.numero) || String(a.id) === String(selectedAthlete.id)) {
          return { ...a, status: 'PENDENTE' }
        }
        return a
      })
    )

    // Remove from deliveries
    setDeliveries((prev) =>
      prev.filter((d) => String(d.id) !== String(selectedAthlete.numero))
    )

    // Remove do histórico de Auditoria
    setAudits((prev) =>
      prev.filter((item) => String(item.atletaNumero) !== String(selectedAthlete.numero))
    )

    // Recalculate metrics
    const newEntregues = Math.max(0, (currentEvent.entregues || 0) - 1)
    const newPendentes = (currentEvent.pendentes || 0) + 1
    const totalCount = currentEvent.total || athletes.length
    const conclRate = totalCount > 0
      ? ((newEntregues / totalCount) * 100).toFixed(1) + '%'
      : '0.0%'

    if (onUpdateEvent) {
      onUpdateEvent({
        ...currentEvent,
        entregues: newEntregues,
        pendentes: newPendentes,
        concl: conclRate,
      })
    }

    setSelectedAthlete(null)
    setDetailForm(null)
    setDetailInitialForm(null)
    setDetailFeedback('')
    publishEspelho('LIVRE')
  }

  // Handle Add Athlete Submission (Dinâmico para Tabela Importada / Associada)
  function handleCreateAthlete(e) {
    e.preventDefault()
    if (isOperator) return
    const num = String(athleteForm.numero || '').trim()
    const nome = String(athleteForm.nome || '').trim().toUpperCase()

    if (!num || !nome) {
      alert('Por favor, informe ao menos o Número e o Nome do atleta.')
      return
    }

    const newAthlete = {
      id: `ath-${Date.now()}`,
      numero: num,
      nome,
      doc: (athleteForm.doc || athleteForm.cpf || '—').trim(),
      nascimento: (athleteForm.nascimento || '').trim(),
      sexo: athleteForm.sexo || 'Masculino',
      modalidade: (athleteForm.modalidade || '5 KM').trim(),
      categoria: (athleteForm.categoria || 'GERAL').trim(),
      equipe: athleteForm.equipe?.trim() ? athleteForm.equipe.trim().toUpperCase() : 'SEM EQUIPE',
      camiseta: athleteForm.camiseta || 'M',
      kit: (athleteForm.kit || 'Kit Padrão').trim(),
      chip: (athleteForm.chip || '').trim(),
      cidade: (athleteForm.cidade || '').trim(),
      morador: (athleteForm.morador || 'Morador').trim(),
      contato: (athleteForm.contato || '').trim(),
      nome_peito: (athleteForm.nome_peito || '').trim(),
      customFields: { ...(athleteForm.customFields || {}) },
      status: 'PENDENTE',
      createdAt: new Date().toISOString(),
    }

    if (athleteForm.customFields) {
      Object.entries(athleteForm.customFields).forEach(([k, v]) => {
        if (k.toUpperCase().includes('PCD')) {
          newAthlete.pcd = v
        }
      })
    }

    // Inserção no final da lista (vai para o último da tabela existente, ex: 301)
    const updatedAthletes = [...athletes, newAthlete]
    setAthletes(updatedAthletes)

    // Update event totals
    const newTotal = (currentEvent.total || 0) + 1
    const newPendentes = (currentEvent.pendentes || 0) + 1
    const conclRate = newTotal > 0
      ? (((currentEvent.entregues || 0) / newTotal) * 100).toFixed(1) + '%'
      : '0.0%'

    if (onUpdateEvent) {
      onUpdateEvent({
        ...currentEvent,
        total: newTotal,
        pendentes: newPendentes,
        concl: conclRate,
      })
    }

    // Sincroniza atômica com o servidor central
    if (currentEvent?.id) {
      apiSaveAthletes(currentEvent.id, updatedAthletes, athleteColumnSchema).catch(() => {})
    }

    setShowAddAthleteModal(false)
  }

  // Deliver kit to an athlete directly
  function handleDeliverKit(athlete, sourceAthlete = athlete) {
    if (!athlete) return null
    if (athlete.status === 'ENTREGUE') {
      return audits.find((a) => String(a.atletaNumero) === String(athlete.numero))
    }

    const deliveryKey = String(sourceAthlete?.id ?? sourceAthlete?.numero ?? athlete.numero)
    if (deliveryLocksRef.current.has(deliveryKey)) return null
    deliveryLocksRef.current.add(deliveryKey)

    const now = new Date()
    const dataHoraFormatada = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    const opName = user?.name || 'Felipe Admin'
    const opEmail = user?.email || 'pacetime@entregas.com'
    const recipient = String(athlete.entreguePara || athlete.nome).trim()

    // Mark athlete as ENTREGUE
    setAthletes((prev) =>
      prev.map((a) =>
        matchesAthleteReference(a, sourceAthlete) || String(a.numero) === String(athlete.numero)
          ? {
              ...a,
              ...athlete,
              status: 'ENTREGUE',
              entregueEm: dataHoraFormatada,
              entreguePor: opName,
              entreguePara: recipient,
            }
          : a
      )
    )

    // Add delivery record (mantendo a lista sempre em ordem numérica crescente)
    const newDelivery = {
      id: athlete.numero,
      name: athlete.nome,
      doc: athlete.doc,
      category: athlete.categoria,
      size: athlete.camiseta,
      kit: athlete.kit,
      time: 'Agora',
      dataHora: dataHoraFormatada,
    }
    setDeliveries((prev) => {
      const next = [newDelivery, ...prev.filter((d) => String(d.id) !== String(newDelivery.id))]
      return next.sort((a, b) => compareAthleteNumbers(a.id, b.id))
    })

    // Registra na Auditoria
    const newAudit = {
      id: `aud-${Date.now()}-${athlete.numero}`,
      comprovanteId: `CPR-${Math.floor(100000 + Math.random() * 900000)}`,
      dataHora: dataHoraFormatada,
      timestamp: Date.now(),
      atletaNumero: athlete.numero,
      atletaNome: athlete.nome,
      atletaCpf: athlete.doc || '—',
      atletaChip: athlete.chip || '',
      tipo: recipient.toUpperCase() !== athlete.nome.trim().toUpperCase() ? 'TERCEIRO' : 'ATLETA',
      retiradoPor: recipient,
      operadorNome: opName,
      operadorEmail: opEmail,
      pontoEntrega: 'Guichê Principal',
      kit: athlete.kit || 'Kit Padrão',
      camiseta: athlete.camiseta || 'M',
      modalidade: athlete.modalidade || '5 KM',
      status: 'ENTREGUE',
      eventId: currentEvent.id,
    }
    setAudits((prev) => [newAudit, ...prev])

    // Update metrics
    const newEntregues = (currentEvent.entregues || 0) + 1
    const newPendentes = Math.max(0, (currentEvent.pendentes || 0) - 1)
    const newTotal = currentEvent.total || athletes.length
    const conclRate = newTotal > 0
      ? ((newEntregues / newTotal) * 100).toFixed(1) + '%'
      : '0.0%'

    // Increment logged-in operator delivery count
    setOperators((prev) =>
      prev.map((op) => (op.name === 'FELIPE' || op.name.toLowerCase() === opName.toLowerCase() ? { ...op, count: op.count + 1 } : op))
    )

    if (onUpdateEvent) {
      onUpdateEvent({
        ...currentEvent,
        entregues: newEntregues,
        pendentes: newPendentes,
        concl: conclRate,
      })
    }

    window.setTimeout(() => {
      deliveryLocksRef.current.delete(deliveryKey)
    }, 0)

    publishEspelho('ENTREGUE', {
      ...athlete,
      camiseta: newAudit.camiseta,
      kit: newAudit.kit,
      modalidade: newAudit.modalidade,
    })

    return newAudit
  }

  function handleSaveAndDeliver({ print = false } = {}) {
    if (detailActionLockRef.current || !selectedAthlete) return

    detailActionLockRef.current = true
    setDetailActionInProgress(true)
    try {
      const sourceAthlete = selectedAthlete
      const athleteToDeliver = isOperator
        ? selectedAthlete
        : persistDetailDraft({ showFeedback: false })
      if (!athleteToDeliver) return

      const auditRecord = handleDeliverKit(athleteToDeliver, sourceAthlete)
      if (!auditRecord) return

      closeAthleteDetail({ force: true })
      if (print) handleOpenComprovante(auditRecord)
    } finally {
      window.setTimeout(() => {
        detailActionLockRef.current = false
        setDetailActionInProgress(false)
      }, 0)
    }
  }

  // Abre modal do comprovante (2 vias) para um atleta ou registro de auditoria
  function handleOpenComprovante(target) {
    if (!target) return
    if (target.comprovanteId) {
      setSelectedComprovante(target)
      return
    }
    const found = audits.find(
      (a) => String(a.atletaNumero) === String(target.numero || target.id)
    )
    if (found) {
      setSelectedComprovante(found)
      return
    }
    const opName = user?.name || 'Felipe Admin'
    const opEmail = user?.email || 'pacetime@entregas.com'
    const fallbackAudit = {
      id: `aud-${Date.now()}-${target.numero || target.id}`,
      comprovanteId: `CPR-${Math.floor(100000 + Math.random() * 900000)}`,
      dataHora: target.entregueEm || new Date().toLocaleString('pt-BR'),
      timestamp: Date.now(),
      atletaNumero: target.numero || target.id,
      atletaNome: target.nome,
      atletaCpf: target.doc || '—',
      tipo:
        target.entreguePara &&
        target.entreguePara.trim().toUpperCase() !== target.nome.trim().toUpperCase()
          ? 'TERCEIRO'
          : 'ATLETA',
      retiradoPor: target.entreguePara || target.nome,
      operadorNome: target.entreguePor || opName,
      operadorEmail: opEmail,
      pontoEntrega: 'Guichê Principal',
      kit: target.kit || 'Kit Padrão',
      camiseta: target.camiseta || 'M',
      modalidade: target.modalidade || '5 KM',
      status: 'ENTREGUE',
      eventId: currentEvent.id,
    }
    setSelectedComprovante(fallbackAudit)
  }

  // Filtered Athletes for Tab 2 (sempre ordenados de forma crescente por número de peito)
  const filteredAthletes = useMemo(() => {
    return athletes
      .filter((a) => {
        const q = atletaSearch.toLowerCase().trim()
        const matchesSearch =
          !q ||
          (a.nome && a.nome.toLowerCase().includes(q)) ||
          (a.numero && String(a.numero).includes(q)) ||
          (a.doc && a.doc.toLowerCase().includes(q))

        const matchesFilter =
          atletaFilter === 'TODOS' ||
          (atletaFilter === 'PENDENTES' && a.status !== 'ENTREGUE') ||
          (atletaFilter === 'ENTREGUES' && a.status === 'ENTREGUE')

        return matchesSearch && matchesFilter
      })
      .sort((a, b) => compareAthleteNumbers(a.numero, b.numero))
  }, [athletes, atletaSearch, atletaFilter])

  // Paginação da grade de atletas (10 por página). O reset para a página 1
  // acontece durante a renderização (padrão oficial do React para "ajustar
  // estado quando uma prop muda"), sem efeito extra em cascata.
  const [atletaPageResetKey, setAtletaPageResetKey] = useState(`${atletaSearch}|${atletaFilter}`)
  const atletaListKey = `${atletaSearch}|${atletaFilter}`
  if (atletaPageResetKey !== atletaListKey) {
    setAtletaPageResetKey(atletaListKey)
    setAtletaPage(1)
  }

  const athleteTotalPages = Math.max(1, Math.ceil(filteredAthletes.length / ATHLETES_PER_PAGE))
  const currentAthletePage = Math.min(atletaPage, athleteTotalPages)
  const athletePageStart = (currentAthletePage - 1) * ATHLETES_PER_PAGE
  const athletePageEnd = Math.min(athletePageStart + ATHLETES_PER_PAGE, filteredAthletes.length)
  const paginatedAthletes = filteredAthletes.slice(athletePageStart, athletePageEnd)

  const visibleAthleteTableColumns = useMemo(() => {
    if (!isOperator) return athleteTableColumns
    const operatorColumns = new Set(['numero', 'nome', 'doc', 'chip', 'status'])
    return athleteTableColumns.filter(
      (column) => column.type === 'standard' && operatorColumns.has(column.key)
    )
  }, [athleteTableColumns, isOperator])

  // minWidth real da grade: soma das larguras estimadas das colunas, para
  // que a última coluna (ex.: CAMISETA) nunca seja cortada pela borda.
  const athleteTableMinWidth = useMemo(
    () =>
      Math.max(
        780,
        visibleAthleteTableColumns.reduce(
          (total, column) => total + getAthleteColumnWidth(column),
          0
        )
      ),
    [visibleAthleteTableColumns]
  )

  // Filtered Athletes for Tab 1 (Kit Search - sempre ordenados por número)
  const searchResultsKit = useMemo(() => {
    if (!kitSearch.trim()) return []
    const q = kitSearch.toLowerCase().trim()
    return athletes
      .filter((a) => {
        return a.status !== 'ENTREGUE' && (
          (a.nome && a.nome.toLowerCase().includes(q)) ||
          (a.numero && String(a.numero).includes(q)) ||
          (a.doc && a.doc.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => compareAthleteNumbers(a.numero, b.numero))
  }, [athletes, kitSearch])

  // Lista de entregas sempre ordenada por número de peito de forma crescente (1, 2, 3...)
  const sortedDeliveries = useMemo(() => {
    return [...deliveries].sort((a, b) => compareAthleteNumbers(a.id, b.id))
  }, [deliveries])

  const hasDeliveries = sortedDeliveries.length > 0

  function handleRefreshDeliveries() {
    setDeliveries((prev) => {
      const existingIds = new Set(prev.map((d) => String(d.id)))
      const merged = [...prev]

      for (const a of athletes) {
        if (a.status === 'ENTREGUE' && !existingIds.has(String(a.numero))) {
          merged.push({
            id: a.numero,
            name: a.nome,
            doc: a.doc,
            category: a.categoria || 'GERAL',
            size: a.camiseta || 'M',
            kit: a.kit || 'Kit Padrão',
            time: a.entregueEm || 'Entregue',
            dataHora: a.entregueEm || new Date().toLocaleString('pt-BR'),
          })
          existingIds.add(String(a.numero))
        }
      }

      return merged.sort((a, b) => compareAthleteNumbers(a.id, b.id))
    })
  }

  return (
    <div className="operacao-layout">
      <Sidebar
        activePage="operacao"
        onNavigate={handleGuardedNavigate}
        onLogout={handleGuardedLogout}
        user={user}
      />

      <main className="operacao-main">
        {/* Top bar with Event title on left and Tutorial / Voltar on right */}
        <header className="operacao-top-header">
          <h1 className="operacao-page-title">{currentEvent.name}</h1>

          <div className="operacao-top-actions">
            <button
              type="button"
              className="operacao-ghost-btn"
              onClick={onOpenTutorial}
            >
              <HelpCircleIcon />
              <span>TUTORIAL</span>
            </button>

            <button
              type="button"
              className="operacao-ghost-btn"
              onClick={() => handleGuardedNavigate('eventos')}
            >
              <ArrowLeftIcon />
              <span>Voltar</span>
            </button>
          </div>
        </header>

        {/* Deep Navy Event Banner Card */}
        <section className="operacao-event-banner">
          <div className="banner-left">
            <span className="banner-label">EVENTO</span>
            <h2 className="banner-title">{currentEvent.name}</h2>
            <span className="banner-meta">
              {currentEvent.dateInput || currentEvent.date} • {currentEvent.location}
            </span>
          </div>

          <div className="banner-stats">
            <div className="banner-stat-col">
              <span className="banner-stat-label">TOTAL</span>
              <span className="banner-stat-val white">{totalAthletes}</span>
            </div>

            <div className="banner-stat-col">
              <span className="banner-stat-label">ENTREGUES</span>
              <span className="banner-stat-val green">{deliveredAthletes}</span>
            </div>

            <div className="banner-stat-col">
              <span className="banner-stat-label">PENDENTES</span>
              <span className="banner-stat-val amber">{pendingAthletes}</span>
            </div>

            <div className="banner-stat-col">
              <span className="banner-stat-label">% CONCL.</span>
              <span className="banner-stat-val orange">{percentDone}</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs Bar */}
        <nav className="operacao-tabs-row">
          <button
            type="button"
            className={`operacao-subtab ${effectiveTab === 'entrega' ? 'active' : ''}`}
            onClick={() => handleOperationTabChange('entrega')}
          >
            <ZapIcon />
            <span className="tab-label-full">ENTREGA DE KIT</span>
            <span className="tab-label-short">ENTREGA</span>
          </button>

          <button
            type="button"
            className={`operacao-subtab ${effectiveTab === 'atletas' ? 'active' : ''}`}
            onClick={() => handleOperationTabChange('atletas')}
          >
            <UsersTabIcon />
            <span>ATLETAS</span>
          </button>

          <button
            type="button"
            className={`operacao-subtab ${effectiveTab === 'estatisticas' ? 'active' : ''}`}
            onClick={() => handleOperationTabChange('estatisticas')}
          >
            <BarChartTabIcon />
            <span className="tab-label-full">ESTATÍSTICAS</span>
            <span className="tab-label-short">ESTATÍSTICA</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`operacao-subtab ${effectiveTab === 'auditoria' ? 'active' : ''}`}
              onClick={() => handleOperationTabChange('auditoria')}
            >
              <ClipboardIcon />
              <span>AUDITORIA</span>
            </button>
          )}
        </nav>

        {/* TAB 1: ENTREGA DE KIT */}
        {effectiveTab === 'entrega' && (
          <div className="operacao-tab-content">
            {/* VIEW A: DETALHE / MODAL DO ATLETA SELECIONADO (FOTO ENVIADA PELO PO) */}
            {selectedAthlete && detailForm ? (
              <div className="athlete-detail-view-container">
                {/* 1. Barra de Ações Superior */}
                <div className="athlete-detail-actions-bar">
                  {detailForm.status === 'ENTREGUE' ? (
                    <>
                      <button
                        type="button"
                        className="btn-detail-print"
                        onClick={() => handleOpenComprovante(selectedAthlete || detailForm)}
                        title="Imprimir comprovante de entrega (2 Vias)"
                      >
                        <PrinterIcon />
                        <span>IMPRIMIR COMPROVANTE</span>
                      </button>
                      {!isOperator && (
                        <button
                          type="button"
                          className="btn-detail-undo"
                          onClick={handleUndoDelivery}
                          title="Desfazer entrega do kit"
                        >
                          <UndoIcon />
                          <span>DESFAZER</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {!isOperator && (
                        <button
                          type="button"
                          className={`btn-detail-save ${detailHasChanges ? 'btn-detail-save-active' : ''}`}
                          onClick={handleSaveDetail}
                          disabled={!detailHasChanges || detailActionInProgress}
                          title={detailHasChanges
                            ? 'Salvar o cadastro sem entregar o kit'
                            : 'Nenhuma alteração para salvar'}
                        >
                          <SaveIcon />
                          <span>{detailHasChanges ? 'SALVAR ALTERAÇÕES' : 'SALVO'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className={`btn-detail-entregar ${deliverBlockedByEdits ? 'btn-detail-blocked' : ''}`}
                        onClick={() => handleSaveAndDeliver()}
                        disabled={detailActionInProgress || deliverBlockedByEdits}
                        title={deliverBlockedByEdits
                          ? 'Existem alterações não salvas — clique em SALVAR ALTERAÇÕES para liberar a entrega'
                          : (isOperator ? 'Confirmar entrega do kit' : 'Entregar o kit com os dados salvos')}
                      >
                        <CheckCircleIcon />
                        <span>ENTREGAR KIT</span>
                      </button>
                      <button
                        type="button"
                        className={`btn-detail-entregar-print ${deliverBlockedByEdits ? 'btn-detail-blocked' : ''}`}
                        onClick={() => handleSaveAndDeliver({ print: true })}
                        disabled={detailActionInProgress || deliverBlockedByEdits}
                        title={deliverBlockedByEdits
                          ? 'Existem alterações não salvas — clique em SALVAR ALTERAÇÕES para liberar a entrega'
                          : 'Entregar o kit e abrir o comprovante (2 vias)'}
                      >
                        <PrinterIcon />
                        <span>ENTREGAR & IMPRIMIR</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="btn-detail-qr-action"
                    onClick={() => setQrModalAthlete(selectedAthlete || detailForm)}
                    title="Visualizar e Imprimir QR Code deste atleta"
                  >
                    <QrCodeIcon size={16} />
                    <span>QR CODE</span>
                  </button>

                  <button
                    type="button"
                    className="btn-detail-cancel"
                    onClick={() => closeAthleteDetail()}
                    title="Voltar à lista"
                  >
                    <CancelIcon />
                    <span>VOLTAR À LISTA</span>
                  </button>
                </div>

                {!isOperator && detailForm.status !== 'ENTREGUE' && (
                  <p className={`athlete-detail-action-hint ${detailHasPendingEdits ? 'pending-warning' : ''}`}>
                    {detailHasPendingEdits
                      ? '⚠ Alterações pendentes: clique em SALVAR ALTERAÇÕES para liberar o botão de entrega.'
                      : 'Cadastro salvo. O botão ENTREGAR KIT está liberado — salvar não registra a entrega.'}
                  </p>
                )}

                {detailFeedback && !detailHasChanges && (
                  <div className="athlete-detail-feedback" role="status">
                    {detailFeedback}
                  </div>
                )}

                {/* 2. Três Cards de Destaque */}
                <div className="athlete-detail-cards-grid">
                  {/* Card 1: Modalidade / Categoria + Número + Chip */}
                  <div className="card-bib-highlight">
                    <div className="bib-header">
                      <span className="bib-modalidade">{detailForm.modalidade || '5 KM'}</span>
                      <span className="bib-categoria">{detailForm.categoria || 'GERAL'}</span>
                    </div>
                    <div className="bib-center">
                      <span className="bib-number">{detailForm.numero}</span>
                    </div>
                    <div className="bib-footer">
                      <span className="bib-chip">{detailForm.chip || '—'}</span>
                    </div>
                  </div>

                  {/* Card 2: Camiseta */}
                  <div className="card-shirt-highlight">
                    <span className="shirt-size">{detailForm.camiseta || 'M'}</span>
                    <span className="shirt-label">CAMISETA</span>
                  </div>

                  {/* Card 3: Kit */}
                  <div className="card-kit-highlight">
                    <span className="kit-name">{detailForm.kit || 'KIT ELITE'}</span>
                    <span className="kit-label">KIT</span>
                  </div>
                </div>

                {/* 3. Metadados de Entrega (Pills à direita) */}
                {detailForm.status === 'ENTREGUE' && (
                  <div className="athlete-detail-meta-row">
                    <div className="meta-pill-group">
                      <span className="meta-pill-label">ENTREGUE EM</span>
                      <span className="meta-pill-badge">{detailForm.entregueEm}</span>
                    </div>

                    <div className="meta-pill-group">
                      <span className="meta-pill-label">ENTREGUE POR</span>
                      <span className="meta-pill-badge">{detailForm.entreguePor}</span>
                    </div>
                  </div>
                )}

                {isOperator && (
                  <div className="operator-permission-notice">
                    <span>🔒 Perfil Operador: consulta e entrega de kit liberadas. Alteração de dados reservada ao Supervisor.</span>
                  </div>
                )}

                {/* 4. Formulário Completo de Dados do Atleta */}
                <form className="athlete-detail-form-card" onSubmit={handleSaveDetail}>
                  <fieldset disabled={isOperator} className="athlete-detail-fieldset">
                  {/* Linha 1: NÚMERO, NOME, DOCUMENTO, SEXO */}
                  <div className="detail-form-row-4">
                    <div className="athlete-form-group">
                      <label className="athlete-form-label">NÚMERO</label>
                      <input
                        type="text"
                        className="athlete-form-input"
                        value={detailForm.numero}
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, numero: e.target.value })
                        }
                      />
                    </div>

                    <div className="athlete-form-group">
                      <label className="athlete-form-label">NOME</label>
                      <input
                        type="text"
                        className="athlete-form-input"
                        value={detailForm.nome}
                        onChange={(e) => {
                          const nextName = e.target.value
                          const recipientFollowedAthlete =
                            !detailForm.entreguePara || detailForm.entreguePara === detailForm.nome
                          setDetailForm({
                            ...detailForm,
                            nome: nextName,
                            ...(recipientFollowedAthlete ? { entreguePara: nextName } : {}),
                          })
                          setDetailFeedback('')
                        }}
                      />
                    </div>

                    <div className="athlete-form-group">
                      <label className="athlete-form-label">DOCUMENTO</label>
                      <input
                        type="text"
                        className="athlete-form-input"
                        value={detailForm.doc}
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, doc: e.target.value })
                        }
                      />
                    </div>

                    <div className="athlete-form-group">
                      <label className="athlete-form-label">SEXO</label>
                      <select
                        className="athlete-form-select"
                        value={detailForm.sexo}
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, sexo: e.target.value })
                        }
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                      </select>
                    </div>
                  </div>

                  {/* Linha 2: NASCIMENTO */}
                  <div className="detail-form-row-4">
                    <div className="athlete-form-group">
                      <label className="athlete-form-label">NASCIMENTO</label>
                      <div className="athlete-input-icon-wrap">
                        <input
                          type="text"
                          className="athlete-form-input"
                          placeholder="dd/mm/aaaa"
                          value={detailForm.nascimento}
                          onChange={(e) =>
                            setDetailForm({
                              ...detailForm,
                              nascimento: e.target.value,
                            })
                          }
                        />
                        <span className="input-end-icon">
                          <CalendarIcon />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linha 3: MODALIDADE, CATEGORIA, EQUIPE (+), NACIONALIDADE */}
                  <div className="detail-form-row-4">
                    <div className="athlete-form-group">
                      <label className="athlete-form-label">MODALIDADE</label>
                      <select
                        className="athlete-form-select"
                        value={detailForm.modalidade}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            modalidade: e.target.value,
                          })
                        }
                      >
                        {Array.from(new Set(['5 KM', '10 KM', '21 KM', ...modalidadeStats.map((m) => m.name), detailForm.modalidade].filter(Boolean))).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="athlete-form-group">
                      <label className="athlete-form-label">CATEGORIA</label>
                      <select
                        className="athlete-form-select"
                        value={detailForm.categoria}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            categoria: e.target.value,
                          })
                        }
                      >
                        <option value="GERAL">GERAL</option>
                        <option value="8 - ALTO DO MOURA">8 - ALTO DO MOURA</option>
                        <option value="79 - DEMAIS ATLETAS">79 - DEMAIS ATLETAS</option>
                        <option value="14 - MORRO DO BOM JESUS">14 - MORRO DO BOM JESUS</option>
                        <option value="2 - ATLETAS LOCAIS">2 - ATLETAS LOCAIS</option>
                      </select>
                    </div>

                    <div className="athlete-form-group">
                      <label className="athlete-form-label">EQUIPE</label>
                      <div className="input-with-action-wrap">
                        <select
                          className="athlete-form-select"
                          value={detailForm.equipe}
                          onChange={(e) =>
                            setDetailForm({ ...detailForm, equipe: e.target.value })
                          }
                        >
                          <option value="—">—</option>
                          <option value="BORA PRO CORRE">BORA PRO CORRE</option>
                          <option value="BORAPROCORRE">BORAPROCORRE</option>
                          <option value="FORMOSO PACE CLUBE">FORMOSO PACE CLUBE</option>
                          <option value="BROCARUN">BROCARUN</option>
                          <option value="SEM EQUIPE">SEM EQUIPE</option>
                        </select>
                        <button
                          type="button"
                          className="btn-inline-plus"
                          title="Nova Equipe"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="athlete-form-group">
                      <label className="athlete-form-label">NACIONALIDADE</label>
                      <select
                        className="athlete-form-select"
                        value={detailForm.nacionalidade}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            nacionalidade: e.target.value,
                          })
                        }
                      >
                        <option value="BRASIL">BRASIL</option>
                        <option value="OUTRO">OUTRO</option>
                      </select>
                    </div>
                  </div>

                  {/* Linha 4: KIT, CAMISETA, CHIPS */}
                  <div className="detail-form-row-kit-chips">
                    <div className="athlete-form-group">
                      <label className="athlete-form-label">KIT</label>
                      <select
                        className="athlete-form-select"
                        value={detailForm.kit}
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, kit: e.target.value })
                        }
                      >
                        <option value="KIT ELITE">KIT ELITE</option>
                        <option value="Kit Padrão">Kit Padrão</option>
                        <option value="KIT ATLETA">KIT ATLETA</option>
                      </select>
                    </div>

                    <div className="athlete-form-group">
                      <label className="athlete-form-label">CAMISETA</label>
                      <select
                        className="athlete-form-select"
                        value={detailForm.camiseta}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            camiseta: e.target.value,
                          })
                        }
                      >
                        <option value="P">P</option>
                        <option value="M">M</option>
                        <option value="G">G</option>
                        <option value="GG">GG</option>
                        <option value="XG">XG</option>
                      </select>
                    </div>

                    <div className="athlete-form-group span-chips">
                      <label className="athlete-form-label">CHIPS</label>
                      <div className="chips-tag-field">
                        {detailForm.chip ? (
                          <span className="chip-pill-tag">
                            <span>{detailForm.chip}</span>
                            <button
                              type="button"
                              className="btn-chip-remove"
                              onClick={() =>
                                setDetailForm({ ...detailForm, chip: '' })
                              }
                              title="Remover chip"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <input
                            type="text"
                            className="chip-tag-input"
                            placeholder="Digite o chip e pressione Enter..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.target.value.trim()) {
                                e.preventDefault()
                                setDetailForm({
                                  ...detailForm,
                                  chip: e.target.value.trim(),
                                })
                                e.target.value = ''
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linha 5: MORADOR/VISITANTE, CONTATO */}
                  <div className="detail-form-row-4">
                    <div className="athlete-form-group">
                      <label className="athlete-form-label">MORADOR/VISITANTE</label>
                      <select
                        className="athlete-form-select"
                        value={detailForm.morador}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            morador: e.target.value,
                          })
                        }
                      >
                        <option value="Morador">Morador</option>
                        <option value="Visitante">Visitante</option>
                      </select>
                    </div>

                    <div className="athlete-form-group">
                      <label className="athlete-form-label">CONTATO</label>
                      <input
                        type="text"
                        className="athlete-form-input"
                        placeholder="(00) 00000-0000"
                        value={detailForm.contato}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            contato: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Linha de Campos Personalizados / PCD */}
                  {detailForm.customFields && Object.keys(detailForm.customFields).length > 0 && (
                    <div className="athlete-custom-fields-box">
                      <div className="custom-fields-header-title">
                        <span className="badge-pcd-pill">CAMPOS EXTRAS & PCD DA PLANILHA</span>
                      </div>
                      <div className="detail-form-row-4">
                        {Object.entries(detailForm.customFields).map(([k, v]) => (
                          <div key={k} className="athlete-form-group">
                            <label className="athlete-form-label">{k}</label>
                            <input
                              type="text"
                              className="athlete-form-input"
                              disabled={isOperator}
                              value={v || ''}
                              onChange={(e) => {
                                const newVal = e.target.value
                                setDetailForm({
                                  ...detailForm,
                                  customFields: {
                                    ...detailForm.customFields,
                                    [k]: newVal,
                                  },
                                  ...(k.toUpperCase().includes('PCD') ? { pcd: newVal } : {}),
                                })
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </fieldset>
                </form>

                {/* 5. Card: ENTREGUE PARA */}
                <div className="athlete-entregue-para-card">
                  <div className="athlete-form-group">
                    <label className="athlete-form-label">ENTREGUE PARA</label>
                    <input
                      type="text"
                      className="athlete-form-input entregue-para-input"
                      disabled={isOperator}
                      value={detailForm.entreguePara || detailForm.nome}
                      onChange={(e) =>
                        setDetailForm({
                          ...detailForm,
                          entreguePara: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* VIEW B: LISTA NORMAL DE ENTREGA (BUSCA + ÚLTIMAS ENTREGAS) */
              <>
                <div className="kit-actions-row">
                  <button
                    type="button"
                    className="btn-espelho"
                    onClick={() => setShowEspelhoModal(true)}
                  >
                    <MonitorIcon />
                    <span>ESPELHO</span>
                  </button>

                  <div className="kit-search-input-wrap">
                    <SearchIcon />
                    <input
                      type="text"
                      placeholder="Buscar Atleta por nome ou documento"
                      value={kitSearch}
                      onChange={(e) => setKitSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Resultados da busca em tempo real */}
                {kitSearch.trim() && (
                  <div className="kit-search-results-panel">
                    <div className="kit-results-header">
                      <span>RESULTADOS DA BUSCA ({searchResultsKit.length})</span>
                    </div>
                    {searchResultsKit.length === 0 ? (
                      <div className="empty-message-box" style={{ padding: '24px' }}>
                        Nenhum atleta encontrado para "{kitSearch}".
                      </div>
                    ) : (
                      <div className="kit-results-list">
                        {searchResultsKit.map((athlete) => (
                          <div
                            key={athlete.id || athlete.numero}
                            className="kit-result-item"
                          >
                            <div
                              className="kit-result-identification clickable-athlete"
                              onClick={() => handleOpenAthleteDetail(athlete.numero)}
                              title="Ver detalhes do atleta"
                            >
                              <span className="kit-result-name">{athlete.nome || '—'}</span>
                              <span className="kit-result-number">Nº {athlete.numero || '—'}</span>
                              <span className="kit-result-document">CPF {athlete.doc || '—'}</span>
                            </div>
                            <button
                              type="button"
                              className="btn-entregar-inline"
                              onClick={() => handleDeliverKit(athlete)}
                            >
                              ENTREGAR KIT
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <section className="ultimas-entregas-section">
                  <div className="ultimas-entregas-header">
                    <h3 className="section-heading">ÚLTIMAS ENTREGAS</h3>
                    <button
                      type="button"
                      className="refresh-btn"
                      title="Atualizar lista de entregas"
                      onClick={handleRefreshDeliveries}
                    >
                      <RefreshIcon />
                    </button>
                  </div>

                  <div className="deliveries-card-box">
                    {!hasDeliveries ? (
                      <div className="empty-message-box">
                        Nenhuma entrega registrada ainda.
                      </div>
                    ) : (
                      <div className="deliveries-list">
                        {sortedDeliveries.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="delivery-item-row"
                            onClick={() => handleOpenAthleteDetail(item.id)}
                            title="Clique para ver dados completos e entrega deste atleta"
                          >
                            <div className="athlete-main">
                              <span className="athlete-peito">Nº {item.id}</span>
                              <span className="athlete-name highlight-link">{item.name}</span>
                              <span className="athlete-doc">— {item.doc}</span>
                            </div>
                            <div className="delivery-tags">
                              <span className="tag-gray">{item.category}</span>
                              <span className="tag-gray">CAMISETA {item.size}</span>
                              <span className="tag-green">ENTREGUE</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* TAB 2: ATLETAS */}
        {effectiveTab === 'atletas' && (
          <div className="operacao-tab-content">
            <div className="atletas-filter-bar">
              <div className="atletas-search-wrap">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Filtrar por nome, peito ou documento..."
                  value={atletaSearch}
                  onChange={(e) => setAtletaSearch(e.target.value)}
                />
              </div>

              <div className="atletas-right-controls">
                <div className="pill-filters-group">
                  <button
                    type="button"
                    className={`pill-filter-btn ${atletaFilter === 'TODOS' ? 'active' : ''}`}
                    onClick={() => setAtletaFilter('TODOS')}
                  >
                    TODOS
                  </button>
                  <button
                    type="button"
                    className={`pill-filter-btn ${atletaFilter === 'PENDENTES' ? 'active' : ''}`}
                    onClick={() => setAtletaFilter('PENDENTES')}
                  >
                    PENDENTES
                  </button>
                  <button
                    type="button"
                    className={`pill-filter-btn ${atletaFilter === 'ENTREGUES' ? 'active' : ''}`}
                    onClick={() => setAtletaFilter('ENTREGUES')}
                  >
                    ENTREGUES
                  </button>
                </div>

                {!isOperator && (
                  <button
                    type="button"
                    className="btn-add-atleta"
                    onClick={handleOpenAddAthleteModal}
                  >
                    <UserPlusIcon />
                    <span>NOVO</span>
                  </button>
                )}
              </div>
            </div>

            <div className="atletas-table-card">
              <div className="atletas-table-scroll-hint">
                <button
                  type="button"
                  className="atletas-scroll-btn"
                  onClick={() => tableResponsiveRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                  aria-label="Rolar tabela para a esquerda"
                  title="Rolar para a esquerda"
                >
                  ‹
                </button>
                <span className="atletas-scroll-hint-label">
                  <span aria-hidden="true">↔</span> Deslize para ver todos os {visibleAthleteTableColumns.length} campos
                </span>
                <button
                  type="button"
                  className="atletas-scroll-btn"
                  onClick={() => tableResponsiveRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                  aria-label="Rolar tabela para a direita"
                  title="Rolar para a direita"
                >
                  ›
                </button>
              </div>
              <div
                ref={tableResponsiveRef}
                className="table-responsive"
                onPointerDown={handleTablePointerDown}
              >
                <table
                  className="atletas-table"
                  style={{ minWidth: `${athleteTableMinWidth + 84}px` }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: '84px', textAlign: 'center' }}>QR CODE</th>
                      {visibleAthleteTableColumns.map((column, columnIndex) => (
                        <th
                          key={column.key}
                          className={columnIndex < 2 ? `sticky-athlete-column sticky-athlete-column-${columnIndex}` : ''}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAthletes.length === 0 ? (
                      <tr>
                        <td colSpan={visibleAthleteTableColumns.length + 1} className="empty-table-cell">
                          Nenhum atleta encontrado.
                        </td>
                      </tr>
                    ) : (
                      paginatedAthletes.map((a) => (
                        <tr
                          key={a.id || a.numero}
                          onClick={(e) => handleRowClick(e, a.numero)}
                          style={{ cursor: 'pointer' }}
                          title="Clique para abrir detalhes do atleta"
                        >
                          <td
                            style={{ textAlign: 'center', width: '84px' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setQrModalAthlete(a)
                            }}
                          >
                            <button
                              type="button"
                              className="btn-table-qr-badge"
                              onClick={(e) => {
                                e.stopPropagation()
                                setQrModalAthlete(a)
                              }}
                              title={`Ver / Imprimir QR Code do atleta #${a.numero}`}
                            >
                              <QrCodeIcon size={14} />
                              <span>QR</span>
                            </button>
                          </td>
                          {visibleAthleteTableColumns.map((column, columnIndex) => {
                            const cellValue = getAthleteTableValue(a, column)
                            return (
                              <td
                                key={column.key}
                                className={`${columnIndex < 2 ? `sticky-athlete-column sticky-athlete-column-${columnIndex}` : ''} ${column.key === 'nome' ? 'athlete-name-cell' : ''}`.trim()}
                                title={cellValue === '—' ? undefined : cellValue}
                              >
                                {cellValue}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="atletas-table-footer">
              <span>
                {filteredAthletes.length === 0
                  ? `0 de ${athletes.length} atletas · ${visibleAthleteTableColumns.length} campos exibidos.`
                  : `Mostrando ${athletePageStart + 1}–${athletePageEnd} de ${filteredAthletes.length} atletas (total da base: ${athletes.length}) · ${visibleAthleteTableColumns.length} campos exibidos.`}
              </span>

              {filteredAthletes.length > ATHLETES_PER_PAGE && (
                <div className="atletas-pagination" role="navigation" aria-label="Paginação da lista de atletas">
                  <button
                    type="button"
                    className="atletas-page-btn"
                    disabled={currentAthletePage <= 1}
                    onClick={() => setAtletaPage((p) => Math.max(1, p - 1))}
                  >
                    ← ANTERIOR
                  </button>
                  <span className="atletas-page-indicator">
                    Página {currentAthletePage} de {athleteTotalPages}
                  </span>
                  <button
                    type="button"
                    className="atletas-page-btn"
                    disabled={currentAthletePage >= athleteTotalPages}
                    onClick={() => setAtletaPage((p) => Math.min(athleteTotalPages, p + 1))}
                  >
                    PRÓXIMA →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ESTATÍSTICAS */}
        {effectiveTab === 'estatisticas' && (
          <div className="operacao-tab-content">
            <div className="estatisticas-top-action">
              <button type="button" className="fechamento-btn">
                <ClipboardIcon />
                <span>Fechamento do dia</span>
              </button>
            </div>

            {/* 4 Stat Cards */}
            <div className="dash-four-stat-cards">
              <div className="stat-overview-card">
                <div className="stat-overview-top">
                  <span className="stat-overview-label">TOTAL</span>
                  <UsersTabIcon />
                </div>
                <div className="stat-overview-number">{totalAthletes}</div>
              </div>

              <div className="stat-overview-card">
                <div className="stat-overview-top">
                  <span className="stat-overview-label">ENTREGUES</span>
                  <CheckCircleIcon />
                </div>
                <div className="stat-overview-number green">{deliveredAthletes}</div>
              </div>

              <div className="stat-overview-card">
                <div className="stat-overview-top">
                  <span className="stat-overview-label">PENDENTES</span>
                  <PackageIcon />
                </div>
                <div className="stat-overview-number amber">{pendingAthletes}</div>
              </div>

              <div className="stat-overview-card">
                <div className="stat-overview-top">
                  <span className="stat-overview-label">% CONCLUÍDO</span>
                  <PercentIcon />
                </div>
                <div className="stat-overview-number orange">{percentDone}</div>
              </div>
            </div>

            {/* Camisetas Section */}
            <section className="estatisticas-section">
              <div className="section-heading-row">
                <h3 className="section-heading">CAMISETAS</h3>
                <span className="section-heading-badge">{camisetaStats.length} TAMANHO{camisetaStats.length === 1 ? '' : 'S'}</span>
              </div>
              <div className="simple-white-box breakdown-box">
                {camisetaStats.length === 0 ? (
                  <div className="empty-message-box">
                    Nenhum dado de camiseta registrado ainda.
                  </div>
                ) : (
                  <div className="stat-breakdown-grid">
                    {camisetaStats.map((item) => (
                      <div key={item.size} className="stat-breakdown-card">
                        <div className="sbc-header">
                          <span className="sbc-title">CAMISETA {item.size}</span>
                          <span className="sbc-percent">{item.conclPercent}%</span>
                        </div>
                        <div className="sbc-stats-row">
                          <div className="sbc-stat-item">
                            <span className="sbc-stat-label">TOTAL</span>
                            <span className="sbc-stat-val">{item.total}</span>
                          </div>
                          <div className="sbc-stat-item">
                            <span className="sbc-stat-label">ENTREGUES</span>
                            <span className="sbc-stat-val green">{item.entregues}</span>
                          </div>
                          <div className="sbc-stat-item">
                            <span className="sbc-stat-label">FALTAM</span>
                            <span className="sbc-stat-val amber">{item.pendentes}</span>
                          </div>
                        </div>
                        <div className="sbc-progress-track">
                          <div
                            className="sbc-progress-fill"
                            style={{ width: `${item.conclPercent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Modalidades Section */}
            <section className="estatisticas-section">
              <div className="section-heading-row">
                <h3 className="section-heading">MODALIDADES</h3>
                <span className="section-heading-badge">{modalidadeStats.length} MODALIDADE{modalidadeStats.length === 1 ? '' : 'S'}</span>
              </div>
              <div className="simple-white-box breakdown-box">
                {modalidadeStats.length === 0 ? (
                  <div className="empty-message-box">
                    Nenhuma modalidade registrada ainda.
                  </div>
                ) : (
                  <div className="stat-breakdown-grid">
                    {modalidadeStats.map((item) => (
                      <div key={item.name} className="stat-breakdown-card">
                        <div className="sbc-header">
                          <span className="sbc-title">{item.name}</span>
                          <span className="sbc-percent">{item.conclPercent}%</span>
                        </div>
                        <div className="sbc-stats-row">
                          <div className="sbc-stat-item">
                            <span className="sbc-stat-label">TOTAL</span>
                            <span className="sbc-stat-val">{item.total}</span>
                          </div>
                          <div className="sbc-stat-item">
                            <span className="sbc-stat-label">ENTREGUES</span>
                            <span className="sbc-stat-val green">{item.entregues}</span>
                          </div>
                          <div className="sbc-stat-item">
                            <span className="sbc-stat-label">FALTAM</span>
                            <span className="sbc-stat-val amber">{item.pendentes}</span>
                          </div>
                        </div>
                        <div className="sbc-progress-track">
                          <div
                            className="sbc-progress-fill"
                            style={{ width: `${item.conclPercent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="section-divider" />

            {/* Produtividade dos Operadores Section */}
            <section className="estatisticas-section">
              <h3 className="section-heading">PRODUTIVIDADE DOS OPERADORES</h3>
              <div className="operators-cards-grid">
                {operators.map((op) => (
                  <div key={op.id} className="operator-productivity-card">
                    <div className="operator-card-header">
                      <div className="operator-avatar-circle">
                        {op.avatar}
                      </div>
                      <div className="operator-card-info">
                        <span className="operator-card-name">{op.name}</span>
                        <span className="operator-card-role">{op.role}</span>
                      </div>
                    </div>

                    <div className="operator-card-body">
                      <div className="operator-count-wrap">
                        <span className="operator-count">{op.count}</span>
                        <span className="operator-count-label">ENTREGAS NESTE EVENTO</span>
                      </div>
                      <span className="operator-trend-icon">
                        <TrendingUpIcon />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 4: AUDITORIA */}
        {effectiveTab === 'auditoria' && (
          <div className="operacao-tab-content auditoria-content-layout">
            {/* 1. CARDS DE MÉTRICAS (4 CARDS) */}
            <div className="audit-metrics-grid">
              {/* Card 1: Entregas no Filtro */}
              <div className="audit-metric-card">
                <div className="audit-metric-header">
                  <span className="audit-metric-label">ENTREGAS NO FILTRO</span>
                  <div className="audit-metric-icon-wrap blue">
                    <ClipboardIcon />
                  </div>
                </div>
                <div className="audit-metric-value">{totalAuditsCount}</div>
                <div className="audit-metric-footer">
                  <span className="audit-dot-green"></span>
                  <span className="audit-footer-text">HISTÓRICO CONSOLIDADO</span>
                  <span className="audit-badge-pill green">100%</span>
                </div>
              </div>

              {/* Card 2: Pelo Atleta */}
              <div className="audit-metric-card">
                <div className="audit-metric-header">
                  <span className="audit-metric-label">PELO ATLETA</span>
                  <div className="audit-metric-icon-wrap emerald">
                    <UsersTabIcon />
                  </div>
                </div>
                <div className="audit-metric-value">{atletaAuditsCount}</div>
                <div className="audit-metric-footer">
                  <span className="audit-badge-pill green">{atletaPercent}%</span>
                  <span className="audit-footer-text">DO TOTAL FILTRADO</span>
                </div>
              </div>

              {/* Card 3: Por Terceiro */}
              <div className="audit-metric-card">
                <div className="audit-metric-header">
                  <span className="audit-metric-label">POR TERCEIRO</span>
                  <div className="audit-metric-icon-wrap amber">
                    <UsersTabIcon />
                  </div>
                </div>
                <div className="audit-metric-value">{terceiroAuditsCount}</div>
                <div className="audit-metric-footer">
                  <span className="audit-badge-pill amber">{terceiroPercent}%</span>
                  <span className="audit-footer-text">DO TOTAL FILTRADO</span>
                </div>
              </div>

              {/* Card 4: Top Operador */}
              <div className="audit-metric-card">
                <div className="audit-metric-header">
                  <span className="audit-metric-label">TOP OPERADOR</span>
                  <div className="audit-metric-icon-wrap gold">
                    <TrophyIcon />
                  </div>
                </div>
                <div className="audit-metric-value">
                  <span className="top-op-name">{topOperatorName}</span>
                  <span className="top-op-count"> · {topOperatorCount}</span>
                </div>
                <div className="audit-metric-footer">
                  <span className="audit-badge-pill green">{topOperatorPercent}%</span>
                  <span className="audit-footer-text">CONCENTRAÇÃO</span>
                </div>
              </div>
            </div>

            {/* 2. CARD: PLANILHA DE ATLETAS */}
            <div className="planilha-box-card">
              <div className="planilha-box-left">
                <div className="planilha-icon-badge">
                  <TableSpreadsheetIcon />
                </div>
                <div className="planilha-box-info">
                  <h3 className="planilha-box-title">BASE GERAL DE ATLETAS</h3>
                  <p className="planilha-box-subtitle">
                    Lista completa e atualizada do evento, com atletas entregues e pendentes.
                  </p>
                </div>
              </div>
              <div className="planilha-box-actions">
                <button
                  type="button"
                  className="btn-export-planilha"
                  onClick={handleExportPlanilha}
                  title="Baixar todos os atletas em CSV, incluindo entregues e pendentes"
                >
                  <DownloadIcon />
                  <span>BAIXAR PLANILHA GERAL</span>
                </button>
                <button
                  type="button"
                  className="btn-import-planilha"
                  onClick={() => setShowImportModal(true)}
                  title="Abrir assistente de importação de planilha"
                >
                  <UploadIcon />
                  <span>IMPORTAR ATLETAS</span>
                </button>
                <button
                  type="button"
                  className="btn-associar-planilha"
                  onClick={() => setShowAssociarModal(true)}
                  title="Unir planilha de atletas e planilha de chips"
                >
                  <LinkSpreadsheetIcon />
                  <span>ASSOCIAR ATLETAS E CHIPS</span>
                </button>
                <button
                  type="button"
                  className="btn-restore-planilha"
                  onClick={handleRestoreOriginalAthletes}
                  title="Restaurar a planilha base original importada para este evento"
                >
                  <RefreshIcon />
                  <span>RESTAURAR PLANILHA ORIGINAL</span>
                </button>
              </div>
            </div>

            {/* 3. CARD: FILTROS */}
            <div className="filtros-audit-card">
              <div className="filtros-audit-header">
                <div className="filtros-header-left">
                  <span className="filtros-icon-wrap">
                    <FilterFunnelIcon />
                  </span>
                  <div>
                    <h3 className="filtros-card-title">FILTRAR ENTREGAS</h3>
                    <p className="filtros-card-subtitle">
                      A tabela, o CSV e o PDF abaixo respeitam os mesmos filtros.
                    </p>
                  </div>
                </div>
              </div>

              <div className="filtros-form-grid">
                {/* Linha 1 */}
                <div className="filtros-row-1">
                  <div className="filtro-field search-field">
                    <label className="filtro-label">BUSCAR ATLETA (NOME, PEITO, CPF, CHIP)</label>
                    <div className="filtro-search-input-wrap">
                      <SearchIcon />
                      <input
                        type="text"
                        placeholder="Digite o nome, número de peito, CPF ou chip..."
                        value={auditSearch}
                        onChange={(e) => {
                          setAuditSearch(e.target.value)
                          setAuditPage(1)
                        }}
                      />
                    </div>
                  </div>

                  <div className="filtro-field">
                    <label className="filtro-label">ENTREGAS FEITAS POR</label>
                    <CustomSelect
                      className="filtro-select-custom"
                      value={auditOperatorFilter}
                      onChange={(val) => {
                        setAuditOperatorFilter(val)
                        setAuditPage(1)
                      }}
                      options={[
                        { value: 'TODOS', label: 'TODOS OS OPERADORES' },
                        ...auditOperatorOptions.map((name) => ({ value: name, label: name })),
                      ]}
                    />
                  </div>

                  <div className="filtro-field">
                    <label className="filtro-label">TIPO DE RETIRADA</label>
                    <CustomSelect
                      className="filtro-select-custom"
                      value={auditTypeFilter}
                      onChange={(val) => {
                        setAuditTypeFilter(val)
                        setAuditPage(1)
                      }}
                      options={[
                        { value: 'TODOS', label: 'TODOS OS TIPOS' },
                        { value: 'ATLETA', label: 'PELO ATLETA' },
                        { value: 'TERCEIRO', label: 'POR TERCEIRO' },
                      ]}
                    />
                  </div>
                </div>

                {/* Linha 2 */}
                <div className="filtros-row-2">
                  <div className="filtro-field periodo-field">
                    <label className="filtro-label">PERÍODO</label>
                    <div className="periodo-pills">
                      {['TODOS', 'HOJE', 'ONTEM', 'ÚLTIMOS 7 DIAS'].map((period) => (
                        <button
                          key={period}
                          type="button"
                          className={`periodo-pill-btn ${auditPeriod === period ? 'active' : ''}`}
                          onClick={() => {
                            setAuditPeriod(period)
                            setAuditPage(1)
                          }}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="filtro-field modo-busca-field">
                    <label className="filtro-label">MODO DE BUSCA</label>
                    <CustomSelect
                      className="filtro-select-custom"
                      value={auditMatchMode}
                      onChange={(val) => setAuditMatchMode(val)}
                      options={[
                        { value: 'contem', label: 'Contém o termo' },
                        { value: 'inicia', label: 'Início do termo' },
                        { value: 'exato', label: 'Termo exato' },
                      ]}
                    />
                  </div>
                </div>

                {/* Linha 3 */}
                <div className="filtros-row-3">
                  <div className="filtro-checkbox-wrap">
                    <label className="custom-checkbox-label">
                      <input
                        type="checkbox"
                        checked={auditIncludeComprovantes}
                        onChange={(e) => setAuditIncludeComprovantes(e.target.checked)}
                      />
                      <span>Incluir número do comprovante no relatório</span>
                    </label>
                  </div>

                  <div className="audit-filter-live-summary">
                    {filteredAudits.length} entrega(s) encontrada(s) · {auditFilterSummary}
                  </div>

                  <div className="filtros-export-actions">
                    <button
                      type="button"
                      className="btn-filtro-action"
                      onClick={handleExportAuditsCsv}
                      title="Exportar exatamente as entregas exibidas pelos filtros"
                    >
                      <DownloadIcon />
                      <span>EXPORTAR ENTREGAS</span>
                    </button>
                    <button
                      type="button"
                      className="btn-filtro-action"
                      onClick={handlePrintAuditPdf}
                      title="Gerar relatório com todas as entregas filtradas"
                    >
                      <FilePdfIcon />
                      <span>GERAR PDF DO FILTRO</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CARD: TABELA DE AUDITORIA */}
            <div className="audit-table-card">
              <div className="audit-table-header">
                <div className="audit-table-header-left">
                  <div className="table-title-row">
                    <h3 className="audit-table-title">RESULTADO DO FILTRO</h3>
                    <span className="audit-counter-badge">{filteredAudits.length} registro(s)</span>
                  </div>
                  <p className="audit-table-subtitle">
                    Estas são as entregas que serão incluídas no CSV e no PDF.
                  </p>
                </div>
                <div className="audit-table-header-right">
                  <div className="per-page-selector">
                    <CustomSelect
                      className="per-page-select-custom"
                      value={auditPerPage}
                      onChange={(val) => {
                        setAuditPerPage(Number(val))
                        setAuditPage(1)
                      }}
                      options={[
                        { value: 25, label: '25 por página' },
                        { value: 50, label: '50 por página' },
                        { value: 100, label: '100 por página' },
                        { value: 200, label: '200 por página' },
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-refresh-audit"
                    onClick={() => {
                      try {
                        const saved = localStorage.getItem(`entregas_run_audits_${currentEvent.id}`)
                        if (saved) {
                          setAudits(JSON.parse(saved))
                        }
                      } catch {
                        // ignore
                      }
                      setAuditPage(1)
                    }}
                    title="Atualizar lista"
                  >
                    <RefreshIcon />
                    <span>ATUALIZAR</span>
                  </button>
                </div>
              </div>

              {/* DICA VISUAL MOBILE DE ROLAGEM DA TABELA */}
              <div className="audit-mobile-scroll-indicator">
                <span>⇄ Deslize horizontalmente para ver todos os dados</span>
              </div>

              {/* TABELA */}
              <div className="audit-table-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px', textAlign: 'center' }}>COMPROVANTE</th>
                      <th style={{ width: '160px' }}>DATA / HORA</th>
                      <th>ATLETA</th>
                      <th style={{ width: '110px' }}>TIPO</th>
                      <th>RETIRADO POR</th>
                      <th>OPERADOR</th>
                      <th>PONTO DE ENTREGA</th>
                      <th>DETALHES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAudits.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="audit-empty-td">
                          Nenhuma entrega corresponde aos filtros atuais. Altere um dos filtros para tentar novamente.
                        </td>
                      </tr>
                    ) : (
                      paginatedAudits.map((item) => (
                        <tr key={item.id} className="audit-tr">
                          {/* 1. Comprovante */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-comprovante-print"
                              onClick={() => setSelectedComprovante(item)}
                              title={`Abrir comprovante individual desta entrega #${item.comprovanteId}`}
                            >
                              <PrinterIcon />
                            </button>
                          </td>

                          {/* 2. Data / Hora */}
                          <td className="audit-td-datetime">
                            {item.dataHora}
                          </td>

                          {/* 3. Atleta */}
                          <td className="audit-td-atleta">
                            <div className="atleta-name-main">{item.atletaNome}</div>
                            <div className="atleta-subline">
                              <span className="peito-badge-green">Nº {item.atletaNumero}</span>
                              <span className="cpf-subtext">· CPF: {item.atletaCpf || '***.***.***-**'}</span>
                            </div>
                          </td>

                          {/* 4. Tipo */}
                          <td>
                            <span className={`audit-badge-tipo ${item.tipo === 'ATLETA' ? 'badge-atleta' : 'badge-terceiro'}`}>
                              {item.tipo}
                            </span>
                          </td>

                          {/* 5. Retirado Por */}
                          <td className="audit-td-retirado">
                            <div className="retirado-name">{item.retiradoPor}</div>
                            {item.tipo === 'TERCEIRO' && item.terceiroParentesco && (
                              <div className="terceiro-parentesco-text">{item.terceiroParentesco}</div>
                            )}
                          </td>

                          {/* 6. Operador */}
                          <td className="audit-td-operador">
                            <div className="operador-pill">
                              <span className="operador-pill-label">OPERADOR:</span>
                              <span className="operador-pill-name">{item.operadorNome}</span>
                            </div>
                          </td>

                          {/* 7. Ponto de Entrega */}
                          <td className="audit-td-ponto">
                            {item.pontoEntrega || 'PONTO PRINCIPAL'}
                          </td>

                          {/* 8. Detalhes */}
                          <td className="audit-td-detalhes">
                            <span className="detalhe-kit-text">{item.kit}</span>
                            {item.camiseta && <span className="detalhe-camiseta-text"> · {item.camiseta}</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINAÇÃO FOOTER */}
              <div className="audit-pagination-bar">
                <div className="pagination-info">
                  Mostrando {filteredAudits.length === 0 ? 0 : startIndex + 1}–{endIndex} de {filteredAudits.length} entregas
                </div>

                <div className="pagination-controls">
                  <button
                    type="button"
                    className="page-nav-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setAuditPage(1)}
                    title="Primeira Página"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="page-nav-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    title="Página Anterior"
                  >
                    ‹
                  </button>

                  <span className="pagination-page-indicator">
                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    className="page-nav-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setAuditPage((p) => Math.min(totalPages, p + 1))}
                    title="Próxima Página"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    className="page-nav-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setAuditPage(totalPages)}
                    title="Última Página"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: NOVO ATLETA (DINÂMICO CONFORME TABELA ASSOCIADA) */}
        {showAddAthleteModal && (
          <div className="modal-backdrop">
            <div className="modal-card-athlete modal-card-athlete-dynamic">
              <div className="modal-athlete-header">
                <div>
                  <div className="modal-athlete-header-tags">
                    <span className="athlete-seq-badge">
                      PRÓXIMO SEQUENCIAL: #{athleteForm.numero || ''}
                    </span>
                    <span className="athlete-seq-source">
                      {athleteTableColumns.length > 0 ? 'Colunas da Tabela Oficial' : 'Cadastro Manual'}
                    </span>
                  </div>
                  <h2 className="modal-athlete-title">NOVO ATLETA</h2>
                </div>
                <button
                  type="button"
                  className="modal-athlete-close-btn"
                  onClick={() => setShowAddAthleteModal(false)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <form className="modal-athlete-body modal-athlete-body-dynamic" onSubmit={handleCreateAthlete}>
                {/* 1. CAMPOS PRINCIPAIS: NÚMERO & NOME COMPLETO */}
                <div className="athlete-dynamic-grid-2">
                  <div className="athlete-form-group">
                    <label className="athlete-form-label">
                      NÚMERO <span className="required-star">*</span>
                    </label>
                    <div className="athlete-number-input-wrap">
                      <input
                        type="text"
                        required
                        className="athlete-form-input highlight-number"
                        placeholder="Ex.: 301"
                        value={athleteForm.numero || ''}
                        onChange={(e) =>
                          setAthleteForm((prev) => ({ ...prev, numero: e.target.value }))
                        }
                      />
                      <span className="athlete-input-badge-seq">Sequencial</span>
                    </div>
                  </div>

                  <div className="athlete-form-group">
                    <label className="athlete-form-label">
                      NOME COMPLETO <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      className="athlete-form-input highlight-first"
                      placeholder="Nome completo do atleta"
                      value={athleteForm.nome || ''}
                      onChange={(e) =>
                        setAthleteForm((prev) => ({ ...prev, nome: e.target.value }))
                      }
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {/* 2. DEMAIS COLUNAS PADRÃO DA TABELA ASSOCIADA */}
                {availableStandardColumns.length > 0 && (
                  <div className="athlete-dynamic-grid">
                    {availableStandardColumns.map((col) => {
                      if (col.key === 'numero' || col.key === 'nome') return null

                      // Seletor de Camiseta com tamanhos detectados da base
                      if (col.key === 'camiseta') {
                        return (
                          <div key={col.key} className="athlete-form-group">
                            <label className="athlete-form-label">{col.label}</label>
                            <select
                              className="athlete-form-select"
                              value={athleteForm.camiseta || shirtOptions[0] || 'M'}
                              onChange={(e) =>
                                setAthleteForm((prev) => ({ ...prev, camiseta: e.target.value }))
                              }
                            >
                              {shirtOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      }

                      // Seletor de Sexo
                      if (col.key === 'sexo') {
                        return (
                          <div key={col.key} className="athlete-form-group">
                            <label className="athlete-form-label">{col.label}</label>
                            <select
                              className="athlete-form-select"
                              value={athleteForm.sexo || 'Masculino'}
                              onChange={(e) =>
                                setAthleteForm((prev) => ({ ...prev, sexo: e.target.value }))
                              }
                            >
                              <option value="Masculino">Masculino</option>
                              <option value="Feminino">Feminino</option>
                            </select>
                          </div>
                        )
                      }

                      // Seletor Morador/Visitante
                      if (col.key === 'morador') {
                        return (
                          <div key={col.key} className="athlete-form-group">
                            <label className="athlete-form-label">{col.label}</label>
                            <select
                              className="athlete-form-select"
                              value={athleteForm.morador || 'Morador'}
                              onChange={(e) =>
                                setAthleteForm((prev) => ({ ...prev, morador: e.target.value }))
                              }
                            >
                              <option value="Morador">Morador</option>
                              <option value="Visitante">Visitante</option>
                            </select>
                          </div>
                        )
                      }

                      // Campo de Nascimento com calendário
                      if (col.key === 'nascimento') {
                        return (
                          <div key={col.key} className="athlete-form-group">
                            <label className="athlete-form-label">{col.label}</label>
                            <div className="athlete-input-icon-wrap">
                              <input
                                type="text"
                                className="athlete-form-input"
                                placeholder="dd/mm/aaaa"
                                value={athleteForm.nascimento || ''}
                                onChange={(e) =>
                                  setAthleteForm((prev) => ({ ...prev, nascimento: e.target.value }))
                                }
                              />
                              <span className="input-end-icon">
                                <CalendarIcon />
                              </span>
                            </div>
                          </div>
                        )
                      }

                      // Campo genérico padrão (doc, chip, modalidade, categoria, kit, equipe, cidade, contato, nome_peito)
                      return (
                        <div key={col.key} className="athlete-form-group">
                          <label className="athlete-form-label">{col.label}</label>
                          <input
                            type="text"
                            className="athlete-form-input"
                            placeholder={col.key === 'doc' ? '000.000.000-00 ou RG' : `Preencher ${col.label.toLowerCase()}`}
                            value={athleteForm[col.key] || ''}
                            onChange={(e) =>
                              setAthleteForm((prev) => ({ ...prev, [col.key]: e.target.value }))
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 3. CAMPOS EXTRAS E PERSONALIZADOS DA TABELA ASSOCIADA (PCD, TAMANHO TÊNIS, ETC.) */}
                {availableCustomColumns.length > 0 && (
                  <div className="athlete-dynamic-custom-section">
                    <div className="athlete-custom-section-header">
                      <span className="badge-custom-cols">CAMPOS EXTRAS DA PLANILHA IMPORTADA</span>
                    </div>
                    <div className="athlete-dynamic-grid">
                      {availableCustomColumns.map((col) => (
                        <div key={col.key} className="athlete-form-group">
                          <label className="athlete-form-label">{col.label}</label>
                          <input
                            type="text"
                            className="athlete-form-input"
                            placeholder={`Preencher ${col.label.toLowerCase()}`}
                            value={athleteForm.customFields?.[col.customKey] || ''}
                            onChange={(e) =>
                              setAthleteForm((prev) => ({
                                ...prev,
                                customFields: {
                                  ...(prev.customFields || {}),
                                  [col.customKey]: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AÇÕES: CANCELAR & CADASTRAR ATLETA */}
                <div className="modal-athlete-actions">
                  <button
                    type="button"
                    className="btn-athlete-cancel"
                    onClick={() => setShowAddAthleteModal(false)}
                  >
                    CANCELAR
                  </button>
                  <button type="submit" className="btn-athlete-submit">
                    <UserPlusIcon />
                    <span>CADASTRAR ATLETA</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: QR CODE INDIVIDUAL DO ATLETA */}
        {qrModalAthlete && (
          <AthleteQrModal
            key={qrModalAthlete.id || qrModalAthlete.numero}
            isOpen={Boolean(qrModalAthlete)}
            onClose={() => setQrModalAthlete(null)}
            athlete={qrModalAthlete}
            event={currentEvent}
          />
        )}

        {/* MODAL: ESPELHO (ACESSO E APARÊNCIA) */}
        {showEspelhoModal && (
          <EspelhoModal
            key={currentEvent?.id}
            isOpen={showEspelhoModal}
            onClose={() => setShowEspelhoModal(false)}
            event={currentEvent}
          />
        )}

        {/* MODAL: IMPORTAR ATLETAS (XLSX / CSV) */}
        {showImportModal && (
          <ImportarAtletasModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            existingAthletes={athletes}
            onImportSuccess={handleImportSuccess}
          />
        )}

        {/* MODAL: ASSOCIAR PLANILHAS (ATLETAS + CHIPS) */}
        {showAssociarModal && (
          <AssociarPlanilhasModal
            isOpen={showAssociarModal}
            onClose={() => setShowAssociarModal(false)}
            existingAthletes={athletes}
            onImportSuccess={handleImportSuccess}
          />
        )}

        {/* MODAL: COMPROVANTE DE RETIRADA (2 VIAS) */}
        {selectedComprovante && (
          <div className="modal-backdrop" onClick={() => setSelectedComprovante(null)}>
            <div className="modal-card-comprovante" onClick={(e) => e.stopPropagation()}>
              <div className="comprovante-header">
                <div className="comprovante-header-left">
                  <div className="comprovante-icon-wrap">
                    <PrinterIcon />
                  </div>
                  <div>
                    <h3 className="comprovante-title">COMPROVANTE INDIVIDUAL DE RETIRADA</h3>
                    <p className="comprovante-subtitle">
                      Registro {selectedComprovante.comprovanteId} · {currentEvent?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-athlete-close-btn"
                  onClick={() => setSelectedComprovante(null)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="comprovante-body">
                <div className="printable-receipt-area">
                  {/* 1ª VIA: ORGANIZAÇÃO / ENTREGADOR */}
                  <div className="comprovante-ticket-box via-organizacao">
                    <div className="ticket-top-row">
                      <div className="ticket-brand-col">
                        <span className="ticket-logo-text">ENTREGAS RUN</span>
                        <span className="ticket-event-name">{currentEvent?.name}</span>
                      </div>
                      <span className="ticket-via-badge badge-org">1ª VIA — ORGANIZAÇÃO</span>
                    </div>

                    <div className="ticket-atleta-card">
                      <div className="ticket-peito-badge">Nº {selectedComprovante.atletaNumero}</div>
                      <div className="ticket-atleta-info">
                        <div className="ticket-nome">{selectedComprovante.atletaNome}</div>
                        <div className="ticket-cpf-sub">CPF: {selectedComprovante.atletaCpf || '***.***.***-**'}</div>
                      </div>
                    </div>

                    <div className="ticket-details-grid">
                      <div className="ticket-grid-col">
                        <span className="grid-label">DATA / HORA</span>
                        <span className="grid-val">{selectedComprovante.dataHora}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">TIPO</span>
                        <span className="grid-val">{selectedComprovante.tipo}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">RETIRADO POR</span>
                        <span className="grid-val">{selectedComprovante.retiradoPor}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">OPERADOR</span>
                        <span className="grid-val">{selectedComprovante.operadorNome}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">PONTO DE RETIRADA</span>
                        <span className="grid-val">{selectedComprovante.pontoEntrega || 'PONTO PRINCIPAL'}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">KIT & CAMISETA</span>
                        <span className="grid-val">{selectedComprovante.kit} {selectedComprovante.camiseta ? `· ${selectedComprovante.camiseta}` : ''}</span>
                      </div>
                    </div>

                    <div className="ticket-signature-section">
                      <div className="ticket-sig-line"></div>
                      <div className="ticket-sig-label">Assinatura do Recebedor ({selectedComprovante.retiradoPor})</div>
                      <div className="ticket-security-hash">CÓDIGO DO REGISTRO: ERUN-{selectedComprovante.comprovanteId}-{selectedComprovante.id?.slice(0, 8).toUpperCase()}</div>
                      <div className="ticket-via-notice">VIA RETIDA PELA ORGANIZAÇÃO DO EVENTO PARA AUDITORIA E SEGURANÇA</div>
                    </div>
                  </div>

                  {/* LINHA DE PICOTE DESTACÁVEL */}
                  <div className="receipt-cut-line">
                    <span className="cut-icon">✂</span>
                    <span className="cut-divider"></span>
                    <span className="cut-text">PICOTE / DESTAQUE AQUI</span>
                    <span className="cut-divider"></span>
                    <span className="cut-icon">✂</span>
                  </div>

                  {/* 2ª VIA: ATLETA */}
                  <div className="comprovante-ticket-box via-atleta">
                    <div className="ticket-top-row">
                      <div className="ticket-brand-col">
                        <span className="ticket-logo-text">ENTREGAS RUN</span>
                        <span className="ticket-event-name">{currentEvent?.name}</span>
                      </div>
                      <span className="ticket-via-badge badge-atleta">2ª VIA — ATLETA</span>
                    </div>

                    <div className="ticket-atleta-card">
                      <div className="ticket-peito-badge">Nº {selectedComprovante.atletaNumero}</div>
                      <div className="ticket-atleta-info">
                        <div className="ticket-nome">{selectedComprovante.atletaNome}</div>
                        <div className="ticket-cpf-sub">CPF: {selectedComprovante.atletaCpf || '***.***.***-**'}</div>
                      </div>
                    </div>

                    <div className="ticket-details-grid">
                      <div className="ticket-grid-col">
                        <span className="grid-label">DATA / HORA</span>
                        <span className="grid-val">{selectedComprovante.dataHora}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">MODALIDADE</span>
                        <span className="grid-val">{selectedComprovante.modalidade || '5 KM'}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">RETIRADO POR</span>
                        <span className="grid-val">{selectedComprovante.retiradoPor}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">OPERADOR RESPONSÁVEL</span>
                        <span className="grid-val">{selectedComprovante.operadorNome}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">KIT CONFERIDO</span>
                        <span className="grid-val">{selectedComprovante.kit}</span>
                      </div>
                      <div className="ticket-grid-col">
                        <span className="grid-label">TAMANHO CAMISETA</span>
                        <span className="grid-val">{selectedComprovante.camiseta || 'M'}</span>
                      </div>
                    </div>

                    <div className="ticket-signature-section">
                      <div className="ticket-termo-text">
                        Comprovante oficial do participante. Verifique todos os itens entregues. Guarde este recibo até o término da prova.
                      </div>
                      <div className="ticket-security-hash">CÓDIGO DO REGISTRO: ERUN-{selectedComprovante.comprovanteId}-{selectedComprovante.id?.slice(0, 8).toUpperCase()}</div>
                      <div className="ticket-via-notice atleta-notice">VIA DO ATLETA — BOA PROVA!</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="comprovante-footer-actions">
                <button
                  type="button"
                  className="btn-athlete-cancel"
                  onClick={() => setSelectedComprovante(null)}
                >
                  FECHAR
                </button>
                <button
                  type="button"
                  className="btn-print-action"
                  onClick={() => window.print()}
                >
                  <PrinterIcon />
                  <span>IMPRIMIR COMPROVANTE — 2 VIAS</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
