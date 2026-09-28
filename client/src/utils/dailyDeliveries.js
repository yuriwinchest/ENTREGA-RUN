// Entregas por dia e meta diária sugerida. Datas no fuso de Brasília: o evento
// e o operador estão no Brasil, mesmo que o navegador esteja em outro fuso.
const TIME_ZONE = 'America/Sao_Paulo'
const DAY_MS = 24 * 60 * 60 * 1000

function isDelivered(athlete) {
  return String(athlete?.status || '').trim().toUpperCase() === 'ENTREGUE' || Boolean(athlete?.entregueEm)
}

// "28/09/2026, 14:08:47" (pt-BR, como o sistema grava) ou ISO → "2026-09-28".
export function deliveryDayKey(value) {
  const text = String(value || '').trim()
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(text)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return null
}

export function todayKey(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
}

export function raceDayKey(event) {
  return deliveryDayKey(event?.dateInput) || deliveryDayKey(event?.date)
}

function dayIndex(key) {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

export function formatDayLabel(key) {
  const [, m, d] = key.split('-')
  return `${d}/${m}`
}

export function buildDailyDeliveries(athletes) {
  const days = new Map()
  for (const athlete of athletes || []) {
    if (!isDelivered(athlete)) continue
    const key = deliveryDayKey(athlete.entregueEm)
    if (!key) continue
    const day = days.get(key) || { day: key, total: 0, operators: new Map() }
    day.total += 1
    // "Felipe Admin" e "FELIPE ADMIN" são a mesma pessoa em gravações diferentes.
    const operator = (String(athlete.entreguePor || '').trim() || 'Não informado').toLocaleUpperCase('pt-BR')
    day.operators.set(operator, (day.operators.get(operator) || 0) + 1)
    days.set(key, day)
  }
  return [...days.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((day) => ({
      day: day.day,
      label: formatDayLabel(day.day),
      total: day.total,
      operators: [...day.operators.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR')),
    }))
}

// Meta = pendentes ÷ dias de retirada que restam (de hoje até a véspera da
// corrida). No dia da corrida, sobra só hoje. Depois dela, não há meta.
export function suggestDailyTarget({ pending, raceKey, today }) {
  if (!raceKey || !today) return { status: 'sem-data' }
  const untilRace = dayIndex(raceKey) - dayIndex(today)
  if (untilRace < 0) return { status: 'encerrado' }
  const daysLeft = Math.max(1, untilRace)
  if (pending <= 0) return { status: 'concluido', daysLeft, target: 0 }
  return { status: 'ativo', daysLeft, target: Math.ceil(pending / daysLeft) }
}
