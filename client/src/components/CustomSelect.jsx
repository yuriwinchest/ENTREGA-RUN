import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './CustomSelect.css'

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function CustomSelect({
  value,
  onChange,
  options = [],
  groups = [],
  placeholder = 'Selecione uma opção',
  className = '',
  disabled = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768
    }
    return false
  })
  const [menuStyle, setMenuStyle] = useState({})
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  // Detecta se a viewport atual é mobile para chavear entre Bottom Sheet e Popover
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Normaliza opções: ou vem em "groups" ou converte "options" simples em 1 grupo padrão
  const allGroups = groups.length > 0
    ? groups
    : [{ label: null, options }]

  // Encontra o item selecionado atualmente para exibir seu label
  let selectedLabel = ''
  let selectedOption = null

  for (const g of allGroups) {
    for (const opt of g.options || []) {
      if (String(opt.value) === String(value)) {
        selectedLabel = opt.label
        selectedOption = opt
        break
      }
    }
    if (selectedOption) break
  }

  // Atualiza posição do menu flutuante (Portal) ancorado ao botão trigger no Desktop
  const updatePosition = useCallback(() => {
    if (isMobile || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpwards = spaceBelow < 280 && spaceAbove > spaceBelow
    const availableSpace = openUpwards ? spaceAbove : spaceBelow
    const maxHeight = Math.min(320, Math.max(140, availableSpace - 24))

    const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 24)
    let left = rect.left
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12
    }
    if (left < 12) left = 12

    setMenuStyle({
      position: 'fixed',
      top: openUpwards ? undefined : `${Math.round(rect.bottom + 6)}px`,
      bottom: openUpwards ? `${Math.round(window.innerHeight - rect.top + 6)}px` : undefined,
      left: `${Math.round(left)}px`,
      width: `${Math.round(width)}px`,
      maxHeight: `${Math.round(maxHeight)}px`,
      zIndex: 999999,
    })
  }, [isMobile])

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen, updatePosition])

  // Fecha ao clicar fora ou rolar no Desktop
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e) {
      if (isMobile) return // O clique fora no mobile é tratado pelo backdrop da Bottom Sheet
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    function handleScroll(e) {
      if (isMobile) return
      if (menuRef.current && menuRef.current.contains(e.target)) return
      setIsOpen(false)
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isMobile, updatePosition])

  const handleSelect = (val) => {
    setIsOpen(false)
    if (onChange) {
      onChange(val)
    }
  }

  // Renderiza a lista de opções reutilizada no Desktop e Mobile
  const renderOptionsList = () => (
    <>
      {allGroups.map((g, gIdx) => (
        <div key={gIdx} className="custom-select-group">
          {g.label && (
            <div className="custom-select-group-label">
              <span>{g.label}</span>
            </div>
          )}
          <div className="custom-select-group-items">
            {(g.options || []).map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <div
                  key={String(opt.value)}
                  className={`custom-select-option ${isSelected ? 'selected' : ''} ${opt.isAction ? 'is-action' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="custom-select-option-label">{opt.label}</span>
                  {isSelected && (
                    <span className="custom-select-option-check">
                      <CheckIcon />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <div className={`custom-select-container ${className} ${disabled ? 'disabled' : ''}`}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsMobile(window.innerWidth <= 768)
            setIsOpen((prev) => !prev)
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className={`custom-select-value ${!selectedLabel ? 'placeholder' : ''}`}>
          {selectedLabel || placeholder}
        </span>
        <span className={`custom-select-chevron ${isOpen ? 'rotated' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen &&
        createPortal(
          isMobile ? (
            /* VISUAL NATIVO MOBILE: BOTTOM SHEET DESLIZANTE COM EFEITO VIDRO */
            <div
              className="custom-select-mobile-backdrop"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="custom-select-bottom-sheet"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="custom-select-sheet-drag-wrap">
                  <div className="custom-select-sheet-drag-pill" />
                </div>
                <div className="custom-select-sheet-header">
                  <div className="custom-select-sheet-header-text">
                    <span className="custom-select-sheet-subtitle">SELECIONE UMA OPÇÃO</span>
                    <h4 className="custom-select-sheet-title">{selectedLabel || placeholder}</h4>
                  </div>
                  <button
                    type="button"
                    className="custom-select-sheet-close-btn"
                    onClick={() => setIsOpen(false)}
                    aria-label="Fechar opções"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="custom-select-sheet-body" role="listbox">
                  {renderOptionsList()}
                </div>
              </div>
            </div>
          ) : (
            /* VISUAL DESKTOP: POPOVER ANCORADO COM CÁLCULO DE VIEWPORT */
            <div
              ref={menuRef}
              className="custom-select-menu"
              style={menuStyle}
              role="listbox"
            >
              {renderOptionsList()}
            </div>
          ),
          document.body
        )}
    </div>
  )
}
