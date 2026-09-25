import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './PendingKitDecisionModal.css'

export default function PendingKitDecisionModal({ decision, busy, error, onDeliver, onUndo, onRetry }) {
  const cardRef = useRef(null)
  const firstButtonRef = useRef(null)
  const [recipient, setRecipient] = useState('')

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstButtonRef.current?.focus()

    function keepFocusInside(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
      if (event.key !== 'Tab') return
      const focusable = [...cardRef.current.querySelectorAll('input:not(:disabled), button:not(:disabled)')]
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!cardRef.current.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', keepFocusInside, true)
    return () => {
      document.removeEventListener('keydown', keepFocusInside, true)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [])

  return createPortal(
    <div className="kit-decision-backdrop">
      <section ref={cardRef} className="kit-decision-card" role="alertdialog" aria-modal="true" aria-labelledby="kit-decision-title" aria-describedby="kit-decision-description">
        <span className="kit-decision-eyebrow">ASSOCIAÇÃO CONFIRMADA</span>
        <h2 id="kit-decision-title">Conclua o atendimento</h2>
        <p id="kit-decision-description">
          Escolha uma das ações abaixo para liberar a tela. A associação por si só não registra a entrega do kit.
        </p>
        <dl className="kit-decision-details">
          <div><dt>Atleta</dt><dd>{decision.athleteName}</dd></div>
          <div><dt>Número</dt><dd>{decision.numero}</dd></div>
          <div><dt>Chip</dt><dd>{decision.chip}</dd></div>
        </dl>
        {!decision.resolution && (
          <label className="kit-decision-recipient">
            Retirado por (se for terceiro)
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Deixe em branco para o próprio atleta" autoComplete="off" />
          </label>
        )}
        {error && <p className="kit-decision-error" role="alert">{error}</p>}
        {decision.resolution ? (
          <button ref={firstButtonRef} type="button" className="kit-decision-deliver" onClick={onRetry} disabled={busy}>
            {busy ? 'Salvando…' : 'Tentar salvar novamente'}
          </button>
        ) : (
          <div className="kit-decision-actions">
            <button ref={firstButtonRef} type="button" className="kit-decision-deliver" onClick={() => onDeliver(recipient)} disabled={busy}>
              {busy ? 'Aguarde…' : 'Entregar kit'}
            </button>
            <button type="button" className="kit-decision-undo" onClick={onUndo} disabled={busy}>
              Desfazer associação
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body
  )
}
