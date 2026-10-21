import assert from 'node:assert/strict'
import test from 'node:test'
import { cacheEventKits } from './kitCache.js'

function installStorage(t, descriptor) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  })
}

test('grava os kits serializados somente na chave do evento', (t) => {
  const saved = new Map([['outro-dado', 'preservado']])
  installStorage(t, { value: { setItem: (key, value) => saved.set(key, value) } })
  const kits = [{ numero: '12', chip: 'QA-12' }]

  assert.equal(cacheEventKits('qa-event', kits), true)
  assert.deepEqual(JSON.parse(saved.get('entregas_run_kits_qa-event')), kits)
  assert.equal(saved.get('outro-dado'), 'preservado')
  assert.equal(saved.size, 2)
})

test('quota esgotada impede apenas o cache e não propaga erro para a tela', (t) => {
  let writes = 0
  installStorage(t, {
    value: {
      setItem() {
        writes++
        throw new DOMException('Quota sintética esgotada', 'QuotaExceededError')
      },
      removeItem() { assert.fail('não deve apagar dados para liberar espaço') },
      clear() { assert.fail('não deve limpar o armazenamento') },
    },
  })

  assert.equal(cacheEventKits('qa-event', [{ numero: '12' }]), false)
  assert.equal(writes, 1)
})

test('bloqueio do próprio acesso ao localStorage não propaga SecurityError', (t) => {
  installStorage(t, {
    get() { throw new DOMException('Armazenamento bloqueado', 'SecurityError') },
  })

  assert.equal(cacheEventKits('qa-event', []), false)
})

test('SecurityError na gravação também impede apenas o cache', (t) => {
  installStorage(t, {
    value: {
      setItem() { throw new DOMException('Gravação bloqueada', 'SecurityError') },
    },
  })

  assert.equal(cacheEventKits('qa-event', []), false)
})

test('evento ausente ou kits inválidos não geram gravação', (t) => {
  let writes = 0
  installStorage(t, { value: { setItem() { writes++ } } })

  for (const eventId of ['', null, undefined]) {
    assert.equal(cacheEventKits(eventId, []), false)
  }
  for (const kits of [null, undefined, {}, 'kits']) {
    assert.equal(cacheEventKits('qa-event', kits), false)
  }
  assert.equal(writes, 0)
})
