import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchMunicipiosIBGE, filterMunicipios } from '../utils/ibge.js'

function MapPinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}

export default function CidadeAutocomplete({
  value,
  onChange,
  placeholder = 'Ex: Recife/PE',
  required = false,
  className = '',
}) {
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Pré-carrega municípios do IBGE
  useEffect(() => {
    let isMounted = true
    fetchMunicipiosIBGE()
      .then((data) => {
        if (isMounted) {
          setMunicipios(data || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Sugestões calculadas de forma reativa e memorizada
  const suggestions = useMemo(() => {
    if (!isOpen || !municipios.length) {
      return []
    }

    if (!value || !value.trim()) {
      // Sugestões padrão quando o campo está focado e vazio
      const defaults = municipios.filter((m) =>
        ['Recife/PE', 'Caruaru/PE', 'Surubim/PE', 'São Bento do Una/PE', 'São Paulo/SP', 'Rio de Janeiro/RJ', 'Salvador/BA', 'Fortaleza/CE', 'Belo Horizonte/MG', 'Brasília/DF'].includes(m.label)
      )
      return defaults.length > 0 ? defaults : municipios.slice(0, 10)
    }

    return filterMunicipios(municipios, value, 25)
  }, [value, isOpen, municipios])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(cidade) {
    onChange(cidade.label)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        handleSelect(suggestions[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`cidade-autocomplete-container ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          ref={inputRef}
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={() => {
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          required={required}
          autoComplete="off"
          style={{ paddingRight: value ? '56px' : '36px' }}
        />

        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {loading && (
            <span style={{ color: '#ff5200', display: 'flex' }} title="Carregando IBGE...">
              <SpinnerIcon />
            </span>
          )}

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                inputRef.current?.focus()
                setIsOpen(true)
                setHighlightedIndex(-1)
              }}
              title="Limpar cidade"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444'
                e.currentTarget.style.background = '#fef2f2'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <CloseIcon />
            </button>
          )}

          <span style={{ color: '#94a3b8', display: 'flex', pointerEvents: 'none' }}>
            <MapPinIcon />
          </span>
        </div>
      </div>

      {/* Dropdown de sugestões do IBGE */}
      {isOpen && (
        <div
          className="cidade-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 12px 28px -4px rgba(12, 20, 44, 0.12), 0 6px 12px -4px rgba(12, 20, 44, 0.08)',
            maxHeight: '230px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '6px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#94a3b8',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>CIDADES (IBGE)</span>
            {loading && <span>Buscando...</span>}
          </div>

          {suggestions.length === 0 ? (
            <div
              style={{
                padding: '16px 12px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {loading
                ? 'Carregando lista de municípios do IBGE...'
                : `Nenhuma cidade encontrada para "${value}"`}
            </div>
          ) : (
            suggestions.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isHighlighted ? '#fff5f0' : 'transparent',
                    color: isHighlighted ? '#ff5200' : '#0c142c',
                    fontSize: '13px',
                    fontWeight: 700,
                    transition: 'background 0.12s ease, color 0.12s ease',
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: isHighlighted ? '#ff5200' : '#94a3b8', display: 'flex' }}>
                      <MapPinIcon />
                    </span>
                    <span>{item.nome}</span>
                  </div>

                  <span
                    style={{
                      background: isHighlighted ? '#ff5200' : '#f1f5f9',
                      color: isHighlighted ? '#ffffff' : '#475569',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {item.uf}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
