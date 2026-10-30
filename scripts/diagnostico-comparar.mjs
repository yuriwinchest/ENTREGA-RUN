// Só leitura. Detalha os registros de um nº de peito e a vizinhança de uma
// posição. Log público: nome, documento e operador só como "igual ao primeiro
// registro do nº: sim/não"; nada de contato.
import fs from 'node:fs'

const [file, numero, around] = process.argv.slice(2)
const athletes = JSON.parse(fs.readFileSync(file, 'utf8')).athletes || []
const norm = (v) => String(v || '').trim().toUpperCase()
const ref = athletes.find((a) => String(a.numero) === numero) || {}
const same = (a, field) => (norm(a[field]) ? (norm(a[field]) === norm(ref[field]) ? 'igual' : 'diferente') : 'vazio')
const row = (a, i) => `pos ${i} · id ${a.id || '-'} · nº ${String(a.numero) === numero ? numero : (a.numero ? 'outro' : '-')}` +
  ` · ${a.status || '-'} em ${a.entregueEm || '-'} · criado ${a.createdAt || '-'}` +
  ` · nome ${same(a, 'nome')} · doc ${same(a, 'doc')} · operador ${same(a, 'entreguePor')}` +
  ` · retirou ${a.entreguePara && norm(a.entreguePara) !== norm(a.nome) ? 'terceiro' : 'próprio'}`

console.log(`Total: ${athletes.length} (comparações contra o 1º registro do nº ${numero})`)
console.log(`Registros com nº ${numero}:`)
athletes.forEach((a, i) => { if (String(a.numero) === numero) console.log(`  ${row(a, i)}`) })
const center = Number(around)
console.log(`Vizinhança da posição ${center}:`)
for (let i = Math.max(0, center - 3); i <= Math.min(athletes.length - 1, center + 9); i++) console.log(`  ${row(athletes[i], i)}`)
