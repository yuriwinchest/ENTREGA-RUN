import { useCallback, useEffect, useState } from 'react'
import { fetchRetiradaPhoto, uploadRetiradaPhoto } from '../utils/retiradaPhotoApi.js'

// Estado único da foto de retirada da ficha aberta: a câmera (lá embaixo, no
// "Retirado por") salva e a miniatura (no topo, junto de "Entregue em") mostra.
export default function useRetiradaPhoto(eventId, athleteId) {
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!eventId || !athleteId) {
      setPhoto(null)
      return undefined
    }
    let alive = true
    let url = null
    setLoading(true)
    fetchRetiradaPhoto(eventId, athleteId)
      .then((result) => {
        if (!alive) {
          if (result?.url) URL.revokeObjectURL(result.url)
          return
        }
        url = result?.url || null
        setPhoto(result)
      })
      .catch(() => { if (alive) setPhoto(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [eventId, athleteId, reloadKey])

  const save = useCallback(async (image) => {
    await uploadRetiradaPhoto(eventId, athleteId, image)
    setReloadKey((key) => key + 1)
  }, [eventId, athleteId])

  const clear = useCallback(() => setPhoto(null), [])

  return { photo, loading, save, clear, canUse: Boolean(eventId && athleteId) }
}
