import { useEffect, useState, useRef, useMemo } from 'react'
import Sidebar from './Sidebar.jsx'
import {
  apiFetchUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
} from '../utils/usersApi.js'
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

function KeyIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1-1-1 1-1-1-1 1-1.5-1.5A6.5 6.5 0 1 0 16 14l2-2" />
      <circle cx="7.5" cy="16.5" r="1.5" />
    </svg>
  )
}

function CopyIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function EyeIcon({ off, size = 16 }) {
  if (off) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function SparklesIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
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
    value: 'SUB_ADMIN',
    label: 'SUB-ADMIN',
    description: 'Gestão sem exclusão',
    detail: 'Cria eventos e entrega kits, sem permissão de exclusão ou alteração cadastral'
  },
  {
    value: 'ADMIN',
    label: 'SUPER ADMIN',
    description: 'Acesso total',
    detail: 'Acesso total irrestrito, gestão e exclusões'
  }
]

// Geração de senha amigável, memorável e de alta entropia (sem caracteres ambíguos)
function generateEasySecurePassword() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  const special = ['@', '#', '!', '$', '%']
  const randomYear = new Date().getFullYear()
  const randomSpecial = special[Math.floor(Math.random() * special.length)]
  let randomTail = ''
  for (let i = 0; i < 4; i++) {
    randomTail += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `Run${randomYear}${randomSpecial}${randomTail}`
}

