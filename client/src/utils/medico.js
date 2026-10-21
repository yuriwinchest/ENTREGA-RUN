// Regras de apresentação da emergência médica, compartilhadas pela importação
// da planilha, pela página pública e pelo painel do médico.

export const GRAVIDADES = [
  { value: 'LEVE', label: 'Leve', hint: 'Consciente, sem risco aparente' },
  { value: 'MODERADA', label: 'Moderada', hint: 'Precisa de avaliação logo' },
  { value: 'GRAVE', label: 'Grave', hint: 'Dor intensa, confusão, sangramento' },
  { value: 'CRITICA', label: 'Crítica', hint: 'Inconsciente ou sem respirar bem' },
]

export const STATUS_OCORRENCIA = [
  { value: 'ABERTA', label: 'Aberta' },
  { value: 'EM_ATENDIMENTO', label: 'Em atendimento' },
  { value: 'ENCERRADA', label: 'Encerrada' },
]

const GRAVIDADE_PESO = { CRITICA: 4, GRAVE: 3, MODERADA: 2, LEVE: 1 }
const STATUS_PESO = { ABERTA: 0, EM_ATENDIMENTO: 1, ENCERRADA: 2 }

export function gravidadeLabel(value) {
  return GRAVIDADES.find((item) => item.value === value)?.label || value || ''
}

export function statusLabel(value) {
  return STATUS_OCORRENCIA.find((item) => item.value === value)?.label || value || ''
}

// ------------------------------------------------------------------
// Colunas de saúde na importação da planilha
// ------------------------------------------------------------------
function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Mesma regra do servidor (server/medico.js): coluna que identifica ou localiza a
// pessoa nunca vai para a página pública. O servidor reaplica; aqui é só a tela.
const IDENTIFYING_COLUMN = /\b(cpf|rg|documento|doc|passaporte|telefone|tel|fone|celular|cel|whats\w*|contato|email|e mail|endereco|rua|logradouro|bairro|cep|complemento|numero da casa|nascimento|nasc|data de nasc\w*|dt nasc)\b/

export function isIdentifyingColumn(text) {
  return IDENTIFYING_COLUMN.test(normalize(text))
}

// Coluna que já é campo principal (nome, CPF, contato...) não vira coluna de saúde:
// o dado de saúde fica nos campos personalizados do atleta.
export function canBeHealthColumn(mapping) {
  return !mapping || mapping === 'ignore' || String(mapping).startsWith('custom:')
}

// Reimportação: marca de novo as colunas que o evento já tinha como saúde.
export function prefillHealthSelection(headers, existingHealthFields) {
  const byKey = new Map((existingHealthFields || []).map((field) => [normalize(field.key), field]))
  const selection = {}
  headers.forEach((header, idx) => {
    const previous = byKey.get(normalize(header))
    if (previous) selection[idx] = { saude: true, publico: previous.publico === true }
  })
  return selection
}

export function buildHealthFields(headers, columnMapping, selection) {
  const fields = []
  headers.forEach((header, idx) => {
    const mapping = columnMapping[idx]
    if (!selection[idx]?.saude || !String(mapping || '').startsWith('custom:')) return
    const key = mapping.slice('custom:'.length).trim()
    if (!key) return
    const label = String(header || key).trim()
    fields.push({ key, label, publico: Boolean(selection[idx].publico) && !isIdentifyingColumn(key) && !isIdentifyingColumn(label) })
  })
  return fields
}

// ------------------------------------------------------------------
// Fila do médico
// ------------------------------------------------------------------
// Abertas primeiro, depois em atendimento; dentro de cada grupo a mais grave vem
// antes e, no empate, a mais antiga (esperando há mais tempo).
export function sortQueue(ocorrencias) {
  return [...(ocorrencias || [])].sort((a, b) => {
    const status = (STATUS_PESO[a.status] ?? 9) - (STATUS_PESO[b.status] ?? 9)
    if (status !== 0) return status
    if (a.status === 'ENCERRADA') return String(b.criadaEm).localeCompare(String(a.criadaEm))
    const gravity = (GRAVIDADE_PESO[b.gravidade] || 0) - (GRAVIDADE_PESO[a.gravidade] || 0)
    if (gravity !== 0) return gravity
    return String(a.criadaEm).localeCompare(String(b.criadaEm))
  })
}

export function countByStatus(ocorrencias) {
  const counts = { ABERTA: 0, EM_ATENDIMENTO: 0, ENCERRADA: 0 }
  for (const item of ocorrencias || []) {
    if (item.status in counts) counts[item.status] += 1
  }
  return counts
}

// Ids presentes agora que não estavam na leitura anterior: dispara o alerta sonoro.
export function newArrivals(previousIds, ocorrencias) {
  if (!previousIds) return []
  return (ocorrencias || []).filter((item) => !previousIds.has(item.id)).map((item) => item.id)
}

export function elapsedLabel(iso, now = Date.now()) {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return ''
  const minutes = Math.max(0, Math.floor((now - time) / 60000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `há ${hours} h ${rest} min` : `há ${hours} h`
}

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13)
  const local = digits.length > 11 ? digits.slice(digits.length - 11) : digits
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return digits
}

// Máscara enquanto digita: (51) 99999-0000.
export function maskPhoneInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function mapsUrl(geo) {
  if (!geo || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lng)) return ''
  return `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`
}

export function emergencyUrl(origin, eventId) {
  return `${String(origin || '').replace(/\/+$/, '')}/emergencia/${encodeURIComponent(eventId || '')}`
}
