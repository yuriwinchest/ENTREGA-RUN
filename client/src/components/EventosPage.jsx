import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import CidadeAutocomplete from './CidadeAutocomplete.jsx'
import DataPickerInput from './DataPickerInput.jsx'
import { apiCreateEvent, apiUpdateEvent, apiDeleteEvent } from '../utils/eventsApi.js'
import { filterEvents, getEventStatusCounts } from '../utils/eventFilter.js'
import './EventosPage.css'

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

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

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
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

function MapPinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function BarChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const INITIAL_EVENTS = []

export default function EventosPage({
  events: propEvents,
  setEvents: setPropEvents,
  user,
  onNavigate,
  onLogout,
  onOpenTutorial,
  tutorialStep,
}) {
  const [internalEvents, setInternalEvents] = useState(INITIAL_EVENTS)
  const events = propEvents || internalEvents
  const setEvents = setPropEvents || setInternalEvents

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ATIVOS')
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deletingEvent, setDeletingEvent] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEventForm, setNewEventForm] = useState({
    name: '',
    date: '',
    location: '',
  })

  const isOperator = user?.role === 'OPERADOR'
  const isRestricted = Boolean(
    user && user.role !== 'ADMIN' && (user.role === 'OPERADOR' || user.role === 'SUPERVISOR' || (user.eventId && user.eventId !== 'all'))
  )
  const canDelete = user?.role === 'ADMIN'
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN'
  const isStep2 = tutorialStep === 2

  const visibleEvents = isRestricted && user?.eventId
    ? events.filter((e) => e.id === user.eventId)
    : events

  const {
    ativos: countAtivos,
    planejados: countPlanejados,
    finalizados: countFinalizados,
    todos: countTodos,
  } = getEventStatusCounts(visibleEvents)

  const filteredEvents = filterEvents(visibleEvents, { statusFilter, search })

  function handleStatusChange(eventId, newStatus) {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === eventId) {
          return {
            ...ev,
            status: newStatus,
            active: newStatus === 'EM OPERAÇÃO',
          }
        }
        return ev
      })
    )
    apiUpdateEvent(eventId, {
      status: newStatus,
      active: newStatus === 'EM OPERAÇÃO',
    }).catch(() => {})
    setOpenDropdownId(null)
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingEvent) return

    const patch = {
      name: editingEvent.name.trim().toUpperCase(),
      location: editingEvent.location.trim().toUpperCase(),
      dateInput: editingEvent.dateInput.trim(),
      date: editingEvent.dateInput.trim(),
    }

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === editingEvent.id) {
          return {
            ...ev,
            ...patch,
          }
        }
        return ev
      })
    )
    apiUpdateEvent(editingEvent.id, patch).catch(() => {})
    setEditingEvent(null)
  }

  function handleConfirmDelete() {
    if (!deletingEvent) return
    if (!canDelete) {
      alert('Somente o Super Admin tem permissão para excluir eventos.')
      setDeletingEvent(null)
      return
    }
    const idToDelete = deletingEvent.id
    setEvents((prev) => prev.filter((ev) => ev.id !== idToDelete))
    apiDeleteEvent(idToDelete).catch(() => {})
    setDeletingEvent(null)
  }

  function handleCreateEvent(e) {
    e.preventDefault()
    if (!newEventForm.name.trim()) return

    const todayStr = new Date().toLocaleDateString('pt-BR')
    const dateVal = newEventForm.date.trim() || todayStr
    const newEv = {
      id: `event-${Date.now()}`,
      name: newEventForm.name.trim().toUpperCase(),
      date: dateVal,
      dateInput: dateVal,
      location: newEventForm.location.trim() || 'Recife/PE',
      status: 'PLANEJADO',
      active: false,
      total: 0,
      entregues: 0,
      pendentes: 0,
      concl: '0.0%',
    }

    setEvents((prev) => [newEv, ...prev])
    apiCreateEvent(newEv).catch(() => {})
    setNewEventForm({ name: '', date: '', location: '' })
    setShowCreateModal(false)
  }

  return (
    <div className="eventos-layout">
      <Sidebar activePage="eventos" onNavigate={onNavigate} onLogout={onLogout} user={user} />

      <main className="eventos-main">
        <header className="eventos-header">
          <h1 className="eventos-page-title">EVENTOS</h1>

          <div className="eventos-header-actions">
            <button
              type="button"
              className="tutorial-open-btn"
              onClick={onOpenTutorial}
            >
              <HelpCircleIcon />
              <span>TUTORIAL</span>
            </button>

            {canCreate && (
              <button
                type="button"
                className={`btn-primary-event ${isStep2 ? 'spotlight-highlight' : ''}`}
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon />
                <span>NOVO EVENTO</span>
                {isStep2 && (
                  <div className="spotlight-badge">
                    <span>✨</span>
                    <span>COMECE POR AQUI</span>
                  </div>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Navegação de Abas por Status */}
        <nav className="eventos-tabs-row" role="tablist" aria-label="Filtrar eventos por status">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'ATIVOS'}
            className={`eventos-tab-btn tab-active ${statusFilter === 'ATIVOS' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ATIVOS')}
          >
            <PlayIcon />
            <span>ATIVOS</span>
            <span className="tab-counter-badge">{countAtivos}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'PLANEJADO'}
            className={`eventos-tab-btn tab-planned ${statusFilter === 'PLANEJADO' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PLANEJADO')}
          >
            <ClockIcon />
            <span>PLANEJADOS</span>
            <span className="tab-counter-badge">{countPlanejados}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'FINALIZADO'}
            className={`eventos-tab-btn tab-finished ${statusFilter === 'FINALIZADO' ? 'active' : ''}`}
            onClick={() => setStatusFilter('FINALIZADO')}
          >
            <CheckCircleIcon />
            <span>FINALIZADOS</span>
            <span className="tab-counter-badge">{countFinalizados}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'TODOS'}
            className={`eventos-tab-btn tab-all ${statusFilter === 'TODOS' ? 'active' : ''}`}
            onClick={() => setStatusFilter('TODOS')}
          >
            <span>TODOS</span>
            <span className="tab-counter-badge">{countTodos}</span>
          </button>
        </nav>

        <section className="eventos-filter-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou data..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Limpar busca"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          <div className="filter-options-wrap">
            <span className="event-count-badge">
              {filteredEvents.length} EVENTO{filteredEvents.length === 1 ? '' : 'S'}
              {statusFilter !== 'TODOS' && (
                <span className="event-count-filter-name">
                  {statusFilter === 'ATIVOS' && (filteredEvents.length === 1 ? ' ATIVO' : ' ATIVOS')}
                  {statusFilter === 'PLANEJADO' && (filteredEvents.length === 1 ? ' PLANEJADO' : ' PLANEJADOS')}
                  {statusFilter === 'FINALIZADO' && (filteredEvents.length === 1 ? ' FINALIZADO' : ' FINALIZADOS')}
                </span>
              )}
            </span>
          </div>
        </section>

        <section className="events-grid">
          {filteredEvents.length === 0 ? (
            <div className="eventos-empty-card">
              <div className="eventos-empty-icon-wrap">
                {statusFilter === 'ATIVOS' && <PlayIcon />}
                {statusFilter === 'PLANEJADO' && <ClockIcon />}
                {statusFilter === 'FINALIZADO' && <CheckCircleIcon />}
                {statusFilter === 'TODOS' && <SearchIcon />}
              </div>
              <p className="eventos-empty-title">
                {search
                  ? `Nenhum evento encontrado para "${search}"`
                  : statusFilter === 'ATIVOS'
                  ? 'Nenhum evento ativo no momento'
                  : statusFilter === 'PLANEJADO'
                  ? 'Nenhum evento planejado'
                  : statusFilter === 'FINALIZADO'
                  ? 'Nenhum evento finalizado'
                  : 'Nenhum evento cadastrado no sistema ainda'}
              </p>
              <p className="eventos-empty-subtitle">
                {search
                  ? 'Tente buscar por outro termo ou limpe o campo de busca.'
                  : statusFilter === 'ATIVOS'
                  ? (countPlanejados > 0 || countFinalizados > 0)
                    ? `Você possui ${countPlanejados} evento(s) planejado(s) e ${countFinalizados} finalizado(s). Altere o status de um evento planejado para "EM OPERAÇÃO" para ativá-lo, ou navegue pelas abas acima.`
                    : 'Cadastre um novo evento e inicie a operação para vê-lo aqui.'
                  : statusFilter === 'PLANEJADO'
                  ? 'Todos os eventos cadastrados já foram iniciados ou finalizados.'
                  : statusFilter === 'FINALIZADO'
                  ? 'Nenhum evento foi marcado como finalizado até o momento.'
                  : 'Cadastre o seu primeiro evento esportivo para começar a operação.'}
              </p>

              <div className="eventos-empty-actions">
                {search && (
                  <button
                    type="button"
                    className="btn-empty-action secondary"
                    onClick={() => setSearch('')}
                  >
                    Limpar busca
                  </button>
                )}

                {!search && statusFilter === 'ATIVOS' && countPlanejados > 0 && (
                  <button
                    type="button"
                    className="btn-empty-action secondary"
                    onClick={() => setStatusFilter('PLANEJADO')}
                  >
                    <ClockIcon />
                    <span>Ver Planejados ({countPlanejados})</span>
                  </button>
                )}

                {!search && statusFilter !== 'TODOS' && countTodos > 0 && (
                  <button
                    type="button"
                    className="btn-empty-action secondary"
                    onClick={() => setStatusFilter('TODOS')}
                  >
                    <span>Ver Todos ({countTodos})</span>
                  </button>
                )}

                {canCreate && (!search || filteredEvents.length === 0) && (
                  <button
                    type="button"
                    className="btn-empty-action primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <PlusIcon />
                    <span>NOVO EVENTO</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredEvents.map((event) => {
            const isDropdownOpen = openDropdownId === event.id

            return (
              <article key={event.id} className="event-card">
                <div className="event-card-top">
                  <span className="event-date">{event.date}</span>

                  <div className="event-top-actions">
                    {!isOperator && (
                      <button
                        type="button"
                        className="icon-action-btn"
                        title="Editar evento"
                        onClick={() => setEditingEvent({ ...event })}
                      >
                        <EditIcon />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        className="icon-action-btn delete"
                        title="Excluir evento"
                        onClick={() => setDeletingEvent(event)}
                      >
                        <TrashIcon />
                      </button>
                    )}

                    {/* Status Pill Button + Dropdown Container */}
                    <div className="status-dropdown-container">
                      {isOperator ? (
                        <div
                          className={`status-pill read-only ${
                            event.status === 'EM OPERAÇÃO'
                              ? 'active'
                              : event.status === 'FINALIZADO'
                              ? 'finished'
                              : 'planned'
                          }`}
                        >
                          {event.status === 'EM OPERAÇÃO' && <PlayIcon />}
                          {event.status === 'PLANEJADO' && <ClockIcon />}
                          {event.status === 'FINALIZADO' && <CheckCircleIcon />}
                          <span>{event.status}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`status-pill ${
                            event.status === 'EM OPERAÇÃO'
                              ? 'active'
                              : event.status === 'FINALIZADO'
                              ? 'finished'
                              : 'planned'
                          }`}
                          onClick={() =>
                            setOpenDropdownId(isDropdownOpen ? null : event.id)
                          }
                        >
                          {event.status === 'EM OPERAÇÃO' && <PlayIcon />}
                          {event.status === 'PLANEJADO' && <ClockIcon />}
                          {event.status === 'FINALIZADO' && <CheckCircleIcon />}
                          <span>{event.status}</span>
                          <ChevronDownIcon />
                        </button>
                      )}

                      {isDropdownOpen && (
                        <>
                          <div
                            className="dropdown-overlay"
                            onClick={() => setOpenDropdownId(null)}
                          />
                          <div className="status-dropdown-menu">
                            <button
                              type="button"
                              className={`status-dropdown-item ${
                                event.status === 'PLANEJADO' ? 'selected' : ''
                              }`}
                              onClick={() =>
                                handleStatusChange(event.id, 'PLANEJADO')
                              }
                            >
                              <span className="status-item-left">
                                <ClockIcon />
                                <span>PLANEJADO</span>
                              </span>
                              {event.status === 'PLANEJADO' && (
                                <span className="status-check-circle">
                                  <CheckCircleIcon />
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              className={`status-dropdown-item ${
                                event.status === 'EM OPERAÇÃO' ? 'selected' : ''
                              }`}
                              onClick={() =>
                                handleStatusChange(event.id, 'EM OPERAÇÃO')
                              }
                            >
                              <span className="status-item-left">
                                <PlayIcon />
                                <span>EM OPERAÇÃO</span>
                              </span>
                              {event.status === 'EM OPERAÇÃO' && (
                                <span className="status-check-circle">
                                  <CheckCircleIcon />
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              className={`status-dropdown-item ${
                                event.status === 'FINALIZADO' ? 'selected' : ''
                              }`}
                              onClick={() =>
                                handleStatusChange(event.id, 'FINALIZADO')
                              }
                            >
                              <span className="status-item-left">
                                <CheckCircleIcon />
                                <span>FINALIZADO</span>
                              </span>
                              {event.status === 'FINALIZADO' && (
                                <span className="status-check-circle">
                                  <CheckCircleIcon />
                                </span>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="event-card-body">
                  <h2 className="event-name">{event.name}</h2>
                  <div className="event-location">
                    <MapPinIcon />
                    <span>{event.location}</span>
                  </div>
                </div>

                <div className="event-card-footer">
                  <button
                    type="button"
                    className="card-action-btn"
                    onClick={() => onNavigate('operacao', event.id)}
                  >
                    <PackageIcon />
                    <span>ENTREGAR KIT</span>
                  </button>

                  <button
                    type="button"
                    className="card-action-btn"
                    onClick={() => onNavigate('event-dashboard', event.id)}
                  >
                    <BarChartIcon />
                    <span>DASHBOARD</span>
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>

        {/* MODAL: NOVO EVENTO */}
        {showCreateModal && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-header">
                <h2 className="modal-title">NOVO EVENTO</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowCreateModal(false)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <form className="modal-body" onSubmit={handleCreateEvent}>
                <div className="form-group">
                  <label className="form-label">
                    <ZapIcon />
                    <span>NOME DO EVENTO</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Corrida do Blogueiro"
                    value={newEventForm.name}
                    onChange={(e) =>
                      setNewEventForm({ ...newEventForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">
                      <CalendarIcon />
                      <span>DATA</span>
                    </label>
                    <DataPickerInput
                      value={newEventForm.date}
                      onChange={(dateVal) =>
                        setNewEventForm({ ...newEventForm, date: dateVal })
                      }
                      placeholder="dd/mm/aaaa"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <MapPinIcon />
                      <span>CIDADE / UF</span>
                    </label>
                    <CidadeAutocomplete
                      value={newEventForm.location}
                      onChange={(locVal) =>
                        setNewEventForm({ ...newEventForm, location: locVal })
                      }
                      placeholder="Ex: Recife/PE"
                      required
                    />
                  </div>
                </div>

                <div className="modal-divider" />

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setShowCreateModal(false)}
                  >
                    CANCELAR
                  </button>
                  <button type="submit" className="modal-btn-create">
                    CRIAR EVENTO
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDITAR EVENTO */}
        {editingEvent && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-header">
                <h2 className="modal-title">EDITAR EVENTO</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setEditingEvent(null)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <form className="modal-body" onSubmit={handleSaveEdit}>
                <div className="form-group">
                  <label className="form-label">
                    <ZapIcon />
                    <span>NOME DO EVENTO</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingEvent.name}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">
                      <CalendarIcon />
                      <span>DATA</span>
                    </label>
                    <DataPickerInput
                      value={editingEvent.dateInput || editingEvent.date || ''}
                      onChange={(dateVal) =>
                        setEditingEvent({
                          ...editingEvent,
                          dateInput: dateVal,
                          date: dateVal,
                        })
                      }
                      placeholder="dd/mm/aaaa"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <MapPinIcon />
                      <span>CIDADE / UF</span>
                    </label>
                    <CidadeAutocomplete
                      value={editingEvent.location || ''}
                      onChange={(locVal) =>
                        setEditingEvent({
                          ...editingEvent,
                          location: locVal,
                        })
                      }
                      placeholder="Ex: Recife/PE"
                      required
                    />
                  </div>
                </div>

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setEditingEvent(null)}
                  >
                    CANCELAR
                  </button>
                  <button type="submit" className="modal-btn-save">
                    SALVAR ALTERAÇÕES
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EXCLUIR EVENTO */}
        {deletingEvent && (
          <div className="modal-backdrop">
            <div className="modal-card modal-card-sm">
              <div className="modal-header">
                <h2 className="modal-title danger">EXCLUIR EVENTO</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setDeletingEvent(null)}
                  title="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="modal-body">
                <p className="modal-delete-text">
                  Tem certeza que deseja excluir o evento{' '}
                  <strong>"{deletingEvent.name}"</strong>? Esta ação não poderá
                  ser desfeita.
                </p>

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setDeletingEvent(null)}
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    className="modal-btn-delete"
                    onClick={handleConfirmDelete}
                  >
                    EXCLUIR
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
