const EDITABLE_DETAIL_FIELDS = [
  'numero',
  'nome',
  'doc',
  'nascimento',
  'sexo',
  'modalidade',
  'categoria',
  'equipe',
  'nacionalidade',
  'kit',
  'camiseta',
  'chip',
  'morador',
  'contato',
  'entreguePara',
]

function text(value) {
  return value == null ? '' : String(value)
}

function cloneCustomFields(customFields) {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) {
    return {}
  }
  return { ...customFields }
}

export function buildAthleteDetailDraft(athlete = {}) {
  const status = athlete.status === 'ENTREGUE' ? 'ENTREGUE' : 'PENDENTE'

  return {
    ...athlete,
    id: athlete.id ?? athlete.numero ?? '',
    numero: text(athlete.numero ?? athlete.id),
    nome: text(athlete.nome),
    doc: text(athlete.doc),
    nascimento: text(athlete.nascimento),
    sexo: text(athlete.sexo),
    modalidade: text(athlete.modalidade),
    categoria: text(athlete.categoria),
    equipe: text(athlete.equipe),
    nacionalidade: text(athlete.nacionalidade),
    kit: text(athlete.kit),
    camiseta: text(athlete.camiseta),
    chip: text(athlete.chip),
    morador: text(athlete.morador),
    contato: text(athlete.contato),
    entreguePara: text(athlete.entreguePara ?? athlete.nome),
    entregueEm: text(athlete.entregueEm),
    entreguePor: text(athlete.entreguePor),
    status,
    customFields: cloneCustomFields(athlete.customFields),
  }
}

export function normalizeAthleteDetail(original = {}, draft = {}) {
  const nome = text(draft.nome).trim().toUpperCase()
  const numero = text(draft.numero).trim()
  const originalStatus = original.status === 'ENTREGUE' ? 'ENTREGUE' : 'PENDENTE'

  return {
    ...original,
    ...draft,
    id: original.id ?? draft.id ?? numero,
    numero,
    nome,
    doc: text(draft.doc).trim(),
    chip: text(draft.chip).trim(),
    contato: text(draft.contato).trim(),
    entreguePara: text(draft.entreguePara || nome).trim(),
    entregueEm: text(original.entregueEm),
    entreguePor: text(original.entreguePor),
    status: originalStatus,
    customFields: cloneCustomFields(draft.customFields),
  }
}

function editableSnapshot(value = {}) {
  return {
    fields: EDITABLE_DETAIL_FIELDS.map((field) => text(value[field])),
    customFields: Object.entries(cloneCustomFields(value.customFields))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, fieldValue]) => [key, text(fieldValue)]),
  }
}

export function hasAthleteDetailChanges(initialDraft, currentDraft) {
  if (!initialDraft || !currentDraft) return false
  return JSON.stringify(editableSnapshot(initialDraft)) !== JSON.stringify(editableSnapshot(currentDraft))
}

export function matchesAthleteReference(record, reference) {
  if (!record || !reference) return false

  if (reference.id != null && record.id != null && String(record.id) === String(reference.id)) {
    return true
  }

  return (
    reference.numero != null &&
    record.numero != null &&
    String(record.numero) === String(reference.numero)
  )
}
