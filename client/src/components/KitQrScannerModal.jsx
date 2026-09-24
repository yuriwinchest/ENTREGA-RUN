import { useEffect, useRef, useState } from 'react'
import './KitQrScannerModal.css'

export default function KitQrScannerModal({ isOpen, onClose, onRead, athlete, kit, feedback, onConfirm }) {
  const videoRef = useRef(null)
  const deliveredRef = useRef(false)
  const onReadRef = useRef(onRead)
  const kitRef = useRef(kit)
  const [manualCode, setManualCode] = useState('')
  const [cameraMessage, setCameraMessage] = useState('Iniciando câmera…')

  useEffect(() => { onReadRef.current = onRead }, [onRead])
  useEffect(() => { kitRef.current = kit }, [kit])

  useEffect(() => {
    if (!isOpen || kit) return undefined

    let active = true
    let stream
    let frameId
    const videoElement = videoRef.current
    deliveredRef.current = false

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMessage('Este navegador não permite acesso à câmera. Digite o código impresso no kit.')
        return
      }
      if (typeof window.BarcodeDetector !== 'function') {
        setCameraMessage('A leitura automática não está disponível neste navegador. Digite o código impresso no kit.')
        return
      }

      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        })
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        if (!active) return
        setCameraMessage('Aponte a câmera para o QR Code impresso no kit.')

        async function scan() {
          if (!active || deliveredRef.current) return
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              const results = await detector.detect(video)
              const value = results.find((result) => result.rawValue?.trim())?.rawValue.trim()
              if (value && active && !deliveredRef.current) {
                deliveredRef.current = true
                onReadRef.current(value)
                window.setTimeout(() => {
                  if (!active || kitRef.current) return
                  deliveredRef.current = false
                  frameId = requestAnimationFrame(scan)
                }, 900)
                return
              }
            } catch {
              // Alguns frames podem falhar enquanto a câmera ajusta o foco.
            }
          }
          if (active) frameId = requestAnimationFrame(scan)
        }
        frameId = requestAnimationFrame(scan)
      } catch (error) {
        if (!active) return
        const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
        setCameraMessage(denied
          ? 'A câmera foi bloqueada. Autorize o acesso nas configurações do navegador ou digite o código do kit.'
          : 'Não foi possível iniciar a câmera. Digite o código impresso no kit.')
      }
    }

    startCamera()

    return () => {
      active = false
      cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((track) => track.stop())
      if (videoElement) videoElement.srcObject = null
    }
  }, [isOpen, kit])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function submitManual(event) {
    event.preventDefault()
    const value = manualCode.trim()
    if (!value || deliveredRef.current) return
    deliveredRef.current = true
    onReadRef.current(value)
    window.setTimeout(() => { if (!kitRef.current) deliveredRef.current = false }, 900)
  }

  return (
    <div className="kit-scanner-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="kit-scanner-card" role="dialog" aria-modal="true" aria-labelledby="kit-scanner-title">
        <header className="kit-scanner-header">
          <div>
            <span className="kit-scanner-eyebrow">ASSOCIAÇÃO DE KIT</span>
            <h2 id="kit-scanner-title">Fazer leitura</h2>
            {athlete?.nome && <p className="kit-scanner-athlete">Atleta: {athlete.nome}</p>}
          </div>
          <button type="button" className="kit-scanner-close" aria-label="Fechar leitor" onClick={onClose}>×</button>
        </header>
        <div className="kit-scanner-body">
          {kit ? (
            <div className="kit-scanner-result">
              <h3>Kit encontrado</h3>
              <dl>
                <div><dt>Código do kit</dt><dd>{kit.qrCode}</dd></div>
                <div><dt>Número de peito</dt><dd>{kit.numero}</dd></div>
                <div><dt>Chip</dt><dd>{kit.chip}</dd></div>
              </dl>
              <p>Confirme para associar este kit a {athlete?.nome || 'esta pessoa'}.</p>
              <button type="button" className="kit-scanner-confirm" onClick={onConfirm}>Confirmar associação</button>
            </div>
          ) : (
            <>
              <div className="kit-scanner-preview">
                <video ref={videoRef} autoPlay muted playsInline aria-label="Imagem da câmera para leitura do QR Code" />
                <span className="kit-scanner-target" aria-hidden="true" />
              </div>
              <p className="kit-scanner-message" role="status">{cameraMessage}</p>
              {feedback && <p className="kit-scanner-feedback" role="alert">{feedback}</p>}
              <form onSubmit={submitManual} className="kit-scanner-manual">
                <label htmlFor="kit-scanner-code">Ou digite o código do kit</label>
                <div className="kit-scanner-input-row">
                  <input id="kit-scanner-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} autoComplete="off" placeholder="Código impresso no kit" />
                  <button type="submit" disabled={!manualCode.trim()}>Consultar</button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
