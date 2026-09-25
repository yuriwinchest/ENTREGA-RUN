import { useEffect, useRef, useState } from 'react'
import { apiFetchAthletes } from '../utils/eventsApi.js'
import Sidebar from './Sidebar.jsx'
import './EventDashboardPage.css'

function HelpCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}


function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function isDelivered(athlete) {
  return String(athlete.status || '').trim().toUpperCase() === 'ENTREGUE' || Boolean(athlete.entregueEm)
}

const SHIRT_SIZES_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'EXG', '2G', '3G', '4G', 'INFANTIL', 'UNICO', 'ÚNICO']

function sortShirtSizes(a, b) {
  const idxA = SHIRT_SIZES_ORDER.indexOf(String(a.name || '').toUpperCase())
  const idxB = SHIRT_SIZES_ORDER.indexOf(String(b.name || '').toUpperCase())
  if (idxA !== -1 && idxB !== -1) return idxA - idxB
  if (idxA !== -1) return -1
  if (idxB !== -1) return 1
  return a.name.localeCompare(b.name, 'pt-BR', { numeric: true })
}

function groupDeliveries(athletes, fields, customSort) {
  const groups = new Map()
  athletes.forEach((athlete) => {
    const label = fields.map((field) => {
      const val = athlete[field] ?? athlete?.customFields?.[field] ?? athlete?.customFields?.[field.toLowerCase()] ?? athlete?.customFields?.[field.toUpperCase()]
      return String(val ?? '').trim()
    }).find(Boolean) || 'Não informado'
    const item = groups.get(label) || { name: label, entregue: 0, faltante: 0, total: 0 }
    item.total += 1
    item[isDelivered(athlete) ? 'entregue' : 'faltante'] += 1
    groups.set(label, item)
  })
  if (customSort) {
    return [...groups.values()].sort(customSort)
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }))
}

function athleteAge(athlete, reference) {
  const raw = String(athlete.nascimento || '').trim()
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) || raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const [year, month, day] = raw.includes('/') ? [Number(match[3]), Number(match[2]), Number(match[1])] : match.slice(1).map(Number)
  const birth = new Date(year, month - 1, day)
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null
  const age = reference.getFullYear() - year - (reference.getMonth() < month - 1 || (reference.getMonth() === month - 1 && reference.getDate() < day) ? 1 : 0)
  return age >= 0 && age <= 120 ? age : null
}

