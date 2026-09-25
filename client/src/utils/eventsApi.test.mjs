import assert from 'node:assert/strict'
import { test } from 'node:test'
import { subscribeEventUpdates } from './eventsApi.js'

test('SSE usa Bearer e processa quadros divididos sem expor token na URL', async () => {
  const oldFetch = globalThis.fetch
  const oldStorage = globalThis.localStorage
  const calls = []
  globalThis.localStorage = { getItem: (key) => key === 'entregas_run_token' ? 'token-teste' : null }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('event: rea'))
        controller.enqueue(encoder.encode('dy\r\ndata: {}\r\n\r\nevent: change\r\ndata: {"eventId":"event-a","revision":2}\r\n\r\n'))
        controller.close()
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
  }
  const updates = []
  const unsubscribe = subscribeEventUpdates((update) => updates.push(update))
  try {
    const deadline = Date.now() + 1000
    while (updates.length < 2 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    assert.deepEqual(updates, [
      { type: 'ready' },
      { type: 'change', eventId: 'event-a', revision: 2 },
    ])
    assert.equal(calls[0].url, '/api/events/stream')
    assert.equal(calls[0].options.headers.Authorization, 'Bearer token-teste')
  } finally {
    unsubscribe()
    globalThis.fetch = oldFetch
    globalThis.localStorage = oldStorage
  }
})
