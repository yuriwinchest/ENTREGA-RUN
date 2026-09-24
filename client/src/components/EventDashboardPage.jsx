import { useEffect, useState } from 'react'
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

const AGE_GROUPS_DATA = [
  { key: 'under18', label: '≤18', masc: 22, fem: 20, misto: 0, center: 104, colLeft: 70, colWidth: 68 },
  { key: '19-29', label: '19-29', masc: 72, fem: 76, misto: 0, center: 193, colLeft: 159, colWidth: 68 },
  { key: '30-39', label: '30-39', masc: 40, fem: 83, misto: 0, center: 281, colLeft: 247, colWidth: 68 },
  { key: '40-49', label: '40-49', masc: 27, fem: 31, misto: 0, center: 370, colLeft: 336, colWidth: 68 },
  { key: '50-59', label: '50-59', masc: 7, fem: 15, misto: 0, center: 458, colLeft: 424, colWidth: 68 },
  { key: '60-69', label: '60-69', masc: 2, fem: 1, misto: 0, center: 547, colLeft: 513, colWidth: 68 },
  { key: '70+', label: '70+', masc: 0, fem: 0, misto: 0, center: 635, colLeft: 601, colWidth: 68 },
]

function groupDeliveries(athletes, field) {
  const groups = new Map()
  athletes.forEach((athlete) => {
    const name = String(field(athlete) || 'Não informado').trim() || 'Não informado'
    const item = groups.get(name) || { name, total: 0, delivered: 0 }
    item.total += 1
    if (isDelivered(athlete)) item.delivered += 1
    groups.set(name, item)
  })
  return [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'))
}

function isDelivered(athlete) {
  return String(athlete.status || '').toUpperCase() === 'ENTREGUE' || Boolean(athlete.entregueEm)
}

function DeliveryBreakdown({ title, rows }) {
  return (
    <div className="dash-chart-card">
      <h3 className="dash-chart-title">{title}</h3>
      {rows.length === 0 ? <div className="chart-empty-msg">Nenhum atleta cadastrado</div> : rows.map((row) => {
        const remaining = row.total - row.delivered
        return (
          <div className="delivery-breakdown-row" key={row.name}>
            <div className="delivery-breakdown-heading"><strong>{row.name}</strong><span>{row.delivered} entregues · {remaining} pendentes · {row.total} total</span></div>
            <div className="delivery-breakdown-track" aria-label={`${row.name}: ${row.delivered} entregues de ${row.total}`}>
              <span style={{ width: `${(row.delivered / row.total) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function EventDashboardPage({
  event,
  user,
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  const [activeSubtab, setActiveSubtab] = useState('geral')
  const [hoveredAgeGroup, setHoveredAgeGroup] = useState(AGE_GROUPS_DATA[2])
  const [hoveredStatus, setHoveredStatus] = useState(null)
  const [hoveredGender, setHoveredGender] = useState(null)

  const [athletes, setAthletes] = useState([])
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function refresh() {
      const result = await apiFetchAthletes(event?.id)
      if (cancelled) return
      if (result) {
        setAthletes(result.athletes)
        setLoadError(false)
      } else {
        setLoadError(true)
      }
      setLoading(false)
    }
    refresh()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [event?.id])

  // Métricas calculadas dinamicamente
  const totalCount = athletes.length
  const mascCount = athletes.length > 0
    ? athletes.filter((a) => (a.sexo || a.gender || '').toUpperCase().startsWith('M')).length
    : 0
  const femCount = athletes.length > 0
    ? athletes.filter((a) => (a.sexo || a.gender || '').toUpperCase().startsWith('F')).length
    : 0
  const entreguesCount = athletes.length > 0
    ? athletes.filter((a) => String(a.status || '').toUpperCase() === 'ENTREGUE' || Boolean(a.entregueEm)).length
    : 0
  const faltantesCount = Math.max(0, totalCount - entreguesCount)
  const entreguesPct = totalCount > 0 ? ((entreguesCount / totalCount) * 100).toFixed(1) : '0.0'
  const faltantesPct = totalCount > 0 ? ((faltantesCount / totalCount) * 100).toFixed(1) : '0.0'
  const mascPct = totalCount > 0 ? ((mascCount / totalCount) * 100).toFixed(1) : '0.0'
  const femPct = totalCount > 0 ? ((femCount / totalCount) * 100).toFixed(1) : '0.0'

  // Equipes calculadas dinamicamente
  const teamsData = (() => {
    if (athletes.length > 0) {
      const counts = {}
      athletes.forEach((a) => {
        const team = (a.equipe || a.assessoria || a.time || 'Sem Equipe').trim() || 'Sem Equipe'
        counts[team] = (counts[team] || 0) + 1
      })
      const sorted = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item, idx) => ({ rank: idx + 1, ...item }))
      return sorted.length > 0 ? sorted : [{ rank: 1, name: 'Sem Equipe', count: athletes.length }]
    }
    return []
  })()
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

        {loading || loadError || athletes.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '1.5px dashed #e2e8f0',
            borderRadius: '16px',
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            margin: '24px'
          }}>
            <PackageIcon />
            <p style={{ margin: 0, color: '#64748b', fontSize: '16px', fontWeight: 600 }}>
              {loading ? 'Carregando atletas...' : loadError ? 'Não foi possível carregar os dados do evento.' : 'Nenhum atleta cadastrado neste evento.'}
            </p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', maxWidth: '440px', lineHeight: 1.5 }}>
              {loadError ? 'Verifique a conexão com o servidor e tente novamente.' : 'Importe uma planilha de atletas ou cadastre manualmente para visualizar as métricas.'}
            </p>
            <button
              type="button"
              style={{
                marginTop: '6px',
                background: '#ff5200',
                color: '#fff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
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

            {/* Faixa etária */}
            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Distribuição por Faixa Etária</h3>
              <div className="age-badges-row">
                <span className="age-badge neutral">👤 Idade Média: 30 anos</span>
                <span className="age-badge male">♂ Masculino: 28 anos</span>
                <span className="age-badge female">♀ Feminino: 32 anos</span>
              </div>

              <div className="age-bars-container">
                <div className="interactive-chart-box">
                  <svg
                    width="100%"
                    height="230"
                    viewBox="0 0 700 230"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    <line x1="40" y1="30" x2="680" y2="30" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="40" y1="70" x2="680" y2="70" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="40" y1="110" x2="680" y2="110" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="40" y1="150" x2="680" y2="150" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="40" y1="190" x2="680" y2="190" stroke="#e2e8f0" strokeWidth="1.5" />

                    {/* Y Axis labels */}
                    <text x="15" y="34" fill="#94a3b8" fontSize="11">100</text>
                    <text x="20" y="74" fill="#94a3b8" fontSize="11">75</text>
                    <text x="20" y="114" fill="#94a3b8" fontSize="11">50</text>
                    <text x="20" y="154" fill="#94a3b8" fontSize="11">25</text>
                    <text x="26" y="194" fill="#94a3b8" fontSize="11">0</text>

                    {/* Active Column Grey Highlight Band */}
                    {hoveredAgeGroup && (
                      <rect
                        x={hoveredAgeGroup.colLeft}
                        y="15"
                        width={hoveredAgeGroup.colWidth}
                        height="175"
                        fill="#cbd5e1"
                        opacity="0.65"
                      />
                    )}

                    {/* Groups */}
                    {AGE_GROUPS_DATA.map((group) => {
                      const mascHeight = (group.masc / 100) * 160
                      const femHeight = (group.fem / 100) * 160
                      const mascY = 190 - mascHeight
                      const femY = 190 - femHeight
                      const isHovered = hoveredAgeGroup?.key === group.key

                      return (
                        <g
                          key={group.key}
                          className="chart-col-group"
                          onMouseEnter={() => setHoveredAgeGroup(group)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Invisible hover hitbox */}
                          <rect
                            x={group.colLeft}
                            y="15"
                            width={group.colWidth}
                            height="195"
                            fill="transparent"
                          />

                          {/* Masculino bar */}
                          {group.masc > 0 && (
                            <rect
                              x={group.center - 18}
                              y={mascY}
                              width="16"
                              height={mascHeight}
                              fill="#2196f3"
                              rx="2"
                            />
                          )}

                          {/* Feminino bar */}
                          {group.fem > 0 && (
                            <rect
                              x={group.center + 2}
                              y={femY}
                              width="16"
                              height={femHeight}
                              fill="#e91e63"
                              rx="2"
                            />
                          )}

                          {/* Label */}
                          <text
                            x={group.center}
                            y="208"
                            textAnchor="middle"
                            fill={isHovered ? '#0f172a' : '#64748b'}
                            fontWeight={isHovered ? '700' : '500'}
                            fontSize="11"
                          >
                            {group.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* Floating tooltip */}
                  {hoveredAgeGroup && (
                    <div
                      className="chart-floating-tooltip age-tooltip"
                      style={{
                        left:
                          hoveredAgeGroup.center > 500
                            ? `${((hoveredAgeGroup.colLeft - 135) / 700) * 100}%`
                            : `${((hoveredAgeGroup.colLeft + hoveredAgeGroup.colWidth + 6) / 700) * 100}%`,
                        top: '15px',
                      }}
                    >
                      <div className="tooltip-title">{hoveredAgeGroup.label}</div>
                      <div className="tooltip-row male">
                        <span>Masculino :</span>
                        <span>{hoveredAgeGroup.masc}</span>
                      </div>
                      <div className="tooltip-row female">
                        <span>Feminino :</span>
                        <span>{hoveredAgeGroup.fem}</span>
                      </div>
                      <div className="tooltip-row misto">
                        <span>Misto :</span>
                        <span>{hoveredAgeGroup.misto}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="donut-legend" style={{ marginTop: 6 }}>
                  <span className="legend-item">
                    <span className="legend-square" style={{ background: '#2196f3' }} />
                    Masculino
                  </span>
                  <span className="legend-item">
                    <span className="legend-square" style={{ background: '#e91e63' }} />
                    Feminino
                  </span>
                  <span className="legend-item">
                    <span className="legend-square" style={{ background: '#9c27b0' }} />
                    Misto
                  </span>
                </div>
              </div>
            </div>

            {/* Destaques de idade */}
            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Destaques de Idade</h3>
              <div className="highlights-grid">
                <div className="highlight-col">
                  <span className="highlight-col-title male">♂ MAIS IDOSO</span>
                  <ul className="highlight-list">
                    <li className="highlight-item">
                      <span className="highlight-rank">1.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">JOSE ADILSON CARNEIRO SILVA</span>
                        <span className="highlight-sub">24/01/1971 • 55 anos • GERAL</span>
                      </div>
                    </li>
                    <li className="highlight-item">
                      <span className="highlight-rank">2.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">JOSE CICERO COSTA</span>
                        <span className="highlight-sub">07/07/1971 • 55 anos • GERAL</span>
                      </div>
                    </li>
                    <li className="highlight-item">
                      <span className="highlight-rank">3.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">LUIZ CARLOS MATOS DA SILVA</span>
                        <span className="highlight-sub">01/04/1972 • 54 anos • GERAL</span>
                      </div>
                    </li>
                    <li className="highlight-item">
                      <span className="highlight-rank">4.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">MARCOS VALENÇA OLIVEIRA</span>
                        <span className="highlight-sub">05/01/1973 • 53 anos • GERAL</span>
                      </div>
                    </li>
                    <li className="highlight-item">
                      <span className="highlight-rank">5.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">EDVALDO DA SILVA</span>
                        <span className="highlight-sub">13/07/1974 • 52 anos • GERAL</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="highlight-col">
                  <span className="highlight-col-title female">♀ MAIS IDOSA</span>
                  <ul className="highlight-list">
                    <li className="highlight-item">
                      <span className="highlight-rank">1.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">MARCIA FERREIRA DE LIRA</span>
                        <span className="highlight-sub">20/04/1970 • 56 anos • GERAL</span>
                      </div>
                    </li>
                    <li className="highlight-item">
                      <span className="highlight-rank">2.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">MARLEIDE LIMA CAVALCANTE</span>
                        <span className="highlight-sub">24/05/1970 • 56 anos • GERAL</span>
                      </div>
                    </li>
                    <li className="highlight-item">
                      <span className="highlight-rank">3.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">EDIVANISE MARIA DO NASCIMENTO</span>
                        <span className="highlight-sub">21/03/1971 • 55 anos • GERAL</span>
                      </div>
                    </li>
                    <li className="highlight-item">
                      <span className="highlight-rank">4.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">ALE MANSO</span>
                        <span className="highlight-sub">30/12/1971 • 54 anos • GERAL</span>
                      </div>
                    </li>
                    <li className="highlight-item">
                      <span className="highlight-rank">5.</span>
                      <div className="highlight-info">
                        <span className="highlight-name">MARIA EDY DA SILVA</span>
                        <span className="highlight-sub">03/03/1972 • 54 anos • GERAL</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
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

        {/* TAB 2: ENTREGA DE KIT */}
        {activeSubtab === 'entrega' && (
          <div className="event-dash-body">
            <div className="dash-three-charts">
              <div className="dash-stat-card blue"><div className="dash-stat-label"><PackageIcon /> Total</div><div className="dash-stat-val">{totalCount}</div></div>
              <div className="dash-stat-card green"><div className="dash-stat-label">✓ Entregue</div><div className="dash-stat-val">{entreguesCount}</div><span className="dash-stat-sub">{entreguesPct}%</span></div>
              <div className="dash-stat-card coral"><div className="dash-stat-label">✕ Faltante</div><div className="dash-stat-val">{faltantesCount}</div><span className="dash-stat-sub">{faltantesPct}%</span></div>
            </div>
            <DeliveryBreakdown title="Kits por Modalidade" rows={groupDeliveries(athletes, (a) => a.modalidade)} />
            <div className="highlights-grid">
              <DeliveryBreakdown title="Camisetas" rows={groupDeliveries(athletes, (a) => a.camiseta || a.tamanho)} />
              <DeliveryBreakdown title="Kits" rows={groupDeliveries(athletes, (a) => a.kit || a.tipoKit)} />
            </div>
            <DeliveryBreakdown title="Entregas por Operador" rows={groupDeliveries(athletes.filter(isDelivered), (a) => a.entreguePor)} />
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}
