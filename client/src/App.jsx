import { useEffect, useState } from 'react'
import DashboardPage from './components/DashboardPage.jsx'
import EventDashboardPage from './components/EventDashboardPage.jsx'
import EventosPage from './components/EventosPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import OperacaoPage from './components/OperacaoPage.jsx'
import EspelhoPage from './components/EspelhoPage.jsx'
import ValidarAtletaPage from './components/ValidarAtletaPage.jsx'
import TutorialModal from './components/TutorialModal.jsx'
import UsuariosPage from './components/UsuariosPage.jsx'
import { apiFetchEvents, apiSyncEvents, apiUpdateEvent } from './utils/eventsApi.js'

const MOCK_EVENT_IDS = [
  '11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6',
  '22c2fb52-9b9d-4f50-ad9a-3bffa67b00b7',
  '33c3fb52-9b9d-4f50-ad9a-3bffa67b00c8',
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
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (e) =>
              !MOCK_EVENT_IDS.includes(e?.id) &&
              !e?.name?.includes('GALINHA') &&
              !e?.name?.includes('SURUBIM') &&
              !e?.name?.includes('YURI2TESTE')
          )
        }
      }
      return []
    } catch {
      return []
    }
  })

  // Valida o token salvo: restaura a sessão após reload, derruba login expirado
  useEffect(() => {
    let isMounted = true
    async function validateSession() {
      let token = ''
      try {
        token = localStorage.getItem('entregas_run_token') || ''
      } catch {
        token = ''
      }
      if (!token) return
      try {
        const res = await fetch('/api/session', {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!isMounted) return
        if (res.ok && data.ok && data.user) {
          setUser((current) => current || {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            eventId: data.user.eventId,
            eventName: data.user.eventName,
          })
        } else {
          setUser(null)
          try {
            localStorage.removeItem('entregas_run_user')
            localStorage.removeItem('entregas_run_token')
          } catch {
            // ignore
          }
        }
      } catch {
        // sem rede: mantém o usuário em cache até a próxima validação
      }
    }
    validateSession()
    return () => {
      isMounted = false
    }
  }, [])

  // Sincroniza eventos locais com o servidor central e puxa atualizações
  useEffect(() => {
    let isMounted = true

    async function syncEventsWithServer() {
      const serverEvents = await apiFetchEvents()
      if (!isMounted || !Array.isArray(serverEvents)) return

      const alreadyMigrated = localStorage.getItem('entregas_run_events_migrated')

      if (!alreadyMigrated) {
        // Primeira carga da nova versão no dispositivo: resgata eventos legados locais
        setEvents((currentLocal) => {
          const serverIds = new Set(serverEvents.map((e) => e.id))
          const localOnly = currentLocal.filter(
            (e) => e && e.id && !serverIds.has(e.id) && !MOCK_EVENT_IDS.includes(e.id)
          )

          try {
            localStorage.setItem('entregas_run_events_migrated', 'true')
          } catch {
            // ignore
          }

          if (localOnly.length > 0) {
            apiSyncEvents(localOnly).then((synced) => {
              if (isMounted && Array.isArray(synced) && synced.length > 0) {
                setEvents(synced)
              }
            })
            return [...localOnly, ...serverEvents]
          }

          return serverEvents
        })
        return
      }

      // Servidor é a fonte oficial da verdade
      setEvents(serverEvents)
    }

    syncEventsWithServer()

    // Sincroniza automaticamente quando o usuário voltar para a aba ou desbloquear a tela
    function handleVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        syncEventsWithServer()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)

    return () => {
      isMounted = false
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
    }
  }, [])

  // Limpa resíduos de dados mockados do navegador
  useEffect(() => {
    try {
      MOCK_EVENT_IDS.forEach((id) => {
        localStorage.removeItem(`entregas_run_athletes_${id}`)
        localStorage.removeItem(`entregas_run_deliveries_${id}`)
        localStorage.removeItem(`entregas_run_audits_${id}`)
      })
    } catch {
      // ignore
    }
  }, [])

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
    if (parts.length > 2 && parts[2] && !MOCK_EVENT_IDS.includes(parts[2])) {
      return parts[2]
    }
    return ''
  })

  const effectiveEventId = (user?.role !== 'ADMIN' && user?.role !== 'SUB_ADMIN' && user?.eventId && user.eventId !== 'all')
    ? user.eventId
    : (selectedEventId && events.some((e) => e.id === selectedEventId)
      ? selectedEventId
      : (events[0]?.id || ''))

  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname
    if (path.startsWith('/validar')) return 'validar'
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

  // Sincroniza navegação via botões voltar/avançar do navegador
  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname
      if (path.startsWith('/validar')) {
        setCurrentPage('validar')
      } else if (path.startsWith('/espelho')) {
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
    let targetPage = page
    if (targetPage === 'usuarios' && user?.role !== 'ADMIN' && user?.role !== 'SUB_ADMIN') {
      targetPage = 'eventos'
    }
    const targetId = id || effectiveEventId
    if (targetId) {
      setSelectedEventId(targetId)
    }
    setCurrentPage(targetPage)
    let path = '/dashboard'
    if (targetPage === 'espelho') {
      path = targetId ? `/espelho/${targetId}` : '/espelho'
    } else if (targetPage === 'eventos') {
      path = '/eventos'
    } else if (targetPage === 'operacao') {
      path = targetId ? `/operacao/${targetId}` : '/eventos'
    } else if (targetPage === 'event-dashboard') {
      path = targetId ? `/dashboard/${targetId}` : '/dashboard'
    } else if (targetPage === 'usuarios') {
      path = '/usuarios'
    } else if (targetPage === 'login') {
      path = '/'
    }
    window.history.pushState(null, '', path)
  }

  function handleLoginSuccess(userData, token) {
    const loggedUser = {
      id: userData?.id || 'admin_pacetime',
      email: userData?.email || 'pacetime@entregas.com',
      name: userData?.name || 'Felipe Admin',
      role: userData?.role || 'ADMIN',
      eventId: userData?.eventId || 'all',
      eventName: userData?.eventName || 'TODOS OS PROJETOS',
    }
    setUser(loggedUser)
    try {
      localStorage.setItem('entregas_run_user', JSON.stringify(loggedUser))
      if (token) localStorage.setItem('entregas_run_token', token)
    } catch {
      // ignore
    }
    navigateTo('dashboard')
  }

  function handleLogout() {
    try {
      const token = localStorage.getItem('entregas_run_token') || ''
      if (token) {
        fetch('/api/logout', {
          method: 'POST',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    } catch {
      // ignore
    }
    setUser(null)
    setShowTutorial(false)
    try {
      localStorage.removeItem('entregas_run_user')
      localStorage.removeItem('entregas_run_token')
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

  // Tela de Validação Pública (acesso via QR Code individual do atleta)
  if (currentPage === 'validar' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/validar'))) {
    const parts = window.location.pathname.split('/')
    const valEventId = parts[2] || effectiveEventId
    const valNumero = decodeURIComponent(parts[3] || '')
    return (
      <ValidarAtletaPage
        eventId={valEventId}
        numero={valNumero}
      />
    )
  }

  // Tela de Espelho (acesso público para atletas via QR Code ou monitor secundário)
  if (currentPage === 'espelho' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/espelho'))) {
    const currentEvent = events.find((e) => e.id === effectiveEventId) || events[0]
    return (
      <EspelhoPage
        eventId={effectiveEventId || currentEvent?.id}
        eventName={currentEvent?.name}
      />
    )
  }

  // Se não estiver autenticado, exibe a tela de login
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="app-container">
      {currentPage === 'dashboard' && (
        <DashboardPage
          events={events}
          user={user}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
        />
      )}

      {currentPage === 'event-dashboard' && (
        <EventDashboardPage
          event={events.find((e) => e.id === effectiveEventId) || events[0]}
          user={user}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
        />
      )}

      {currentPage === 'eventos' && (
        <EventosPage
          events={events}
          setEvents={setEvents}
          user={user}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
          tutorialStep={showTutorial ? tutorialStep : null}
        />
      )}

      {currentPage === 'operacao' && (
        <OperacaoPage
          key={effectiveEventId || 'operacao'}
          event={events.find((e) => e.id === effectiveEventId) || events[0]}
          user={user}
          onUpdateEvent={(updatedEvent) => {
            setEvents((prev) =>
              prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
            )
            if (updatedEvent && updatedEvent.id) {
              apiUpdateEvent(updatedEvent.id, updatedEvent).catch(() => {})
            }
          }}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onOpenTutorial={handleOpenTutorial}
          tutorialStep={showTutorial ? tutorialStep : null}
        />
      )}

      {currentPage === 'usuarios' && (
        <UsuariosPage
          user={user}
          events={events}
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
