import { useState, useRef, useEffect, useLayoutEffect } from 'react'
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
  const [menuStyle, setMenuStyle] = useState({})
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

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

  // Atualiza posição do menu flutuante (Portal) ancorado ao botão trigger
  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpwards = spaceBelow < 280 && spaceAbove > spaceBelow

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
      maxHeight: '320px',
      zIndex: 999999,
    })
  }

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen])

  // Fecha ao clicar fora ou rolar o fundo
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    function handleScroll(e) {
      if (menuRef.current && menuRef.current.contains(e.target)) return
      setIsOpen(false)
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (val) => {
    setIsOpen(false)
    if (onChange) {
      onChange(val)
    }
  }

  return (
    <div className={`custom-select-container ${className} ${disabled ? 'disabled' : ''}`}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
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
          <div
            ref={menuRef}
            className="custom-select-menu"
            style={menuStyle}
            role="listbox"
          >
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
          </div>,
          document.body
        )}
    </div>
  )
}