export default function UsuariosPage({
  user,
  events = [],
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  const availableEvents = (events && events.length > 0) ? events : (() => {
    try {
      const saved = localStorage.getItem('entregas_run_events')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })()

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
      name: user?.name || 'FELIPE ADMIN',
      email: user?.email || 'pacetime@entregas.com',
      password: '',
      role: user?.role || 'ADMIN',
      eventId: 'all',
      eventName: 'TODOS OS PROJETOS',
      status: 'ATIVO',
      deliveries: 0,
      avatar: (user?.name || 'F').substring(0, 2).toUpperCase(),
    }
    return [defaultUser]
  })

  // Sincroniza usuários com o servidor central
  useEffect(() => {
    let isMounted = true
    apiFetchUsers().then((serverUsers) => {
      if (isMounted && Array.isArray(serverUsers) && serverUsers.length > 0) {
        setUsers(serverUsers)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showPasswordInAddModal, setShowPasswordInAddModal] = useState(false)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false)
  const roleDropdownRef = useRef(null)
  const eventDropdownRef = useRef(null)

  // Credenciais geradas após criar usuário com sucesso (para copiar para WhatsApp)
  const [createdUserCredentials, setCreatedUserCredentials] = useState(null)
  const [copiedNotification, setCopiedNotification] = useState(false)

  // Modal para ver/redefinir senha de usuário existente
  const [userToManagePassword, setUserToManagePassword] = useState(null)
  const [showManagePasswordEye, setShowManagePasswordEye] = useState(false)
  const [managePasswordFeedback, setManagePasswordFeedback] = useState('')

  const [newUserForm, setNewUserForm] = useState(() => ({
    name: '',
    email: '',
    password: generateEasySecurePassword(),
    role: 'OPERADOR',
    eventId: availableEvents[0]?.id || 'all',
    eventName: availableEvents[0]?.name || 'TODOS OS EVENTOS',
  }))

  useEffect(() => {
    function handleClickOutside(event) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false)
      }
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(event.target)) {
        setIsEventDropdownOpen(false)
      }
    }
    if (isRoleDropdownOpen || isEventDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isRoleDropdownOpen, isEventDropdownOpen])

  useEffect(() => {
    try {
      localStorage.setItem('entregas_run_users', JSON.stringify(users))
    } catch {
      // ignore
    }
  }, [users])

  function handleOpenAddModal() {
    setNewUserForm({
      name: '',
      email: '',
      password: generateEasySecurePassword(),
      role: 'OPERADOR',
      eventId: availableEvents[0]?.id || 'all',
      eventName: availableEvents[0]?.name || 'TODOS OS PROJETOS',
    })
    setShowPasswordInAddModal(false)
    setShowAddUserModal(true)
  }

  function handleGenerateNewPasswordInForm() {
    setNewUserForm((prev) => ({
      ...prev,
      password: generateEasySecurePassword(),
    }))
  }

  async function handleAddUser(e) {
    e.preventDefault()
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) return
    if (!newUserForm.password || newUserForm.password.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    const selectedEv = availableEvents.find((ev) => ev.id === newUserForm.eventId)
    const assignedName = newUserForm.eventId === 'all'
      ? 'TODOS OS PROJETOS'
      : (selectedEv?.name || newUserForm.eventName || 'PROJETO VINCULADO')

    const newUser = {
      id: `user-${Date.now()}`,
      name: newUserForm.name.trim().toUpperCase(),
      email: newUserForm.email.trim().toLowerCase(),
      password: newUserForm.password.trim(),
      role: newUserForm.role,
      eventId: newUserForm.eventId,
      eventName: assignedName,
      status: 'ATIVO',
      deliveries: 0,
      avatar: newUserForm.name.trim().substring(0, 2).toUpperCase(),
    }

    // Salva no estado e no backend
    setUsers((prev) => [newUser, ...prev.filter((u) => u.email !== newUser.email)])
    apiCreateUser(newUser).catch(() => {})

    setShowAddUserModal(false)

    // Abre imediatamente o modal com as credenciais prontas para o Yuri copiar para WhatsApp
    setCreatedUserCredentials({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      eventName: newUser.eventName,
    })
  }

  const availableRoleOptions = useMemo(() => {
    if (user?.role === 'SUB_ADMIN') {
      return ROLE_OPTIONS.filter((r) => r.value === 'OPERADOR' || r.value === 'SUPERVISOR')
    }
    return ROLE_OPTIONS
  }, [user?.role])

  async function handleToggleStatus(userId) {
    const target = users.find((u) => u.id === userId)
    if (!target) return
    if (user?.role === 'SUB_ADMIN' && target.role === 'ADMIN') {
      alert('Sub-Admin não tem permissão para alterar o status do Super Admin.')
      return
    }
    const nextStatus = target.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    )
    apiUpdateUser(userId, { status: nextStatus }).catch(() => {})
  }

  async function handleRemoveUser(userId) {
    if (user?.role !== 'ADMIN') {
      alert('Somente o Super Admin tem permissão para remover usuários.')
      return
    }
    const targetUser = users.find((u) => u.id === userId)
    if (userId === user?.id || userId === 'admin_pacetime' || targetUser?.role === 'ADMIN') {
      alert('Não é possível remover o administrador principal.')
      return
    }
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return

    setUsers((prev) => prev.filter((u) => u.id !== userId))
    apiDeleteUser(userId).catch(() => {})
  }

  function handleCopyCredentials(creds) {
    if (!creds) return
    if (!creds.password) {
      alert('Gere uma nova senha antes de copiar o acesso.')
      return
    }
    const systemUrl = typeof window !== 'undefined' ? window.location.origin : 'https://entregasrunning.com.br'
    const text = `🏃 *ENTREGAS RUN — DADOS DE ACESSO AO SISTEMA*
Olá *${creds.name}*, seu login foi liberado!

🔗 *Link de Acesso:* ${systemUrl}
📧 *E-mail:* ${creds.email}
🔑 *Senha:* ${creds.password}
🏷️ *Função:* ${creds.role} (${creds.eventName || 'TODOS OS PROJETOS'})

Guarde esta senha para acessar a operação de kits no celular ou computador.`

    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotification(true)
      setTimeout(() => setCopiedNotification(false), 3000)
    }).catch(() => {
      alert('Texto copiado!')
    })
  }

  async function handleResetPasswordForUser(userId) {
    const target = users.find((u) => u.id === userId)
    if (user?.role === 'SUB_ADMIN' && target?.role === 'ADMIN') {
      alert('Sub-Admin não tem permissão para redefinir a senha do Super Admin.')
      return
    }
    const newPass = generateEasySecurePassword()
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
    )
    setUserToManagePassword((prev) => (prev ? { ...prev, password: newPass } : null))
    setShowManagePasswordEye(true)
    setManagePasswordFeedback('✓ Nova senha gerada! Copie agora — ela não será exibida de novo.')
    setTimeout(() => setManagePasswordFeedback(''), 3000)

    apiUpdateUser(userId, { password: newPass }).catch(() => {})
  }

  return (
    <div className="usuarios-layout">
      <Sidebar activePage="usuarios" onNavigate={onNavigate} onLogout={onLogout} user={user} />

      <main className="usuarios-main">
        <header className="usuarios-header">
          <div className="usuarios-title-wrap">
            <h1 className="usuarios-page-title">USUÁRIOS</h1>
            <p className="usuarios-subtitle">
              Gerencie os usuários da operação e a função de cada um. Operador apenas entrega o kit; Supervisor entrega e pode alterar os dados do atleta; Sub-Admin gerencia a operação sem poder de exclusão; Super Admin tem acesso total irrestrito.
              <br />
              Crie logins com senha gerada automaticamente e envie facilmente para a equipe no WhatsApp.
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
              onClick={handleOpenAddModal}
            >
              <PlusIcon />
              <span>ADICIONAR USUÁRIO</span>
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
                      {item.role === 'ADMIN' || item.role === 'SUB_ADMIN' ? <ShieldIcon /> : <UserIcon />}
                      <span>{item.role === 'SUB_ADMIN' ? 'SUB-ADMIN' : item.role === 'ADMIN' ? 'SUPER ADMIN' : item.role}</span>
                    </span>

                    <span className={`status-pill-user ${item.status === 'INATIVO' ? 'inactive' : ''}`}>
                      {item.status}
                    </span>

                    <span className="user-event-pill" title={item.eventName || 'Todos os Projetos'}>
                      📍 {item.eventName || 'TODOS OS PROJETOS'}
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
                  {!(user?.role === 'SUB_ADMIN' && item.role === 'ADMIN') && (
                    <button
                      type="button"
                      className="btn-user-cred-action"
                      title="Redefinir senha do usuário"
                      onClick={() => {
                        setUserToManagePassword({
                          ...item,
                          password: '',
                        })
                        setShowManagePasswordEye(false)
                        setManagePasswordFeedback('')
                      }}
                    >
                      <KeyIcon size={14} />
                      <span>SENHA</span>
                    </button>
                  )}

                  {!(user?.role === 'SUB_ADMIN' && item.role === 'ADMIN') && (
                    <button
                      type="button"
                      className="btn-deactivate"
                      onClick={() => handleToggleStatus(item.id)}
                    >
                      {item.status === 'ATIVO' ? 'DESATIVAR' : 'ATIVAR'}
                    </button>
                  )}

                  {user?.role === 'ADMIN' && item.id !== user?.id && item.id !== 'admin_pacetime' && item.role !== 'ADMIN' && (
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

        {/* MODAL 1: ADICIONAR NOVO USUÁRIO */}
        {showAddUserModal && (
          <div className="modal-backdrop" onClick={() => setShowAddUserModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-with-badge">
                  <h2 className="modal-title">NOVO USUÁRIO</h2>
                  <span className="modal-title-desc">Crie o acesso para o operador ou supervisor</span>
                </div>
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
                  <label className="form-label">E-MAIL (LOGIN DE ACESSO)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Ex: joao@entregas.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    required
                  />
                </div>

                {/* NOVO: CAMPO DE SENHA COM GERAÇÃO AUTOMÁTICA */}
                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label">SENHA DE ACESSO</label>
                    <button
                      type="button"
                      className="btn-inline-generate"
                      onClick={handleGenerateNewPasswordInForm}
                      title="Gerar uma nova senha aleatória e segura"
                    >
                      <SparklesIcon size={13} />
                      <span>GERAR SENHA</span>
                    </button>
                  </div>
                  <div className="password-input-wrapper">
                    <input
                      type={showPasswordInAddModal ? 'text' : 'password'}
                      className="form-input password-input"
                      placeholder="Mínimo 6 caracteres"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPasswordInAddModal((prev) => !prev)}
                      title={showPasswordInAddModal ? 'Ocultar senha' : 'Ver senha'}
                    >
                      <EyeIcon off={!showPasswordInAddModal} size={17} />
                    </button>
                  </div>
                  <span className="form-hint">
                    Esta senha será usada pelo operador para entrar no sistema. Ao salvar, você poderá copiá-la.
                  </span>
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
                        {availableRoleOptions.map((opt) => {
                          const isSelected = newUserForm.role === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`role-option-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setNewUserForm((prev) => ({
                                  ...prev,
                                  role: opt.value,
                                  ...(opt.value === 'ADMIN' || opt.value === 'SUB_ADMIN'
                                    ? { eventId: 'all', eventName: 'TODOS OS PROJETOS' }
                                    : {}),
                                }))
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

                <div className="form-group" ref={eventDropdownRef}>
                  <label className="form-label" id="event-select-label">VINCULAR A PROJETO / CORRIDA</label>
                  <div className="custom-role-dropdown">
                    <button
                      type="button"
                      className={`custom-role-trigger ${isEventDropdownOpen ? 'open' : ''}`}
                      onClick={() => {
                        setIsRoleDropdownOpen(false)
                        setIsEventDropdownOpen((prev) => !prev)
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={isEventDropdownOpen}
                      aria-labelledby="event-select-label"
                    >
                      <div className="role-trigger-text">
                        <span className="role-trigger-name">
                          {newUserForm.eventId === 'all'
                            ? 'TODOS OS PROJETOS (Acesso Global)'
                            : (availableEvents.find((e) => e.id === newUserForm.eventId)?.name || newUserForm.eventName || 'SELECIONE A CORRIDA')}
                        </span>
                      </div>
                      <ChevronDownIcon className={`role-chevron ${isEventDropdownOpen ? 'rotated' : ''}`} />
                    </button>

                    {isEventDropdownOpen && (
                      <div className="role-options-list" role="listbox">
                        {(newUserForm.role === 'ADMIN' || newUserForm.role === 'SUB_ADMIN') && (
                          <button
                            type="button"
                            className={`role-option-item ${newUserForm.eventId === 'all' ? 'selected' : ''}`}
                            onClick={() => {
                              setNewUserForm((prev) => ({
                                ...prev,
                                eventId: 'all',
                                eventName: 'TODOS OS PROJETOS',
                              }))
                              setIsEventDropdownOpen(false)
                            }}
                            role="option"
                            aria-selected={newUserForm.eventId === 'all'}
                          >
                            <div className="role-option-content">
                              <div className="role-option-title-row">
                                <span className={`role-tag-badge ${newUserForm.role === 'SUB_ADMIN' ? 'sub_admin' : 'admin'}`}>GLOBAL</span>
                                <span className="role-option-desc">TODOS OS PROJETOS</span>
                              </div>
                              <p className="role-option-detail">Acesso e gestão de todas as corridas do sistema</p>
                            </div>
                            {newUserForm.eventId === 'all' && (
                              <div className="role-selected-check">
                                <CheckIcon />
                              </div>
                            )}
                          </button>
                        )}

                        {availableEvents.length === 0 ? (
                          <div className="empty-events-select-msg">
                            Nenhum projeto cadastrado no momento. Cadastre um evento primeiro na aba Eventos.
                          </div>
                        ) : (
                          availableEvents.map((ev) => {
                            const isSelected = newUserForm.eventId === ev.id
                            return (
                              <button
                                key={ev.id}
                                type="button"
                                className={`role-option-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setNewUserForm((prev) => ({
                                    ...prev,
                                    eventId: ev.id,
                                    eventName: ev.name,
                                  }))
                                  setIsEventDropdownOpen(false)
                                }}
                                role="option"
                                aria-selected={isSelected}
                              >
                                <div className="role-option-content">
                                  <div className="role-option-title-row">
                                    <span className="role-tag-badge operador">CORRIDA</span>
                                    <span className="role-option-desc">{ev.name}</span>
                                  </div>
                                  <p className="role-option-detail">
                                    {ev.dateInput || ev.date || 'Data a definir'} • {ev.location || 'Local a definir'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <div className="role-selected-check">
                                    <CheckIcon />
                                  </div>
                                )}
                              </button>
                            )
                          })
                        )}
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

        {/* MODAL 2: CREDENCIAIS CRIADAS (ENTREGAR ACESSO AO USUÁRIO VIA WHATSAPP) */}
        {createdUserCredentials && (
          <div className="modal-backdrop" onClick={() => setCreatedUserCredentials(null)}>
            <div className="modal-card creds-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-with-badge">
                  <div className="creds-success-pill">✓ USUÁRIO CADASTRADO COM SUCESSO</div>
                  <h2 className="modal-title">DADOS DE ACESSO AO SISTEMA</h2>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setCreatedUserCredentials(null)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="modal-body creds-modal-body">
                <p className="creds-instructions">
                  Entregue estes dados para o usuário acessar a operação no celular ou computador:
                </p>

                <div className="credentials-box">
                  <div className="cred-field-row">
                    <span className="cred-field-label">NOME</span>
                    <strong className="cred-field-value">{createdUserCredentials.name}</strong>
                  </div>

                  <div className="cred-field-row">
                    <span className="cred-field-label">FUNÇÃO & PROJETO</span>
                    <strong className="cred-field-value role-badge-val">
                      {createdUserCredentials.role} ({createdUserCredentials.eventName})
                    </strong>
                  </div>

                  <div className="cred-field-row highlight-row">
                    <span className="cred-field-label">E-MAIL (LOGIN)</span>
                    <strong className="cred-field-value email-value">{createdUserCredentials.email}</strong>
                  </div>

                  <div className="cred-field-row highlight-row password-row">
                    <span className="cred-field-label">SENHA DE ACESSO</span>
                    <strong className="cred-field-value pass-value">{createdUserCredentials.password}</strong>
                  </div>
                </div>

                <div className="creds-actions-group">
                  <button
                    type="button"
                    className="btn-copy-creds-whatsapp"
                    onClick={() => handleCopyCredentials(createdUserCredentials)}
                  >
                    <CopyIcon size={18} />
                    <span>{copiedNotification ? '✓ COPIADO PARA A ÁREA DE TRANSFERÊNCIA!' : 'COPIAR DADOS DE ACESSO (WHATSAPP)'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-creds-finish"
                    onClick={() => setCreatedUserCredentials(null)}
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: VER / REDEFINIR SENHA DE USUÁRIO EXISTENTE */}
        {userToManagePassword && (
          <div className="modal-backdrop" onClick={() => setUserToManagePassword(null)}>
            <div className="modal-card creds-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-with-badge">
                  <h2 className="modal-title">CREDENCIAIS DE ACESSO</h2>
                  <span className="modal-title-desc">{userToManagePassword.name} ({userToManagePassword.role})</span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setUserToManagePassword(null)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="modal-body creds-modal-body">
                {managePasswordFeedback && (
                  <div className="alert-feedback-success">{managePasswordFeedback}</div>
                )}

                <div className="credentials-box">
                  <div className="cred-field-row">
                    <span className="cred-field-label">E-MAIL</span>
                    <strong className="cred-field-value">{userToManagePassword.email}</strong>
                  </div>

                  <div className="cred-field-row password-row">
                    <span className="cred-field-label">SENHA</span>
                    <div className="password-display-group">
                      <strong className="cred-field-value pass-value">
                        {userToManagePassword.password
                          ? (showManagePasswordEye ? userToManagePassword.password : '••••••••••••')
                          : 'Oculta por segurança — gere uma nova abaixo'}
                      </strong>
                      <button
                        type="button"
                        className="password-toggle-btn-small"
                        onClick={() => setShowManagePasswordEye((prev) => !prev)}
                        title={showManagePasswordEye ? 'Ocultar' : 'Exibir'}
                      >
                        <EyeIcon off={!showManagePasswordEye} size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="creds-actions-group">
                  <button
                    type="button"
                    className="btn-copy-creds-whatsapp"
                    onClick={() => handleCopyCredentials(userToManagePassword)}
                  >
                    <CopyIcon size={18} />
                    <span>{copiedNotification ? '✓ COPIADO!' : 'COPIAR ACESSO (WHATSAPP)'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-reset-password"
                    onClick={() => handleResetPasswordForUser(userToManagePassword.id)}
                  >
                    <SparklesIcon size={15} />
                    <span>GERAR NOVA SENHA</span>
                  </button>

                  <button
                    type="button"
                    className="btn-creds-finish"
                    onClick={() => setUserToManagePassword(null)}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
