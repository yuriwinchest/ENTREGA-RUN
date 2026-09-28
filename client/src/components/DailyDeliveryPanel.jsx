import { useMemo, useState } from 'react'
import {
  buildDailyDeliveries,
  formatDayLabel,
  raceDayKey,
  suggestDailyTarget,
  todayKey,
} from '../utils/dailyDeliveries.js'
import './DailyDeliveryPanel.css'

const CHART_HEIGHT = 180

function targetHeadline(suggestion) {
  if (suggestion.status === 'ativo') return { value: suggestion.target, sub: 'kits por dia' }
  if (suggestion.status === 'concluido') return { value: '✓', sub: 'todos entregues' }
  if (suggestion.status === 'encerrado') return { value: '—', sub: 'corrida já passou' }
  return { value: '—', sub: 'evento sem data' }
}

export default function DailyDeliveryPanel({ event, athletes, pending }) {
  const [focusedDay, setFocusedDay] = useState(null)
  const days = useMemo(() => buildDailyDeliveries(athletes), [athletes])
  const today = todayKey()
  const suggestion = suggestDailyTarget({ pending, raceKey: raceDayKey(event), today })
  const headline = targetHeadline(suggestion)
  const todayTotal = days.find((d) => d.day === today)?.total || 0
  const target = suggestion.status === 'ativo' ? suggestion.target : 0
  const scaleMax = Math.max(1, target, ...days.map((d) => d.total))
  const peak = days.reduce((best, d) => (d.total > (best?.total || 0) ? d : best), null)
  const focused = days.find((d) => d.day === focusedDay)

  return (
    <section className="daily-panel" aria-labelledby="daily-panel-title">
      <div className="daily-panel-stats">
        <div className="daily-stat daily-stat-accent">
          <span className="daily-stat-label">Meta sugerida</span>
          <strong className="daily-stat-value">{headline.value}</strong>
          <span className="daily-stat-sub">{headline.sub}</span>
        </div>
        <div className="daily-stat">
          <span className="daily-stat-label">Dias de retirada</span>
          <strong className="daily-stat-value">{suggestion.daysLeft ?? '—'}</strong>
          <span className="daily-stat-sub">até a véspera da corrida</span>
        </div>
        <div className="daily-stat">
          <span className="daily-stat-label">Entregues hoje</span>
          <strong className="daily-stat-value">{todayTotal}</strong>
          <span className="daily-stat-sub">
            {target > 0 ? `${Math.min(100, Math.round((todayTotal / target) * 100))}% da meta` : formatDayLabel(today)}
          </span>
        </div>
      </div>

      <div className="dash-chart-card daily-chart-card">
        <h3 id="daily-panel-title" className="dash-chart-title">Entregas por dia</h3>
        {days.length === 0 ? (
          <div className="chart-empty-msg">Nenhuma entrega registrada</div>
        ) : (
          <>
            <div className="daily-chart-scroll">
              <div className="daily-chart" style={{ height: CHART_HEIGHT }}>
                {target > 0 && (
                  <div className="daily-target-line" style={{ bottom: `${(target / scaleMax) * 100}%` }}>
                    <span>Meta {target}/dia</span>
                  </div>
                )}
                {days.map((d) => {
                  const labeled = d.day === today || d === peak
                  return (
                    <button
                      key={d.day}
                      type="button"
                      className={`daily-bar ${d.day === today ? 'is-today' : ''} ${focusedDay === d.day ? 'is-focused' : ''}`}
                      onMouseEnter={() => setFocusedDay(d.day)}
                      onMouseLeave={() => setFocusedDay(null)}
                      onFocus={() => setFocusedDay(d.day)}
                      onBlur={() => setFocusedDay(null)}
                      onClick={() => setFocusedDay(focusedDay === d.day ? null : d.day)}
                      aria-label={`${d.label}: ${d.total} entregas`}
                    >
                      <span className="daily-bar-fill" style={{ height: `${(d.total / scaleMax) * 100}%` }}>
                        {labeled && <em>{d.total}</em>}
                      </span>
                      <span className="daily-bar-day">{d.day === today ? 'Hoje' : d.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="daily-tooltip" aria-live="polite">
              {focused ? (
                <>
                  <strong>{focused.day === today ? 'Hoje' : focused.label} · {focused.total} entregas</strong>
                  <span>{focused.operators.map((o) => `${o.name}: ${o.count}`).join(' · ')}</span>
                </>
              ) : (
                <span>Toque numa coluna para ver quem entregou no dia.</span>
              )}
            </div>

            <table className="daily-table">
              <caption>Quem entregou em cada dia</caption>
              <thead>
                <tr><th scope="col">Dia</th><th scope="col">Entregas</th><th scope="col">Operadores</th></tr>
              </thead>
              <tbody>
                {[...days].reverse().map((d) => (
                  <tr key={d.day}>
                    <th scope="row">{d.day === today ? 'Hoje' : d.label}</th>
                    <td>{d.total}</td>
                    <td>{d.operators.map((o) => `${o.name} (${o.count})`).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  )
}
