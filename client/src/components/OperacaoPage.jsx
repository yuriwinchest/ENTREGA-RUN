import { useEffect, useState } from 'react'
import Sidebar from './Sidebar.jsx'
import EspelhoModal from './EspelhoModal.jsx'
import ImportarAtletasModal from './ImportarAtletasModal.jsx'
import AssociarPlanilhasModal from './AssociarPlanilhasModal.jsx'
import CustomSelect from './CustomSelect.jsx'
import { exportCsvFile } from '../utils/auditData.js'
import './OperacaoPage.css'

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

  // Modal Novo Atleta
  const [showAddAthleteModal, setShowAddAthleteModal] = useState(false)
  const [athleteForm, setAthleteForm] = useState(INITIAL_ATHLETE_FORM)

  // Modal Espelho (Acesso e Aparência)
  const [showEspelhoModal, setShowEspelhoModal] = useState(false)

  // Selected athlete for detailed kit delivery view (Photo reference)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [detailForm, setDetailForm] = useState(null)

  const currentEvent = event || {
    id: '',
    name: 'SELECIONE UM EVENTO',
    date: '',
    dateInput: '',
    location: '',
    total: 0,
    entregues: 0,
    pendentes: 0,
    concl: '0.0%',
  }

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

  // Save athletes to localStorage
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
  }, [athletes, currentEvent.id])

  // Deliveries list
  const [deliveries, setDeliveries] = useState(() => {
    try {
      if (!currentEvent.id) return []
      const saved = localStorage.getItem(`entregas_run_deliveries_${currentEvent.id}`)
      if (saved) return JSON.parse(saved)
      return []
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
              timestamp: Date.now(),
              atletaNumero: athlete.numero,
              atletaNome: athlete.nome,
              atletaCpf: athlete.doc || '—',
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
            timestamp: Date.now(),
            atletaNumero: athlete.numero,
            atletaNome: athlete.nome,
            atletaCpf: athlete.doc || '—',
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
  const [auditOnlyMatches, setAuditOnlyMatches] = useState(false)
  const [auditIncludeComprovantes, setAuditIncludeComprovantes] = useState(true)
  const [auditPreset, setAuditPreset] = useState('tudo')
  const [auditPerPage, setAuditPerPage] = useState(50)
  const [auditPage, setAuditPage] = useState(1)

  // Selected comprovante modal / preview
  const [selectedComprovante, setSelectedComprovante] = useState(null)

  function handleImportSuccess(newAthletes, options = {}) {
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
    const filename = `atletas_${(currentEvent?.name || 'evento').toLowerCase().replace(/\s+/g, '_')}.csv`
    exportCsvFile(athletes, filename)
  }

  function handleExportAuditsCsv() {
    const filename = `auditoria_entregas_${(currentEvent?.name || 'evento').toLowerCase().replace(/\s+/g, '_')}.csv`
    const headers = [
      'COMPROVANTE',
      'DATA_HORA',
      'NUMERO',
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
    const rows = filteredAudits.map((a) => [
      a.comprovanteId || '',
      a.dataHora || '',
      a.atletaNumero || '',
      `"${(a.atletaNome || '').replace(/"/g, '""')}"`,
      a.atletaCpf || '',
      a.tipo || '',
      `"${(a.retiradoPor || '').replace(/"/g, '""')}"`,
      `"${(a.operadorNome || '').replace(/"/g, '""')}"`,
      `"${(a.pontoEntrega || '').replace(/"/g, '""')}"`,
      `"${(a.kit || '').replace(/"/g, '""')}"`,
      a.camiseta || '',
      `"${(a.modalidade || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handlePrintAuditPdf() {
    window.print()
  }

  // Filter audits based on user criteria
  const filteredAudits = audits.filter((item) => {
    if (auditSearch.trim()) {
      const q = auditSearch.trim().toLowerCase()
      const nome = (item.atletaNome || '').toLowerCase()
      const peito = String(item.atletaNumero || '').toLowerCase()
      const cpf = (item.atletaCpf || '').toLowerCase().replace(/\D/g, '')
      const qClean = q.replace(/\D/g, '')

      let match = false
      if (auditMatchMode === 'exato') {
        match = nome === q || peito === q || (qClean && cpf === qClean)
      } else if (auditMatchMode === 'inicia') {
        match = nome.startsWith(q) || peito.startsWith(q) || (qClean && cpf.startsWith(qClean))
      } else {
        match = nome.includes(q) || peito.includes(q) || (qClean && cpf.includes(qClean))
      }
      if (!match) return false
    }

    if (auditOperatorFilter !== 'TODOS') {
      if (item.operadorNome !== auditOperatorFilter) return false
    }

    if (auditTypeFilter !== 'TODOS') {
      if (item.tipo !== auditTypeFilter) return false
    }

    return true
  })

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

  // Open Athlete Detail View
  function handleOpenAthleteDetail(athleteId) {
    const athlete = athletes.find(
      (a) => String(a.numero) === String(athleteId) || String(a.id) === String(athleteId)
    )

    if (athlete) {
      setSelectedAthlete(athlete)
      setDetailForm({
        numero: athlete.numero || athlete.id,
        nome: athlete.nome,
        doc: athlete.doc || '',
        nascimento: athlete.nascimento || '17/02/2001',
        sexo: athlete.sexo || 'Masculino',
        modalidade: athlete.modalidade || '5 KM',
        categoria: athlete.categoria || 'GERAL',
        equipe: athlete.equipe || '—',
        nacionalidade: athlete.nacionalidade || 'BRASIL',
        kit: athlete.kit || 'KIT ELITE',
        camiseta: athlete.camiseta || 'M',
        chip: athlete.chip || '6855',
        morador: athlete.morador || 'Morador',
        contato: athlete.contato || '',
        entreguePara: athlete.entreguePara || athlete.nome,
        entregueEm: athlete.entregueEm || '16/09/2026, 20:15:37',
        entreguePor: athlete.entreguePor || 'f58694b1-bce0-4ff8-a71c-e2301bb0fb31',
        status: athlete.status || 'ENTREGUE',
      })
    } else {
      // Fallback if opened from delivery item not yet in athletes
      const deliveryItem = deliveries.find((d) => String(d.id) === String(athleteId))
      const fallbackAthlete = {
        id: String(athleteId),
        numero: String(athleteId),
        nome: deliveryItem?.name || 'ATLETA',
        doc: deliveryItem?.doc || '',
        nascimento: '17/02/2001',
        sexo: 'Masculino',
        modalidade: '5 KM',
        categoria: deliveryItem?.category || 'GERAL',
        equipe: '—',
        nacionalidade: 'BRASIL',
        kit: deliveryItem?.kit || 'KIT ELITE',
        camiseta: deliveryItem?.size || 'M',
        chip: '6855',
        morador: 'Morador',
        contato: '',
        entreguePara: deliveryItem?.name || 'ATLETA',
        entregueEm: '16/09/2026, 20:15:37',
        entreguePor: 'f58694b1-bce0-4ff8-a71c-e2301bb0fb31',
        status: 'ENTREGUE',
      }
      setSelectedAthlete(fallbackAthlete)
      setDetailForm({ ...fallbackAthlete })
    }
    setActiveTab('entrega')
  }

  // Save changes from Detail View
  function handleSaveDetail(e) {
    if (e) e.preventDefault()
    if (isOperator) return
    if (!detailForm || !selectedAthlete) return

    const updated = athletes.map((a) => {
      if (String(a.numero) === String(selectedAthlete.numero) || String(a.id) === String(selectedAthlete.id)) {
        return {
          ...a,
          ...detailForm,
          nome: detailForm.nome.toUpperCase(),
          numero: detailForm.numero,
        }
      }
      return a
    })
    setAthletes(updated)

    // Update deliveries if name or size changed
    setDeliveries((prev) =>
      prev.map((d) => {
        if (String(d.id) === String(selectedAthlete.numero)) {
          return {
            ...d,
            name: detailForm.nome.toUpperCase(),
            doc: detailForm.doc,
            category: detailForm.categoria,
            size: detailForm.camiseta,
            kit: detailForm.kit,
          }
        }
        return d
      })
    )

    // Sincroniza dados com o histórico de Auditoria
    setAudits((prev) =>
      prev.map((item) => {
        if (String(item.atletaNumero) === String(selectedAthlete.numero)) {
          return {
            ...item,
            atletaNome: detailForm.nome.toUpperCase(),
            atletaCpf: detailForm.doc || item.atletaCpf,
            retiradoPor: detailForm.entreguePara || detailForm.nome,
            tipo:
              detailForm.entreguePara &&
              detailForm.entreguePara.trim().toUpperCase() !== detailForm.nome.trim().toUpperCase()
                ? 'TERCEIRO'
                : 'ATLETA',
            kit: detailForm.kit || item.kit,
            camiseta: detailForm.camiseta || item.camiseta,
            modalidade: detailForm.modalidade || item.modalidade,
          }
        }
        return item
      })
    )

    setSelectedAthlete(null)
    setDetailForm(null)
  }

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
  }

  // Handle Add Athlete Submission
  function handleCreateAthlete(e) {
    e.preventDefault()
    if (isOperator) return
    if (!athleteForm.nome.trim() || !athleteForm.numero.trim()) return

    const newAthlete = {
      id: `ath-${Date.now()}`,
      numero: athleteForm.numero.trim(),
      nome: athleteForm.nome.trim().toUpperCase(),
      doc: athleteForm.cpf.trim() || '—',
      nascimento: athleteForm.nascimento.trim(),
      sexo: athleteForm.sexo,
      modalidade: athleteForm.modalidade.trim() || '5 KM',
      categoria: athleteForm.categoria.trim() || 'GERAL',
      equipe: athleteForm.equipe.trim() ? athleteForm.equipe.trim().toUpperCase() : 'SEM EQUIPE',
      camiseta: athleteForm.camiseta,
      kit: athleteForm.kit.trim() || 'Kit Padrão',
      chip: athleteForm.chip.trim(),
      status: 'PENDENTE',
      createdAt: new Date().toISOString(),
    }

    const updatedAthletes = [newAthlete, ...athletes]
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

    setAthleteForm(INITIAL_ATHLETE_FORM)
    setShowAddAthleteModal(false)
  }

  // Deliver kit to an athlete directly
  function handleDeliverKit(athlete) {
    if (athlete.status === 'ENTREGUE') {
      return audits.find((a) => String(a.atletaNumero) === String(athlete.numero))
    }

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

    // Mark athlete as ENTREGUE
    setAthletes((prev) =>
      prev.map((a) =>
        String(a.numero) === String(athlete.numero)
          ? {
              ...a,
              status: 'ENTREGUE',
              entregueEm: dataHoraFormatada,
              entreguePor: opName,
              entreguePara: athlete.nome,
            }
          : a
      )
    )

    // Add delivery record
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
    setDeliveries((prev) => [newDelivery, ...prev])

    // Registra na Auditoria
    const newAudit = {
      id: `aud-${Date.now()}-${athlete.numero}`,
      comprovanteId: `CPR-${Math.floor(100000 + Math.random() * 900000)}`,
      dataHora: dataHoraFormatada,
      timestamp: Date.now(),
      atletaNumero: athlete.numero,
      atletaNome: athlete.nome,
      atletaCpf: athlete.doc || '—',
      tipo: 'ATLETA',
      retiradoPor: athlete.nome,
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

    return newAudit
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

  // Filtered Athletes for Tab 2
  const filteredAthletes = athletes.filter((a) => {
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

  // Filtered Athletes for Tab 1 (Kit Search)
  const searchResultsKit = kitSearch.trim()
    ? athletes.filter((a) => {
        const q = kitSearch.toLowerCase().trim()
        return (
          (a.nome && a.nome.toLowerCase().includes(q)) ||
          (a.numero && String(a.numero).includes(q)) ||
          (a.doc && a.doc.toLowerCase().includes(q))
        )
      })
    : []

  const hasDeliveries = deliveries.length > 0
  const hasAthletes = athletes.length > 0

  return (
    <div className="operacao-layout">
      <Sidebar activePage="operacao" onNavigate={onNavigate} onLogout={onLogout} user={user} />

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
              onClick={() => onNavigate('eventos')}
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
              <span className="banner-stat-val white">{currentEvent.total || 0}</span>
            </div>

            <div className="banner-stat-col">
              <span className="banner-stat-label">ENTREGUES</span>
              <span className="banner-stat-val green">{currentEvent.entregues || 0}</span>
            </div>

            <div className="banner-stat-col">
              <span className="banner-stat-label">PENDENTES</span>
              <span className="banner-stat-val amber">{currentEvent.pendentes || 0}</span>
            </div>

            <div className="banner-stat-col">
              <span className="banner-stat-label">% CONCL.</span>
              <span className="banner-stat-val orange">{currentEvent.concl || '0.0%'}</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs Bar */}
        <nav className="operacao-tabs-row">
          <button
            type="button"
            className={`operacao-subtab ${effectiveTab === 'entrega' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('entrega')
            }}
          >
            <ZapIcon />
            <span className="tab-label-full">ENTREGA DE KIT</span>
            <span className="tab-label-short">ENTREGA</span>
          </button>

          <button
            type="button"
            className={`operacao-subtab ${effectiveTab === 'atletas' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('atletas')
              setSelectedAthlete(null)
            }}
          >
            <UsersTabIcon />
            <span>ATLETAS</span>
          </button>

          <button
            type="button"
            className={`operacao-subtab ${effectiveTab === 'estatisticas' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('estatisticas')
              setSelectedAthlete(null)
            }}
          >
            <BarChartTabIcon />
            <span className="tab-label-full">ESTATÍSTICAS</span>
            <span className="tab-label-short">ESTATÍSTICA</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`operacao-subtab ${effectiveTab === 'auditoria' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('auditoria')
                setSelectedAthlete(null)
              }}
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
                      <button
                        type="button"
                        className="btn-detail-entregar"
                        onClick={() => {
                          handleDeliverKit(selectedAthlete)
                          setSelectedAthlete(null)
                        }}
                        title="Confirmar entrega do kit"
                      >
                        <CheckCircleIcon />
                        <span>ENTREGAR KIT</span>
                      </button>
                      <button
                        type="button"
                        className="btn-detail-entregar-print"
                        onClick={() => {
                          const auditRec = handleDeliverKit(selectedAthlete)
                          setSelectedAthlete(null)
                          handleOpenComprovante(auditRec || selectedAthlete)
                        }}
                        title="Confirmar entrega e abrir comprovante (2 Vias)"
                      >
                        <PrinterIcon />
                        <span>ENTREGAR & IMPRIMIR</span>
                      </button>
                    </>
                  )}

                  {!isOperator && (
                    <button
                      type="button"
                      className="btn-detail-save"
                      onClick={handleSaveDetail}
                      title="Salvar alterações"
                    >
                      <SaveIcon />
                      <span>SALVAR</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-detail-cancel"
                    onClick={() => {
                      setSelectedAthlete(null)
                      setDetailForm(null)
                    }}
                    title="Cancelar e voltar à lista"
                  >
                    <CancelIcon />
                    <span>CANCELAR</span>
                  </button>
                </div>

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
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, nome: e.target.value })
                        }
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
                        <option value="5 KM">5 KM</option>
                        <option value="10 KM">10 KM</option>
                        <option value="21 KM">21 KM</option>
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
                                  [k]: newVal,
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
                              className="athlete-main clickable-athlete"
                              onClick={() => handleOpenAthleteDetail(athlete.numero)}
                              title="Ver detalhes do atleta"
                            >
                              <span className="athlete-peito">#{athlete.numero}</span>
                              <span className="athlete-name">{athlete.nome}</span>
                              <span className="athlete-doc">— {athlete.doc}</span>
                            </div>
                            <div className="delivery-tags">
                              {Boolean(athlete.pcd || athlete.customFields?.['PCD'] || athlete.customFields?.['PCD MEMBROS INFERIORES']) && (
                                <span className="tag-pcd-badge" title="Atleta PCD">
                                  ♿ {athlete.pcd || athlete.customFields?.['PCD MEMBROS INFERIORES'] || athlete.customFields?.['PCD'] || 'PCD'}
                                </span>
                              )}
                              <span className="tag-gray">{athlete.categoria}</span>
                              <span className="tag-gray">CAMISETA {athlete.camiseta}</span>
                              <span className="tag-gray">{athlete.kit}</span>
                              {athlete.status === 'ENTREGUE' ? (
                                <button
                                  type="button"
                                  className="tag-green btn-view-badge"
                                  onClick={() => handleOpenAthleteDetail(athlete.numero)}
                                >
                                  ENTREGUE
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-entregar-inline"
                                  onClick={() => handleDeliverKit(athlete)}
                                >
                                  ENTREGAR KIT
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <section className="ultimas-entregas-section">
                  <div className="ultimas-entregas-header">
                    <h3 className="section-heading">ÚLTIMAS ENTREGAS</h3>
                    <button type="button" className="refresh-btn" title="Atualizar">
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
                        {deliveries.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="delivery-item-row"
                            onClick={() => handleOpenAthleteDetail(item.id)}
                            title="Clique para ver dados completos e entrega deste atleta"
                          >
                            <div className="athlete-main">
                              <span className="athlete-peito">#{item.id}</span>
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
                    onClick={() => setShowAddAthleteModal(true)}
                  >
                    <UserPlusIcon />
                    <span>NOVO</span>
                  </button>
                )}
              </div>
            </div>

            <div className="atletas-table-card">
              <div className="table-responsive">
                <table className="atletas-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px' }}>#</th>
                      <th>NOME</th>
                      <th>DOCUMENTO</th>
                      <th>MODALIDADE</th>
                      <th>CATEGORIA</th>
                      <th>CAMISETA</th>
                      <th>EQUIPE</th>
                      <th>KIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAthletes.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="empty-table-cell">
                          Nenhum atleta encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredAthletes.map((a) => (
                        <tr
                          key={a.id || a.numero}
                          onClick={() => handleOpenAthleteDetail(a.numero)}
                          style={{ cursor: 'pointer' }}
                          title="Clique para abrir detalhes do atleta"
                        >
                          <td>{a.numero}</td>
                          <td style={{ fontWeight: 700, color: '#0c142c' }}>{a.nome}</td>
                          <td>{a.doc || '—'}</td>
                          <td>{a.modalidade || '5 KM'}</td>
                          <td>{a.categoria || 'GERAL'}</td>
                          <td>{a.camiseta || 'M'}</td>
                          <td>{a.equipe || '—'}</td>
                          <td>{a.kit || 'Kit Padrão'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="atletas-table-footer">
              <span>
                Mostrando {filteredAthletes.length} de {athletes.length} atletas.
              </span>
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
                <div className="stat-overview-number">{currentEvent.total || 0}</div>
              </div>

              <div className="stat-overview-card">
                <div className="stat-overview-top">
                  <span className="stat-overview-label">ENTREGUES</span>
                  <CheckCircleIcon />
                </div>
                <div className="stat-overview-number green">{currentEvent.entregues || 0}</div>
              </div>

              <div className="stat-overview-card">
                <div className="stat-overview-top">
                  <span className="stat-overview-label">PENDENTES</span>
                  <PackageIcon />
                </div>
                <div className="stat-overview-number amber">{currentEvent.pendentes || 0}</div>
              </div>

              <div className="stat-overview-card">
                <div className="stat-overview-top">
                  <span className="stat-overview-label">% CONCLUÍDO</span>
                  <PercentIcon />
                </div>
                <div className="stat-overview-number orange">{currentEvent.concl || '0.0%'}</div>
              </div>
            </div>

            {/* Camisetas Section */}
            <section className="estatisticas-section">
              <h3 className="section-heading">CAMISETAS</h3>
              <div className="simple-white-box">
                {!hasAthletes ? (
                  <div className="empty-message-box">
                    Nenhum dado de camiseta registrado ainda.
                  </div>
                ) : (
                  <div className="stat-tags-summary">
                    {['P', 'M', 'G', 'GG', 'XG'].map((size) => {
                      const count = athletes.filter((a) => a.camiseta === size).length
                      return (
                        <div key={size} className="summary-pill">
                          <span className="summary-pill-label">CAMISETA {size}</span>
                          <span className="summary-pill-count">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Modalidades Section */}
            <section className="estatisticas-section">
              <h3 className="section-heading">MODALIDADES</h3>
              <div className="simple-white-box">
                {!hasAthletes ? (
                  <div className="empty-message-box">
                    Nenhuma modalidade registrada ainda.
                  </div>
                ) : (
                  <div className="stat-tags-summary">
                    <div className="summary-pill">
                      <span className="summary-pill-label">5 KM</span>
                      <span className="summary-pill-count">{athletes.length}</span>
                    </div>
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
                  <h3 className="planilha-box-title">PLANILHA DE ATLETAS</h3>
                  <p className="planilha-box-subtitle">
                    Importe sua planilha base (XLSX, XLS ou CSV) com mapeamento de colunas ou exporte o consolidado com entregas.
                  </p>
                </div>
              </div>
              <div className="planilha-box-actions">
                <button
                  type="button"
                  className="btn-export-planilha"
                  onClick={handleExportPlanilha}
                  title="Exportar dados de atletas em formato CSV"
                >
                  <DownloadIcon />
                  <span>EXPORTAR PLANILHA</span>
                </button>
                <button
                  type="button"
                  className="btn-import-planilha"
                  onClick={() => setShowImportModal(true)}
                  title="Abrir assistente de importação de planilha"
                >
                  <UploadIcon />
                  <span>IMPORTAR PLANILHA</span>
                </button>
                <button
                  type="button"
                  className="btn-associar-planilha"
                  onClick={() => setShowAssociarModal(true)}
                  title="Unir planilha de atletas e planilha de chips"
                >
                  <LinkSpreadsheetIcon />
                  <span>ASSOCIAR PLANILHA</span>
                </button>
                <button
                  type="button"
                  className="btn-restore-planilha"
                  onClick={handleRestoreOriginalAthletes}
                  title="Restaurar a planilha base original importada para este evento"
                >
                  <RefreshIcon />
                  <span>RESTAURAR BASE</span>
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
                    <h3 className="filtros-card-title">FILTROS</h3>
                    <p className="filtros-card-subtitle">
                      Filtre as entregas por atleta, operador, período ou tipo de retirada.
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
                    <label className="filtro-label">OPERADOR</label>
                    <CustomSelect
                      className="filtro-select-custom"
                      value={auditOperatorFilter}
                      onChange={(val) => {
                        setAuditOperatorFilter(val)
                        setAuditPage(1)
                      }}
                      options={[
                        { value: 'TODOS', label: 'TODOS OS OPERADORES' },
                        ...operators.map((op) => ({ value: op.name, label: op.name })),
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

                  <div className="filtro-checkbox-wrap">
                    <label className="custom-checkbox-label">
                      <input
                        type="checkbox"
                        checked={auditOnlyMatches}
                        onChange={(e) => setAuditOnlyMatches(e.target.checked)}
                      />
                      <span>Considerar apenas atleta correspondente</span>
                    </label>
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
                      <span>Incluir comprovante</span>
                    </label>
                  </div>

                  <div className="filtro-field preset-field">
                    <label className="filtro-label">PRESET</label>
                    <CustomSelect
                      className="filtro-select-custom"
                      value={auditPreset}
                      onChange={(val) => setAuditPreset(val)}
                      options={[
                        { value: 'tudo', label: 'Tudo' },
                        { value: 'apenas_entregues', label: 'Apenas entregues' },
                        { value: 'apenas_nao_entregues', label: 'Apenas não entregues' },
                      ]}
                    />
                  </div>

                  <div className="filtros-export-actions">
                    <button
                      type="button"
                      className="btn-filtro-action"
                      onClick={handleExportAuditsCsv}
                      title="Exportar registros filtrados em CSV"
                    >
                      <DownloadIcon />
                      <span>CSV</span>
                    </button>
                    <button
                      type="button"
                      className="btn-filtro-action"
                      onClick={handlePrintAuditPdf}
                      title="Imprimir ou salvar em PDF"
                    >
                      <FilePdfIcon />
                      <span>PDF</span>
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
                    <h3 className="audit-table-title">ENTREGAS NO PERÍODO</h3>
                    <span className="audit-counter-badge">{filteredAudits.length} registro(s)</span>
                  </div>
                  <p className="audit-table-subtitle">
                    Histórico detalhado de retiradas com operador, data/hora e comprovante.
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
                          Nenhum registro encontrado para os filtros selecionados.
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
                              title={`Imprimir Comprovante #${item.comprovanteId}`}
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
                              <span className="peito-badge-green">#{item.atletaNumero}</span>
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

        {/* MODAL: NOVO ATLETA */}
        {showAddAthleteModal && (
          <div className="modal-backdrop">
            <div className="modal-card-athlete">
              <div className="modal-athlete-header">
                <h2 className="modal-athlete-title">NOVO ATLETA</h2>
                <button
                  type="button"
                  className="modal-athlete-close-btn"
                  onClick={() => setShowAddAthleteModal(false)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <form className="modal-athlete-body" onSubmit={handleCreateAthlete}>
                {/* NOME COMPLETO * */}
                <div className="athlete-form-group">
                  <label className="athlete-form-label">
                    NOME COMPLETO <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="athlete-form-input highlight-first"
                    value={athleteForm.nome}
                    onChange={(e) =>
                      setAthleteForm({ ...athleteForm, nome: e.target.value })
                    }
                    autoFocus
                    required
                  />
                </div>

                {/* CPF & NASCIMENTO */}
                <div className="athlete-row-2">
                  <div className="athlete-form-group">
                    <label className="athlete-form-label">CPF</label>
                    <input
                      type="text"
                      className="athlete-form-input"
                      placeholder="000.000.000-00"
                      value={athleteForm.cpf}
                      onChange={(e) =>
                        setAthleteForm({ ...athleteForm, cpf: e.target.value })
                      }
                    />
                  </div>

                  <div className="athlete-form-group">
                    <label className="athlete-form-label">NASCIMENTO</label>
                    <div className="athlete-input-icon-wrap">
                      <input
                        type="text"
                        className="athlete-form-input"
                        placeholder="dd/mm/aaaa"
                        value={athleteForm.nascimento}
                        onChange={(e) =>
                          setAthleteForm({
                            ...athleteForm,
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

                {/* SEXO & MODALIDADE */}
                <div className="athlete-row-2">
                  <div className="athlete-form-group">
                    <label className="athlete-form-label">SEXO</label>
                    <select
                      className="athlete-form-select"
                      value={athleteForm.sexo}
                      onChange={(e) =>
                        setAthleteForm({ ...athleteForm, sexo: e.target.value })
                      }
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>

                  <div className="athlete-form-group">
                    <label className="athlete-form-label">MODALIDADE</label>
                    <input
                      type="text"
                      className="athlete-form-input"
                      value={athleteForm.modalidade}
                      onChange={(e) =>
                        setAthleteForm({
                          ...athleteForm,
                          modalidade: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* 4. CATEGORIA & EQUIPE */}
                <div className="athlete-row-2">
                  <div className="athlete-form-group">
                    <label className="athlete-form-label">CATEGORIA</label>
                    <input
                      type="text"
                      className="athlete-form-input"
                      value={athleteForm.categoria}
                      onChange={(e) =>
                        setAthleteForm({
                          ...athleteForm,
                          categoria: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="athlete-form-group">
                    <label className="athlete-form-label">EQUIPE</label>
                    <input
                      type="text"
                      className="athlete-form-input"
                      placeholder="Opcional"
                      value={athleteForm.equipe}
                      onChange={(e) =>
                        setAthleteForm({
                          ...athleteForm,
                          equipe: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* 5. CAMISETA, KIT & NÚMERO */}
                <div className="athlete-row-3">
                  <div className="athlete-form-group">
                    <label className="athlete-form-label">CAMISETA</label>
                    <select
                      className="athlete-form-select"
                      value={athleteForm.camiseta}
                      onChange={(e) =>
                        setAthleteForm({
                          ...athleteForm,
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

                  <div className="athlete-form-group">
                    <label className="athlete-form-label">KIT</label>
                    <input
                      type="text"
                      className="athlete-form-input"
                      value={athleteForm.kit}
                      onChange={(e) =>
                        setAthleteForm({
                          ...athleteForm,
                          kit: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="athlete-form-group">
                    <label className="athlete-form-label">
                      NÚMERO <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="athlete-form-input"
                      placeholder="Ex.: 350"
                      value={athleteForm.numero}
                      onChange={(e) =>
                        setAthleteForm({
                          ...athleteForm,
                          numero: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* 6. CHIP */}
                <div className="athlete-form-group">
                  <label className="athlete-form-label">CHIP</label>
                  <input
                    type="text"
                    className="athlete-form-input"
                    placeholder="Opcional"
                    value={athleteForm.chip}
                    onChange={(e) =>
                      setAthleteForm({ ...athleteForm, chip: e.target.value })
                    }
                  />
                </div>

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
                    <h3 className="comprovante-title">COMPROVANTE DE RETIRADA (2 VIAS)</h3>
                    <p className="comprovante-subtitle">
                      Registro #{selectedComprovante.comprovanteId} · {currentEvent?.name}
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
                      <div className="ticket-peito-badge">#{selectedComprovante.atletaNumero}</div>
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
                      <div className="ticket-security-hash">CÓDIGO DE AUTENTICIDADE: ERUN-{selectedComprovante.comprovanteId}-{selectedComprovante.id?.slice(0, 8).toUpperCase()}</div>
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
                      <div className="ticket-peito-badge">#{selectedComprovante.atletaNumero}</div>
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
                      <div className="ticket-security-hash">CÓDIGO DE AUTENTICIDADE: ERUN-{selectedComprovante.comprovanteId}-{selectedComprovante.id?.slice(0, 8).toUpperCase()}</div>
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
                  <span>IMPRIMIR 2 VIAS</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