function DeliveryChart({ title, data, showPendentes = true }) {
  const max = Math.max(1, ...data.map((item) => item.total))
  return (
    <div className="dash-chart-card">
      <h3 className="dash-chart-title">{title}</h3>
      {data.length === 0 ? <div className="chart-empty-msg">Nenhuma entrega registrada</div> : (
        <div className="delivery-chart-rows">
          {data.map((item) => (
            <div key={item.name} className="delivery-chart-row">
              <div className="delivery-chart-label">
                <span>{item.name}</span>
                <strong>
                  {showPendentes && item.faltante > 0
                    ? `${item.entregue} entregues · ${item.faltante} pendentes · ${item.total} total`
                    : `${item.entregue} entregue(s)`}
                </strong>
              </div>
              <div className="delivery-chart-track" role="img" aria-label={`${item.name}: ${item.entregue} entregues, ${item.faltante} pendentes`}>
                <span style={{ width: `${(item.entregue / max) * 100}%`, background: '#22c55e' }} />
                {showPendentes && item.faltante > 0 && (
                  <span style={{ width: `${(item.faltante / max) * 100}%`, background: '#f87171' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.length > 0 && showPendentes && (
        <div className="donut-legend">
          <span className="legend-item"><span className="legend-square" style={{ background: '#22c55e' }} />Entregue</span>
          <span className="legend-item"><span className="legend-square" style={{ background: '#f87171' }} />Pendente</span>
        </div>
      )}
    </div>
  )
}

export default function EventDashboardPage({
  event,
  eventUpdate,
  user,
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  const refreshRef = useRef(null)
  const [activeSubtab, setActiveSubtab] = useState('geral')
  const [hoveredStatus, setHoveredStatus] = useState(null)
  const [hoveredGender, setHoveredGender] = useState(null)
  const [snapshot, setSnapshot] = useState({ eventId: null, athletes: [], loading: true, error: false })
  const athletes = snapshot.eventId === event?.id ? snapshot.athletes : []
  const loading = snapshot.eventId !== event?.id || snapshot.loading
  const error = snapshot.eventId === event?.id && snapshot.error

  useEffect(() => {
    let active = true
    let busy = false
    const refresh = async () => {
      if (busy || !event?.id || document.visibilityState === 'hidden') return
      busy = true
      try {
        const result = await apiFetchAthletes(event.id)
        if (!active) return
        setSnapshot((previous) => ({
          eventId: event.id,
          athletes: Array.isArray(result?.athletes) ? result.athletes : previous.eventId === event.id ? previous.athletes : [],
          loading: false,
          error: !Array.isArray(result?.athletes),
        }))
      } finally {
        busy = false
      }
    }
    refreshRef.current = refresh
    refresh()
    const timer = window.setInterval(refresh, 10000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      if (refreshRef.current === refresh) refreshRef.current = null
    }
  }, [event?.id])

  useEffect(() => {
    if (eventUpdate?.revision && (!eventUpdate.eventId || eventUpdate.eventId === event?.id)) {
      void refreshRef.current?.()
    }
  }, [eventUpdate?.revision, event?.id])

  const totalCount = athletes.length
  const mascCount = athletes.filter((a) => String(a.sexo || a.gender || '').toUpperCase().startsWith('M')).length
  const femCount = athletes.filter((a) => String(a.sexo || a.gender || '').toUpperCase().startsWith('F')).length
  const entreguesCount = athletes.filter(isDelivered).length
  const faltantesCount = totalCount - entreguesCount
  const percentage = (count) => totalCount ? (count / totalCount * 100).toFixed(1) : '0.0'
  const entreguesPct = percentage(entreguesCount)
  const faltantesPct = percentage(faltantesCount)
  const mascPct = percentage(mascCount)
  const femPct = percentage(femCount)
  const teamsData = groupDeliveries(athletes, ['equipe', 'assessoria', 'time'])
    .map((item) => ({ name: item.name, count: item.total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }))
  const ageReference = new Date()
  const ages = athletes.map((athlete) => ({ ...athlete, age: athleteAge(athlete, ageReference) })).filter((athlete) => athlete.age !== null)
  const ageGroups = ['≤18', '19–29', '30–39', '40–49', '50–59', '60–69', '70+'].map((label, index) => ({
    label,
    count: ages.filter(({ age }) => (index === 0 ? age <= 18 : index === 6 ? age >= 70 : age >= (index === 1 ? 19 : (index + 1) * 10) && age < (index + 2) * 10)).length,
  }))
  const maxTeamCount = teamsData[0]?.count || 1

  return (
    <div className="event-dash-layout">
      <Sidebar activePage="dashboard" onNavigate={onNavigate} onLogout={onLogout} user={user} />

      <main className="event-dash-main">
        <header className="event-dash-header">
          <h1 className="event-dash-global-title">DASHBOARD</h1>

          <button
            type="button"
            className="tutorial-open-btn"
            onClick={onOpenTutorial}
          >
            <HelpCircleIcon />
            <span>TUTORIAL</span>
          </button>
        </header>

        <section className="event-dash-banner">
          <div className="event-banner-left">
            <button
              type="button"
              className="back-to-events-btn"
              onClick={() => onNavigate('eventos')}
            >
              <ArrowLeftIcon />
              <span>EVENTOS</span>
            </button>

            <h2 className="event-banner-title">{event?.name || 'EVENTO'}</h2>
            <span className="event-banner-meta">
              {event?.date || event?.dateInput || '—'}{' '}
              {event?.location || event?.city ? `• ${event.location || event.city}` : ''}
            </span>
          </div>
        </section>

        {error && <p role="alert" className="event-dashboard-feedback">Não foi possível atualizar os dados. {athletes.length ? 'Exibindo a última consulta. ' : ''}Uma nova tentativa será feita automaticamente.</p>}
        {loading ? <p role="status" className="event-dashboard-feedback">Carregando dados do evento…</p> : athletes.length === 0 && error ? null : athletes.length === 0 ? (
          <div className="event-dash-empty-state">
            <PackageIcon />
            <p className="event-dash-empty-title">
              Nenhum dado de atletas cadastrado para este evento ainda.
            </p>
            <p className="event-dash-empty-desc">
              Importe uma planilha oficial de atletas ou cadastre manualmente para visualizar gráficos e métricas analíticas em tempo real.
            </p>
            <button
              type="button"
              className="event-dash-empty-btn"
              onClick={() => onNavigate('operacao', event?.id)}
            >
              IR PARA OPERAÇÃO DO EVENTO
            </button>
          </div>
        ) : (
          <>
            {/* 2 subtabs bar */}
            <div className="event-tabs-bar">
              <div className="event-tabs-pill">
                <button
                  type="button"
                  className={`event-subtab-btn ${activeSubtab === 'geral' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('geral')}
                >
                  📊 Visão Geral
                </button>

                <button
                  type="button"
                  className={`event-subtab-btn ${activeSubtab === 'entrega' ? 'active' : ''}`}
                  onClick={() => setActiveSubtab('entrega')}
                >
                  📦 Entrega de Kit
                </button>
              </div>
            </div>

            {/* TAB 1: VISÃO GERAL */}
            {activeSubtab === 'geral' && (
              <div className="event-dash-body">
                {/* Top 3 metrics */}
                <div className="dash-three-metrics">
                  <div className="dash-stat-card blue">
                    <div className="dash-stat-label"><UsersIcon /> Atletas</div>
                    <div className="dash-stat-val">{totalCount}</div>
                  </div>

                  <div className="dash-stat-card blue">
                    <div className="dash-stat-label"><UsersIcon /> Masculino</div>
                    <div className="dash-stat-val">{mascCount}</div>
                    <span className="dash-stat-sub">{mascPct}%</span>
                  </div>

                  <div className="dash-stat-card pink">
                    <div className="dash-stat-label"><UsersIcon /> Feminino</div>
                    <div className="dash-stat-val">{femCount}</div>
                    <span className="dash-stat-sub">{femPct}%</span>
                  </div>
                </div>

                {/* 2 Donut / status charts */}
                <div className="dash-two-charts">
                  <div className="dash-chart-card">
                    <h3 className="dash-chart-title">Distribuição por Status</h3>
                    <div className="donut-wrap interactive-chart-box">
                      <svg width="140" height="140" viewBox="0 0 42 42">
                        <circle
                          cx="21"
                          cy="21"
                          r="15.9"
                          fill="transparent"
                          stroke="#ff5200"
                          strokeWidth={hoveredStatus === 'pendente' ? '7.5' : '5.5'}
                          strokeDasharray={`${Math.round(Number(faltantesPct))} ${100 - Math.round(Number(faltantesPct))}`}
                          strokeDashoffset="25"
                          style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
                          onMouseEnter={() => setHoveredStatus('pendente')}
                          onMouseLeave={() => setHoveredStatus(null)}
                        />
                        <circle
                          cx="21"
                          cy="21"
                          r="15.9"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth={hoveredStatus === 'entregue' ? '7.5' : '5.5'}
                          strokeDasharray={`${Math.round(Number(entreguesPct))} ${100 - Math.round(Number(entreguesPct))}`}
                          strokeDashoffset={`${100 - Math.round(Number(entreguesPct)) + 25}`}
                          style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
                          onMouseEnter={() => setHoveredStatus('entregue')}
                          onMouseLeave={() => setHoveredStatus(null)}
                        />
                      </svg>
                      {hoveredStatus && (
                        <div className="chart-floating-tooltip donut-tooltip">
                          <div className="tooltip-title">{hoveredStatus === 'entregue' ? 'Status: Entregue' : 'Status: Pendente'}</div>
                          <div className={`tooltip-row ${hoveredStatus}`}>
                            <span>{hoveredStatus === 'entregue' ? `${entreguesCount} kits` : `${faltantesCount} kits`}</span>
                            <span>{hoveredStatus === 'entregue' ? `${entreguesPct}%` : `${faltantesPct}%`}</span>
                          </div>
                        </div>
                      )}
                      <div className="donut-legend">
                        <span
                          className="legend-item"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredStatus('entregue')}
                          onMouseLeave={() => setHoveredStatus(null)}
                        >
                          <span className="legend-square" style={{ background: '#10b981' }} />
                          Entregue ({entreguesPct}%)
                        </span>
                        <span
                          className="legend-item"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredStatus('pendente')}
                          onMouseLeave={() => setHoveredStatus(null)}
                        >
                          <span className="legend-square" style={{ background: '#ff5200' }} />
                          Pendente ({faltantesPct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="dash-chart-card">
                    <h3 className="dash-chart-title">Distribuição por Gênero</h3>
                    <div className="donut-wrap interactive-chart-box">
                      <svg width="140" height="140" viewBox="0 0 42 42">
                        <circle
                          cx="21"
                          cy="21"
                          r="15.9"
                          fill="transparent"
                          stroke="#2196f3"
                          strokeWidth={hoveredGender === 'masc' ? '7.5' : '5.5'}
                          strokeDasharray={`${Math.round(Number(mascPct))} ${100 - Math.round(Number(mascPct))}`}
                          strokeDashoffset="25"
                          style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
                          onMouseEnter={() => setHoveredGender('masc')}
                          onMouseLeave={() => setHoveredGender(null)}
                        />
                        <circle
                          cx="21"
                          cy="21"
                          r="15.9"
                          fill="transparent"
                          stroke="#e91e63"
                          strokeWidth={hoveredGender === 'fem' ? '7.5' : '5.5'}
                          strokeDasharray={`${Math.round(Number(femPct))} ${100 - Math.round(Number(femPct))}`}
                          strokeDashoffset={`${100 - Math.round(Number(femPct)) + 25}`}
                          style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
                          onMouseEnter={() => setHoveredGender('fem')}
                          onMouseLeave={() => setHoveredGender(null)}
                        />
                        <text x="28" y="16" fill="#2196f3" fontSize="3" fontWeight="bold">{Math.round(Number(mascPct))}%</text>
                        <text x="14" y="32" fill="#e91e63" fontSize="3" fontWeight="bold">{Math.round(Number(femPct))}%</text>
                      </svg>
                      {hoveredGender && (
                        <div className="chart-floating-tooltip donut-tooltip">
                          <div className="tooltip-title">{hoveredGender === 'fem' ? 'Gênero: Feminino' : 'Gênero: Masculino'}</div>
                          <div className={`tooltip-row ${hoveredGender === 'fem' ? 'female' : 'male'}`}>
                            <span>{hoveredGender === 'fem' ? `${femCount} atletas` : `${mascCount} atletas`}</span>
                            <span>{hoveredGender === 'fem' ? `${femPct}%` : `${mascPct}%`}</span>
                          </div>
                        </div>
                      )}
                      <div className="donut-legend">
                        <span
                          className="legend-item"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredGender('masc')}
                          onMouseLeave={() => setHoveredGender(null)}
                        >
                          <span className="legend-square" style={{ background: '#2196f3' }} />
                          Masculino ({mascPct}%)
                        </span>
                        <span
                          className="legend-item"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredGender('fem')}
                          onMouseLeave={() => setHoveredGender(null)}
                        >
                          <span className="legend-square" style={{ background: '#e91e63' }} />
                          Feminino ({femPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Distribuição por Faixa Etária</h3>
              {ages.length === 0 ? <div className="chart-empty-msg">Nenhuma data de nascimento válida informada.</div> : <>
                <div className="age-badges-row"><span className="age-badge neutral">Idade média: {Math.round(ages.reduce((sum, athlete) => sum + athlete.age, 0) / ages.length)} anos</span></div>
                <div className="delivery-chart-rows">{ageGroups.map((group) => <div className="delivery-chart-row" key={group.label}><div className="delivery-chart-label"><span>{group.label}</span><strong>{group.count} atletas</strong></div><div className="delivery-chart-track"><span style={{ width: `${group.count / ages.length * 100}%`, background: '#2196f3' }} /></div></div>)}</div>
                <p className="dash-stat-sub">Idades calculadas hoje; {totalCount - ages.length} atletas sem data válida.</p>
              </>}
            </div>
            {/* Equipes por Atletas Cadastrados */}
            <div className="dash-chart-card">
              <h3 className="dash-chart-title flex-title">
                <UsersIcon />
                <span>Equipes por Atletas Cadastrados</span>
              </h3>
              <div className="teams-list">
                {teamsData.map((team) => {
                  const pct = Math.max(1.2, (team.count / maxTeamCount) * 100)
                  return (
                    <div key={`${team.rank}-${team.name}`} className="team-progress-row">
                      <div className="team-info-row">
                        <div className="team-left">
                          <span className="team-rank">{team.rank}</span>
                          <span className="team-name">{team.name}</span>
                        </div>
                        <span className="team-count">{team.count} {team.count === 1 ? 'atleta' : 'atletas'}</span>
                      </div>
                      <div className="team-bar-track">
                        <div
                          className="team-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeSubtab === 'entrega' && (
          <div className="event-dash-body">
            <div className="dash-three-metrics">
              <div className="dash-stat-card blue"><div className="dash-stat-label"><UsersIcon /> Atletas</div><div className="dash-stat-val">{totalCount}</div></div>
              <div className="dash-stat-card green"><div className="dash-stat-label"><PackageIcon /> Entregues</div><div className="dash-stat-val">{entreguesCount}</div><span className="dash-stat-sub">{entreguesPct}%</span></div>
              <div className="dash-stat-card coral"><div className="dash-stat-label"><PackageIcon /> Pendentes</div><div className="dash-stat-val">{faltantesCount}</div><span className="dash-stat-sub">{faltantesPct}%</span></div>
            </div>
            <DeliveryChart title="Kits por Modalidade" data={groupDeliveries(athletes, ['modalidade', 'distancia'])} />
            <div className="dash-two-charts">
              <DeliveryChart title="Camisetas" data={groupDeliveries(athletes, ['camiseta', 'tamanho', 'CAMISETA', 'TAMANHO'], sortShirtSizes)} />
              <DeliveryChart title="Kits" data={groupDeliveries(athletes, ['kit', 'KIT'])} />
            </div>
            <DeliveryChart title="Entregas por Operador" data={groupDeliveries(athletes.filter(isDelivered), ['entreguePor'])} showPendentes={false} />
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}
