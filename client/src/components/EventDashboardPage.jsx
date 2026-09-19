import { useState } from 'react'
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


function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
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

const CAMISETAS_DATA = [
  { size: 'P', entregue: 65, faltante: 3, total: 68, center: 94.6, colLeft: 54, colWidth: 81.2, barWidth: 52 },
  { size: 'M', entregue: 114, faltante: 11, total: 125, center: 175.8, colLeft: 135.2, colWidth: 81.2, barWidth: 52 },
  { size: 'G', entregue: 55, faltante: 2, total: 57, center: 257.0, colLeft: 216.4, colWidth: 81.2, barWidth: 52 },
  { size: 'GG', entregue: 19, faltante: 0, total: 19, center: 338.2, colLeft: 297.6, colWidth: 81.2, barWidth: 52 },
  { size: 'XG', entregue: 1, faltante: 0, total: 1, center: 419.4, colLeft: 378.8, colWidth: 81.2, barWidth: 52 },
]

const KITS_DATA = [
  { name: 'KIT ELITE', entregue: 255, faltante: 5, total: 260, center: 121.7, colLeft: 54, colWidth: 135.33, barWidth: 96 },
  { name: 'KIT ATLETA', entregue: 136, faltante: 3, total: 139, center: 257.0, colLeft: 189.33, colWidth: 135.33, barWidth: 96 },
  { name: 'Kit Padrão', entregue: 0, faltante: 11, total: 11, center: 392.3, colLeft: 324.66, colWidth: 135.33, barWidth: 96 },
]

