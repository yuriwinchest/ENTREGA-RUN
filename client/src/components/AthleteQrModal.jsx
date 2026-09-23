import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import './AthleteQrModal.css'

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function PrinterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function AthleteQrModal({ isOpen, onClose, athlete, event }) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const eventId = event?.id || ''
  const athleteNumero = athlete?.numero || ''
  const athleteNome = athlete?.nome || ''
  const isEntregue = athlete?.status === 'ENTREGUE'

  const validationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/validar/${eventId}/${encodeURIComponent(athleteNumero)}`
    : ''

  useEffect(() => {
    if (!isOpen || !eventId || !athleteNumero) {
      return
    }

    let isMounted = true
    QRCode.toDataURL(validationUrl, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0c142c',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url)
      })
      .catch((err) => {
        console.error('Erro ao gerar QR Code do atleta:', err)
        if (isMounted) setQrDataUrl('')
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, eventId, athleteNumero, validationUrl])

  if (!isOpen || !athlete) return null

  function handleCopy() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(validationUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  function handleOpenValidation() {
    window.open(validationUrl, '_blank', 'noopener,noreferrer')
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-backdrop athlete-qr-backdrop" onClick={onClose}>
      <div className="modal-card-athlete-qr" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-athlete-qr-header">
          <div>
            <span className="athlete-qr-header-badge">QR CODE DO ATLETA</span>
            <h2 className="modal-athlete-qr-title">COMPROVANTE DIGITAL</h2>
          </div>
          <button
            type="button"
            className="modal-athlete-close-btn"
            onClick={onClose}
            title="Fechar"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Conteúdo com área de impressão */}
        <div className="modal-athlete-qr-body print-area-athlete-qr">
          <div className="athlete-qr-hero-card">
            <div className="athlete-qr-info-header">
              <span className="athlete-qr-event-tag">{event?.name || 'EVENTO'}</span>
              <span className={`athlete-qr-status-tag ${isEntregue ? 'status-entregue' : 'status-pendente'}`}>
                {isEntregue ? 'KIT ENTREGUE' : 'PENDENTE DE RETIRADA'}
              </span>
            </div>

            <div className="athlete-qr-number-display">
              <span className="athlete-qr-num-prefix">Nº</span>
              <span className="athlete-qr-num-val">{athleteNumero}</span>
            </div>

            <h3 className="athlete-qr-name-display">{athleteNome}</h3>

            <div className="athlete-qr-subdetails">
              {athlete.modalidade && <span>Modalidade: <strong>{athlete.modalidade}</strong></span>}
              {athlete.camiseta && <span>Camiseta: <strong>{athlete.camiseta}</strong></span>}
              {athlete.kit && <span>Kit: <strong>{athlete.kit}</strong></span>}
              {athlete.chip && <span>Chip: <strong>{athlete.chip}</strong></span>}
            </div>

            {/* Imagem do QR Code */}
            <div className="athlete-qr-code-wrapper">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code de Validação para Atleta #${athleteNumero}`}
                  className="athlete-qr-image"
                />
              ) : (
                <div className="athlete-qr-placeholder">Gerando QR Code...</div>
              )}
            </div>

            <p className="athlete-qr-scan-instruction">
              Aponte a câmera do celular para consultar a ficha e validar a retirada do kit.
            </p>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="modal-athlete-qr-actions no-print">
          <button
            type="button"
            className="btn-athlete-qr-action secondary"
            onClick={handleCopy}
            title="Copiar URL de Validação"
          >
            <CopyIcon />
            <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>

          <button
            type="button"
            className="btn-athlete-qr-action secondary"
            onClick={handleOpenValidation}
            title="Abrir página de validação pública"
          >
            <ExternalLinkIcon />
            <span>Abrir Validação</span>
          </button>

          <button
            type="button"
            className="btn-athlete-qr-action primary"
            onClick={handlePrint}
            title="Imprimir filipeta / etiqueta com QR Code"
          >
            <PrinterIcon />
            <span>Imprimir Etiqueta</span>
          </button>
        </div>
      </div>
    </div>
  )
}
