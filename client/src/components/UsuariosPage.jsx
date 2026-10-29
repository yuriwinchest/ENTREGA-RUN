import { useEffect, useState, useRef, useMemo } from 'react'
import Sidebar from './Sidebar.jsx'
import {
  apiFetchUsers,
  apiCreateUser,
  apiUpdateUser,
  apiIsolarUser,
  apiDeleteUser,
} from '../utils/usersApi.js'
import { buildEventTabs, buildUserScopes, scopeTotals, searchUsers, usersForEventTab } from '../utils/userTabs.js'
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

function EditIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
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

// Perfil de tela: o servidor guarda Super admin como ADMIN com superAdmin.
const SUPER_ADMIN_OPTION = {
  value: 'SUPER_ADMIN',
  label: 'SUPER ADMIN',
  description: 'Acesso total',
  detail: 'Login próprio com acesso total: vê tudo e gerencia todos os usuários, menos a sua conta de dono',
}

const EVENT_ROLES = ['OPERADOR', 'SUPERVISOR', 'MEDICO']

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
    value: 'MEDICO',
    label: 'MÉDICO',
    description: 'Socorro do evento',
    detail: 'Vê só o painel de ocorrências médicas do evento vinculado'
  },
  {
    value: 'SUB_ADMIN',
    label: 'GERENTE DE EVENTO',
    description: 'Gestão de um evento',
    detail: 'Gerencia usuários e auditoria de um evento específico'
  },
  {
    value: 'TEAM_ADMIN',
    label: 'SUB-ADMIN',
    description: 'Vê só o que é dele',
    detail: 'Acesso de administrador, mas só aos eventos e usuários que ele criar ou que você passar para ele'
  },
  {
    value: 'ADMIN',
    label: 'ADMIN DO PRINCIPAL',
    description: 'Administração do principal',
    detail: 'Gerencia o ambiente do principal; acesso global fica reservado ao administrador principal'
  }
]

function isLegacyGlobalAdmin(item) {
  return !item?.isPrincipal && !item?.teamId && (item?.role === 'ADMIN' || (item?.role === 'SUB_ADMIN' && item?.eventId === 'all'))
}

function roleBadgeLabel(item) {
  if (item.isOwner) return 'SUPER ADMIN · DONO'
  if (item.isPrincipal) return 'SUPER ADMIN'
  if (item.role === 'TEAM_ADMIN') return 'SUB-ADMIN'
  if (isLegacyGlobalAdmin(item)) return item.role === 'ADMIN' ? 'ADMIN ANTIGO · VÊ TUDO' : 'SUB-ADMIN ANTIGO · VÊ TUDO'
  if (item.role === 'SUB_ADMIN') return 'GERENTE DE EVENTO'
  if (item.role === 'MEDICO') return 'MÉDICO'
  return item.role
}