export default function EventDashboardPage({
  onNavigate,
  onLogout,
  onOpenTutorial,
}) {
  const [activeSubtab, setActiveSubtab] = useState('geral')
  const [hoveredAgeGroup, setHoveredAgeGroup] = useState(AGE_GROUPS_DATA[2])
  const [hoveredStatus, setHoveredStatus] = useState(null)
  const [hoveredGender, setHoveredGender] = useState(null)
  const [hoveredModalidadeKit, setHoveredModalidadeKit] = useState(false)
  const [hoveredCamiseta, setHoveredCamiseta] = useState(null)
  const [hoveredKit, setHoveredKit] = useState(null)
  const [hoveredCategoria, setHoveredCategoria] = useState(false)

  return (
    <div className="event-dash-layout">
      <Sidebar activePage="dashboard" onNavigate={onNavigate} onLogout={onLogout} />

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

            <h2 className="event-banner-title">TREINÃO DA GALINHA</h2>
            <span className="event-banner-meta">16/09/2026 • SÃO BENTO DO UNA</span>
          </div>
        </section>

        {/* 3 subtabs bar */}
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
              className={`event-subtab-btn ${activeSubtab === 'modalidade' ? 'active' : ''}`}
              onClick={() => setActiveSubtab('modalidade')}
            >
              🚩 Por Modalidade
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
            {/* Top 6 metrics */}
            <div className="dash-six-metrics">
              <div className="dash-stat-card blue">
                <div className="dash-stat-label"><UsersIcon /> Atletas</div>
                <div className="dash-stat-val">430</div>
              </div>

              <div className="dash-stat-card amber">
                <div className="dash-stat-label"><FlagIcon /> Largada</div>
                <div className="dash-stat-val">0</div>
              </div>

              <div className="dash-stat-card green">
                <div className="dash-stat-label"><FlagIcon /> Chegadas</div>
                <div className="dash-stat-val">0</div>
              </div>

              <div className="dash-stat-card blue">
                <div className="dash-stat-label"><UsersIcon /> Masculino</div>
                <div className="dash-stat-val">179</div>
              </div>

              <div className="dash-stat-card pink">
                <div className="dash-stat-label"><UsersIcon /> Feminino</div>
                <div className="dash-stat-val">251</div>
              </div>

              <div className="dash-stat-card purple">
                <div className="dash-stat-label"><UsersIcon /> Misto</div>
                <div className="dash-stat-val">0</div>
              </div>
            </div>

            {/* 3 Donut / status charts */}
            <div className="dash-three-charts">
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
                      strokeDasharray="16 84"
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
                      strokeDasharray="84 16"
                      strokeDashoffset="109"
                      style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
                      onMouseEnter={() => setHoveredStatus('entregue')}
                      onMouseLeave={() => setHoveredStatus(null)}
                    />
                  </svg>
                  {hoveredStatus && (
                    <div className="chart-floating-tooltip donut-tooltip">
                      <div className="tooltip-title">{hoveredStatus === 'entregue' ? 'Status: Entregue' : 'Status: Pendente'}</div>
                      <div className={`tooltip-row ${hoveredStatus}`}>
                        <span>{hoveredStatus === 'entregue' ? '361 kits' : '69 kits'}</span>
                        <span>{hoveredStatus === 'entregue' ? '84.0%' : '16.0%'}</span>
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
                      Entregue
                    </span>
                    <span
                      className="legend-item"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredStatus('pendente')}
                      onMouseLeave={() => setHoveredStatus(null)}
                    >
                      <span className="legend-square" style={{ background: '#ff5200' }} />
                      Pendente
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
                      strokeDasharray="42 58"
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
                      strokeDasharray="58 42"
                      strokeDashoffset="83"
                      style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
                      onMouseEnter={() => setHoveredGender('fem')}
                      onMouseLeave={() => setHoveredGender(null)}
                    />
                    <text x="28" y="16" fill="#2196f3" fontSize="3" fontWeight="bold">42%</text>
                    <text x="14" y="32" fill="#e91e63" fontSize="3" fontWeight="bold">58%</text>
                  </svg>
                  {hoveredGender && (
                    <div className="chart-floating-tooltip donut-tooltip">
                      <div className="tooltip-title">{hoveredGender === 'fem' ? 'Gênero: Feminino' : 'Gênero: Masculino'}</div>
                      <div className={`tooltip-row ${hoveredGender === 'fem' ? 'female' : 'male'}`}>
                        <span>{hoveredGender === 'fem' ? '251 atletas' : '179 atletas'}</span>
                        <span>{hoveredGender === 'fem' ? '58.4%' : '41.6%'}</span>
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
                      Masculino
                    </span>
                    <span
                      className="legend-item"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredGender('fem')}
                      onMouseLeave={() => setHoveredGender(null)}
                    >
                      <span className="legend-square" style={{ background: '#e91e63' }} />
                      Feminino
                    </span>
                  </div>
                </div>
              </div>

              <div className="dash-chart-card">
                <h3 className="dash-chart-title">Distribuição de Largada</h3>
                <div className="chart-empty-msg">
                  Sem dados suficientes ainda
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

            {/* Chegadas por intervalo */}
            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Chegadas por Intervalo de Tempo</h3>
              <div className="chart-empty-msg">
                Nenhuma chegada registrada
              </div>
            </div>

            {/* Largaram sem finalizar */}
            <div className="dash-chart-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 className="dash-chart-title" style={{ margin: 0 }}>Largaram Sem Finalizar</h3>
                <span className="category-filter-chip" style={{ padding: '2px 8px', fontSize: 10 }}>0 Atletas</span>
              </div>
              <div className="chart-empty-msg">
                Sem dados suficientes ainda
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POR MODALIDADE */}
        {activeSubtab === 'modalidade' && (
          <div className="event-dash-body">
            <span className="category-filter-chip">✓ 5 KM</span>

            {/* 6 metrics */}
            <div className="dash-six-metrics">
              <div className="dash-stat-card blue">
                <div className="dash-stat-label"><UsersIcon /> Atletas</div>
                <div className="dash-stat-val">430</div>
              </div>

              <div className="dash-stat-card amber">
                <div className="dash-stat-label"><FlagIcon /> Largada</div>
                <div className="dash-stat-val">0</div>
              </div>

              <div className="dash-stat-card green">
                <div className="dash-stat-label"><FlagIcon /> Chegadas</div>
                <div className="dash-stat-val">0</div>
              </div>

              <div className="dash-stat-card blue">
                <div className="dash-stat-label"><UsersIcon /> Masculino</div>
                <div className="dash-stat-val">179</div>
              </div>

              <div className="dash-stat-card pink">
                <div className="dash-stat-label"><UsersIcon /> Feminino</div>
                <div className="dash-stat-val">251</div>
              </div>

              <div className="dash-stat-card purple">
                <div className="dash-stat-label"><UsersIcon /> Misto</div>
                <div className="dash-stat-val">0</div>
              </div>
            </div>

            {/* Estatísticas de tempo */}
            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Estatísticas de Tempo</h3>
              <div className="time-stats-grid">
                <div className="time-stat-col">
                  <span className="time-stat-gender male">♂ Masculino</span>
                  <div className="time-stat-row">
                    <span>🏆 Primeiro Atleta</span>
                    <span>00:00:00</span>
                  </div>
                  <div className="time-stat-row">
                    <span>🚩 Último Atleta</span>
                    <span>00:00:00</span>
                  </div>
                  <div className="time-stat-row">
                    <span>📊 Tempo Médio</span>
                    <span>00:00:00</span>
                  </div>
                </div>

                <div className="time-stat-col">
                  <span className="time-stat-gender female">♀ Feminino</span>
                  <div className="time-stat-row">
                    <span>🏆 Primeiro Atleta</span>
                    <span>00:00:00</span>
                  </div>
                  <div className="time-stat-row">
                    <span>🚩 Último Atleta</span>
                    <span>00:00:00</span>
                  </div>
                  <div className="time-stat-row">
                    <span>📊 Tempo Médio</span>
                    <span>00:00:00</span>
                  </div>
                </div>

                <div className="time-stat-col">
                  <span className="time-stat-gender mixed">⚥ Misto</span>
                  <div className="time-stat-row">
                    <span>🏆 Primeiro Atleta</span>
                    <span>00:00:00</span>
                  </div>
                  <div className="time-stat-row">
                    <span>🚩 Último Atleta</span>
                    <span>00:00:00</span>
                  </div>
                  <div className="time-stat-row">
                    <span>📊 Tempo Médio</span>
                    <span>00:00:00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Atletas por modalidade e categoria */}
            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Atletas por Modalidade e Categoria</h3>
              <div className="interactive-chart-box">
                <svg width="100%" height="200" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <line x1="40" y1="30" x2="560" y2="30" stroke="#f1f5f9" strokeDasharray="4" />
                  <line x1="40" y1="75" x2="560" y2="75" stroke="#f1f5f9" strokeDasharray="4" />
                  <line x1="40" y1="120" x2="560" y2="120" stroke="#f1f5f9" strokeDasharray="4" />
                  <line x1="40" y1="165" x2="560" y2="165" stroke="#e2e8f0" />
                  <text x="15" y="34" fill="#94a3b8" fontSize="11">600</text>
                  <text x="15" y="79" fill="#94a3b8" fontSize="11">450</text>
                  <text x="15" y="124" fill="#94a3b8" fontSize="11">300</text>
                  <text x="15" y="169" fill="#94a3b8" fontSize="11">150</text>
                  <text x="26" y="190" fill="#94a3b8" fontSize="11">0</text>

                  {/* Single wide teal bar with interactive hover */}
                  <rect
                    x="180"
                    y="80"
                    width="300"
                    height="85"
                    fill={hoveredCategoria ? '#2dd4bf' : '#42b9b7'}
                    rx="3"
                    style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
                    onMouseEnter={() => setHoveredCategoria(true)}
                    onMouseLeave={() => setHoveredCategoria(false)}
                  />
                  <text x="310" y="185" fill="#64748b" fontSize="11">GERAL</text>
                </svg>
                {hoveredCategoria && (
                  <div
                    className="chart-floating-tooltip"
                    style={{ left: '50%', top: '25px', transform: 'translateX(-50%)' }}
                  >
                    <div className="tooltip-title">Categoria: GERAL</div>
                    <div className="tooltip-row male">
                      <span>Total :</span>
                      <span>430 atletas</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Equipes */}
            <div className="highlights-grid">
              <div className="dash-chart-card">
                <h3 className="dash-chart-title flex-title">
                  <UsersIcon />
                  <span>Equipes por Atletas Cadastrados</span>
                </h3>
                <div className="teams-list">
                  {[
                    { rank: 1, name: 'Sem Equipe', count: 267 },
                    { rank: 2, name: 'BORA PRO CORRE', count: 55 },
                    { rank: 3, name: 'BORAPROCORRE', count: 15 },
                    { rank: 4, name: 'FORMOSO PACE CLUBE', count: 6 },
                    { rank: 5, name: 'BROCARUN', count: 6 },
                    { rank: 6, name: 'UNA-SE', count: 3 },
                    { rank: 7, name: 'FORMOSO PACE', count: 3 },
                    { rank: 8, name: 'SAO BENTO DO UNA', count: 3 },
                    { rank: 9, name: 'SANTA LUZIA', count: 3 },
                    { rank: 10, name: 'BORRA PRO CORRE', count: 2 },
                  ].map((team) => {
                    const pct = Math.max(1.2, (team.count / 267) * 100)
                    return (
                      <div key={team.rank} className="team-progress-row">
                        <div className="team-info-row">
                          <div className="team-left">
                            <span className="team-rank">{team.rank}</span>
                            <span className="team-name">{team.name}</span>
                          </div>
                          <span className="team-count">{team.count}</span>
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

              <div className="dash-chart-card">
                <h3 className="dash-chart-title flex-title green">
                  <FlagIcon />
                  <span>Equipes por Finalizados</span>
                </h3>
                <div className="chart-empty-msg">
                  Nenhuma equipe registrada
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ENTREGA DE KIT */}
        {activeSubtab === 'entrega' && (
          <div className="event-dash-body">
            {/* Top 3 metrics */}
            <div className="dash-three-charts">
              <div className="dash-stat-card blue">
                <div className="dash-stat-label"><PackageIcon /> Total</div>
                <div className="dash-stat-val">430</div>
              </div>

              <div className="dash-stat-card green">
                <div className="dash-stat-label">✓ Entregue</div>
                <div className="dash-stat-val">361</div>
                <span className="dash-stat-sub">84.0%</span>
              </div>

              <div className="dash-stat-card coral">
                <div className="dash-stat-label">✕ Faltante</div>
                <div className="dash-stat-val">69</div>
                <span className="dash-stat-sub">16.0%</span>
              </div>
            </div>

            {/* Kits por modalidade */}
            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Kits por Modalidade</h3>
              <div className="interactive-chart-box">
                <svg width="100%" height="220" viewBox="0 0 600 220" preserveAspectRatio="none">
                  <line x1="40" y1="30" x2="560" y2="30" stroke="#f1f5f9" strokeDasharray="4" />
                  <line x1="40" y1="75" x2="560" y2="75" stroke="#f1f5f9" strokeDasharray="4" />
                  <line x1="40" y1="120" x2="560" y2="120" stroke="#f1f5f9" strokeDasharray="4" />
                  <line x1="40" y1="165" x2="560" y2="165" stroke="#e2e8f0" />
                  <text x="15" y="34" fill="#94a3b8" fontSize="11">600</text>
                  <text x="15" y="79" fill="#94a3b8" fontSize="11">450</text>
                  <text x="15" y="124" fill="#94a3b8" fontSize="11">300</text>
                  <text x="15" y="169" fill="#94a3b8" fontSize="11">150</text>
                  <text x="26" y="190" fill="#94a3b8" fontSize="11">0</text>

                  {hoveredModalidadeKit && (
                    <rect x="170" y="20" width="300" height="150" fill="#e2e8f0" opacity="0.65" />
                  )}

                  {/* Stacked bar for 5 KM */}
                  <g
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredModalidadeKit(true)}
                    onMouseLeave={() => setHoveredModalidadeKit(false)}
                  >
                    <rect x="180" y="65" width="280" height="24" fill="#ef4444" rx="2" />
                    <text x="312" y="81" fill="#ffffff" fontSize="11" fontWeight="bold">69</text>
                    <rect x="180" y="89" width="280" height="76" fill="#10b981" rx="2" />
                    <text x="310" y="132" fill="#ffffff" fontSize="11" fontWeight="bold">361</text>
                    <text x="306" y="185" fill="#64748b" fontSize="11">5 KM</text>
                  </g>
                </svg>
                {hoveredModalidadeKit && (
                  <div
                    className="chart-floating-tooltip"
                    style={{ left: '50%', top: '15px', transform: 'translateX(-50%)' }}
                  >
                    <div className="tooltip-title">Modalidade: 5 KM</div>
                    <div className="tooltip-row entregue">
                      <span>Entregue :</span>
                      <span>361 (84.0%)</span>
                    </div>
                    <div className="tooltip-row faltante">
                      <span>Faltante :</span>
                      <span>69 (16.0%)</span>
                    </div>
                    <div className="tooltip-row total">
                      <span>Total :</span>
                      <span>430</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="donut-legend">
                <span className="legend-item"><span className="legend-square" style={{ background: '#10b981' }} /> Entregue</span>
                <span className="legend-item"><span className="legend-square" style={{ background: '#ef4444' }} /> Faltante</span>
              </div>
            </div>

            {/* Camisetas e Kits */}
            <div className="highlights-grid">
              <div className="dash-chart-card">
                <h3 className="dash-chart-title">Camisetas</h3>
                <div className="interactive-chart-box">
                  <svg width="100%" height="280" viewBox="0 0 480 270">
                    {/* Y-axis Title */}
                    <text
                      x="-120"
                      y="16"
                      transform="rotate(-90)"
                      fill="#64748b"
                      fontSize="12"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      Quantidade
                    </text>

                    {/* Dotted horizontal grid lines */}
                    <line x1="54" y1="20" x2="460" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="54" y1="70" x2="460" y2="70" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="54" y1="120" x2="460" y2="120" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="54" y1="170" x2="460" y2="170" stroke="#f1f5f9" strokeDasharray="3 3" />

                    {/* Right boundary dotted grid line */}
                    <line x1="460" y1="20" x2="460" y2="220" stroke="#f1f5f9" strokeDasharray="3 3" />

                    {/* Vertical grid lines at category centers */}
                    {CAMISETAS_DATA.map((item) => (
                      <line
                        key={`grid-${item.size}`}
                        x1={item.center}
                        y1="20"
                        x2={item.center}
                        y2="220"
                        stroke="#f1f5f9"
                        strokeDasharray="3 3"
                      />
                    ))}

                    {/* Axes */}
                    <line x1="54" y1="20" x2="54" y2="220" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="54" y1="220" x2="460" y2="220" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Y-axis Ticks & Labels */}
                    <line x1="49" y1="20" x2="54" y2="20" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="24" fill="#94a3b8" fontSize="11.5" textAnchor="end">140</text>

                    <line x1="49" y1="70" x2="54" y2="70" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="74" fill="#94a3b8" fontSize="11.5" textAnchor="end">105</text>

                    <line x1="49" y1="120" x2="54" y2="120" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="124" fill="#94a3b8" fontSize="11.5" textAnchor="end">70</text>

                    <line x1="49" y1="170" x2="54" y2="170" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="174" fill="#94a3b8" fontSize="11.5" textAnchor="end">35</text>

                    <line x1="49" y1="220" x2="54" y2="220" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="224" fill="#94a3b8" fontSize="11.5" textAnchor="end">0</text>

                    {/* Active column highlight */}
                    {hoveredCamiseta && (
                      <rect
                        x={hoveredCamiseta.colLeft}
                        y="20"
                        width={hoveredCamiseta.colWidth}
                        height="200"
                        fill="#cbd5e1"
                        opacity="0.45"
                      />
                    )}

                    {/* Wide Bars */}
                    {CAMISETAS_DATA.map((item) => {
                      const scale = 200 / 140
                      const faltanteH = item.faltante * scale
                      const entregueH = item.entregue * scale
                      const totalH = faltanteH + entregueH
                      const topY = 220 - totalH
                      const entregueY = 220 - entregueH
                      const barX = item.center - item.barWidth / 2

                      return (
                        <g
                          key={item.size}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredCamiseta(item)}
                          onMouseLeave={() => setHoveredCamiseta(null)}
                        >
                          {/* Invisible hover catcher */}
                          <rect
                            x={item.colLeft}
                            y="20"
                            width={item.colWidth}
                            height="210"
                            fill="transparent"
                          />

                          {/* Faltante (Coral/Red) */}
                          {item.faltante > 0 && (
                            <rect
                              x={barX}
                              y={topY}
                              width={item.barWidth}
                              height={Math.max(4, faltanteH)}
                              fill="#f87171"
                              rx="3"
                            />
                          )}

                          {/* Faltante label */}
                          {item.faltante >= 2 && (
                            <text
                              x={item.center}
                              y={topY + Math.max(4, faltanteH) / 2 + 4}
                              fill="#fff"
                              fontSize={item.faltante >= 10 ? '11' : '10'}
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {item.faltante}
                            </text>
                          )}

                          {/* Entregue (Vivid Green) */}
                          {item.entregue > 0 && (
                            <rect
                              x={barX}
                              y={entregueY}
                              width={item.barWidth}
                              height={entregueH}
                              fill="#22c55e"
                              rx={item.faltante === 0 ? '3' : '0'}
                            />
                          )}

                          {/* Entregue label */}
                          {item.entregue >= 10 && (
                            <text
                              x={item.center}
                              y={entregueY + entregueH / 2 + 4.5}
                              fill="#fff"
                              fontSize="12"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {item.entregue}
                            </text>
                          )}

                          {/* X-axis tick */}
                          <line
                            x1={item.center}
                            y1="220"
                            x2={item.center}
                            y2="225"
                            stroke="#cbd5e1"
                            strokeWidth="1"
                          />

                          {/* X-axis Label */}
                          <text
                            x={item.center}
                            y="244"
                            fill={hoveredCamiseta?.size === item.size ? '#0f172a' : '#64748b'}
                            fontWeight={hoveredCamiseta?.size === item.size ? '700' : '600'}
                            fontSize="12.5"
                            textAnchor="middle"
                          >
                            {item.size}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {hoveredCamiseta && (
                    <div
                      className="chart-floating-tooltip"
                      style={{
                        left: hoveredCamiseta.center > 260 ? '18%' : '55%',
                        top: '15px',
                      }}
                    >
                      <div className="tooltip-title">Camiseta: {hoveredCamiseta.size}</div>
                      <div className="tooltip-row entregue">
                        <span>Entregue :</span>
                        <span>{hoveredCamiseta.entregue}</span>
                      </div>
                      <div className="tooltip-row faltante">
                        <span>Faltante :</span>
                        <span>{hoveredCamiseta.faltante}</span>
                      </div>
                      <div className="tooltip-row total">
                        <span>Total :</span>
                        <span>{hoveredCamiseta.total}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="dash-chart-legend">
                  <span className="legend-item entregue">
                    <span className="legend-square" style={{ background: '#22c55e' }} />
                    Entregue
                  </span>
                  <span className="legend-item faltante">
                    <span className="legend-square" style={{ background: '#f87171' }} />
                    Faltante
                  </span>
                </div>
              </div>

              <div className="dash-chart-card">
                <h3 className="dash-chart-title">Kits</h3>
                <div className="interactive-chart-box">
                  <svg width="100%" height="280" viewBox="0 0 480 270">
                    {/* Dotted horizontal grid lines */}
                    <line x1="54" y1="20" x2="460" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="54" y1="70" x2="460" y2="70" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="54" y1="120" x2="460" y2="120" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="54" y1="170" x2="460" y2="170" stroke="#f1f5f9" strokeDasharray="3 3" />

                    {/* Right boundary dotted grid line */}
                    <line x1="460" y1="20" x2="460" y2="220" stroke="#f1f5f9" strokeDasharray="3 3" />

                    {/* Vertical grid lines at category centers */}
                    {KITS_DATA.map((item) => (
                      <line
                        key={`grid-${item.name}`}
                        x1={item.center}
                        y1="20"
                        x2={item.center}
                        y2="220"
                        stroke="#f1f5f9"
                        strokeDasharray="3 3"
                      />
                    ))}

                    {/* Axes */}
                    <line x1="54" y1="20" x2="54" y2="220" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="54" y1="220" x2="460" y2="220" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Y-axis Ticks & Labels */}
                    <line x1="49" y1="20" x2="54" y2="20" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="24" fill="#94a3b8" fontSize="11.5" textAnchor="end">260</text>

                    <line x1="49" y1="70" x2="54" y2="70" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="74" fill="#94a3b8" fontSize="11.5" textAnchor="end">195</text>

                    <line x1="49" y1="120" x2="54" y2="120" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="124" fill="#94a3b8" fontSize="11.5" textAnchor="end">130</text>

                    <line x1="49" y1="170" x2="54" y2="170" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="174" fill="#94a3b8" fontSize="11.5" textAnchor="end">65</text>

                    <line x1="49" y1="220" x2="54" y2="220" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="46" y="224" fill="#94a3b8" fontSize="11.5" textAnchor="end">0</text>

                    {/* Active column highlight */}
                    {hoveredKit && (
                      <rect
                        x={hoveredKit.colLeft}
                        y="20"
                        width={hoveredKit.colWidth}
                        height="200"
                        fill="#cbd5e1"
                        opacity="0.45"
                      />
                    )}

                    {/* Thick Wide Bars */}
                    {KITS_DATA.map((item) => {
                      const scale = 200 / 260
                      const faltanteH = item.faltante * scale
                      const entregueH = item.entregue * scale
                      const totalH = faltanteH + entregueH
                      const topY = 220 - totalH
                      const entregueY = 220 - entregueH
                      const barX = item.center - item.barWidth / 2

                      return (
                        <g
                          key={item.name}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredKit(item)}
                          onMouseLeave={() => setHoveredKit(null)}
                        >
                          {/* Invisible hover catcher */}
                          <rect
                            x={item.colLeft}
                            y="20"
                            width={item.colWidth}
                            height="210"
                            fill="transparent"
                          />

                          {/* Faltante (Coral/Red) */}
                          {item.faltante > 0 && (
                            <rect
                              x={barX}
                              y={topY}
                              width={item.barWidth}
                              height={Math.max(4, faltanteH)}
                              fill="#f87171"
                              rx="3"
                            />
                          )}

                          {/* Faltante label */}
                          {item.faltante >= 3 && (
                            <text
                              x={item.center}
                              y={topY + Math.max(4, faltanteH) / 2 + 4}
                              fill="#fff"
                              fontSize={item.faltante >= 10 ? '11' : '10'}
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {item.faltante}
                            </text>
                          )}

                          {/* Entregue (Vivid Green) */}
                          {item.entregue > 0 && (
                            <rect
                              x={barX}
                              y={entregueY}
                              width={item.barWidth}
                              height={entregueH}
                              fill="#22c55e"
                              rx={item.faltante === 0 ? '3' : '0'}
                            />
                          )}

                          {/* Entregue label */}
                          {item.entregue >= 30 && (
                            <text
                              x={item.center}
                              y={entregueY + entregueH / 2 + 5}
                              fill="#fff"
                              fontSize="13"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {item.entregue}
                            </text>
                          )}

                          {/* X-axis tick */}
                          <line
                            x1={item.center}
                            y1="220"
                            x2={item.center}
                            y2="225"
                            stroke="#cbd5e1"
                            strokeWidth="1"
                          />

                          {/* X-axis Label */}
                          <text
                            x={item.center}
                            y="244"
                            fill={hoveredKit?.name === item.name ? '#0f172a' : '#64748b'}
                            fontWeight={hoveredKit?.name === item.name ? '700' : '600'}
                            fontSize="11.5"
                            textAnchor="middle"
                          >
                            {item.name}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {hoveredKit && (
                    <div
                      className="chart-floating-tooltip"
                      style={{
                        left: hoveredKit.center > 260 ? '15%' : '50%',
                        top: '15px',
                      }}
                    >
                      <div className="tooltip-title">{hoveredKit.name}</div>
                      <div className="tooltip-row entregue">
                        <span>Entregue :</span>
                        <span>{hoveredKit.entregue}</span>
                      </div>
                      <div className="tooltip-row faltante">
                        <span>Faltante :</span>
                        <span>{hoveredKit.faltante}</span>
                      </div>
                      <div className="tooltip-row total">
                        <span>Total :</span>
                        <span>{hoveredKit.total}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="dash-chart-legend">
                  <span className="legend-item entregue">
                    <span className="legend-square" style={{ background: '#22c55e' }} />
                    Entregue
                  </span>
                  <span className="legend-item faltante">
                    <span className="legend-square" style={{ background: '#f87171' }} />
                    Faltante
                  </span>
                </div>
              </div>
            </div>

            {/* Entregas por operador */}
            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Entregas por Operador</h3>
              <div className="chart-empty-msg">
                Nenhuma entrega registrada
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
