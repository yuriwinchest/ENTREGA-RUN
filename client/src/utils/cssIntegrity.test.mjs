import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// No build de produção todos os .css viram um arquivo só: uma chave "{" sem
// fechamento em um deles engole o CSS de todas as telas seguintes (aconteceu
// em 2026-09-27: acima de 768px Eventos e Usuários ficaram sem estilo).
const srcDir = path.resolve(import.meta.dirname, '..')

function cssFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return cssFiles(full)
    return entry.name.endsWith('.css') ? [full] : []
  })
}

function unbalanced(source) {
  const text = source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(/(["'])(?:\\.|(?!\1).)*\1/g, (str) => str.replace(/[{}]/g, ' '))
  let depth = 0
  let line = 1
  const opened = []
  for (const char of text) {
    if (char === '\n') line += 1
    if (char === '{') { depth += 1; opened.push(line) }
    if (char === '}') {
      depth -= 1
      opened.pop()
      if (depth < 0) return `"}" sobrando na linha ${line}`
    }
  }
  return depth === 0 ? null : `"{" sem fechamento aberto na linha ${opened.at(-1)}`
}

test('todo arquivo CSS tem chaves balanceadas', () => {
  const problems = cssFiles(srcDir)
    .map((file) => [path.relative(srcDir, file), unbalanced(fs.readFileSync(file, 'utf8'))])
    .filter(([, problem]) => problem)
  assert.deepEqual(problems, [])
})
