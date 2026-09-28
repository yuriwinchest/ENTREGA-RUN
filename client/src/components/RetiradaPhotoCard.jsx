import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { compressPhotoFile, fetchRetiradaPhoto, uploadRetiradaPhoto } from '../utils/retiradaPhotoApi.js'
import './RetiradaPhotoCard.css'

function formatDateTime(ms) {
  return ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
}

function formatDate(ms) {
  return ms ? new Date(ms).toLocaleDateString('pt-BR') : ''
}

export default function RetiradaPhotoCard({ eventId, athleteId, athleteName }) {
  const [photo, setPhoto] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    let alive = true
    let objectUrl = null
    setStatus('loading')
    setPhoto(null)
    fetchRetiradaPhoto(eventId, athleteId)
      .then((result) => {
        if (!alive) {
          if (result?.url) URL.revokeObjectURL(result.url)
          return
        }
        objectUrl = result?.url || null
        setPhoto(result)
        setStatus('idle')
      })
      .catch(() => {
        if (!alive) return
        setStatus('idle')
        setMessage('Não foi possível carregar a foto agora.')
      })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [eventId, athleteId])

  useEffect(() => () => { if (photo?.url) URL.revokeObjectURL(photo.url) }, [photo])

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setStatus('saving')
    setMessage('')
    try {
      const image = await compressPhotoFile(file)
      await uploadRetiradaPhoto(eventId, athleteId, image)
      const fresh = await fetchRetiradaPhoto(eventId, athleteId)
      setPhoto(fresh)
      setMessage('Foto salva.')
    } catch (err) {
      setMessage(err?.message || 'Não foi possível salvar a foto.')
    } finally {
      setStatus('idle')
    }
  }

  const busy = status !== 'idle'

  return (
    <section className="retirada-photo-card" aria-labelledby="retirada-photo-title">
      <div className="retirada-photo-head">
        <h4 id="retirada-photo-title">📷 FOTO DA RETIRADA</h4>
        <span className="retirada-photo-optional">opcional</span>
      </div>

      <div className="retirada-photo-body">
        {photo?.url ? (
          <button type="button" className="retirada-photo-thumb" onClick={() => setExpanded(true)} aria-label="Ampliar foto da retirada">
            <img src={photo.url} alt={`Foto da retirada do kit de ${athleteName || 'atleta'}`} />
          </button>
        ) : (
          <div className="retirada-photo-empty" aria-live="polite">
            {status === 'loading' ? 'Carregando…' : 'Sem foto'}
          </div>
        )}

        <div className="retirada-photo-info">
          {photo ? (
            <p>
              Tirada {photo.takenBy ? `por ${photo.takenBy} ` : ''}em {formatDateTime(photo.takenAt)}.
              <br />
              Apagada automaticamente em {formatDate(photo.expiresAt)}.
            </p>
          ) : (
            <p>Fotografe quem está retirando o kit para comprovar a entrega.</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            hidden
          />
          <button type="button" className="retirada-photo-action" onClick={() => inputRef.current?.click()} disabled={busy}>
            {status === 'saving' ? 'Salvando foto…' : photo ? 'REFAZER FOTO' : 'TIRAR FOTO'}
          </button>
          {message && <p className="retirada-photo-message" role="status">{message}</p>}
        </div>
      </div>

      <p className="retirada-photo-lgpd">
        Usada só para comprovar a retirada do kit. Apagada automaticamente 7 dias após a corrida.
      </p>

      {expanded && photo?.url && createPortal(
        <div className="retirada-photo-lightbox" role="dialog" aria-modal="true" aria-label="Foto da retirada" onClick={() => setExpanded(false)}>
          <img src={photo.url} alt={`Foto da retirada do kit de ${athleteName || 'atleta'}`} />
          <button type="button" aria-label="Fechar foto" onClick={() => setExpanded(false)}>×</button>
        </div>,
        document.body
      )}
    </section>
  )
}
