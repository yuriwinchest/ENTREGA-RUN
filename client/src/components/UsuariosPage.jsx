import Sidebar from './Sidebar.jsx'
import './UsuariosPage.css'

function HelpCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

const USERS_LIST = [
  {
    id: 1,
    name: 'AGNER ISRAEL',
    email: 'agnerisrsel@hotmail.com',
    role: 'ADMIN',
    status: 'ATIVO',
    deliveries: 0,
    avatar: 'AI',
  },
  {
    id: 2,
    name: 'AGNER ARAUJO',
    email: 'agneraraujo@hotmail.com',
    role: 'ADMIN',
    status: 'ATIVO',
    deliveries: 23,
    avatar: 'AA',
  },
  {
    id: 3,
    name: 'entregas1',
    email: 'entregas1@pacetime.com',
    role: 'OPERADOR',
    status: 'ATIVO',
    deliveries: 361,
    avatar: 'e',
  },
  {
    id: 4,
    name: 'entregas2',
    email: 'entregas2@pacetime.com',
    role: 'OPERADOR',
    status: 'ATIVO',
    deliveries: 0,
    avatar: 'e',
  },
  {
    id: 5,
    name: 'entregas3',
    email: 'entregas3@pacetime.com',
    role: 'OPERADOR',
    status: 'ATIVO',
    deliveries: 0,
    avatar: 'e',
  },
  {
    id: 6,
    name: 'FELIPE',
    email: 'pacetime@entregas.com',
    role: 'ADMIN',
    status: 'ATIVO',
    deliveries: 0,
    avatar: 'F',
  },
]

export default function UsuariosPage({
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  return (
    <div className="usuarios-layout">
      <Sidebar activePage="usuarios" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="usuarios-main">
        <header className="usuarios-header">
          <div className="usuarios-title-wrap">
            <h1 className="usuarios-page-title">USUÁRIOS</h1>
            <p className="usuarios-subtitle">
              Gerencie os usuários da operação e a função de cada um. Operador apenas entrega o kit; Supervisor entrega e pode alterar os dados do atleta; Admin tem acesso total.
              <br />
              Somente o Admin pode criar, desativar ou remover usuários.
            </p>
          </div>

          <div className="usuarios-header-actions">
            <button
              type="button"
              className="tutorial-open-btn"
              onClick={onOpenTutorial}
            >
              <HelpCircleIcon />
              <span>TUTORIAL</span>
            </button>

            <button type="button" className="btn-primary-user">
              <PlusIcon />
              <span>NOVO USUÁRIO</span>
            </button>
          </div>
        </header>

        <section className="users-grid">
          {USERS_LIST.map((user) => (
            <article key={user.id} className="user-card">
              <div className="user-card-top">
                <div className="user-avatar">{user.avatar}</div>

                <div className="user-details">
                  <h2 className="user-name">{user.name}</h2>
                  <span className="user-email">{user.email}</span>

                  <div className="user-badges-row">
                    <span className={`role-pill ${user.role.toLowerCase()}`}>
                      {user.role === 'ADMIN' ? <ShieldIcon /> : <UserIcon />}
                      <span>{user.role}</span>
                    </span>

                    <span className="status-pill-user">
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="user-card-footer">
                <div className="user-deliveries-col">
                  <span className="user-deliveries-label">ENTREGAS TOTAIS</span>
                  <span className="user-deliveries-count">{user.deliveries}</span>
                </div>

                <div className="user-card-actions">
                  <button type="button" className="btn-deactivate">
                    DESATIVAR
                  </button>

                  <button
                    type="button"
                    className="icon-action-btn"
                    title="Remover usuário"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
