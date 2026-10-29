import { useCallback, useEffect, useState } from 'react'
import { openEspelhoStation } from '../utils/espelhoStation.js'
import { publishEspelhoState } from '../utils/espelhoSync.js'

export default function useEspelhoStation(eventId, userId) {
  const context = `${eventId || ''}:${userId || ''}`
  const [station, setStation] = useState({ context: '', canalId: '', error: '' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  useEffect(() => {
    if (!eventId || !userId) return undefined
    let active = true
    let channel = ''
    const controller = new AbortController()
    setStation({ context, canalId: '', error: '' })
    openEspelhoStation(eventId, { signal: controller.signal }).then((canalId) => {
      if (!active) return
      channel = canalId
      // Reabrir a operação começa disponível; não reutiliza a ficha do cache.
      void publishEspelhoState(eventId, { status: 'LIVRE' }, canalId)
      setStation({ context, canalId, error: '' })
    }).catch((error) => {
      if (active) setStation({ context, canalId: '', error: error.message })
    })
    return () => {
      active = false
      controller.abort()
      if (channel) void publishEspelhoState(eventId, { status: 'LIVRE' }, channel)
    }
  }, [context, eventId, userId, attempt])
  return { ...(station.context === context ? station : { canalId: '', error: '' }), retry }
}
