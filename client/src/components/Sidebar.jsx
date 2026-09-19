import './Sidebar.css'

function LayoutGridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  )
}

export default function Sidebar({ activePage = 'eventos', onNavigate, onLogout }) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="sidebar-brand-badge">
            <img src="/logo.png" alt="Entregas RUN" />
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <LayoutGridIcon />
            <span>DASHBOARD</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activePage === 'eventos' || activePage === 'operacao' ? 'active' : ''}`}
            onClick={() => onNavigate('eventos')}
          >
            <CalendarIcon />
            <span>EVENTOS</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activePage === 'usuarios' ? 'active' : ''}`}
            onClick={() => onNavigate('usuarios')}
          >
            <UsersIcon />
            <span>USUÁRIOS</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <span className="sidebar-user-label">USUÁRIO</span>
          <span className="sidebar-user-name">FELIPE</span>
          <span className="sidebar-user-role">ADMIN</span>
        </div>

        <button type="button" className="logout-btn" onClick={onLogout}>
          <LogOutIcon />
          <span>SAIR</span>
        </button>
      </div>
    </aside>
  )
}
