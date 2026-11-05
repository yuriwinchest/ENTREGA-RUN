import { Children, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { optionIdentity } from '../utils/registrationOptions.js'
import './CreatableSelect.css'

const CREATE_OPTION = '__create_registration_option__'

export default function CreatableSelect({ children, label, onCreate, maxLength = 128, disabled, onChange, ...selectProps }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const editorId = useId()
  const inputRef = useRef(null)
  const selectRef = useRef(null)
  const dialogRef = useRef(null)
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
  const selectedValue = selectedOption ? selectedOption.props.value : selectProps.value

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!editing) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => { document.body.style.overflow = previousOverflow }
  }, [editing])
  useEffect(() => {
    if (focusTarget.current === 'input' && editing && !saving) {
      inputRef.current?.focus()
      focusTarget.current = ''
    } else if (focusTarget.current === 'select' && !editing && !saving) {
      selectRef.current?.focus()
      focusTarget.current = ''
    }
  }, [editing, saving, error])

  function close() {
    if (locked.current) return
    focusTarget.current = 'select'
    setEditing(false)
    setDraft('')
    setError('')
  }

  function select(event) {
    if (event.target.value !== CREATE_OPTION) { onChange(event); return }
    // The action belongs to the menu, never to the athlete's saved value.
    event.currentTarget.value = selectedValue ?? ''
    setNotice('')
    setEditing(true)
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
      locked.current = false
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
    <>
      <select {...selectProps} ref={selectRef} value={selectedValue} aria-label={selectProps['aria-label'] || label} aria-describedby={`${editorId}-notice`} disabled={disabled || saving} onChange={select}>
        {children}
        {selectProps.value && !selectedOption && <option value={selectProps.value}>{selectProps.value}</option>}
        {onCreate && !disabled && <option value={CREATE_OPTION}>+ Adicionar opção…</option>}
      </select>
      <span id={`${editorId}-notice`} className="creatable-select-sr-only" role="status">{notice}</span>
      {editing && createPortal(
        <div className="registration-option-overlay" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) close() }} onKeyDown={(e) => e.stopPropagation()}>
        <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="registration-option-dialog" aria-labelledby={`${editorId}-title`} aria-describedby={`${editorId}-help`} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save() }
          if (e.key === 'Escape') { e.preventDefault(); close() }
          if (e.key === 'Tab') {
            const controls = Array.from(dialogRef.current.querySelectorAll('input, button')).filter((el) => !el.disabled)
            const first = controls[0], last = controls.at(-1)
            if (!first) { e.preventDefault(); dialogRef.current.focus() }
            else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus() }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
          }
        }}>
          <h2 id={`${editorId}-title`}>Adicionar opção</h2>
          <label htmlFor={`${editorId}-input`}>{label}</label>
          <input ref={inputRef} id={`${editorId}-input`} type="text" value={draft} maxLength={maxLength} disabled={saving} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? `${editorId}-error` : undefined} onChange={(e) => setDraft(e.target.value)} />
          <p id={`${editorId}-help`}>Disponível nos eventos da sua organização, mesmo se cancelar o cadastro do atleta.</p>
          {error && <p id={`${editorId}-error`} className="registration-option-error" role="alert">{error}</p>}
          <div className="registration-option-actions">
            <button type="button" disabled={saving} onClick={close}>Cancelar</button>
            <button type="button" disabled={saving || !draft.trim()} onClick={save}>{saving ? 'Salvando…' : 'Salvar opção'}</button>
          </div>
        </div>
        </div>, document.body,
      )}
    </>
  )
}
