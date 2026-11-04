export const REGISTRATION_OPTION_LIMITS = Object.freeze({
  equipe: 128, modalidade: 64, categoria: 64, kit: 64, camiseta: 32, nacionalidade: 64,
})

export function optionIdentity(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR')
}

export function mergeRegistrationOptions(...groups) {
  const seen = new Set()
  return groups.flat().filter((value) => {
    if (typeof value !== 'string') return false
    const key = optionIdentity(value)
    if (!key || key === '—' || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function optionValueLimit(field) {
  return Object.hasOwn(REGISTRATION_OPTION_LIMITS, field) ? REGISTRATION_OPTION_LIMITS[field] : 128
}
