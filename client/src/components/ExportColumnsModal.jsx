import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  moveColumn,
  readSavedColumns,
  resolveColumnSelection,
  sampleValue,
  saveColumns,
  setAllColumns,
  toggleColumn,
} from '../utils/exportColumns.js'
import './ExportColumnsModal.css'

const FILTER_THRESHOLD = 10

function formatHeader(header) {
  return String(header).replace(/_/g, ' ')
}

export default function ExportColumnsModal({ eventId, kind, title, table, onExport, onClose }) {
  const [columns, setColumns] = useState(() => resolveColumnSelection(table.headers, readSavedColumns(eventId, kind)))
  const [filter, setFilter] = useState('')
  const [lastMoved, setLastMoved] = useState(null)
  const cardRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const selectedCount = columns.filter((item) => item.selected).length
  const orderOf = useMemo(() => {
    const order = new Map()
    columns.filter((item) => item.selected).forEach((item, i) => order.set(item.header, i + 1))
    return order
  }, [columns])

  const normalizedFilter = filter.trim().toLowerCase()
  const visible = columns
    .map((item, index) => ({ ...item, index }))
    .filter((item) => !normalizedFilter || formatHeader(item.header).toLowerCase().includes(normalizedFilter))

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cardRef.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  function move(index, delta) {
    setColumns((current) => moveColumn(current, index, delta))
    setLastMoved(columns[index]?.header ?? null)
  }

  function handleExport() {
    if (selectedCount === 0) return
    saveColumns(eventId, kind, columns)
    onExport(columns)
  }

  return createPortal(
    <div className="export-cols-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section
        ref={cardRef}
        tabIndex={-1}
        className="export-cols-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-cols-title"
      >
        <header className="export-cols-header">
          <div>
            <span className="export-cols-eyebrow">EXPORTAR PLANILHA</span>
            <h2 id="export-cols-title">{title}</h2>
            <p>{table.rows.length} {table.rows.length === 1 ? 'linha' : 'linhas'} · marque as colunas e defina a ordem com ↑ ↓</p>
          </div>
          <button type="button" className="export-cols-close" aria-label="Fechar" onClick={onClose}>×</button>
        </header>

        <div className="export-cols-toolbar">
          <button type="button" onClick={() => setColumns((c) => setAllColumns(c, true))}>Marcar todas</button>
          <button type="button" onClick={() => setColumns((c) => setAllColumns(c, false))}>Desmarcar todas</button>
          <button type="button" onClick={() => setColumns(resolveColumnSelection(table.headers, null))}>Ordem original</button>
        </div>

        {columns.length > FILTER_THRESHOLD && (
          <input
            className="export-cols-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filtrar colunas pelo nome"
            aria-label="Filtrar colunas pelo nome"
          />
        )}

        <ol className="export-cols-list">
          {visible.map((item) => {
            const sample = sampleValue(table, item.header)
            const position = orderOf.get(item.header)
            return (
              <li
                key={item.header}
                className={`export-cols-item ${item.selected ? 'is-selected' : ''} ${lastMoved === item.header ? 'is-moved' : ''}`}
              >
                <label className="export-cols-pick">
                  <input type="checkbox" checked={item.selected} onChange={() => setColumns((c) => toggleColumn(c, item.index))} />
                  <span className="export-cols-position" aria-hidden="true">{position ? `${position}º` : '—'}</span>
                  <span className="export-cols-text">
                    <strong>{formatHeader(item.header)}</strong>
                    <small>{sample ? `ex.: ${sample}` : 'sem valores preenchidos'}</small>
                  </span>
                </label>
                <div className="export-cols-move">
                  <button
                    type="button"
                    onClick={() => move(item.index, -1)}
                    disabled={item.index === 0}
                    aria-label={`Subir ${formatHeader(item.header)}`}
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => move(item.index, 1)}
                    disabled={item.index === columns.length - 1}
                    aria-label={`Descer ${formatHeader(item.header)}`}
                  >↓</button>
                </div>
              </li>
            )
          })}
          {visible.length === 0 && <li className="export-cols-empty">Nenhuma coluna com esse nome.</li>}
        </ol>

        <footer className="export-cols-footer">
          <p className="export-cols-summary" aria-live="polite">
            {selectedCount === 0
              ? 'Marque ao menos uma coluna.'
              : `${selectedCount} ${selectedCount === 1 ? 'coluna' : 'colunas'}: ${columns.filter((c) => c.selected).map((c) => formatHeader(c.header)).join(' · ')}`}
          </p>
          <div className="export-cols-actions">
            <button type="button" className="export-cols-cancel" onClick={onClose}>Cancelar</button>
            <button type="button" className="export-cols-download" onClick={handleExport} disabled={selectedCount === 0}>
              Baixar planilha
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  )
}
