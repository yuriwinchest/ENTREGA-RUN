import { useState } from 'react'
import { emergencyLinksApi } from '../utils/medicoApi.js'
import { parseEmergencyCode } from '../utils/emergencyLinks.js'

export default function EmergencyLinksManager({ event, events, onChanged }) {
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState(null)
  const [targetId, setTargetId] = useState(event.id)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const target = events.find((item) => item.id === targetId && item.status !== 'ARQUIVADO')

  async function check() {
    setMessage('')
    setPreview(null)
    setConfirmed(false)
    const code = parseEmergencyCode(input, window.location.origin)
    if (!code) return setMessage('Cole o endereço de emergência ou o código que aparece depois de /emergencia/.')
    setBusy(true)
    const response = await emergencyLinksApi.preview(code)
    setBusy(false)
    if (!response.ok) return setMessage(response.data?.message || 'Não foi possível conferir o endereço.')
    setPreview(response.data)
  }

  async function transfer() {
    if (!target || !preview || !confirmed) return
    setBusy(true)
    const response = await emergencyLinksApi.bind({ code: preview.code, targetEventId: target.id, expectedRevision: preview.revision, confirmed: true })
    setBusy(false)
    if (!response.ok) {
      setConfirmed(false)
      return setMessage(response.data?.message || 'Não foi possível salvar o vínculo.')
    }
    setPreview(null)
    setConfirmed(false)
    setMessage(`QR impresso vinculado a ${target.name} — ${target.date || 'data não informada'}. Os dados anteriores não foram transferidos.`)
    onChanged()
  }

  return (
    <details className="evmed-reuse">
      <summary>Reaproveitar QR Code já impresso</summary>
      <p>Use quando o evento original foi arquivado ou excluído. O novo evento precisa ter a lista correta de atletas importada.</p>
      <label htmlFor="old-emergency-link">Link ou código antigo</label>
      <input id="old-emergency-link" value={input} disabled={busy} onChange={(e) => { setInput(e.target.value); setPreview(null); setConfirmed(false); setMessage('') }} placeholder="Cole o endereço do QR impresso" />
      <button type="button" className="evmed-btn ghost" disabled={busy || !input.trim()} onClick={check}>{busy ? 'Aguarde…' : 'Conferir endereço'}</button>
      {preview && <>
        <p>Endereço: <code>{preview.code}</code><br />Destino anterior: {preview.previous ? `${preview.previous.name} — ${preview.previous.date || 'sem data'} (${preview.previous.status})` : 'Evento excluído'}</p>
        <label htmlFor="emergency-link-target">Evento que o QR deve abrir</label>
        <select id="emergency-link-target" value={targetId} disabled={busy} onChange={(e) => { setTargetId(e.target.value); setConfirmed(false) }}>
          <option value="">Selecione um evento</option>
          {events.filter((item) => item.status !== 'ARQUIVADO').map((item) => <option key={item.id} value={item.id}>{item.name} — {item.date || 'sem data'}</option>)}
        </select>
        {target && <label className="evmed-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)} />Confirmei o destino {target.name}, a data {target.date || 'não informada'} e a lista de atletas importada.</label>}
        <button type="button" className="evmed-btn primary" disabled={busy || !confirmed || !target} onClick={transfer}>Vincular QR impresso a este evento</button>
      </>}
      {message && <p role="status">{message}</p>}
    </details>
  )
}
