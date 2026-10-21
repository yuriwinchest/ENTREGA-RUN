import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { apiFetchAthletes } from '../utils/eventsApi.js'
import { emergencyUrl } from '../utils/medico.js'
import './EventoMedicoModal.css'

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function slug(text) {
  return String(text || 'evento')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

function downloadHref(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export default function EventoMedicoModal({ event, onClose, onOpenPainel, onOpenOperacao }) {
  const [qrPreview, setQrPreview] = useState('')
  const [copied, setCopied] = useState(false)
  const [health, setHealth] = useState(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const linkEmergencia = emergencyUrl(origin, event?.id)
  const fileBase = `qr-emergencia-${slug(event?.name)}`

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(linkEmergencia, { width: 420, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#0c142c', light: '#ffffff' } })
      .then((url) => { if (alive) setQrPreview(url) })
      .catch(() => { if (alive) setQrPreview('') })
    return () => { alive = false }
  }, [linkEmergencia])

  useEffect(() => {
    let alive = true
    apiFetchAthletes(event?.id).then((result) => {
      if (alive) setHealth({ fields: result?.healthFields || [] })
    })
    return () => { alive = false }
  }, [event?.id])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function downloadPng() {
    const url = await QRCode.toDataURL(linkEmergencia, {
      width: 2048,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    })
    downloadHref(url, `${fileBase}.png`)
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(linkEmergencia, { type: 'svg', margin: 4, errorCorrectionLevel: 'H' })
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    downloadHref(blobUrl, `${fileBase}.svg`)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(linkEmergencia)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copie o link:', linkEmergencia)
    }
  }

  const publicas = (health?.fields || []).filter((field) => field.publico)
  const privadas = (health?.fields || []).filter((field) => !field.publico)

  return (
    <div className="evmed-backdrop" onClick={onClose}>
      <div className="evmed-card" role="dialog" aria-modal="true" aria-labelledby="evmed-title" onClick={(e) => e.stopPropagation()}>
        <header className="evmed-head">
          <div>
            <span className="evmed-kicker">Emergência médica</span>
            <h2 id="evmed-title" className="evmed-title">{event?.name}</h2>
          </div>
          <button type="button" className="evmed-close" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </header>

        <section className="evmed-body">
          <div className="evmed-qr-wrap">
            <figure className="evmed-qr">
              {qrPreview ? <img src={qrPreview} alt="QR Code da página de emergência do evento" /> : <div className="evmed-qr-ph" />}
              <figcaption>Imprima no número de peito</figcaption>
            </figure>
            <div className="evmed-qr-info">
              <h3>QR Code de emergência</h3>
              <p>
                Um só QR para todos os atletas do evento. Quem encontrar alguém passando mal escaneia e cai na
                busca por peito, nome ou CPF. Correção de erro alta: funciona mesmo com o peito amassado ou molhado.
              </p>
              <div className="evmed-actions">
                <button type="button" className="evmed-btn primary" onClick={downloadPng}>Baixar PNG (alta resolução)</button>
                <button type="button" className="evmed-btn ghost" onClick={downloadSvg}>Baixar SVG (vetor)</button>
              </div>
            </div>
          </div>

          <div className="evmed-link-row">
            <span className="evmed-link-label">Página de emergência (pública)</span>
            <code>{linkEmergencia}</code>
            <div className="evmed-link-actions">
              <button type="button" onClick={copyLink}>{copied ? 'Copiado' : 'Copiar'}</button>
              <a href={linkEmergencia} target="_blank" rel="noreferrer">Abrir</a>
            </div>
          </div>

          <div className="evmed-health">
            <h3>Dados de saúde da planilha</h3>
            {!health ? (
              <p className="evmed-lead">Carregando…</p>
            ) : health.fields.length === 0 ? (
              <p className="evmed-lead">
                Nenhuma coluna marcada como saúde. Na <strong>importação da planilha</strong> (Entregar kit → Importar),
                marque na seção <strong>Saúde</strong> as colunas de alergia, remédio, doença etc. e quais aparecem na página pública.
              </p>
            ) : (
              <>
                <p className="evmed-lead">
                  Definido na importação da planilha. Para mudar, importe de novo: as marcações atuais voltam pré-selecionadas.
                </p>
                <div className="evmed-chips">
                  {publicas.map((field) => (
                    <span key={field.key} className="evmed-chip pub" title="Aparece na página pública e no painel médico">{field.label}</span>
                  ))}
                  {privadas.map((field) => (
                    <span key={field.key} className="evmed-chip" title="Só no painel médico">{field.label}</span>
                  ))}
                </div>
                <p className="evmed-legend">
                  <span className="evmed-chip pub">pública</span> página de emergência e painel ·{' '}
                  <span className="evmed-chip">privada</span> só no painel médico
                </p>
              </>
            )}
            {onOpenOperacao && health && health.fields.length === 0 && (
              <button type="button" className="evmed-btn ghost" onClick={onOpenOperacao}>Ir para a importação</button>
            )}
          </div>

          {onOpenPainel && (
            <button type="button" className="evmed-btn dark wide" onClick={onOpenPainel}>
              Abrir painel médico deste evento
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
