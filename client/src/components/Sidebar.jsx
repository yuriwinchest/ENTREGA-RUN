import { useState } from 'react'
import logoImg from '../assets/logo.png'
import './Sidebar.css'

function BrandRunnerLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Entregas RUN">
      <circle cx="24" cy="24" r="23" fill="#ffffff" stroke="#ff5200" strokeWidth="2" />
      <circle cx="34" cy="14" r="4.5" fill="#0c142c" />
      <path d="M28 17l-5 6-6-2-4 5h4l3-3 4 1.5 5-5.5z" fill="#0c142c" />
      <path d="M24 23l-3 7-7 2 1 3 8-2.5 3-6.5z" fill="#0c142c" />
      <path d="M28 24l5 6 6-1v-3l-4 .5-4-5z" fill="#ff5200" />
      <path d="M12 28h8v2h-8zM10 32h11v2H10zM14 36h8v2h-8z" fill="#ff5200" />
    </svg>
  )
}

function SidebarBrandLogo({ className = '', alt = 'Entregas RUN' }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return <BrandRunnerLogo size={className === 'mobile-top-logo' ? 24 : 32} />
  }

  return (
    <img
      src={logoImg}
      alt={alt}
      className={className}
      onError={(e) => {
        if (e.currentTarget.src !== window.location.origin + '/logo.png') {
          e.currentTarget.src = '/logo.png'
        } else {
          setHasError(true)
        }
      }}
    />
  )
}

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

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronLeftIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export default function Sidebar({ activePage = 'eventos', onNavigate, onLogout, user }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('entregas_run_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const userName = user?.name || (user?.email ? user.email.split('@')[0].toUpperCase() : 'ADMIN')
  const userRole = user?.role || 'ADMIN'

  function handleNav(page) {
    onNavigate(page)
    setMobileOpen(false)
  }

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('entregas_run_sidebar_collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <>
      {/* 1. Barra Superior Mobile (Visível apenas <= 768px) */}
      <div className="mobile-top-bar">
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu lateral"
        >
          <MenuIcon />
        </button>

        <div className="mobile-top-brand" onClick={() => handleNav('dashboard')}>
          <SidebarBrandLogo className="mobile-top-logo" alt="Entregas RUN" />
          <span className="mobile-top-title">ENTREGAS RUN</span>
        </div>

        <div className="mobile-top-user" onClick={() => setMobileOpen(true)}>
          <span className="mobile-user-avatar-badge">{userName.charAt(0)}</span>
        </div>
      </div>

      {/* 2. Backdrop do Drawer Mobile */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. Sidebar Principal (Desktop estática / Mobile Drawer Deslizante / Recolhível) */}
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-brand-badge" onClick={() => handleNav('dashboard')} style={{ cursor: 'pointer' }} title="Ir para o Dashboard">
              <SidebarBrandLogo alt="Entregas RUN" />
            </div>
            <span className="sidebar-brand-title-mobile">ENTREGAS RUN</span>
            
            {/* Botão fechar (visível apenas no mobile drawer) */}
            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <CloseIcon />
            </button>

            {/* Botão com a setinha para recolher/expandir o menu lateral no desktop */}
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
              <ChevronLeftIcon className={`collapse-chevron-icon ${isCollapsed ? 'rotated' : ''}`} />
            </button>
          </div>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNav('dashboard')}
              title="DASHBOARD"
            >
              <LayoutGridIcon />
              <span>DASHBOARD</span>
            </button>

            <button
              type="button"
              className={`nav-item ${activePage === 'eventos' || activePage === 'operacao' || activePage === 'event-dashboard' ? 'active' : ''}`}
              onClick={() => handleNav('eventos')}
              title="EVENTOS"
            >
              <CalendarIcon />
              <span>EVENTOS</span>
            </button>

            {(userRole === 'ADMIN' || userRole === 'SUB_ADMIN') && (
              <button
                type="button"
                className={`nav-item ${activePage === 'usuarios' ? 'active' : ''}`}
                onClick={() => handleNav('usuarios')}
                title="USUÁRIOS"
              >
                <UsersIcon />
                <span>USUÁRIOS</span>
              </button>
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user" title={`${userName} (${userRole})`}>
            <span className="sidebar-user-avatar-mini">{userName.charAt(0)}</span>
            <div className="sidebar-user-text-col">
              <span className="sidebar-user-label">USUÁRIO</span>
              <span className="sidebar-user-name">{userName}</span>
              <span className="sidebar-user-role">{userRole === 'ADMIN' ? 'SUPER ADMIN' : userRole === 'SUB_ADMIN' ? 'SUB-ADMIN' : userRole}</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={() => {
              setMobileOpen(false)
              onLogout()
            }}
            title="Sair da conta"
          >
            <LogOutIcon />
            <span>SAIR</span>
          </button>
        </div>
      </aside>

      {/* 4. Bottom Navigation Bar Mobile (Visível apenas <= 768px) */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-nav-btn ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNav('dashboard')}
        >
          <LayoutGridIcon />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activePage === 'eventos' || activePage === 'operacao' || activePage === 'event-dashboard' ? 'active' : ''}`}
          onClick={() => handleNav('eventos')}
        >
          <CalendarIcon />
          <span>Eventos</span>
        </button>

        {(userRole === 'ADMIN' || userRole === 'SUB_ADMIN') && (
          <button
            type="button"
            className={`mobile-nav-btn ${activePage === 'usuarios' ? 'active' : ''}`}
            onClick={() => handleNav('usuarios')}
          >
            <UsersIcon />
            <span>Usuários</span>
          </button>
        )}

        <button
          type="button"
          className={`mobile-nav-btn ${mobileOpen ? 'active' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <MenuIcon />
          <span>Menu</span>
        </button>
      </nav>
    </>
  )
}
