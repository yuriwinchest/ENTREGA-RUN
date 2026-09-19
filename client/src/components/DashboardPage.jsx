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

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  return (
    <div className="dashboard-layout">
      <Sidebar activePage="dashboard" onNavigate={onNavigate} onLogout={onLogout} />

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
            <div className="metric-number">779</div>
            <div className="metric-label">TOTAL DE ATLETAS</div>
          </div>

          <div className="metric-card success">
            <div className="metric-top">
              <div className="metric-icon"><CheckCircleIcon /></div>
            </div>
            <div className="metric-number">361</div>
            <div className="metric-label">KITS ENTREGUES</div>
          </div>

          <div className="metric-card warning">
            <div className="metric-top">
              <div className="metric-icon"><PackageIcon /></div>
            </div>
            <div className="metric-number">418</div>
            <div className="metric-label">KITS PENDENTES</div>
          </div>

          <div className="metric-card accent">
            <div className="metric-top">
              <div className="metric-icon"><TrendingUpIcon /></div>
            </div>
            <div className="metric-number">46.3%</div>
            <div className="metric-label">% CONCLUÍDO</div>
          </div>

          <div className="metric-card neutral">
            <div className="metric-top">
              <div className="metric-icon"><ZapIcon /></div>
            </div>
            <div className="metric-number">6</div>
            <div className="metric-label">OPERADORES ATIVOS</div>
          </div>

          <div className="metric-card accent">
            <div className="metric-top">
              <div className="metric-icon"><ActivityIcon /></div>
            </div>
            <div className="metric-number">1</div>
            <div className="metric-label">EVENTOS EM OPERAÇÃO</div>
          </div>
        </section>

        {/* Progresso por evento */}
        <section className="progress-section">
          <div className="progress-header">
            <h2 className="progress-title">PROGRESSO POR EVENTO</h2>
            <span className="progress-count">2 EVENTOS</span>
          </div>

          <div className="progress-list">
            <div
              className="progress-row-card"
              onClick={() => onNavigate('event-dashboard', '11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6')}
            >
              <div className="event-col-info">
                <h3 className="event-col-title">TREINÃO DA GALINHA</h3>
                <span className="event-col-meta">16/09/2026 • SÃO BENTO DO UNA</span>
              </div>

              <div className="event-col-stats">
                <div className="stat-item">
                  <span className="stat-label">ENTREGUES</span>
                  <span className="stat-value delivered">361</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">PENDENTES</span>
                  <span className="stat-value pending">69</span>
                </div>

                <div className="progress-bar-wrap">
                  <span className="progress-bar-label">Progresso</span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: '84.0%' }} />
                  </div>
                  <span className="progress-percent-val">84.0%</span>
                </div>

                <div className="chevron-icon">
                  <ChevronRightIcon />
                </div>
              </div>
            </div>

            <div
              className="progress-row-card"
              onClick={() => onNavigate('operacao', '22c2fb52-9b9d-4f50-ad9a-3bffa67b00b7')}
            >
              <div className="event-col-info">
                <h3 className="event-col-title">CORRE SURUBIM</h3>
                <span className="event-col-meta">19/09/2026 • SURUBIM</span>
              </div>

              <div className="event-col-stats">
                <div className="stat-item">
                  <span className="stat-label">ENTREGUES</span>
                  <span className="stat-value delivered">0</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">PENDENTES</span>
                  <span className="stat-value pending">349</span>
                </div>

                <div className="progress-bar-wrap">
                  <span className="progress-bar-label">Progresso</span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: '0%' }} />
                  </div>
                  <span className="progress-percent-val">0.0%</span>
                </div>

                <div className="chevron-icon">
                  <ChevronRightIcon />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notice banner */}
        <div className="demo-notice-card">
          <div className="demo-notice-icon"><ClockIcon /></div>
          <div>
            <strong>Ambiente populado com dados de demonstração.</strong> Todos os registros já estão persistidos no banco de dados real com sincronização em tempo real. Para entrega ao cliente, basta zerar as tabelas do módulo.
          </div>
        </div>
      </main>
    </div>
  )
}
