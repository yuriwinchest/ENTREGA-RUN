import { useEffect, useState, useRef } from 'react'
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

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const ROLE_OPTIONS = [
  {
    value: 'OPERADOR',
    label: 'OPERADOR',
    description: 'Entrega de kit',
    detail: 'Apenas busca atletas e entrega kits'
  },
  {
    value: 'SUPERVISOR',
    label: 'SUPERVISOR',
    description: 'Entrega e edição',
    detail: 'Entrega kits e pode alterar dados do atleta'
  },
  {
    value: 'ADMIN',
    label: 'ADMIN',
    description: 'Acesso total',
    detail: 'Acesso total, gestão e novos usuários'
  }
]

export default function UsuariosPage({
  user,
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('entregas_run_users')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (u) => !['AGNER ISRAEL', 'AGNER ARAUJO', 'entregas1', 'entregas2', 'entregas3'].includes(u.name)
          )
          if (cleaned.length > 0) return cleaned
        }
      }
    } catch {
      // ignore
    }
    const defaultUser = {
      id: user?.id || 'admin_pacetime',
      name: user?.name || 'FELIPE',
      email: user?.email || 'pacetime@entregas.com',
      role: user?.role || 'ADMIN',
      status: 'ATIVO',
      deliveries: 0,
      avatar: (user?.name || 'F').substring(0, 2).toUpperCase(),
    }
    return [defaultUser]
  })

  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const roleDropdownRef = useRef(null)
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'OPERADOR',
  })

  useEffect(() => {
    function handleClickOutside(event) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false)
      }
    }
    if (isRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isRoleDropdownOpen])

  useEffect(() => {
    try {
      localStorage.setItem('entregas_run_users', JSON.stringify(users))
    } catch {
      // ignore
    }
  }, [users])

  function handleAddUser(e) {
    e.preventDefault()
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) return

    const newUser = {
      id: `user-${Date.now()}`,
      name: newUserForm.name.trim().toUpperCase(),
      email: newUserForm.email.trim().toLowerCase(),
      role: newUserForm.role,
      status: 'ATIVO',
      deliveries: 0,
      avatar: newUserForm.name.trim().substring(0, 2).toUpperCase(),
    }

    setUsers((prev) => [newUser, ...prev])
    setNewUserForm({ name: '', email: '', role: 'OPERADOR' })
    setShowAddUserModal(false)
  }

  function handleToggleStatus(userId) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return { ...u, status: u.status === 'ATIVO' ? 'INATIVO' : 'ATIVO' }
        }
        return u
      })
    )
  }

  function handleRemoveUser(userId) {
    if (userId === user?.id || userId === 'admin_pacetime') {
      alert('Não é possível remover o administrador principal.')
      return
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  return (
    <div className="usuarios-layout">
      <Sidebar activePage="usuarios" onNavigate={onNavigate} onLogout={onLogout} user={user} />

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

            <button
              type="button"
              className="btn-primary-user"
              onClick={() => setShowAddUserModal(true)}
            >
              <PlusIcon />
              <span>NOVO USUÁRIO</span>
            </button>
          </div>
        </header>

        <section className="users-grid">
          {users.map((item) => (
            <article key={item.id} className="user-card">
              <div className="user-card-top">
                <div className="user-avatar">{item.avatar || item.name?.substring(0, 2).toUpperCase() || 'U'}</div>

                <div className="user-details">
                  <h2 className="user-name">{item.name}</h2>
                  <span className="user-email">{item.email}</span>

                  <div className="user-badges-row">
                    <span className={`role-pill ${item.role.toLowerCase()}`}>
                      {item.role === 'ADMIN' ? <ShieldIcon /> : <UserIcon />}
                      <span>{item.role}</span>
                    </span>

                    <span className={`status-pill-user ${item.status === 'INATIVO' ? 'inactive' : ''}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="user-card-footer">
                <div className="user-deliveries-col">
                  <span className="user-deliveries-label">ENTREGAS TOTAIS</span>
                  <span className="user-deliveries-count">{item.deliveries || 0}</span>
                </div>

                <div className="user-card-actions">
                  <button
                    type="button"
                    className="btn-deactivate"
                    onClick={() => handleToggleStatus(item.id)}
                  >
                    {item.status === 'ATIVO' ? 'DESATIVAR' : 'ATIVAR'}
                  </button>

                  {item.id !== user?.id && item.id !== 'admin_pacetime' && (
                    <button
                      type="button"
                      className="icon-action-btn"
                      title="Remover usuário"
                      onClick={() => handleRemoveUser(item.id)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        {showAddUserModal && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-header">
                <h2 className="modal-title">NOVO USUÁRIO</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowAddUserModal(false)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <form className="modal-body" onSubmit={handleAddUser}>
                <div className="form-group">
                  <label className="form-label">NOME COMPLETO</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: João Silva"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">E-MAIL</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Ex: joao@entregas.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" ref={roleDropdownRef}>
                  <label className="form-label" id="role-select-label">FUNÇÃO</label>
                  <div className="custom-role-dropdown">
                    <button
                      type="button"
                      className={`custom-role-trigger ${isRoleDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                      aria-haspopup="listbox"
                      aria-expanded={isRoleDropdownOpen}
                      aria-labelledby="role-select-label"
                    >
                      <div className="role-trigger-text">
                        <span className="role-trigger-name">
                          {ROLE_OPTIONS.find((r) => r.value === newUserForm.role)?.label || newUserForm.role}
                        </span>
                        <span className="role-trigger-desc">
                          ({ROLE_OPTIONS.find((r) => r.value === newUserForm.role)?.description || ''})
                        </span>
                      </div>
                      <ChevronDownIcon className={`role-chevron ${isRoleDropdownOpen ? 'rotated' : ''}`} />
                    </button>

                    {isRoleDropdownOpen && (
                      <div className="role-options-list" role="listbox">
                        {ROLE_OPTIONS.map((opt) => {
                          const isSelected = newUserForm.role === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`role-option-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setNewUserForm((prev) => ({ ...prev, role: opt.value }))
                                setIsRoleDropdownOpen(false)
                              }}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <div className="role-option-content">
                                <div className="role-option-title-row">
                                  <span className={`role-tag-badge ${opt.value.toLowerCase()}`}>
                                    {opt.label}
                                  </span>
                                  <span className="role-option-desc">({opt.description})</span>
                                </div>
                                <p className="role-option-detail">{opt.detail}</p>
                              </div>
                              {isSelected && (
                                <div className="role-selected-check">
                                  <CheckIcon />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setShowAddUserModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="modal-btn-save">
                    Adicionar Usuário
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
