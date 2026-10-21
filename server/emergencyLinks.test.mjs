import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createEmergencyLinksStore } from './emergencyLinks.js'

test('vínculo persiste, controla revisão e não retoma endereço transferido ao restaurar', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-links-'))
  try {
    const store = createEmergencyLinksStore(dir)
    assert.equal(store.issue('old', 'admin').code, 'old')
    const events = [{ id: 'old', status: 'ARQUIVADO' }, { id: 'new', status: 'PLANEJADO' }]
    const bind = (revision) => store.bind({ code: 'old', eventId: 'new', expectedRevision: revision, actor: 'admin', currentEvent: (id) => events.find((event) => event.id === id) })
    assert.equal(bind(0).status, 409)
    assert.equal(bind(1).link.revision, 2)
    const reopened = createEmergencyLinksStore(dir)
    assert.equal(reopened.resolve('old'), 'new')
    const fresh = reopened.issue('old', 'admin')
    assert.notEqual(fresh.code, 'old')
    assert.equal(reopened.resolve(fresh.code), 'old')
    assert.equal(reopened.resolve('old'), 'new')
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'emergency_links.json'))).history.length, 3)
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('recusa códigos desconhecidos, destinos ainda disponíveis e arquivo corrompido', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-links-'))
  try {
    const store = createEmergencyLinksStore(dir)
    assert.equal(store.bind({ code: 'unknown', eventId: 'new', expectedRevision: 0, currentEvent: () => null }).status, 404)
    assert.equal(store.bind({ code: '../old', eventId: 'new' }).status, 400)
    store.issue('old', 'admin')
    assert.equal(store.bind({ code: 'old', eventId: 'new', expectedRevision: 1, currentEvent: () => ({ id: 'old', status: 'PLANEJADO' }) }).status, 409)
    fs.writeFileSync(path.join(dir, 'emergency_links.json'), 'corrupt')
    assert.throws(() => createEmergencyLinksStore(dir))
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})
