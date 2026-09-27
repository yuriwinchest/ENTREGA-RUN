/**
 * Utilitários para categorização, contagem e filtragem de eventos esportivos por status e busca.
 */

export function isEventActive(event) {
  if (!event) return false
  return event.status === 'EM OPERAÇÃO' || event.status === 'EM_OPERACAO' || event.active === true
}

export function isEventFinalizado(event) {
  if (!event) return false
  return event.status === 'FINALIZADO'
}

export function isEventPlanejado(event) {
  if (!event) return false
  return !isEventActive(event) && !isEventFinalizado(event)
}

export function getEventStatusCounts(events = []) {
  return {
    ativos: events.filter(isEventActive).length,
    planejados: events.filter(isEventPlanejado).length,
    finalizados: events.filter(isEventFinalizado).length,
    todos: events.length,
  }
}

export function filterEvents(events = [], { statusFilter = 'ATIVOS', search = '' } = {}) {
  const term = (search || '').trim().toLowerCase()

  return events.filter((event) => {
    const matchesSearch =
      !term ||
      (event.name || '').toLowerCase().includes(term) ||
      (event.location || '').toLowerCase().includes(term) ||
      (event.date || '').toLowerCase().includes(term)

    let matchesStatus = true
    if (statusFilter === 'ATIVOS') {
      matchesStatus = isEventActive(event)
    } else if (statusFilter === 'PLANEJADO') {
      matchesStatus = isEventPlanejado(event)
    } else if (statusFilter === 'FINALIZADO') {
      matchesStatus = isEventFinalizado(event)
    } else if (statusFilter === 'TODOS') {
      matchesStatus = true
    }

    return matchesSearch && matchesStatus
  })
}
