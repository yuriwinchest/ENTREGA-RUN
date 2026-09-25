import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import test from 'node:test'

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

test('two old clients can deliver without erasing each other, including chunk uploads', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entregas-sync-'))
  const port = await freePort()
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, APPWRITE_ENABLED: 'false' },
    stdio: 'ignore',
  })
  const base = `http://127.0.0.1:${port}`
  const request = async (method, route, body) => {
    const response = await fetch(`${base}${route}`, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json() }
  }
  try {
    let ready = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const health = await request('GET', '/api/health')
        if (health.status === 200) { ready = true; break }
      } catch { /* server is starting */ }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.equal(ready, true, 'local server did not start')

    const eventId = 'event-sync-test'
    const route = `/api/events/${eventId}/athletes`
    const event = await request('POST', '/api/events', { id: eventId, name: 'TESTE', status: 'EM OPERAÇÃO' })
    assert.equal(event.status, 201)
    const original = Array.from({ length: 301 }, (_, index) => ({
      id: `athlete-${index + 1}`, numero: String(index + 1), chip: String(1000 + index), status: 'PENDENTE',
    }))
    assert.equal((await request('POST', route, { athletes: original })).status, 200)
    const clientA = structuredClone(original)
    clientA[0].status = 'ENTREGUE'
    clientA[0].entreguePor = 'Operador A'
    assert.equal((await request('POST', route, { athletes: clientA })).status, 200)

    const clientB = structuredClone(original)
    clientB[1].status = 'ENTREGUE'
    clientB[1].entreguePor = 'Operador B'
    const uploadId = 'stale-client-b'
    const first = await request('POST', `${route}/chunks`, {
      uploadId, chunkIndex: 0, totalChunks: 2, athletesChunk: clientB.slice(0, 250),
    })
    assert.equal(first.body.done, false)
    const last = await request('POST', `${route}/chunks`, {
      uploadId, chunkIndex: 1, totalChunks: 2, athletesChunk: clientB.slice(250),
    })
    assert.equal(last.body.done, true)

    const saved = await request('GET', route)
    assert.equal(saved.body.athletes.length, 301)
    assert.equal(saved.body.athletes[0].entreguePor, 'Operador A')
    assert.equal(saved.body.athletes[1].entreguePor, 'Operador B')
    const events = await request('GET', '/api/events')
    const updated = events.body.events.find((item) => item.id === eventId)
    assert.deepEqual([updated.total, updated.entregues, updated.pendentes], [301, 2, 299])

    const undoPending = structuredClone(saved.body.athletes)
    undoPending[2] = { ...undoPending[2], numero: '', chip: '' }
    const undoResponse = await request('POST', route, { athletes: undoPending, undoAthleteId: 'athlete-3' })
    assert.equal(undoResponse.status, 200)
    assert.equal((await request('GET', route)).body.athletes[2].chip, '')

    await request('PUT', `/api/events/${eventId}`, { entregues: 0, pendentes: 301 })
    const afterStaleMetadata = await request('GET', '/api/events')
    assert.equal(afterStaleMetadata.body.events.find((item) => item.id === eventId).entregues, 2)

    await request('PUT', `/api/events/${eventId}`, { status: 'FINALIZADO' })
    assert.equal((await request('POST', route, { athletes: original })).status, 200)
    const afterFinalizedStaleWrite = await request('GET', route)
    assert.equal(afterFinalizedStaleWrite.body.athletes.filter((athlete) => athlete.status === 'ENTREGUE').length, 2)
  } finally {
    child.kill()
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
