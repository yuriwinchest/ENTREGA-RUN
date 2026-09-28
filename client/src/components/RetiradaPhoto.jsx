import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { compressPhotoFile } from '../utils/retiradaPhotoApi.js'
import './RetiradaPhoto.css'

function formatDateTime(ms) {
  return ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
}

function CameraIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function useBodyLock(active) {
  useEffect(() => {
    if (!active) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [active])
}

// Ícone ao lado de "Entregue para / Retirado por": abre a câmera, mostra a prévia
// e só grava quando o operador escolhe SALVAR.
export function RetiradaCameraButton({ photoState }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useBodyLock(Boolean(preview))

  if (!photoState.canUse) return null

  function openCamera() {
    setError('')
    inputRef.current?.click()
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setPreview(await compressPhotoFile(file))
    } catch {
      setError('Não foi possível ler a foto. Tente de novo.')
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await photoState.save(preview)
      setPreview(null)
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar a foto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`retirada-camera-btn ${photoState.photo ? 'has-photo' : ''}`}
        onClick={openCamera}
        aria-label={photoState.photo ? 'Refazer foto de quem retirou o kit' : 'Tirar foto de quem retirou o kit'}
        title={photoState.photo ? 'Refazer foto da retirada' : 'Tirar foto da retirada'}
      >
        <CameraIcon />
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />
      {error && !preview && <span className="retirada-camera-error" role="alert">{error}</span>}

      {preview && createPortal(
        <div className="retirada-preview-backdrop" role="dialog" aria-modal="true" aria-labelledby="retirada-preview-title">
          <section className="retirada-preview-card">
            <h2 id="retirada-preview-title">Foto da retirada</h2>
            <img src={preview} alt="Prévia da foto de quem retirou o kit" />
            {error && <p className="retirada-preview-error" role="alert">{error}</p>}
            <div className="retirada-preview-actions">
              <button type="button" className="retirada-preview-redo" onClick={openCamera} disabled={saving}>REFAZER</button>
              <button type="button" className="retirada-preview-save" onClick={handleSave} disabled={saving}>
                {saving ? 'SALVANDO…' : 'SALVAR'}
              </button>
            </div>
            <button type="button" className="retirada-preview-cancel" onClick={() => setPreview(null)} disabled={saving}>Cancelar</button>
            <p className="retirada-preview-lgpd">Usada só para comprovar a retirada do kit. Apagada automaticamente 7 dias após a corrida.</p>
          </section>
        </div>,
        document.body
      )}
    </>
  )
}

// Miniatura no topo da ficha, junto de "Entregue em / Entregue por".
export function RetiradaPhotoThumb({ photoState, athleteName }) {
  const [expanded, setExpanded] = useState(false)
  useBodyLock(expanded)
  const { photo } = photoState
  if (!photo?.url) return null
  const alt = `Foto da retirada do kit de ${athleteName || 'atleta'}`

  return (
    <>
      <button type="button" className="retirada-thumb" onClick={() => setExpanded(true)} aria-label="Ampliar foto da retirada">
        <img src={photo.url} alt={alt} />
      </button>
      {expanded && createPortal(
        <div className="retirada-lightbox" role="dialog" aria-modal="true" aria-label="Foto da retirada" onClick={() => setExpanded(false)}>
          <figure>
            <img src={photo.url} alt={alt} />
            <figcaption>
              {photo.takenBy ? `Tirada por ${photo.takenBy} · ` : ''}{formatDateTime(photo.takenAt)}
              {photo.expiresAt ? ` · apagada em ${new Date(photo.expiresAt).toLocaleDateString('pt-BR')}` : ''}
            </figcaption>
          </figure>
          <button type="button" aria-label="Fechar foto" onClick={() => setExpanded(false)}>×</button>
        </div>,
        document.body
      )}
    </>
  )
}
