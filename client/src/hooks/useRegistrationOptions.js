import { useCallback, useEffect, useRef, useState } from 'react'
import { createRegistrationOption, fetchRegistrationOptions } from '../utils/registrationOptionsApi.js'
import { mergeRegistrationOptions } from '../utils/registrationOptions.js'

export default function useRegistrationOptions(eventId, enabled = true) {
  const [catalog, setCatalog] = useState({ eventId: '', options: {}, customFields: [] })
  const [error, setError] = useState('')
  const [pendingCounts, setPendingCounts] = useState(() => new Map())
  const pendingRef = useRef(new Map())
  const mounted = useRef(true)
  const eventRef = useRef(eventId)
  const requestVersion = useRef(0)
  eventRef.current = eventId

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const refresh = useCallback(async (signal) => {
    if (!eventId || !enabled) return
    const version = ++requestVersion.current
    try {
      const data = await fetchRegistrationOptions(eventId, signal)
      if (!mounted.current || eventRef.current !== eventId || signal?.aborted || version !== requestVersion.current) return
      setCatalog({ eventId, options: data.options || {}, customFields: data.customFields || [] })
      setError('')
    } catch (err) {
      if (mounted.current && eventRef.current === eventId && !signal?.aborted && version === requestVersion.current) setError(err.message)
    }
  }, [eventId, enabled])

  useEffect(() => {
    const controller = new AbortController()
    refresh(controller.signal)
    const onFocus = () => refresh(controller.signal)
    window.addEventListener('focus', onFocus)
    return () => { controller.abort(); window.removeEventListener('focus', onFocus) }
  }, [refresh])

  const create = useCallback(async (field, value) => {
    if (!eventId || !enabled) throw new Error('Abra um evento para cadastrar opções.')
    pendingRef.current.set(eventId, (pendingRef.current.get(eventId) || 0) + 1)
    setPendingCounts(new Map(pendingRef.current))
    try {
      const data = await createRegistrationOption(eventId, field, value)
      if (eventRef.current !== eventId) throw new Error('O evento mudou. Abra o cadastro novamente.')
      if (!mounted.current) return data.value
      ++requestVersion.current
      setCatalog((current) => {
        const options = current.eventId === eventId ? current.options : {}
        const merged = { ...options }
        for (const [key, values] of Object.entries(data.options || {})) merged[key] = mergeRegistrationOptions(options[key] || [], values)
        merged[field] = mergeRegistrationOptions(merged[field] || [], [data.value])
        return { eventId, options: merged, customFields: current.eventId === eventId ? current.customFields : [] }
      })
      setError('')
      return data.value
    } finally {
      const remaining = (pendingRef.current.get(eventId) || 1) - 1
      if (remaining > 0) pendingRef.current.set(eventId, remaining)
      else pendingRef.current.delete(eventId)
      if (mounted.current) setPendingCounts(new Map(pendingRef.current))
    }
  }, [eventId, enabled])

  const isPending = useCallback(() => (pendingRef.current.get(eventId) || 0) > 0, [eventId])
  const pendingCount = pendingCounts.get(eventId) || 0

  return {
    options: catalog.eventId === eventId ? catalog.options : {},
    customFields: catalog.eventId === eventId ? catalog.customFields : [],
    pending: pendingCount > 0, pendingCount, isPending,
    error, refresh, create,
  }
}
