import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseAthleteBirth,
  getAthleteGender,
  getAgeHighlights,
} from './ageHighlights.js'

test('parseAthleteBirth calcula idade correta e formata data', () => {
  const ref = new Date(2026, 8, 27) // 27/09/2026
  const athlete1 = { nascimento: '27/09/2006' }
  const res1 = parseAthleteBirth(athlete1, ref)
  assert.equal(res1.age, 20)
  assert.equal(res1.birthDateFormatted, '27/09/2006')

  const athlete2 = { nascimento: '28/09/2006' }
  const res2 = parseAthleteBirth(athlete2, ref)
  assert.equal(res2.age, 19) // ainda não fez 20 anos

  const athleteIso = { nascimento: '1980-05-15' }
  const resIso = parseAthleteBirth(athleteIso, ref)
  assert.equal(resIso.age, 46)
  assert.equal(resIso.birthDateFormatted, '15/05/1980')
})

test('getAthleteGender identifica masculino e feminino', () => {
  assert.equal(getAthleteGender({ sexo: 'M' }), 'M')
  assert.equal(getAthleteGender({ sexo: 'Masculino' }), 'M')
  assert.equal(getAthleteGender({ gender: 'Feminino' }), 'F')
  assert.equal(getAthleteGender({ sexo: 'F' }), 'F')
  assert.equal(getAthleteGender({}), 'OUTRO')
})

test('getAgeHighlights retorna 4 mais novos e 4 mais velhos por gênero com ordenação correta', () => {
  const ref = new Date(2026, 8, 27)
  const mockAthletes = [
    // Masculino
    { nome: 'Carlos (15)', sexo: 'M', nascimento: '10/01/2011' }, // 15
    { nome: 'Bruno (16)', sexo: 'M', nascimento: '15/03/2010' },  // 16
    { nome: 'Daniel (18)', sexo: 'M', nascimento: '20/05/2008' }, // 18
    { nome: 'Eduardo (22)', sexo: 'M', nascimento: '01/01/2004' }, // 22
    { nome: 'Fabio (35)', sexo: 'M', nascimento: '12/12/1990' },   // 35
    { nome: 'Gilberto (60)', sexo: 'M', nascimento: '10/02/1966' }, // 60
    { nome: 'Helio (70)', sexo: 'M', nascimento: '05/05/1956' },   // 70
    { nome: 'Icaro (75)', sexo: 'M', nascimento: '01/01/1951' },   // 75
    { nome: 'Jose (82)', sexo: 'M', nascimento: '10/10/1943' },    // 82

    // Feminino
    { nome: 'Alice (14)', sexo: 'F', nascimento: '01/02/2012' },  // 14
    { nome: 'Beatriz (15)', sexo: 'F', nascimento: '10/08/2011' }, // 15
    { nome: 'Carla (17)', sexo: 'F', nascimento: '20/09/2009' },   // 17
    { nome: 'Debora (20)', sexo: 'F', nascimento: '05/05/2006' },  // 20
    { nome: 'Elena (40)', sexo: 'F', nascimento: '01/01/1986' },   // 40
    { nome: 'Fernanda (65)', sexo: 'F', nascimento: '02/02/1961' }, // 65
    { nome: 'Gloria (68)', sexo: 'F', nascimento: '03/03/1958' },   // 68
    { nome: 'Helena (72)', sexo: 'F', nascimento: '04/04/1954' },  // 72
    { nome: 'Irene (79)', sexo: 'F', nascimento: '05/05/1947' },   // 79
  ]

  const highlights = getAgeHighlights(mockAthletes, 4, ref)

  // 4 Mais Novos Masculino: Carlos (15), Bruno (16), Daniel (18), Eduardo (22)
  assert.equal(highlights.novosMasc.length, 4)
  assert.equal(highlights.novosMasc[0].nome, 'Carlos (15)')
  assert.equal(highlights.novosMasc[1].nome, 'Bruno (16)')
  assert.equal(highlights.novosMasc[2].nome, 'Daniel (18)')
  assert.equal(highlights.novosMasc[3].nome, 'Eduardo (22)')

  // 4 Mais Velhos Masculino: Jose (82), Icaro (75), Helio (70), Gilberto (60)
  assert.equal(highlights.velhosMasc.length, 4)
  assert.equal(highlights.velhosMasc[0].nome, 'Jose (82)')
  assert.equal(highlights.velhosMasc[1].nome, 'Icaro (75)')
  assert.equal(highlights.velhosMasc[2].nome, 'Helio (70)')
  assert.equal(highlights.velhosMasc[3].nome, 'Gilberto (60)')

  // 4 Mais Novas Feminino: Alice (14), Beatriz (15), Carla (17), Debora (20)
  assert.equal(highlights.novosFem.length, 4)
  assert.equal(highlights.novosFem[0].nome, 'Alice (14)')
  assert.equal(highlights.novosFem[1].nome, 'Beatriz (15)')
  assert.equal(highlights.novosFem[2].nome, 'Carla (17)')
  assert.equal(highlights.novosFem[3].nome, 'Debora (20)')

  // 4 Mais Velhas Feminino: Irene (79), Helena (72), Gloria (68), Fernanda (65)
  assert.equal(highlights.velhosFem.length, 4)
  assert.equal(highlights.velhosFem[0].nome, 'Irene (79)')
  assert.equal(highlights.velhosFem[1].nome, 'Helena (72)')
  assert.equal(highlights.velhosFem[2].nome, 'Gloria (68)')
  assert.equal(highlights.velhosFem[3].nome, 'Fernanda (65)')
})
