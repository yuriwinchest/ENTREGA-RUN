import { useEffect, useState } from 'react'
import DashboardPage from './components/DashboardPage.jsx'
import EventDashboardPage from './components/EventDashboardPage.jsx'
import EventosPage from './components/EventosPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import OperacaoPage from './components/OperacaoPage.jsx'
import EspelhoPage from './components/EspelhoPage.jsx'
import EmergenciaPage from './components/EmergenciaPage.jsx'
import MedicoPage from './components/MedicoPage.jsx'
import ValidarAtletaPage from './components/ValidarAtletaPage.jsx'
import TutorialModal from './components/TutorialModal.jsx'
import UsuariosPage from './components/UsuariosPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { SESSION_EXPIRED_EVENT, apiFetchEvents, apiUpdateEvent } from './utils/eventsApi.js'
import { readKitDecision } from './utils/kitDecisionLock.js'
import { activateSessionScope, clearPrivateCaches, canManageUsers, isEventBoundUser, credentialStorageChangeRequiresReset } from './utils/sessionScope.js'

const MOCK_EVENT_IDS = [
  '11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6',
  '22c2fb52-9b9d-4f50-ad9a-3bffa67b00b7',
  '33c3fb52-9b9d-4f50-ad9a-3bffa67b00c8',
]

