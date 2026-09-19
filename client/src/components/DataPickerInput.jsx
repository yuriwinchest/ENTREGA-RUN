import { useRef } from 'react'

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function formatDateMask(val) {
  if (!val) return ''
  const digits = val.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function toIsoDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.trim().split('/')
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  return ''
}

function fromIsoDate(isoStr) {
  if (!isoStr) return ''
  const parts = isoStr.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return ''
}

export default function DataPickerInput({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  required = false,
  className = '',
}) {
  const pickerRef = useRef(null)

  function handleTextChange(e) {
    const masked = formatDateMask(e.target.value)
    onChange(masked)
  }

  function handlePickerChange(e) {
    const iso = e.target.value
    if (iso) {
      const brDate = fromIsoDate(iso)
      onChange(brDate)
    }
  }

  function openPicker() {
    if (pickerRef.current) {
      if (typeof pickerRef.current.showPicker === 'function') {
        try {
          pickerRef.current.showPicker()
          return
        } catch {
          // fallback to focus
        }
      }
      pickerRef.current.focus()
    }
  }

  return (
    <div className={`input-with-icon-wrap date-picker-field-wrap ${className}`} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        maxLength={10}
        value={value || ''}
        onChange={handleTextChange}
        required={required}
        style={{ paddingRight: '44px' }}
      />

      {/* Input nativo invisível para disparar o seletor visual de calendário do navegador */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={toIsoDate(value)}
        onChange={handlePickerChange}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '28px',
          height: '28px',
          opacity: 0,
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 2,
        }}
      />

      <button
        type="button"
        className="date-picker-icon-btn"
        onClick={openPicker}
        title="Abrir calendário para escolher data"
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          cursor: 'pointer',
          borderRadius: '6px',
          zIndex: 1,
          transition: 'color 0.15s ease, background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ff5200'
          e.currentTarget.style.backgroundColor = '#fff5f0'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#64748b'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <CalendarIcon />
      </button>
    </div>
  )
}
