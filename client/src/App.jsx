import { useEffect, useState } from 'react'
import DashboardPage from './components/DashboardPage.jsx'
import EventDashboardPage from './components/EventDashboardPage.jsx'
import EventosPage from './components/EventosPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import OperacaoPage from './components/OperacaoPage.jsx'
import EspelhoPage from './components/EspelhoPage.jsx'
import TutorialModal from './components/TutorialModal.jsx'
import UsuariosPage from './components/UsuariosPage.jsx'

const DEFAULT_EVENTS = [
  {
    id: '11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6',
    date: '16 SET 2026',
    dateInput: '16/09/2026',
    name: 'TREINÃO DA GALINHA',
    location: 'SÃO BENTO DO UNA',
    status: 'EM OPERAÇÃO',
    active: true,
    total: 409,
    entregues: 392,
    pendentes: 17,
    concl: '95.8%',
  },
  {
    id: '22c2fb52-9b9d-4f50-ad9a-3bffa67b00b7',
    date: '19 SET 2026',
    dateInput: '19/09/2026',
    name: 'CORRE SURUBIM',
    location: 'SURUBIM',
    status: 'PLANEJADO',
    active: false,
    total: 350,
    entregues: 0,
    pendentes: 350,
    concl: '0.0%',
  },
  {
    id: '33c3fb52-9b9d-4f50-ad9a-3bffa67b00c8',
    date: '15 SET 2026',
    dateInput: '15/09/2026',
    name: 'YURI2TESTE',
    location: 'piaui',
    status: 'PLANEJADO',
    active: false,
    total: 0,
    entregues: 0,
    pendentes: 0,
    concl: '0.0%',
  },
]

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('entregas_run_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('entregas_run_events')
      return saved ? JSON.parse(saved) : DEFAULT_EVENTS
    } catch {
      return DEFAULT_EVENTS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('entregas_run_events', JSON.stringify(events))
    } catch {
      // ignore
    }
  }, [events])

  const [selectedEventId, setSelectedEventId] = useState(() => {
    const path = window.location.pathname
    const parts = path.split('/')
    if (parts.length > 2 && parts[2]) {
      return parts[2]
    }
    return '33c3fb52-9b9d-4f50-ad9a-3bffa67b00c8'
  })

  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname
    if (path.startsWith('/espelho')) return 'espelho'
    if (path.startsWith('/operacao')) return 'operacao'
    if (path.startsWith('/eventos')) return 'eventos'
    if (path.startsWith('/usuarios')) return 'usuarios'
    if (path.startsWith('/dashboard/')) return 'event-dashboard'
    if (path.startsWith('/dashboard')) return 'dashboard'
    return 'dashboard'
  })

  const [tutorialStep, setTutorialStep] = useState(1)
  const [showTutorial, setShowTutorial] = useState(false)

  // Sync browser back/forward buttons
  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname
      if (path.startsWith('/espelho')) {
        const parts = path.split('/')
        if (parts[2]) setSelectedEventId(parts[2])
        setCurrentPage('espelho')
      } else if (path.startsWith('/operacao')) {
        const parts = path.split('/')
        if (parts[2]) setSelectedEventId(parts[2])
        setCurrentPage('operacao')
      } else if (path.startsWith('/eventos')) {
        setCurrentPage('eventos')
      } else if (path.startsWith('/usuarios')) {
        setCurrentPage('usuarios')
      } else if (path.startsWith('/dashboard/')) {
        const parts = path.split('/')
        if (parts[2]) setSelectedEventId(parts[2])
        setCurrentPage('event-dashboard')
      } else if (path.startsWith('/dashboard')) {
        setCurrentPage('dashboard')
      } else {
        setCurrentPage(user ? 'dashboard' : 'login')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [user])

  function navigateTo(page, id) {
    if (id) {
      setSelectedEventId(id)
    }
    setCurrentPage(page)
    let path = '/dashboard'
    if (page === 'espelho') {
      path = `/espelho/${id || selectedEventId || '11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6'}`
    } else if (page === 'eventos') {
      path = '/eventos'
    } else if (page === 'operacao') {
      path = `/operacao/${id || selectedEventId || '33c3fb52-9b9d-4f50-ad9a-3bffa67b00c8'}`
    } else if (page === 'event-dashboard') {
      path = `/dashboard/${id || selectedEventId || '11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6'}`
    } else if (page === 'usuarios') {
      path = '/usuarios'
    } else if (page === 'login') {
      path = '/'
    }
    window.history.pushState(null, '', path)
  }

  function handleLoginSuccess(userData) {
    const adminUser = {
      email: userData?.email || 'pacetime@entregas.com',
      name: 'FELIPE',
      role: 'ADMIN',
    }
    setUser(adminUser)
    try {
      localStorage.setItem('entregas_run_user', JSON.stringify(adminUser))
    } catch {
      // ignore
    }
    navigateTo('dashboard')
  }

  function handleLogout() {
    setUser(null)
    setShowTutorial(false)
    try {
      localStorage.removeItem('entregas_run_user')
    } catch {
      // ignore
    }
    navigateTo('login')
  }

  function handleOpenTutorial() {
    setTutorialStep(1)
    setShowTutorial(true)
  }

  function handleTutorialStepChange(nextStep) {
    setTutorialStep(nextStep)
    if (nextStep === 2) {
      if (currentPage !== 'eventos') {
        navigateTo('eventos')
      }
    }
    if (nextStep >= 3) {
      if (currentPage !== 'operacao') {
        navigateTo('operacao')
      }
    }
  }

  // Tela de Espelho (acesso público para atletas via QR Code ou monitor secundário)
  if (currentPage === 'espelho' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/espelho'))) {
    const currentEvent = events.find((e) => e.id === selectedEventId) || events[0]
    return (
      <EspelhoPage
        eventId={selectedEventId || currentEvent?.id}
        eventName={currentEvent?.name}
      />
    )
  }

  // If not logged in, render LoginPage
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="app-container">
      {currentPage === 'dashboard' && (
        <DashboardPage
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
        />
      )}

      {currentPage === 'event-dashboard' && (
        <EventDashboardPage
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
        />
      )}

      {currentPage === 'eventos' && (
        <EventosPage
          events={events}
          setEvents={setEvents}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
          tutorialStep={showTutorial ? tutorialStep : null}
        />
      )}

      {currentPage === 'operacao' && (
        <OperacaoPage
          key={selectedEventId}
          event={events.find((e) => e.id === selectedEventId) || events[0]}
          onUpdateEvent={(updatedEvent) => {
            setEvents((prev) =>
              prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
            )
          }}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
          tutorialStep={showTutorial ? tutorialStep : null}
        />
      )}

      {currentPage === 'usuarios' && (
        <UsuariosPage
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
        />
      )}

      {showTutorial && (
        <TutorialModal
          currentStep={tutorialStep}
          totalSteps={6}
          onStepChange={handleTutorialStepChange}
          onClose={() => setShowTutorial(false)}
        />
      )}
    </div>
  )
}
