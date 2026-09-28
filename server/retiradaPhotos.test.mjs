import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  decodeJpegDataUrl,
  deletePhoto,
  parseRaceDate,
  photoExpiresAt,
  photoPaths,
  readPhoto,
  savePhoto,
  sweepExpiredPhotos,
} from './retiradaPhotos.js'

const DAY = 24 * 60 * 60 * 1000
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fotos-retirada-'))
}

test('aceita só JPEG real dentro do limite', () => {
  assert.deepEqual(decodeJpegDataUrl(dataUrl), jpeg)
  assert.throws(() => decodeJpegDataUrl('data:image/png;base64,iVBORw0KGgo='))
  assert.throws(() => decodeJpegDataUrl(`data:image/jpeg;base64,${Buffer.from('<svg>').toString('base64')}`))
  assert.throws(() => decodeJpegDataUrl(dataUrl, 4))
  assert.throws(() => decodeJpegDataUrl('nada'))
})

test('nome do arquivo não depende de caminho vindo do cliente', () => {
  const paths = photoPaths('/raiz', '../../etc', '../../passwd')
  assert.ok(paths.image.startsWith(path.join('/raiz', 'etc')))
  assert.match(path.basename(paths.image), /^[0-9a-f]{40}\.jpg$/)
  assert.throws(() => photoPaths('/raiz', '', 'a1'))
  assert.throws(() => photoPaths('/raiz', 'evt', ''))
})

test('prazo: fim do 7º dia após a corrida (BRT), aceitando os dois formatos de data', () => {
  const race = parseRaceDate({ dateInput: '2026-10-04' })
  assert.equal(race, parseRaceDate({ date: '04/10/2026' }))
  assert.equal(new Date(race).toISOString(), '2026-10-04T03:00:00.000Z')
  assert.equal(new Date(photoExpiresAt({ dateInput: '2026-10-04' }, 0)).toISOString(), '2026-10-12T03:00:00.000Z')
  assert.equal(photoExpiresAt({}, 1000), 1000 + 7 * DAY)
})

test('salva, lê, apaga e varre fotos vencidas', () => {
  const root = tempRoot()
  const event = { id: 'evt-1', dateInput: '2026-10-04' }
  const takenAt = Date.UTC(2026, 9, 1)
  const meta = savePhoto(root, { event, athleteId: 'a1', buffer: jpeg, takenBy: 'Operador', now: takenAt })
  assert.equal(meta.takenBy, 'Operador')
  assert.deepEqual(readPhoto(root, 'evt-1', 'a1').buffer, jpeg)

  savePhoto(root, { event, athleteId: 'a2', buffer: jpeg, now: takenAt })
  assert.equal(sweepExpiredPhotos(root, [event], Date.UTC(2026, 9, 11)), 0)
  assert.equal(sweepExpiredPhotos(root, [event], Date.UTC(2026, 9, 12, 3)), 2)
  assert.equal(readPhoto(root, 'evt-1', 'a1'), null)
  assert.equal(fs.existsSync(path.join(root, 'evt-1')), false)

  savePhoto(root, { event, athleteId: 'a3', buffer: jpeg, now: takenAt })
  assert.equal(deletePhoto(root, 'evt-1', 'a3'), true)
  assert.equal(deletePhoto(root, 'evt-1', 'a3'), false)
  fs.rmSync(root, { recursive: true, force: true })
})

test('evento excluído leva as fotos junto na varredura', () => {
  const root = tempRoot()
  savePhoto(root, { event: { id: 'evt-x', dateInput: '2030-01-01' }, athleteId: 'a1', buffer: jpeg })
  assert.equal(sweepExpiredPhotos(root, []), 1)
  fs.rmSync(root, { recursive: true, force: true })
})
