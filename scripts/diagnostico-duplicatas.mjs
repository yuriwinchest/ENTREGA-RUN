// Só leitura. Lista atletas entregues com a mesma identidade usada pela trava
// do snapshot (server/dataSnapshot.mjs). O log do Actions é público: nunca
// imprimir nome, documento, contato ou "entregue para".
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const dataDir = process.argv[2] || '/opt/entregas-run/data'
const delivered = (a) => String(a?.status || '').toUpperCase() === 'ENTREGUE'
const hash = (v) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 10)

function identity(a) {
  const id = String(a.id || '').trim()
  if (id) return { type: 'id', key: id }
  const doc = String(a.doc || a.documento || '').replace(/\D/g, '')
  if (doc) return { type: 'documento', key: doc }
  const numero = String(a.numero || '').trim()
  return numero ? { type: 'numero', key: numero } : { type: 'nenhuma', key: '' }
}

const events = JSON.parse(fs.readFileSync(path.join(dataDir, 'events.json'), 'utf8'))
const files = fs.readdirSync(dataDir).filter((f) => /^athletes_.+\.json$/.test(f))
let total = 0
for (const file of files) {
  const eventId = file.slice('athletes_'.length, -'.json'.length)
  const athletes = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')).athletes || []
  const groups = new Map()
  athletes.forEach((a, index) => {
    if (!delivered(a)) return
    const { type, key } = identity(a)
    const k = `${type}:${key}`
    if (!groups.has(k)) groups.set(k, { type, copies: [] })
    groups.get(k).copies.push({ index, a })
  })
  for (const { type, copies } of groups.values()) {
    if (copies.length < 2 && type !== 'nenhuma') continue
    total += 1
    const ev = events.find((e) => e.id === eventId)
    console.log(`EVENTO ${eventId} (${ev?.status || 'sem status'}, ${athletes.length} atletas) · identidade por ${type} · ${copies.length} cópias`)
    for (const { index, a } of copies) {
      const { status, entregueEm, entreguePor, numero, chip } = a
      console.log(`  posição ${index} · nº ${numero || '-'} · chip ${chip ? 'sim' : 'não'} · ${status} em ${entregueEm || '-'} · operador ${hash(entreguePor || '')} · registro ${hash(a)}`)
    }
  }
}
console.log(total ? `${total} grupo(s) duplicado(s).` : 'Nenhuma duplicata entre atletas entregues.')
