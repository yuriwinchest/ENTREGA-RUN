import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const workspace = process.cwd()
const scratch = path.resolve(workspace, 'scratch')
const testDir = path.resolve(scratch, `event-storage-${Date.now()}`)
assert.ok(testDir.startsWith(`${scratch}${path.sep}`))
fs.mkdirSync(testDir, { recursive: true })

const server = net.createServer()
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
await new Promise((resolve) => server.close(resolve))
const child = spawn(process.execPath, ['server/server.js'], {
  cwd: workspace,
  env: { ...process.env, DATA_DIR: testDir, PORT: String(port) },
  stdio: 'ignore',
})
const base = `http://127.0.0.1:${port}`
async function request(url, method = 'GET', body) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, data: response.headers.get('content-type')?.includes('json') ? await response.json() : await response.text() }
}

try {
  let ready = false
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const health = await request('/api/health')
      if (health.status === 200) { ready = true; break }
    } catch {}
    await delay(100)
  }
  assert.ok(ready, 'server did not start')
  const id = `sync-test-${Date.now()}`
  const created = await request('/api/events', 'POST', { id, name: 'TESTE ISOLADO', date: '24/09/2026', location: 'TESTE' })
  assert.equal(created.status, 201)
  const eventUrl = `/api/events/${id}`
  const initial = await request(`${eventUrl}/athletes`)
  assert.equal(initial.data.revision, 0)
  const saved = await request(`${eventUrl}/athletes`, 'POST', {
    athletes: [{ id: 'a1', nome: 'ATLETA TESTE', numero: '5', chip: '71172', status: 'ENTREGUE', customFields: { nota: '=2+2' } }],
    schema: [{ key: 'nome' }, { key: 'numero' }, { key: 'chip' }],
    kits: [{ qrCode: '500', numero: '5', chip: '71172' }],
    deliveries: [{ id: '5', name: 'ATLETA TESTE' }],
    audits: [{ id: 'audit-1', atletaNumero: '5' }],
    expectedRevision: 0,
  })
  assert.equal(saved.status, 200)
  assert.equal(saved.data.revision, 1)
  const otherClient = await request(`${eventUrl}/athletes`)
  assert.equal(otherClient.data.athletes[0].nome, 'ATLETA TESTE')
  assert.equal(otherClient.data.kits[0].qrCode, '500')
  assert.equal(otherClient.data.deliveries.length, 1)
  assert.equal(otherClient.data.audits.length, 1)
  const stale = await request(`${eventUrl}/athletes`, 'POST', { athletes: [], expectedRevision: 0 })
  assert.equal(stale.status, 409)
  const csv = await request(`${eventUrl}/export.csv`)
  assert.equal(csv.status, 200)
  assert.match(csv.data, /ATLETA TESTE/)
  assert.match(csv.data, /"'=2\+2"/)
  const removed = await request(eventUrl, 'DELETE')
  assert.equal(removed.status, 200)
  assert.equal(fs.existsSync(path.join(testDir, `athletes_${id}.json`)), false)
  assert.equal((await request(`${eventUrl}/athletes`)).status, 404)
  assert.equal((await request(`${eventUrl}/athletes`, 'POST', { athletes: [] })).status, 404)
  console.log('PASS: shared event data, revision conflict, CSV export, deletion, deleted-event rejection')
} finally {
  child.kill()
  await delay(100)
  assert.ok(testDir.startsWith(`${scratch}${path.sep}`))
  fs.rmSync(testDir, { recursive: true, force: true })
}
