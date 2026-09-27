/**
 * Utilitários para extração, cálculo e ordenação de atletas mais novos e mais velhos por gênero.
 */

export function parseAthleteBirth(athlete, reference = new Date()) {
  const raw = String(
    athlete?.nascimento ||
    athlete?.dataNascimento ||
    athlete?.data_nascimento ||
    athlete?.customFields?.nascimento ||
    athlete?.customFields?.dataNascimento ||
    ''
  ).trim()

  let birth = null
  let formatted = ''

  if (raw) {
    const matchSlash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    const matchDash = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (matchSlash) {
      const day = Number(matchSlash[1])
      const month = Number(matchSlash[2])
      const year = Number(matchSlash[3])
      const d = new Date(year, month - 1, day)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        birth = d
        formatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
      }
    } else if (matchDash) {
      const year = Number(matchDash[1])
      const month = Number(matchDash[2])
      const day = Number(matchDash[3])
      const d = new Date(year, month - 1, day)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        birth = d
        formatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
      }
    }
  }

  let age = null
  if (birth) {
    const refYear = reference.getFullYear()
    const refMonth = reference.getMonth()
    const refDay = reference.getDate()
    const bYear = birth.getFullYear()
    const bMonth = birth.getMonth()
    const bDay = birth.getDate()

    let calculatedAge = refYear - bYear
    if (refMonth < bMonth || (refMonth === bMonth && refDay < bDay)) {
      calculatedAge -= 1
    }
    if (calculatedAge >= 0 && calculatedAge <= 120) {
      age = calculatedAge
    }
  } else if (typeof athlete?.age === 'number' && athlete.age >= 0 && athlete.age <= 120) {
    age = athlete.age
  } else if (typeof athlete?.idade === 'number' && athlete.idade >= 0 && athlete.idade <= 120) {
    age = athlete.idade
  } else if (typeof athlete?.idade === 'string' && athlete.idade.trim() && !Number.isNaN(Number(athlete.idade.trim()))) {
    const parsed = Number(athlete.idade.trim())
    if (parsed >= 0 && parsed <= 120) age = parsed
  }

  return {
    age,
    birthTime: birth ? birth.getTime() : null,
    birthDateFormatted: formatted,
  }
}

export function getAthleteGender(athlete) {
  const g = String(athlete?.sexo || athlete?.gender || athlete?.customFields?.sexo || '').trim().toUpperCase()
  if (g.startsWith('M')) return 'M'
  if (g.startsWith('F')) return 'F'
  return 'OUTRO'
}

/**
 * Retorna os 4 atletas mais novos e 4 mais velhos divididos por Masculino e Feminino.
 */
export function getAgeHighlights(athletes = [], limit = 4, reference = new Date()) {
  const enriched = (athletes || [])
    .map((athlete) => {
      const { age, birthTime, birthDateFormatted } = parseAthleteBirth(athlete, reference)
      const gender = getAthleteGender(athlete)
      return {
        ...athlete,
        age,
        birthTime,
        birthDateFormatted,
        gender,
      }
    })
    .filter((a) => a.age !== null)

  const masc = enriched.filter((a) => a.gender === 'M')
  const fem = enriched.filter((a) => a.gender === 'F')

  // Mais Novos: menor idade primeiro; empate desempata por quem nasceu mais tarde (maior birthTime)
  const sortYoungest = (a, b) => {
    if (a.age !== b.age) return a.age - b.age
    if (a.birthTime && b.birthTime && a.birthTime !== b.birthTime) {
      return b.birthTime - a.birthTime
    }
    return String(a.nome || a.name || '').localeCompare(String(b.nome || b.name || ''), 'pt-BR')
  }

  // Mais Velhos: maior idade primeiro; empate desempata por quem nasceu mais cedo (menor birthTime)
  const sortOldest = (a, b) => {
    if (a.age !== b.age) return b.age - a.age
    if (a.birthTime && b.birthTime && a.birthTime !== b.birthTime) {
      return a.birthTime - b.birthTime
    }
    return String(a.nome || a.name || '').localeCompare(String(b.nome || b.name || ''), 'pt-BR')
  }

  return {
    novosMasc: [...masc].sort(sortYoungest).slice(0, limit),
    novosFem: [...fem].sort(sortYoungest).slice(0, limit),
    velhosMasc: [...masc].sort(sortOldest).slice(0, limit),
    velhosFem: [...fem].sort(sortOldest).slice(0, limit),
  }
}
