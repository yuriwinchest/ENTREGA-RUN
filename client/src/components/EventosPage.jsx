import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
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

const INITIAL_EVENTS = [
  {
    id: '11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6',
    date: '16 SET 2026',
    dateInput: '16/09/2026',
    name: 'TREINÃO DA GALINHA',
    location: 'SÃO BENTO DO UNA',
    status: 'EM OPERAÇÃO',
    active: true,
    total: 409,
    entregues: 392,
    pendentes: 17,
    concl: '95.8%',
  },
  {
    id: '22c2fb52-9b9d-4f50-ad9a-3bffa67b00b7',
    date: '19 SET 2026',
    dateInput: '19/09/2026',
    name: 'CORRE SURUBIM',
    location: 'SURUBIM',
    status: 'PLANEJADO',
    active: false,
    total: 350,
    entregues: 0,
    pendentes: 350,
    concl: '0.0%',
  },
  {
    id: '33c3fb52-9b9d-4f50-ad9a-3bffa67b00c8',
    date: '15 SET 2026',
    dateInput: '15/09/2026',
    name: 'YURI2TESTE',
    location: 'piaui',
    status: 'PLANEJADO',
    active: false,
    total: 0,
    entregues: 0,
    pendentes: 0,
    concl: '0.0%',
  },
]

export default function EventosPage({
  events: propEvents,
  setEvents: setPropEvents,
  onNavigate,
  onLogout,
  onOpenTutorial,
  tutorialStep,
}) {
  const [internalEvents, setInternalEvents] = useState(INITIAL_EVENTS)
  const events = propEvents || internalEvents
  const setEvents = setPropEvents || setInternalEvents

  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deletingEvent, setDeletingEvent] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEventForm, setNewEventForm] = useState({
    name: '',
    date: '',
    location: '',
  })

  const isStep2 = tutorialStep === 2

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(search.toLowerCase()) ||
      event.location.toLowerCase().includes(search.toLowerCase()) ||
      event.date.toLowerCase().includes(search.toLowerCase())

    const matchesActive = onlyActive ? event.status === 'EM OPERAÇÃO' : true

    return matchesSearch && matchesActive
  })

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
    setOpenDropdownId(null)
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingEvent) return

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === editingEvent.id) {
          return {
            ...ev,
            name: editingEvent.name.trim().toUpperCase(),
            location: editingEvent.location.trim().toUpperCase(),
            dateInput: editingEvent.dateInput.trim(),
            date: editingEvent.dateInput.trim(),
          }
        }
        return ev
      })
    )
    setEditingEvent(null)
  }

  function handleConfirmDelete() {
    if (!deletingEvent) return
    setEvents((prev) => prev.filter((ev) => ev.id !== deletingEvent.id))
    setDeletingEvent(null)
  }

  function handleCreateEvent(e) {
    e.preventDefault()
    if (!newEventForm.name.trim()) return

    const dateVal = newEventForm.date.trim() || '15/09/2026'
    const newEv = {
      id: `event-${Date.now()}`,
      name: newEventForm.name.trim().toUpperCase(),
      date: dateVal,
      dateInput: dateVal,
      location: (newEventForm.location.trim() || 'Recife/PE').toUpperCase(),
      status: 'PLANEJADO',
      active: false,
      total: 0,
      entregues: 0,
      pendentes: 0,
      concl: '0.0%',
    }

    setEvents((prev) => [newEv, ...prev])
    setNewEventForm({ name: '', date: '', location: '' })
    setShowCreateModal(false)
  }

  return (
    <div className="eventos-layout">
      <Sidebar activePage="eventos" onNavigate={onNavigate} onLogout={onLogout} />

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
          </div>
        </header>

        <section className="eventos-filter-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou data..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-options-wrap">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              <span>SOMENTE ATIVOS</span>
            </label>

            <span className="event-count-badge">
              {filteredEvents.length} EVENTO{filteredEvents.length === 1 ? '' : 'S'}
            </span>
          </div>
        </section>

        <section className="events-grid">
          {filteredEvents.map((event) => {
            const isDropdownOpen = openDropdownId === event.id

            return (
              <article key={event.id} className="event-card">
                <div className="event-card-top">
                  <span className="event-date">{event.date}</span>

                  <div className="event-top-actions">
                    <button
                      type="button"
                      className="icon-action-btn"
                      title="Editar evento"
                      onClick={() => setEditingEvent({ ...event })}
                    >
                      <EditIcon />
                    </button>

                    <button
                      type="button"
                      className="icon-action-btn delete"
                      title="Excluir evento"
                      onClick={() => setDeletingEvent(event)}
                    >
                      <TrashIcon />
                    </button>

                    {/* Status Pill Button + Dropdown Container */}
                    <div className="status-dropdown-container">
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
          })}
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
                    <div className="input-with-icon-wrap">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="dd/mm/aaaa"
                        value={newEventForm.date}
                        onChange={(e) =>
                          setNewEventForm({ ...newEventForm, date: e.target.value })
                        }
                        required
                      />
                      <span className="input-end-icon">
                        <CalendarIcon />
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <MapPinIcon />
                      <span>CIDADE / UF</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Recife/PE"
                      value={newEventForm.location}
                      onChange={(e) =>
                        setNewEventForm({ ...newEventForm, location: e.target.value })
                      }
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
                    <div className="input-with-icon-wrap">
                      <input
                        type="text"
                        className="form-input"
                        value={editingEvent.dateInput || ''}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            dateInput: e.target.value,
                          })
                        }
                        required
                      />
                      <span className="input-end-icon">
                        <CalendarIcon />
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <MapPinIcon />
                      <span>CIDADE / UF</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingEvent.location}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          location: e.target.value,
                        })
                      }
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