export default function App() {
  const [user, setUser] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [eventsLoaded, setEventsLoaded] = useState(false)

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
      // Usuário em cache sem token (login anterior às sessões) não passa mais
      // nas rotas de eventos/atletas: volta ao login em vez de operar sem salvar.
      if (!token) {
        setUser(null)
        setSessionLoading(false)
        clearPrivateCaches()
        try {
          localStorage.removeItem('entregas_run_user')
        } catch {
          // ignore
        }
        return
      }
      try {
        const res = await fetch('/api/session', {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!isMounted) return
        if (res.ok && data.ok && data.user) {
          activateSessionScope(data.user)
          setUser(data.user)
          try { localStorage.setItem('entregas_run_user', JSON.stringify(data.user)) } catch {}
        } else {
          setUser(null)
          clearPrivateCaches()
          try {
            localStorage.removeItem('entregas_run_user')
            localStorage.removeItem('entregas_run_token')
          } catch {
            // ignore
          }
        }
      } catch {
        if (isMounted) setUser(null)
      } finally {
        if (isMounted) setSessionLoading(false)
      }
    }
    validateSession()
    return () => {
      isMounted = false
    }
  }, [])

  // Token vencido ou revogado no meio do uso: o servidor recusa com 401 e o
  // eventsApi avisa; sem isto a tela seguiria mostrando entregas não salvas.
  useEffect(() => {
    if (!user) return undefined
    function handleSessionExpired() {
      setUser(null)
      setEvents([])
      setEventsLoaded(false)
      clearPrivateCaches()
      try {
        localStorage.removeItem('entregas_run_user')
        localStorage.removeItem('entregas_run_token')
      } catch {
        // ignore
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [user])

  useEffect(() => {
    let currentToken = ''
    try { currentToken = localStorage.getItem('entregas_run_token') || '' } catch {}
    function handleCredentialChange(event) {
      if (event.storageArea && event.storageArea !== localStorage) return
      if (credentialStorageChangeRequiresReset(event, user, currentToken)) {
        clearPrivateCaches()
        window.location.reload()
      }
    }
    window.addEventListener('storage', handleCredentialChange)
    return () => window.removeEventListener('storage', handleCredentialChange)
  }, [user])

  // Sincroniza eventos locais com o servidor central e puxa atualizações em tempo real
  useEffect(() => {
    // Deslogado (login, espelho, validação pública) a API de eventos exige token.
    if (!user) return undefined
    let isMounted = true

    // Médico não usa a lista de eventos (e o servidor a recusa para ele).
    if (user?.role === 'MEDICO') return undefined

    async function syncEventsWithServer() {
      const serverEvents = await apiFetchEvents()
      if (!isMounted || !Array.isArray(serverEvents)) return

      const isRestricted = isEventBoundUser(user)

      const finalEvents = isRestricted && user?.eventId
        ? serverEvents.filter((e) => e.id === user.eventId)
        : serverEvents

      setEvents(finalEvents)
      setEventsLoaded(true)
      try {
        localStorage.setItem('entregas_run_events', JSON.stringify(finalEvents))
      } catch {
        // ignore
      }
    }

    void syncEventsWithServer()

    // Só admin/sub-admin acompanham todos os eventos ao vivo. Operador já recebe
    // as entregas pela tela de operação; polling em dezenas de celulares a cada
    // 5 s dobrava a carga da VPS (2 vCPU compartilhada) durante o evento.
    const watchesAllEvents = canManageUsers(user)
    const timer = watchesAllEvents
      ? window.setInterval(() => {
        if (document.visibilityState !== 'hidden') void syncEventsWithServer()
      }, 10000)
      : null

    // Sincroniza automaticamente quando o usuário voltar para a aba ou desbloquear a tela
    function handleVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        void syncEventsWithServer()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)

    return () => {
      isMounted = false
      if (timer) window.clearInterval(timer)
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
    }
  }, [user])

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

  const isRestrictedUser = isEventBoundUser(user)

  const activeEventFallback = events.find((e) => e.status === 'EM OPERAÇÃO' || e.status === 'EM_OPERACAO') || events[0]

  const effectiveEventId = isRestrictedUser
    ? (user?.eventId || '')
    : (selectedEventId || activeEventFallback?.id || '')

  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname
    if (path.startsWith('/validar')) return 'validar'
    if (path.startsWith('/espelho')) return 'espelho'
    if (path.startsWith('/operacao')) return 'operacao'
    if (path.startsWith('/eventos')) return 'eventos'
    if (path.startsWith('/usuarios')) return 'usuarios'
    if (path.startsWith('/medico')) return 'medico'
    if (path.startsWith('/dashboard/')) return 'event-dashboard'
    if (path.startsWith('/dashboard')) return 'dashboard'
    return 'eventos'
  })

  const [tutorialStep, setTutorialStep] = useState(1)
  const [showTutorial, setShowTutorial] = useState(false)

  // Guard de rota para isolamento estrito de eventos por usuário
  useEffect(() => {
    if (!user) return
    if (user.role === 'MEDICO') {
      // Telas públicas (espelho, validação, emergência) abrem normalmente no aparelho do médico.
      const publicPath = /^\/(espelho|validar|emergencia)/.test(window.location.pathname)
      if (!publicPath && !window.location.pathname.startsWith('/medico')) {
        window.history.replaceState(null, '', `/medico/${user.eventId}`)
      }
      return
    }
    if (currentPage === 'medico' && !canManageUsers(user)) {
      const fallback = isRestrictedUser && user.eventId ? 'operacao' : 'eventos'
      setCurrentPage(fallback)
      window.history.replaceState(null, '', fallback === 'operacao' ? `/operacao/${user.eventId}` : '/eventos')
      return
    }
    if (isRestrictedUser && user.eventId && user.eventId !== 'all') {
      const path = window.location.pathname
      const parts = path.split('/')
      const section = parts[1] || ''
      const urlId = parts[2] || ''

      if (section === 'usuarios' && !canManageUsers(user)) {
        setSelectedEventId(user.eventId)
        setCurrentPage('operacao')
        window.history.replaceState(null, '', `/operacao/${user.eventId}`)
        return
      }

      if (['operacao', 'dashboard', 'espelho'].includes(section) && urlId && urlId !== user.eventId) {
        setSelectedEventId(user.eventId)
        const targetPath = section === 'dashboard' ? `/dashboard/${user.eventId}` : `/${section}/${user.eventId}`
        window.history.replaceState(null, '', targetPath)
        if (section === 'dashboard') setCurrentPage('event-dashboard')
        else setCurrentPage(section)
      }
    }
  }, [user, isRestrictedUser, currentPage])

  // Sincroniza navegação via botões voltar/avançar do navegador
  useEffect(() => {
    function handlePopState() {
      if (currentPage === 'operacao' && readKitDecision(effectiveEventId)) {
        window.history.pushState({ kitDecisionGuard: true }, '', `/operacao/${effectiveEventId}`)
        return
      }
      const path = window.location.pathname
      if (path.startsWith('/validar')) {
        setCurrentPage('validar')
      } else if (path.startsWith('/espelho')) {
        const parts = path.split('/')
        if (parts[2]) setSelectedEventId(isRestrictedUser && user?.eventId ? user.eventId : parts[2])
        setCurrentPage('espelho')
      } else if (path.startsWith('/operacao')) {
        const parts = path.split('/')
        if (parts[2]) setSelectedEventId(isRestrictedUser && user?.eventId ? user.eventId : parts[2])
        setCurrentPage('operacao')
      } else if (path.startsWith('/eventos')) {
        setCurrentPage('eventos')
      } else if (path.startsWith('/usuarios')) {
        if (isRestrictedUser && !canManageUsers(user)) {
          setCurrentPage('operacao')
        } else {
          setCurrentPage('usuarios')
        }
      } else if (path.startsWith('/medico')) {
        const parts = path.split('/')
        if (parts[2]) setSelectedEventId(isRestrictedUser && user?.eventId ? user.eventId : parts[2])
        setCurrentPage('medico')
      } else if (path.startsWith('/dashboard/')) {
        const parts = path.split('/')
        if (parts[2]) setSelectedEventId(isRestrictedUser && user?.eventId ? user.eventId : parts[2])
        setCurrentPage('event-dashboard')
      } else if (path.startsWith('/dashboard')) {
        setCurrentPage('dashboard')
      } else {
        setCurrentPage(user ? 'eventos' : 'login')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [user, currentPage, effectiveEventId, isRestrictedUser])

  function navigateTo(page, id) {
    let targetPage = page
    if (targetPage === 'usuarios' && !canManageUsers(user)) {
      targetPage = isRestrictedUser ? 'operacao' : 'eventos'
    }
    let targetId = id || effectiveEventId
    if (isRestrictedUser && user?.eventId) {
      targetId = user.eventId
    }
    if (targetPage === 'login' || targetPage === 'eventos') targetId = ''
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
    } else if (targetPage === 'medico') {
      path = targetId ? `/medico/${targetId}` : '/eventos'
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
      role: userData?.role || 'OPERADOR',
      teamId: userData?.teamId || null,
      isPrincipal: Boolean(userData?.isPrincipal),
      eventId: userData?.eventId || 'all',
      eventName: userData?.eventName || 'TODOS OS PROJETOS',
    }
    clearPrivateCaches()
    activateSessionScope(loggedUser)
    setEvents([])
    setEventsLoaded(false)
    setSelectedEventId('')
    setUser(loggedUser)
    setSessionLoading(false)
    try {
      localStorage.setItem('entregas_run_user', JSON.stringify(loggedUser))
      if (token) localStorage.setItem('entregas_run_token', token)
    } catch {
      // ignore
    }
    if (loggedUser.role === 'MEDICO') {
      setSelectedEventId(loggedUser.eventId)
      setCurrentPage('medico')
      window.history.pushState(null, '', `/medico/${loggedUser.eventId}`)
    } else if (loggedUser.role === 'OPERADOR' && loggedUser.eventId && loggedUser.eventId !== 'all') {
      setSelectedEventId(loggedUser.eventId)
      navigateTo('operacao', loggedUser.eventId)
    } else {
      navigateTo('eventos')
    }
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
    setEvents([])
    setEventsLoaded(false)
    setSelectedEventId('')
    clearPrivateCaches()
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
    const currentEvent = events.find((e) => e.id === effectiveEventId) || (
      isRestrictedUser && user?.eventId ? { id: user.eventId, name: user.eventName || 'PROJETO ATRIBUÍDO' } : events[0]
    )
    return (
      <EspelhoPage
        eventId={effectiveEventId || currentEvent?.id}
        eventName={currentEvent?.name}
      />
    )
  }

  // Emergência médica (pública, aberta pelo QR Code do número de peito): não
  // depende de login, nem do usuário logado no aparelho.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/emergencia')) {
    return <EmergenciaPage eventId={decodeURIComponent(window.location.pathname.split('/')[2] || '')} />
  }

  if (sessionLoading) return <p role="status">Validando sua sessão…</p>

  // Se não estiver autenticado, exibe a tela de login
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  // Perfil médico enxerga só o painel de ocorrências do evento dele.
  if (user.role === 'MEDICO') {
    return <MedicoPage user={user} eventId={user.eventId} onLogout={handleLogout} />
  }

  if (['operacao', 'event-dashboard', 'medico'].includes(currentPage)) {
    if (!eventsLoaded) return <p role="status">Carregando seus projetos…</p>
    if (!events.some((event) => event.id === effectiveEventId)) {
      return <main><p role="alert">Projeto indisponível para seu acesso.</p><button onClick={() => navigateTo('eventos')}>Voltar aos projetos</button></main>
    }
  }

  if (currentPage === 'medico' && canManageUsers(user) && effectiveEventId) {
    return (
      <MedicoPage
        key={effectiveEventId}
        user={user}
        eventId={effectiveEventId}
        onLogout={handleLogout}
        onBack={() => navigateTo('eventos')}
      />
    )
  }

  const assignedEventFallback = isRestrictedUser && user?.eventId
    ? { id: user.eventId, name: user.eventName || 'PROJETO ATRIBUÍDO' }
    : activeEventFallback

  const eventForOperacao = events.find((e) => e.id === effectiveEventId) || (
    effectiveEventId
      ? { id: effectiveEventId, name: 'CARREGANDO...', status: 'EM OPERAÇÃO', total: 0, entregues: 0, pendentes: 0, concl: '0.0%' }
      : assignedEventFallback
  )

  return (
    <ErrorBoundary onNavigate={navigateTo}>
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
          event={events.find((e) => e.id === effectiveEventId) || assignedEventFallback}
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
          event={eventForOperacao}
          user={user}
          onUpdateEvent={(updatedEvent) => {
            if (!updatedEvent?.id) return
            // A operação só atualiza contagens. Mandar o evento inteiro gravava o
            // provisório "CARREGANDO..." (nome e status) por cima do evento real.
            const { total, entregues, pendentes, concl } = updatedEvent
            const counts = { total, entregues, pendentes, concl }
            setEvents((prev) =>
              prev.map((e) => (e.id === updatedEvent.id ? { ...e, ...counts } : e))
            )
            apiUpdateEvent(updatedEvent.id, counts).catch(() => {})
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
  </ErrorBoundary>
  )
}
