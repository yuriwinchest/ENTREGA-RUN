import Sidebar from './Sidebar.jsx'
import './DashboardPage.css'

function HelpCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function TrendingUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export default function DashboardPage({
  events = [],
  user,
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  const isRestricted = Boolean(
    user &&
    user.role !== 'ADMIN' &&
    (user.role === 'OPERADOR' || user.role === 'SUPERVISOR' || (user.eventId && user.eventId !== 'all'))
  )
  const visibleEvents = isRestricted
    ? events.filter((e) => e.id === user.eventId)
    : events

  // Métricas calculadas dinamicamente sobre os eventos visíveis do usuário
  const totalAtletas = visibleEvents.reduce((sum, e) => sum + (Number(e.total_athletes || e.total) || 0), 0)
  const totalEntregues = visibleEvents.reduce((sum, e) => sum + (Number(e.delivered_count || e.entregues) || 0), 0)
  const totalPendentes = Math.max(0, totalAtletas - totalEntregues)
  const percentConcluido = totalAtletas > 0 ? ((totalEntregues / totalAtletas) * 100).toFixed(1) + '%' : '0.0%'
  const eventosEmOperacao = visibleEvents.filter((e) => e.status === 'EM OPERAÇÃO' || e.status === 'EM_OPERACAO').length

  return (
    <div className="dashboard-layout">
      <Sidebar activePage="dashboard" onNavigate={onNavigate} onLogout={onLogout} user={user} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-title-wrap">
            <h1 className="dashboard-title">DASHBOARD</h1>
            <p className="dashboard-subtitle">
              Visão geral da operação. Métricas atualizadas em tempo real.
            </p>
          </div>

          <button
            type="button"
            className="tutorial-open-btn"
            onClick={onOpenTutorial}
          >
            <HelpCircleIcon />
            <span>TUTORIAL</span>
          </button>
        </header>

        {/* 6 metric cards */}
        <section className="metrics-grid">
          <div className="metric-card neutral">
            <div className="metric-top">
              <div className="metric-icon"><UsersIcon /></div>
            </div>
            <div className="metric-number">{totalAtletas}</div>
            <div className="metric-label">TOTAL DE ATLETAS</div>
          </div>

          <div className="metric-card success">
            <div className="metric-top">
              <div className="metric-icon"><CheckCircleIcon /></div>
            </div>
            <div className="metric-number">{totalEntregues}</div>
            <div className="metric-label">KITS ENTREGUES</div>
          </div>

          <div className="metric-card warning">
            <div className="metric-top">
              <div className="metric-icon"><PackageIcon /></div>
            </div>
            <div className="metric-number">{totalPendentes}</div>
            <div className="metric-label">KITS PENDENTES</div>
          </div>

          <div className="metric-card accent">
            <div className="metric-top">
              <div className="metric-icon"><TrendingUpIcon /></div>
            </div>
            <div className="metric-number">{percentConcluido}</div>
            <div className="metric-label">% CONCLUÍDO</div>
          </div>

          <div className="metric-card neutral">
            <div className="metric-top">
              <div className="metric-icon"><ZapIcon /></div>
            </div>
            <div className="metric-number">1</div>
            <div className="metric-label">OPERADORES ATIVOS</div>
          </div>

          <div className="metric-card accent">
            <div className="metric-top">
              <div className="metric-icon"><ActivityIcon /></div>
            </div>
            <div className="metric-number">{eventosEmOperacao}</div>
            <div className="metric-label">EVENTOS EM OPERAÇÃO</div>
          </div>
        </section>

        {/* Progresso por evento */}
        <section className="progress-section">
          <div className="progress-header">
            <h2 className="progress-title">PROGRESSO POR EVENTO</h2>
            <span className="progress-count">{visibleEvents.length} {visibleEvents.length === 1 ? 'EVENTO' : 'EVENTOS'}</span>
          </div>

          {visibleEvents.length === 0 ? (
            <div style={{
              background: '#fff',
              border: '1.5px dashed #e2e8f0',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '15px', fontWeight: 600 }}>
                {isRestricted ? 'Nenhum evento atribuído ao seu usuário.' : 'Nenhum evento cadastrado no sistema ainda.'}
              </p>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                {isRestricted
                  ? 'Contate o administrador para vincular um evento ao seu perfil.'
                  : 'Clique no botão abaixo para cadastrar o primeiro evento ou importar uma planilha.'}
              </p>
              {!isRestricted && (
                <button
                  type="button"
                  style={{
                    marginTop: '8px',
                    background: '#ff5200',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    letterSpacing: '0.5px'
                  }}
                  onClick={() => onNavigate('eventos')}
                >
                  + CADASTRAR EVENTO
                </button>
              )}
            </div>
          ) : (
            <div className="progress-list">
              {visibleEvents.map((ev) => {
                const total = Number(ev.total_athletes || ev.total) || 0
                const entregues = Number(ev.delivered_count || ev.entregues) || 0
                const pendentes = Math.max(0, total - entregues)
                const pct = total > 0 ? ((entregues / total) * 100).toFixed(1) : '0.0'

                return (
                  <div
                    key={ev.id}
                    className="progress-row-card"
                    onClick={() => onNavigate('event-dashboard', ev.id)}
                  >
                    <div className="event-col-info">
                      <h3 className="event-col-title">{ev.name}</h3>
                      <span className="event-col-meta">
                        {ev.date || ev.dateInput || '—'} • {ev.city || ev.location || '—'}
                      </span>
                    </div>

                    <div className="event-col-stats">
                      <div className="stat-item">
                        <span className="stat-label">ENTREGUES</span>
                        <span className="stat-value delivered">{entregues}</span>
                      </div>

                      <div className="stat-item">
                        <span className="stat-label">PENDENTES</span>
                        <span className="stat-value pending">{pendentes}</span>
                      </div>

                      <div className="progress-bar-wrap">
                        <span className="progress-bar-label">Progresso</span>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="progress-percent-val">{pct}%</span>
                      </div>

                      <div className="chevron-icon">
                        <ChevronRightIcon />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
