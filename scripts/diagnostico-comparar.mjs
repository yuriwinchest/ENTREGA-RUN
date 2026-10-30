// Só leitura. Compara a planilha de um evento num backup com a atual para achar
// atleta sobrescrito por outro de mesmo número. Log público: nada de nome,
// documento ou contato; só id interno, nº, status e marcas booleanas.
import fs from 'node:fs'

const [oldFile, newFile, numero] = process.argv.slice(2)
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8')).athletes || []
const before = load(oldFile)
const after = load(newFile)
const row = (a, i) => `pos ${i} · id ${a.id || '-'} · nº ${a.numero || '-'} · ${a.status || '-'}` +
  ` · chip ${a.chip ? 'sim' : 'não'} · associado no app ${Object.hasOwn(a, '_kitPreviousNumero') ? 'sim' : 'não'}` +
  ` · nº anterior ${Object.hasOwn(a, '_kitPreviousNumero') ? (a._kitPreviousNumero || 'vazio') : '-'}`

console.log(`ANTES: ${before.length} atletas · DEPOIS: ${after.length} atletas`)
for (const [label, list] of [['ANTES', before], ['DEPOIS', after]]) {
  console.log(`${label} — atletas com nº ${numero} ou nº anterior ${numero}:`)
  list.forEach((a, i) => {
    if (String(a.numero) === numero || String(a._kitPreviousNumero ?? '') === numero) console.log(`  ${row(a, i)}`)
  })
}
const afterIds = new Set(after.map((a) => String(a.id)))
const beforeIds = new Set(before.map((a) => String(a.id)))
const lost = before.map((a, i) => [a, i]).filter(([a]) => !afterIds.has(String(a.id)))
console.log(`Ids que existiam antes e sumiram: ${lost.length}`)
for (const [a, i] of lost) console.log(`  ${row(a, i)}`)
console.log(`Ids novos depois: ${after.filter((a) => !beforeIds.has(String(a.id))).length}`)

const repeated = (list) => {
  const count = new Map()
  for (const a of list) {
    const n = String(a.numero || '').trim()
    if (n) count.set(n, (count.get(n) || 0) + 1)
  }
  return [...count].filter(([, c]) => c > 1).map(([n, c]) => `${n}×${c}`)
}
console.log(`Números de peito repetidos ANTES: ${repeated(before).join(', ') || 'nenhum'}`)
console.log(`Números de peito repetidos DEPOIS: ${repeated(after).join(', ') || 'nenhum'}`)