export default function UsuariosPage({
  user,
  events = [],
  onNavigate,
  onLogout,
  onOpenTutorial,
  onEnterEnvironment,
}) {
  const availableEvents = events
  const manageableEvents = user?.isPrincipal ? availableEvents.filter((event) => !event.teamId) : user?.role === 'SUB_ADMIN' && user.eventId !== 'all'
    ? availableEvents.filter((event) => event.id === user.eventId)
    : availableEvents
  const defaultEvent = manageableEvents[0] || (user?.eventId !== 'all' ? { id: user.eventId, name: user.eventName } : null)

  const allProjectsLabel = user?.teamId ? 'TODOS OS PROJETOS DA EQUIPE' : 'TODOS OS PROJETOS DO PRINCIPAL'
  const projectScopeLabel = (role, teamId) => role === 'SUPER_ADMIN' ? 'TODOS OS PROJETOS DA PLATAFORMA' : role === 'TEAM_ADMIN' || teamId ? 'TODOS OS PROJETOS DA EQUIPE' : 'TODOS OS PROJETOS DO PRINCIPAL'
  // "Todos os projetos" só faz sentido dentro de um âmbito isolado: o sub-admin
  // (TEAM_ADMIN) e o gerente criado por ele. Para o principal, um gerente com
  // todos os projetos seria o sub-admin antigo que vê tudo.
  const canPickAllProjects = (role) => ['SUPER_ADMIN', 'TEAM_ADMIN', 'ADMIN'].includes(role) || (role === 'SUB_ADMIN' && user?.role === 'TEAM_ADMIN')
  const roleOption = (value) => (value === 'SUPER_ADMIN' ? SUPER_ADMIN_OPTION : ROLE_OPTIONS.find((r) => r.value === value))
  const canManageTarget = (target) => {
    // A conta dona só o próprio dono altera; os demais Super admins gerenciam todos.
    if (target.isOwner) return Boolean(user?.isOwner)
    if (user?.isPrincipal) return true
    if (target.role === 'ADMIN' || target.role === 'TEAM_ADMIN' || target.isPrincipal) return false
    return true
  }

  const [users, setUsers] = useState([])
  const [loadError, setLoadError] = useState('')
  // Escadinha: aba do super admin + uma por Sub-admin; dentro, sub-abas por evento.
  const [scopeId, setScopeId] = useState('')
  const [eventTabId, setEventTabId] = useState('all')
  const userScopes = useMemo(() => buildUserScopes(users, events, user || {}), [users, events, user])
  const activeScope = userScopes.find((scope) => scope.id === scopeId) || userScopes[0]
  const eventTabs = useMemo(() => buildEventTabs(activeScope), [activeScope])
  const activeEventTab = eventTabs.some((tab) => tab.id === eventTabId) ? eventTabId : 'all'
  const [userSearch, setUserSearch] = useState('')
  const searching = userSearch.trim() !== ''
  const shownUsers = searching ? searchUsers(userScopes, userSearch) : usersForEventTab(activeScope, activeEventTab)
  const activeTotals = scopeTotals(activeScope)
  const nameById = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users])
  // Novo usuário aberto dentro da aba de um Sub-admin: entra na equipe dele,
  // num dos eventos dele (o servidor herda a equipe do evento escolhido).
  const [addScope, setAddScope] = useState(null)
  const addEvents = addScope ? addScope.events : manageableEvents
  // Super admin entra no ambiente de um Sub-admin (e volta pela faixa do App).
  const [enteringId, setEnteringId] = useState('')
  const canEnter = (target) => Boolean(user?.isPrincipal && onEnterEnvironment && target?.role === 'TEAM_ADMIN' && target.teamId && target.status !== 'INATIVO')
  async function enterEnvironment(target) {
    setEnteringId(target.id)
    try {
      await onEnterEnvironment(target)
    } catch (error) {
      setEnteringId('')
      alert(error.message || 'Não foi possível entrar no ambiente.')
    }
  }

  // Remove cache legado que continha senhas em texto puro e sincroniza usuários em tempo real
  useEffect(() => {
    try { localStorage.removeItem('entregas_run_users') } catch {}
    let isMounted = true

    const loadUsers = async () => {
      if (document.visibilityState === 'hidden') return
      const serverUsers = await apiFetchUsers()
      if (!isMounted) return
      if (Array.isArray(serverUsers)) {
        setUsers(serverUsers)
        setLoadError('')
      } else if (!users.length) {
        setLoadError('Não foi possível carregar os usuários do servidor.')
      }
    }

    void loadUsers()

    // A cada 10 s: contagem de entregas por operador sem sobrecarregar a VPS.
    const timer = window.setInterval(loadUsers, 10000)
    window.addEventListener('focus', loadUsers)
    document.addEventListener('visibilitychange', loadUsers)

    return () => {
      isMounted = false
      window.clearInterval(timer)
      window.removeEventListener('focus', loadUsers)
      document.removeEventListener('visibilitychange', loadUsers)
    }
  }, [users.length])

  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showPasswordInAddModal, setShowPasswordInAddModal] = useState(false)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false)
  const roleDropdownRef = useRef(null)
  const eventDropdownRef = useRef(null)

  // Modal para editar usuário (função, nome e projeto atribuído)
  const [userToEdit, setUserToEdit] = useState(null)
  // Isolar sub-admin antigo: { target, eventIds: Set, saving, error, done }
  const [isolar, setIsolar] = useState(null)
  const principalEvents = events.filter((event) => !event.teamId)

  function openIsolar(target) {
    const own = principalEvents.filter((event) => event.createdBy === target.id || (target.eventId !== 'all' && event.id === target.eventId))
    setIsolar({ target, eventIds: new Set(own.map((event) => event.id)), saving: false, error: '', done: null })
  }

  function toggleIsolarEvent(eventId) {
    setIsolar((prev) => {
      const next = new Set(prev.eventIds)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return { ...prev, eventIds: next, error: '' }
    })
  }

  async function confirmIsolar() {
    if (!isolar || isolar.saving) return
    setIsolar((prev) => ({ ...prev, saving: true, error: '' }))
    try {
      const result = await apiIsolarUser(isolar.target.id, [...isolar.eventIds])
      setIsolar((prev) => ({ ...prev, saving: false, done: result }))
      const serverUsers = await apiFetchUsers()
      if (Array.isArray(serverUsers)) setUsers(serverUsers)
    } catch (error) {
      setIsolar((prev) => ({ ...prev, saving: false, error: error.message || 'Não foi possível isolar.' }))
    }
  }
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    role: 'OPERADOR',
    eventId: '',
    eventName: '',
  })
  const editManageableEvents = user?.isPrincipal
    ? availableEvents.filter((event) => (event.teamId || null) === (userToEdit?.teamId || null))
    : manageableEvents
  const [editFormError, setEditFormError] = useState('')
  const [isEditRoleDropdownOpen, setIsEditRoleDropdownOpen] = useState(false)
  const [isEditEventDropdownOpen, setIsEditEventDropdownOpen] = useState(false)
  const editRoleDropdownRef = useRef(null)
  const editEventDropdownRef = useRef(null)

  // Credenciais geradas após criar usuário com sucesso (para copiar para WhatsApp)
  const [createdUserCredentials, setCreatedUserCredentials] = useState(null)
  const [copiedNotification, setCopiedNotification] = useState(false)

  // Modal para ver/redefinir senha de usuário existente
  const [userToManagePassword, setUserToManagePassword] = useState(null)
  const [showManagePasswordEye, setShowManagePasswordEye] = useState(false)
  const [managePasswordFeedback, setManagePasswordFeedback] = useState('')
  const [manualPassword, setManualPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [newUserForm, setNewUserForm] = useState(() => ({
    name: '',
    email: '',
    password: '',
    role: 'OPERADOR',
    eventId: defaultEvent?.id || '',
    eventName: defaultEvent?.name || '',
  }))

  useEffect(() => {
    function handleClickOutside(event) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false)
      }
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(event.target)) {
        setIsEventDropdownOpen(false)
      }
      if (editRoleDropdownRef.current && !editRoleDropdownRef.current.contains(event.target)) {
        setIsEditRoleDropdownOpen(false)
      }
      if (editEventDropdownRef.current && !editEventDropdownRef.current.contains(event.target)) {
        setIsEditEventDropdownOpen(false)
      }
    }
    if (isRoleDropdownOpen || isEventDropdownOpen || isEditRoleDropdownOpen || isEditEventDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isRoleDropdownOpen, isEventDropdownOpen, isEditRoleDropdownOpen, isEditEventDropdownOpen])

  function handleOpenAddModal(scope = null) {
    setAddScope(scope)
    const initialEvent = scope ? scope.events[0] : manageableEvents[0] || (user?.eventId !== 'all' ? { id: user.eventId, name: user.eventName } : null)
    setNewUserForm({
      name: '',
      email: '',
      password: '',
      role: 'OPERADOR',
      eventId: initialEvent?.id || '',
      eventName: initialEvent?.name || '',
    })
    setFormError('')
    setShowPasswordInAddModal(false)
    setShowAddUserModal(true)
  }

  async function handleAddUser(e) {
    e.preventDefault()
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) return
    if (!newUserForm.password || newUserForm.password.length < 6) {
      setFormError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if ((EVENT_ROLES.includes(newUserForm.role) || !canPickAllProjects(newUserForm.role)) && (!newUserForm.eventId || newUserForm.eventId === 'all')) {
      setFormError('Escolha o evento deste usuário. Para um administrador que vê só o que é dele, use o perfil SUB-ADMIN.')
      return
    }

    const selectedEv = availableEvents.find((ev) => ev.id === newUserForm.eventId)
    const assignedName = newUserForm.eventId === 'all'
      ? projectScopeLabel(newUserForm.role, user?.teamId)
      : (selectedEv?.name || newUserForm.eventName || 'PROJETO VINCULADO')

    const newUser = {
      name: newUserForm.name.trim().toUpperCase(),
      email: newUserForm.email.trim().toLowerCase(),
      password: newUserForm.password,
      role: newUserForm.role === 'SUPER_ADMIN' ? 'ADMIN' : newUserForm.role,
      ...(newUserForm.role === 'SUPER_ADMIN' ? { superAdmin: true } : {}),
      eventId: newUserForm.eventId,
      eventName: assignedName,
      status: 'ATIVO',
      deliveries: 0,
      avatar: newUserForm.name.trim().substring(0, 2).toUpperCase(),
    }

    setSaving(true)
    setFormError('')
    try {
      const savedUser = await apiCreateUser(newUser)
      setUsers((prev) => [savedUser, ...prev])
      setShowAddUserModal(false)
      setCreatedUserCredentials({ ...savedUser, password: newUserForm.password })
    } catch (error) {
      setFormError(error.message || 'Não foi possível salvar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  function handleOpenEditModal(targetUser) {
    const initialEvent = manageableEvents.find((e) => e.id === targetUser.eventId) || manageableEvents[0]
    setUserToEdit(targetUser)
    setEditUserForm({
      name: targetUser.name || '',
      role: targetUser.superAdmin ? 'SUPER_ADMIN' : (targetUser.role || 'OPERADOR'),
      eventId: targetUser.eventId || (initialEvent?.id || ''),
      eventName: targetUser.eventId === 'all' ? projectScopeLabel(targetUser.role, targetUser.teamId) : (targetUser.eventName || initialEvent?.name || ''),
    })
    setEditFormError('')
    setIsEditRoleDropdownOpen(false)
    setIsEditEventDropdownOpen(false)
  }

  async function handleSaveEditUser(e) {
    e.preventDefault()
    if (!userToEdit) return
    if (!editUserForm.name.trim()) {
      setEditFormError('O nome do usuário é obrigatório.')
      return
    }
    if (['OPERADOR', 'SUPERVISOR', 'MEDICO'].includes(editUserForm.role) && (!editUserForm.eventId || editUserForm.eventId === 'all')) {
      setEditFormError('Operadores, Supervisores e Médicos devem ser vinculados obrigatoriamente a um projeto específico.')
      return
    }

    const selectedEv = availableEvents.find((ev) => ev.id === editUserForm.eventId)
    const assignedName = editUserForm.eventId === 'all'
      ? projectScopeLabel(editUserForm.role, userToEdit?.teamId)
      : (selectedEv?.name || editUserForm.eventName || 'PROJETO VINCULADO')

    setSaving(true)
    setEditFormError('')
    try {
      const savedUser = await apiUpdateUser(userToEdit.id, {
        name: editUserForm.name.trim().toUpperCase(),
        role: editUserForm.role === 'SUPER_ADMIN' ? 'ADMIN' : editUserForm.role,
        eventId: editUserForm.eventId,
        eventName: assignedName,
      })
      setUsers((prev) => prev.map((u) => (u.id === userToEdit.id ? savedUser : u)))
      setUserToEdit(null)
    } catch (error) {
      setEditFormError(error.message || 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  // Modelo do Yuri (2026-10-28): Super admin é só a conta dona (não se cria pela
  // tela); Sub-admin vê só o que é dele; os demais são perfis de um evento.
  // "Admin do principal" e "Gerente de evento" não são mais criados; os que já
  // existem continuam funcionando e aparecem na edição só para quem já os tem.
  const availableRoleOptions = useMemo(() => {
    const creatable = ROLE_OPTIONS.filter((option) => !['ADMIN', 'SUB_ADMIN'].includes(option.value))
    const ordered = [...creatable.filter((option) => option.value === 'TEAM_ADMIN'), ...creatable.filter((option) => option.value !== 'TEAM_ADMIN')]
    if (user?.isOwner) return [SUPER_ADMIN_OPTION, ...ordered]
    return user?.isPrincipal ? ordered : ordered.filter((option) => option.value !== 'TEAM_ADMIN')
  }, [user?.isPrincipal, user?.isOwner])
  // Dentro da equipe de um Sub-admin só entram perfis de evento.
  const addRoleOptions = addScope ? availableRoleOptions.filter((option) => EVENT_ROLES.includes(option.value)) : availableRoleOptions
  const editRoleOptions = userToEdit?.superAdmin
    ? [SUPER_ADMIN_OPTION]
    : userToEdit?.role === 'TEAM_ADMIN'
    ? ROLE_OPTIONS.filter((option) => option.value === 'TEAM_ADMIN')
    : [
      ...availableRoleOptions.filter((option) => !['TEAM_ADMIN', 'SUPER_ADMIN'].includes(option.value)),
      ...ROLE_OPTIONS.filter((option) => ['ADMIN', 'SUB_ADMIN'].includes(option.value) && option.value === userToEdit?.role),
    ]

  async function handleToggleStatus(userId) {
    const target = users.find((u) => u.id === userId)
    if (!target) return
    if (!canManageTarget(target)) {
      alert('Você não tem permissão para alterar este administrador.')
      return
    }
    const nextStatus = target.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'

    try {
      const savedUser = await apiUpdateUser(userId, { status: nextStatus })
      setUsers((prev) => prev.map((u) => (u.id === userId ? savedUser : u)))
    } catch (error) {
      alert(error.message || 'Não foi possível alterar o usuário.')
    }
  }

  async function handleRemoveUser(userId) {
    const targetUser = users.find((u) => u.id === userId)
    if (user?.role === 'SUB_ADMIN' && (targetUser?.createdBy !== user.id || (user.eventId !== 'all' && targetUser?.eventId !== user.eventId))) {
      alert('Você só pode remover usuários que criou no seu ambiente.')
      return
    }
    if (userId === user?.id || targetUser?.isOwner) {
      alert('Não é possível remover a conta dona do sistema nem a sua própria conta.')
      return
    }
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return

    try {
      await apiDeleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (error) {
      alert(error.message || 'Não foi possível remover o usuário.')
    }
  }

  function handleCopyCredentials(creds) {
    if (!creds) return
    if (!creds.password) {
      alert('Salve uma senha antes de copiar o acesso.')
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
    if (target && !canManageTarget(target)) {
      alert('Você não tem permissão para redefinir a senha deste administrador.')
      return
    }
    if (manualPassword.length < 6) {
      setManagePasswordFeedback('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    setSaving(true)
    setManagePasswordFeedback('')
    try {
      const savedUser = await apiUpdateUser(userId, { password: manualPassword })
      setUsers((prev) => prev.map((u) => (u.id === userId ? savedUser : u)))
      setUserToManagePassword({ ...savedUser, password: manualPassword })
      setManualPassword('')
      setShowManagePasswordEye(true)
      setManagePasswordFeedback('Senha salva. Copie o acesso agora; ela não será exibida de novo.')
    } catch (error) {
      setManagePasswordFeedback(error.message || 'Não foi possível salvar a senha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="usuarios-layout">
      <Sidebar activePage="usuarios" onNavigate={onNavigate} onLogout={onLogout} user={user} />

      <main className="usuarios-main">
        <header className="usuarios-header">
          <div className="usuarios-title-wrap">
            <h1 className="usuarios-page-title">USUÁRIOS</h1>
            <p className="usuarios-subtitle">
              O Super Admin vê e gerencia tudo. Cada Sub-admin vê só os eventos e os usuários dele.
              <br />
              Crie logins com a senha que você definir e compartilhe o acesso com a equipe.
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
              onClick={() => handleOpenAddModal()}
            >
              <PlusIcon />
              <span>ADICIONAR USUÁRIO</span>
            </button>
          </div>
        </header>

        {loadError && <p role="alert" className="alert-feedback-error">{loadError}</p>}
        {users.length > 0 && (
          <div className="user-search">
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={userScopes.length > 1 ? 'Buscar por nome, e-mail ou evento em todas as abas' : 'Buscar por nome, e-mail ou evento'}
              aria-label="Buscar usuário"
            />
            {searching && <span>{shownUsers.length} {shownUsers.length === 1 ? 'encontrado' : 'encontrados'}</span>}
          </div>
        )}
        {!searching && userScopes.length > 1 && (
          <nav className="user-scope-tabs" role="tablist" aria-label="Usuários por administrador">
            {userScopes.map((scope) => (
              <button
                key={scope.id}
                type="button"
                role="tab"
                aria-selected={activeScope?.id === scope.id}
                className={activeScope?.id === scope.id ? 'on' : ''}
                onClick={() => { setScopeId(scope.id); setEventTabId('all') }}
              >
                {scope.leader && <span className="user-scope-kind">SUB-ADMIN</span>}
                <span className="user-scope-name">{scope.label}</span>
                <span className="user-scope-count">{scope.users.length}</span>
              </button>
            ))}
          </nav>
        )}

        {!searching && activeScope?.leader && (
          <section className="user-scope-summary" aria-label={`Eventos de ${activeScope.label}`}>
            <div className="user-scope-summary-head">
              <div>
                <h2>Eventos de {activeScope.label}</h2>
                <p className="user-scope-totals">
                  {activeTotals.eventos} {activeTotals.eventos === 1 ? 'evento' : 'eventos'} · {activeScope.users.length} {activeScope.users.length === 1 ? 'usuário' : 'usuários'} · {activeTotals.entregues.toLocaleString('pt-BR')} de {activeTotals.atletas.toLocaleString('pt-BR')} kits entregues ({activeTotals.percentual}%)
                </p>
              </div>
              <div className="user-scope-actions">
              {canEnter(activeScope.leader) && (
                <button type="button" className="btn-enter-env" onClick={() => enterEnvironment(activeScope.leader)} disabled={enteringId !== ''}>
                  {enteringId === activeScope.leader.id ? 'ENTRANDO…' : `ENTRAR NO AMBIENTE DE ${activeScope.label}`}
                </button>
              )}
              {activeScope.events.length > 0 && (
                <button type="button" className="btn-scope-add" onClick={() => handleOpenAddModal(activeScope)}>
                  <PlusIcon /> <span>USUÁRIO PARA {activeScope.label}</span>
                </button>
              )}
              </div>
            </div>
            {activeScope.events.length === 0 ? (
              <p className="user-scope-empty">Ainda não criou nenhum evento.</p>
            ) : (
              <ul>
                {activeScope.events.map((event) => (
                  <li key={event.id}>
                    <strong>{event.name}</strong>
                    <span>{Number(event.total) || 0} atletas · {Number(event.entregues) || 0} entregues{event.status ? ` · ${event.status}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!searching && eventTabs.length > 2 && (
          <nav className="user-event-tabs" role="tablist" aria-label="Usuários por evento">
            {eventTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeEventTab === tab.id}
                className={activeEventTab === tab.id ? 'on' : ''}
                onClick={() => setEventTabId(tab.id)}
              >
                {tab.label} <span>{tab.count}</span>
              </button>
            ))}
          </nav>
        )}

        {shownUsers.length === 0 && users.length > 0 && (
          <p className="user-scope-empty">{searching ? 'Ninguém encontrado com essa busca.' : 'Ninguém cadastrado aqui ainda.'}</p>
        )}

        <section className="users-grid">
          {shownUsers.map((item) => (
            <article key={item.id} className="user-card">
              <div className="user-card-top">
                <div className="user-avatar">{item.avatar || item.name?.substring(0, 2).toUpperCase() || 'U'}</div>

                <div className="user-details">
                  {canEnter(item) ? (
                    <h2 className="user-name">
                      <button type="button" className="user-name-enter" title={`Entrar no ambiente de ${item.name}`} onClick={() => enterEnvironment(item)} disabled={enteringId !== ''}>
                        {item.name}
                      </button>
                    </h2>
                  ) : (
                    <h2 className="user-name">{item.name}</h2>
                  )}
                  <span className="user-email">{item.email}</span>

                  <div className="user-badges-row">
                    <span className={`role-pill ${item.isPrincipal ? 'super_admin' : item.role.toLowerCase()}`}>
                      {['ADMIN', 'TEAM_ADMIN', 'SUB_ADMIN'].includes(item.role) ? <ShieldIcon /> : <UserIcon />}
                      <span>{roleBadgeLabel(item)}</span>
                    </span>

                    <span className={`status-pill-user ${item.status === 'INATIVO' ? 'inactive' : ''}`}>
                      {item.status}
                    </span>

                    <span className="user-event-pill" title={item.eventId === 'all' ? (item.isPrincipal ? 'TODOS OS PROJETOS DA PLATAFORMA' : projectScopeLabel(item.role, item.teamId)) : item.eventName}>
                      📍 {item.eventId === 'all' ? (item.isPrincipal ? 'TODOS OS PROJETOS DA PLATAFORMA' : projectScopeLabel(item.role, item.teamId)) : item.eventName}
                    </span>
                  </div>
                  {(item.scopeLabel && userScopes.length > 1) || nameById.get(item.createdBy) ? (
                    <p className="user-origin">
                      {[
                        item.scopeLabel && userScopes.length > 1 ? `Aba: ${item.scopeLabel}` : '',
                        nameById.get(item.createdBy) ? `Cadastrado por ${nameById.get(item.createdBy)}` : '',
                      ].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {item.role === 'TEAM_ADMIN' && canManageTarget(item) && (
                    <p className="user-team-note">Vê só os eventos e usuários dele. Desativar suspende o acesso dele e dos usuários dele, sem apagar nada.</p>
                  )}
                  {user?.isPrincipal && isLegacyGlobalAdmin(item) && (
                    <div className="user-isolar-note">
                      <p>Este perfil antigo vê todos os eventos. Isole para ele ver só o que é dele.</p>
                      <button type="button" className="btn-isolar" onClick={() => openIsolar(item)}>ISOLAR COMO SUB-ADMIN</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="user-card-footer">
                <div className="user-deliveries-col">
                  <span className="user-deliveries-label">ENTREGAS TOTAIS</span>
                  <span className="user-deliveries-count">{item.deliveries || 0}</span>
                </div>

                <div className="user-card-actions">
                  {canEnter(item) && (
                    <button type="button" className="btn-enter-env" onClick={() => enterEnvironment(item)} disabled={enteringId !== ''}>
                      {enteringId === item.id ? 'ENTRANDO…' : 'ENTRAR NO AMBIENTE'}
                    </button>
                  )}
                  {canManageTarget(item) && (
                    <button
                      type="button"
                      className="btn-user-cred-action"
                      title="Editar dados e projeto do usuário"
                      onClick={() => handleOpenEditModal(item)}
                    >
                      <EditIcon size={14} />
                      <span>EDITAR</span>
                    </button>
                  )}

                  {canManageTarget(item) && (
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
                        setManualPassword('')
                      }}
                    >
                      <KeyIcon size={14} />
                      <span>SENHA</span>
                    </button>
                  )}

                  {canManageTarget(item) && !item.isOwner && item.id !== user?.id && (
                    <button
                      type="button"
                      className="btn-deactivate"
                      onClick={() => handleToggleStatus(item.id)}
                    >
                      {item.role === 'TEAM_ADMIN' ? (item.status === 'ATIVO' ? 'DESATIVAR EQUIPE' : 'REATIVAR EQUIPE') : (item.status === 'ATIVO' ? 'DESATIVAR' : 'ATIVAR')}
                    </button>
                  )}

                  {(((user?.role === 'ADMIN' || user?.isPrincipal) && canManageTarget(item)) || (user?.role === 'TEAM_ADMIN' && canManageTarget(item)) || (user?.role === 'SUB_ADMIN' && item.createdBy === user.id && item.role !== 'ADMIN' && (user.eventId === 'all' || item.eventId === user.eventId))) && item.id !== user?.id && !item.isOwner && item.role !== 'TEAM_ADMIN' && (
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

        {/* MODAL: ISOLAR SUB-ADMIN ANTIGO */}
        {isolar && (
          <div className="modal-backdrop" onClick={() => !isolar.saving && setIsolar(null)}>
            <div className="modal-card isolar-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="isolar-title">
              <div className="modal-header">
                <div className="modal-title-with-badge">
                  <h2 className="modal-title" id="isolar-title">ISOLAR {isolar.target.name}</h2>
                  <span className="modal-title-desc">Depois disso ele verá só os eventos marcados e os que criar.</span>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setIsolar(null)} disabled={isolar.saving} title="Fechar">
                  <CloseIcon />
                </button>
              </div>
              <div className="modal-body isolar-body">
                {isolar.done ? (
                  <div className="isolar-done" role="status">
                    <strong>{isolar.target.name} agora é SUB-ADMIN isolado.</strong>
                    <p>{isolar.done.eventos} evento(s) e {isolar.done.usuarios} usuário(s) passaram para ele. Ele precisa entrar de novo no sistema.</p>
                    <button type="button" className="btn-isolar" onClick={() => setIsolar(null)}>CONCLUIR</button>
                  </div>
                ) : (
                  <>
                    <p className="isolar-help">
                      Marque os eventos que passam a ser dele. Os operadores, supervisores e médicos desses eventos vão junto.
                      Os eventos não marcados continuam só com você.
                    </p>
                    {principalEvents.length === 0 ? (
                      <p className="isolar-help">Nenhum evento disponível para passar. Ele começará sem eventos.</p>
                    ) : (
                      <ul className="isolar-list">
                        {principalEvents.map((event) => (
                          <li key={event.id}>
                            <label>
                              <input type="checkbox" checked={isolar.eventIds.has(event.id)} onChange={() => toggleIsolarEvent(event.id)} disabled={isolar.saving} />
                              <span>
                                <strong>{event.name}</strong>
                                <small>{[event.date || event.dateInput, event.location, event.createdBy === isolar.target.id ? 'criado por ele' : ''].filter(Boolean).join(' · ')}</small>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                    {isolar.error && <p className="alert-feedback-error" role="alert">{isolar.error}</p>}
                    <div className="isolar-actions">
                      <button type="button" className="btn-isolar ghost" onClick={() => setIsolar(null)} disabled={isolar.saving}>CANCELAR</button>
                      <button type="button" className="btn-isolar" onClick={() => void confirmIsolar()} disabled={isolar.saving}>
                        {isolar.saving ? 'ISOLANDO…' : `ISOLAR COM ${isolar.eventIds.size} EVENTO(S)`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: ADICIONAR NOVO USUÁRIO */}
        {showAddUserModal && (
          <div className="modal-backdrop" onClick={() => setShowAddUserModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-with-badge">
                  <h2 className="modal-title">NOVO USUÁRIO</h2>
                  <span className="modal-title-desc">{addScope ? `Entra na equipe do Sub-admin ${addScope.label}, num evento dele` : user?.isPrincipal ? 'Crie um Sub-admin ou alguém da equipe de um evento' : 'Crie o acesso para alguém da equipe do evento'}</span>
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

                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label">SENHA DE ACESSO</label>
                  </div>
                  <div className="password-input-wrapper">
                    <input
                      type={showPasswordInAddModal ? 'text' : 'password'}
                      className="form-input password-input"
                      placeholder="Mínimo 6 caracteres"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      minLength={6}
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
                  {user?.isPrincipal && !addScope && (
                    <p className="form-hint role-model-hint">
                      <strong>Super admin</strong>: login próprio com acesso total{user?.isOwner ? ' (só você cria)' : ''}. <strong>Sub-admin</strong>: faz tudo, mas só nos eventos que ele criar e nos que os usuários dele criarem.
                    </p>
                  )}
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
                          {roleOption(newUserForm.role)?.label || newUserForm.role}
                        </span>
                        <span className="role-trigger-desc">
                          ({roleOption(newUserForm.role)?.description || ''})
                        </span>
                      </div>
                      <ChevronDownIcon className={`role-chevron ${isRoleDropdownOpen ? 'rotated' : ''}`} />
                    </button>

                    {isRoleDropdownOpen && (
                      <div className="role-options-list" role="listbox">
                        {addRoleOptions.map((opt) => {
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
                                  ...(canPickAllProjects(opt.value)
                                    ? { eventId: 'all', eventName: allProjectsLabel }
                                    : prev.eventId === 'all'
                                      ? { eventId: addEvents[0]?.id || '', eventName: addEvents[0]?.name || '' }
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
                      disabled={['TEAM_ADMIN', 'SUPER_ADMIN'].includes(newUserForm.role)}
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
                            ? projectScopeLabel(newUserForm.role, user?.teamId)
                            : (addEvents.find((e) => e.id === newUserForm.eventId)?.name || newUserForm.eventName || 'SELECIONE A CORRIDA')}
                        </span>
                      </div>
                      <ChevronDownIcon className={`role-chevron ${isEventDropdownOpen ? 'rotated' : ''}`} />
                    </button>

                    {isEventDropdownOpen && (
                      <div className="role-options-list" role="listbox">
                        {canPickAllProjects(newUserForm.role) && (
                          <button
                            type="button"
                            className={`role-option-item ${newUserForm.eventId === 'all' ? 'selected' : ''}`}
                            onClick={() => {
                              setNewUserForm((prev) => ({
                                ...prev,
                                eventId: 'all',
                                eventName: allProjectsLabel,
                              }))
                              setIsEventDropdownOpen(false)
                            }}
                            role="option"
                            aria-selected={newUserForm.eventId === 'all'}
                          >
                            <div className="role-option-content">
                              <div className="role-option-title-row">
                                <span className={`role-tag-badge ${newUserForm.role === 'SUB_ADMIN' ? 'sub_admin' : 'admin'}`}>EQUIPE</span>
                                <span className="role-option-desc">{projectScopeLabel(newUserForm.role, user?.teamId)}</span>
                              </div>
                              <p className="role-option-detail">Acesso aos projetos deste ambiente, respeitando o perfil escolhido</p>
                            </div>
                            {newUserForm.eventId === 'all' && (
                              <div className="role-selected-check">
                                <CheckIcon />
                              </div>
                            )}
                          </button>
                        )}

                        {addEvents.length === 0 ? (
                          <div className="empty-events-select-msg">
                            Nenhum projeto cadastrado no momento. Cadastre um evento primeiro na aba Eventos.
                          </div>
                        ) : (
                          addEvents.map((ev) => {
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

                {formError && <p role="alert" className="alert-feedback-error">{formError}</p>}
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setShowAddUserModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="modal-btn-save" disabled={saving}>
                    {saving ? 'Salvando...' : 'Adicionar Usuário'}
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
                      {(createdUserCredentials.superAdmin ? SUPER_ADMIN_OPTION.label : roleOption(createdUserCredentials.role)?.label) || createdUserCredentials.role} ({createdUserCredentials.eventName})
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

        {/* MODAL EDITAR USUÁRIO */}
        {userToEdit && (
          <div className="modal-backdrop" onClick={() => setUserToEdit(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-with-badge">
                  <h2 className="modal-title">EDITAR USUÁRIO</h2>
                  <span className="modal-title-desc">Altere o nome, a função e o projeto atribuído</span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setUserToEdit(null)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <form className="modal-body" onSubmit={handleSaveEditUser}>
                <div className="form-group">
                  <label className="form-label">NOME COMPLETO</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">E-MAIL (LOGIN)</label>
                  <input
                    type="email"
                    className="form-input"
                    value={userToEdit.email}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group" ref={editRoleDropdownRef}>
                  <label className="form-label" id="edit-role-select-label">FUNÇÃO</label>
                  <div className="custom-role-dropdown">
                    <button
                      type="button"
                      className={`custom-role-trigger ${isEditRoleDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsEditRoleDropdownOpen((prev) => !prev)}
                      aria-haspopup="listbox"
                      aria-expanded={isEditRoleDropdownOpen}
                      aria-labelledby="edit-role-select-label"
                    >
                      <div className="role-trigger-text">
                        <span className="role-trigger-name">
                          {roleOption(editUserForm.role)?.label || editUserForm.role}
                        </span>
                        <span className="role-trigger-desc">
                          ({roleOption(editUserForm.role)?.description || ''})
                        </span>
                      </div>
                      <ChevronDownIcon className={`role-chevron ${isEditRoleDropdownOpen ? 'rotated' : ''}`} />
                    </button>

                    {isEditRoleDropdownOpen && (
                      <div className="role-options-list" role="listbox">
                        {editRoleOptions.map((opt) => {
                          const isSelected = editUserForm.role === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`role-option-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setEditUserForm((prev) => {
                                  const isGlobalRole = canPickAllProjects(opt.value)
                                  let nextEventId = prev.eventId
                                  let nextEventName = prev.eventName
                                  if (!isGlobalRole && (prev.eventId === 'all' || !prev.eventId)) {
                                    nextEventId = editManageableEvents[0]?.id || ''
                                    nextEventName = editManageableEvents[0]?.name || ''
                                  }
                                  if (isGlobalRole) {
                                    nextEventId = 'all'
                                    nextEventName = 'TODOS OS PROJETOS'
                                  }
                                  return {
                                    ...prev,
                                    role: opt.value,
                                    eventId: nextEventId,
                                    eventName: nextEventName,
                                  }
                                })
                                setIsEditRoleDropdownOpen(false)
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

                <div className="form-group" ref={editEventDropdownRef}>
                  <label className="form-label" id="edit-event-select-label">PROJETO / CORRIDA ATRIBUÍDA</label>
                  <div className="custom-role-dropdown">
                    <button
                      type="button"
                      className={`custom-role-trigger ${isEditEventDropdownOpen ? 'open' : ''}`}
                      disabled={['TEAM_ADMIN', 'SUPER_ADMIN'].includes(editUserForm.role)}
                      onClick={() => {
                        setIsEditRoleDropdownOpen(false)
                        setIsEditEventDropdownOpen((prev) => !prev)
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={isEditEventDropdownOpen}
                      aria-labelledby="edit-event-select-label"
                    >
                      <div className="role-trigger-text">
                        <span className="role-trigger-name">
                          {editUserForm.eventId === 'all'
                            ? projectScopeLabel(editUserForm.role, userToEdit?.teamId)
                            : (editManageableEvents.find((e) => e.id === editUserForm.eventId)?.name || editUserForm.eventName || 'SELECIONE A CORRIDA')}
                        </span>
                      </div>
                      <ChevronDownIcon className={`role-chevron ${isEditEventDropdownOpen ? 'rotated' : ''}`} />
                    </button>

                    {isEditEventDropdownOpen && (
                      <div className="role-options-list" role="listbox">
                        {canPickAllProjects(editUserForm.role) && (
                          <button
                            type="button"
                            className={`role-option-item ${editUserForm.eventId === 'all' ? 'selected' : ''}`}
                            onClick={() => {
                              setEditUserForm((prev) => ({
                                ...prev,
                                eventId: 'all',
                                eventName: allProjectsLabel,
                              }))
                              setIsEditEventDropdownOpen(false)
                            }}
                            role="option"
                            aria-selected={editUserForm.eventId === 'all'}
                          >
                            <div className="role-option-content">
                              <div className="role-option-title-row">
                                <span className={`role-tag-badge ${editUserForm.role === 'SUB_ADMIN' ? 'sub_admin' : 'admin'}`}>EQUIPE</span>
                                <span className="role-option-desc">{projectScopeLabel(editUserForm.role, userToEdit?.teamId)}</span>
                              </div>
                              <p className="role-option-detail">Acesso aos projetos deste ambiente, respeitando o perfil escolhido</p>
                            </div>
                            {editUserForm.eventId === 'all' && (
                              <div className="role-selected-check">
                                <CheckIcon />
                              </div>
                            )}
                          </button>
                        )}

                        {editManageableEvents.length === 0 ? (
                          <div className="empty-events-select-msg">
                            Nenhum projeto cadastrado no momento.
                          </div>
                        ) : (
                          editManageableEvents.map((ev) => {
                            const isSelected = editUserForm.eventId === ev.id
                            return (
                              <button
                                key={ev.id}
                                type="button"
                                className={`role-option-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setEditUserForm((prev) => ({
                                    ...prev,
                                    eventId: ev.id,
                                    eventName: ev.name,
                                  }))
                                  setIsEditEventDropdownOpen(false)
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

                {editFormError && <p role="alert" className="alert-feedback-error">{editFormError}</p>}
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setUserToEdit(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="modal-btn-save" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
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
                          : 'Oculta por segurança — digite uma nova abaixo'}
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

                <div className="form-group">
                  <label className="form-label" htmlFor="manual-password">NOVA SENHA</label>
                  <input
                    id="manual-password"
                    className="form-input"
                    type="password"
                    minLength={6}
                    placeholder="Digite a senha desejada"
                    value={manualPassword}
                    onChange={(event) => setManualPassword(event.target.value)}
                  />
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
                    disabled={saving || manualPassword.length < 6}
                  >
                    <KeyIcon size={15} />
                    <span>{saving ? 'SALVANDO...' : 'SALVAR SENHA'}</span>
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
