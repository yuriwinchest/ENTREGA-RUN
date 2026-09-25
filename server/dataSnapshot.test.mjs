import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { captureSnapshot, deliveredContentHash, verifyApiSnapshot, verifySnapshot } from './dataSnapshot.mjs'

test('deploy gate rejects a missing active sheet or a lost delivery', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-deploy-gate-'))
  const file = path.join(dataDir, 'athletes_event-test.json')
  const events = [{ id: 'event-test', name: 'TESTE', status: 'EM OPERAÇÃO', total: 2 }]
  const priorRequired = process.env.REQUIRED_EVENT_ID
  const athletes = [
    { id: 'a', numero: '1', status: 'ENTREGUE' },
    { id: 'b', numero: '2', status: 'PENDENTE' },
  ]
  try {
    fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify(events))
    assert.throws(() => captureSnapshot(dataDir), /Planilha de evento ativo ausente/)
    process.env.REQUIRED_EVENT_ID = 'event-test'
    fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify([{ ...events[0], status: 'PLANEJADO', total: 0 }]))
    assert.throws(() => captureSnapshot(dataDir), /Planilha de evento ativo ausente/)
    fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify(events))
    fs.writeFileSync(file, JSON.stringify({ athletes }))
    const before = captureSnapshot(dataDir)
    assert.equal(before.athletesByFile['athletes_event-test.json'].deliveredCount, 1)
    assert.doesNotThrow(() => verifySnapshot(before, dataDir))
    fs.writeFileSync(file, JSON.stringify({ athletes: [{ ...athletes[0], status: 'PENDENTE' }, athletes[1]] }))
    assert.throws(() => verifySnapshot(before, dataDir), /Quantidade de atletas ou entregas diminuiu/)
    fs.writeFileSync(file, JSON.stringify({ athletes: [athletes[1], { id: 'c', numero: '3', status: 'ENTREGUE' }] }))
    assert.throws(() => verifySnapshot(before, dataDir), /Entrega confirmada deixou de constar/)
    fs.writeFileSync(file, JSON.stringify({ athletes: [{ ...athletes[0], chip: 'alterado' }, athletes[1]] }))
    assert.throws(() => verifySnapshot(before, dataDir), /Dados de entrega confirmada mudaram/)
  } finally {
    if (priorRequired === undefined) delete process.env.REQUIRED_EVENT_ID
    else process.env.REQUIRED_EVENT_ID = priorRequired
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})

test('deploy gate verifies that the API still exposes confirmed deliveries', async () => {
  const before = {
    version: 1,
    eventIds: ['event-test'],
    athletesByFile: {
      'athletes_event-test.json': {
        total: 1,
        deliveredCount: 1,
        deliveredIds: [crypto.createHash('sha256').update('id:a').digest('hex')],
        deliveredContent: {
          [crypto.createHash('sha256').update('id:a').digest('hex')]: deliveredContentHash({ id: 'a', numero: '1', status: 'ENTREGUE' }),
        },
      },
    },
  }
  let status = 'ENTREGUE'
  const server = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(request.url === '/api/events'
      ? { events: [{ id: 'event-test' }] }
      : { athletes: [{ id: 'a', numero: '1', status }] }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    await assert.doesNotReject(verifyApiSnapshot(before, base))
    status = 'PENDENTE'
    await assert.rejects(verifyApiSnapshot(before, base), /API perdeu atletas ou entregas/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
