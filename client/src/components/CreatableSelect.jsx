import { Children, useEffect, useId, useRef, useState } from 'react'
import { optionIdentity } from '../utils/registrationOptions.js'
import './CreatableSelect.css'

export default function CreatableSelect({ children, label, onCreate, maxLength = 128, disabled, onChange, ...selectProps }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const editorId = useId()
  const inputRef = useRef(null)
  const addRef = useRef(null)
  const locked = useRef(false)
  const mounted = useRef(true)
  const focusTarget = useRef('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const childOptions = Children.toArray(children)
  function matchingOption(value) {
    return childOptions.find((option) => typeof option.props?.value === 'string' && optionIdentity(option.props.value) === optionIdentity(value))
  }
  const selectedOption = matchingOption(selectProps.value)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (focusTarget.current === 'input' && editing && !saving) {
      inputRef.current?.focus()
      focusTarget.current = ''
    } else if (focusTarget.current === 'add' && !editing) {
      addRef.current?.focus()
      focusTarget.current = ''
    }
  }, [editing, saving, error])

  function close() {
    focusTarget.current = 'add'
    setEditing(false)
    setDraft('')
    setError('')
  }

  async function save() {
    if (locked.current || disabled || !draft.trim()) return
    locked.current = true
    setSaving(true)
    setError('')
    try {
      const value = await onCreate(draft)
      if (!mounted.current) return
      const existing = matchingOption(value)
      onChangeRef.current({ target: { value: existing ? existing.props.value : value } })
      close()
      setNotice('Opção salva e selecionada.')
    } catch (err) {
      if (mounted.current) { focusTarget.current = 'input'; setError(err.message || 'Não foi possível salvar. Tente novamente.') }
    } finally {
      locked.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <div className="creatable-select">
      <select {...selectProps} value={selectedOption ? selectedOption.props.value : selectProps.value} aria-label={selectProps['aria-label'] || label} disabled={disabled || saving} onChange={onChange}>
        {children}
        {selectProps.value && !selectedOption && <option value={selectProps.value}>{selectProps.value}</option>}
      </select>
      {onCreate && !disabled && (
        <>
          <button ref={addRef} type="button" className="creatable-select-add" aria-label={`Adicionar opção em ${label}`} aria-expanded={editing} aria-controls={editorId} hidden={editing} onClick={() => { focusTarget.current = 'input'; setEditing(true); setNotice('') }}>+ Adicionar opção</button>
          {editing && (
            <div id={editorId} className="creatable-select-editor">
              <label htmlFor={`${editorId}-input`}>Nova opção de {label.toLocaleLowerCase('pt-BR')}</label>
              <input ref={inputRef} id={`${editorId}-input`} className="athlete-form-input" type="text" value={draft} maxLength={maxLength} disabled={saving} aria-invalid={Boolean(error)} aria-describedby={`${editorId}-help${error ? ` ${editorId}-error` : ''}`} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); save() }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!saving) close() }
              }} />
              <p id={`${editorId}-help`} className="creatable-select-help">Ficará disponível nos eventos da sua organização, mesmo se cancelar este atleta.</p>
              {error && <p id={`${editorId}-error`} className="creatable-select-error" role="alert">{error}</p>}
              <div className="creatable-select-actions">
                <button type="button" disabled={saving || !draft.trim()} onClick={save}>{saving ? 'Salvando…' : 'Salvar opção'}</button>
                <button type="button" disabled={saving} onClick={close}>Cancelar</button>
              </div>
            </div>
          )}
          <span className="creatable-select-notice" role="status">{notice}</span>
        </>
      )}
    </div>
  )
}
