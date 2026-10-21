import test from 'node:test'
import assert from 'node:assert/strict'
import { createAlertRepeater, highestAlert, pendingAlerts } from './medicoAlert.js'

const occurrence = (id, gravidade, extra = {}) => ({ id, gravidade, status: 'ABERTA', ...extra })

function audioHarness(state = 'running') {
  let nextId = 1
  const intervals = new Map()
  const oscillators = []
  const parameter = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
  })
  const ctx = {
    state,
    currentTime: 12,
    destination: {},
    createOscillator() {
      const osc = {
        frequency: parameter(),
        starts: [],
        stops: [],
        disconnected: false,
        connect(node) { return node },
        disconnect() { this.disconnected = true },
        start(time) { this.starts.push(time) },
        stop(time) { this.stops.push(time) },
      }
      oscillators.push(osc)
      return osc
    },
    createGain() {
      return { gain: parameter(), connect(node) { return node }, disconnect() {} }
    },
  }
  const timers = {
    setInterval(callback, ms) {
      const id = nextId++
      intervals.set(id, { callback, ms })
      return id
    },
    clearInterval(id) { intervals.delete(id) },
  }
  const tick = () => { for (const { callback } of [...intervals.values()]) callback() }
  return { ctx, timers, intervals, oscillators, tick }
}

test('pendências incluem registros antigos e encerrados sem reconhecimento, sem mudar atendimento', () => {
  const list = [
    occurrence('antiga', 'GRAVE', { criadaEm: '2025-01-01T00:00:00Z' }),
    occurrence('encerrada', 'LEVE', { status: 'ENCERRADA' }),
    occurrence('atendimento', 'MODERADA', { status: 'EM_ATENDIMENTO' }),
    occurrence('reconhecida', 'CRITICA', { alertaReconhecidoEm: '2026-10-21T12:00:00Z' }),
  ]
  const before = structuredClone(list)
  assert.deepEqual(pendingAlerts(list).map(({ id }) => id), ['antiga', 'encerrada', 'atendimento'])
  assert.deepEqual(list, before)
  assert.deepEqual(pendingAlerts([]), [])
})

test('maior gravidade pendente respeita as quatro prioridades independentemente da ordem', () => {
  const priority = ['LEVE', 'MODERADA', 'GRAVE', 'CRITICA']
  for (let i = 0; i < priority.length; i += 1) {
    const list = priority.slice(0, i + 1).map((gravidade) => occurrence(gravidade, gravidade))
    assert.equal(highestAlert(list)?.gravidade, priority[i])
    assert.equal(highestAlert([...list].reverse())?.gravidade, priority[i])
  }
  assert.equal(highestAlert([]), null)
})

test('reconhecer crítica deixa moderada como prioridade e uma nova crítica rearma', () => {
  const list = [occurrence('x', 'CRITICA'), occurrence('y', 'MODERADA')]
  assert.equal(highestAlert(list)?.id, 'x')
  const acknowledged = list.map((item) => item.id === 'x'
    ? { ...item, alertaReconhecidoEm: '2026-10-21T12:00:00Z' }
    : item)
  assert.equal(highestAlert(acknowledged)?.id, 'y')
  assert.deepEqual(pendingAlerts(acknowledged).map(({ id }) => id), ['y'])
  assert.equal(highestAlert([...acknowledged, occurrence('z', 'CRITICA')])?.id, 'z')
  assert.equal(highestAlert(acknowledged.map((item) => ({ ...item, alertaReconhecidoEm: 'agora' }))), null)
})

test('repetidor inicia imediatamente, mantém um timer e start duplicado não duplica áudio', () => {
  const h = audioHarness()
  const repeater = createAlertRepeater(h.ctx, h.timers)
  repeater.start()
  const firstCount = h.oscillators.length
  assert.ok(firstCount > 0)
  assert.equal(h.intervals.size, 1)
  assert.equal([...h.intervals.values()][0].ms, 4000)
  repeater.start()
  assert.equal(h.oscillators.length, firstCount)
  assert.equal(h.intervals.size, 1)
  h.tick()
  assert.ok(h.oscillators.length > firstCount)
  assert.ok(h.oscillators.every((osc) => osc.starts.length === 1 && osc.stops.some(Number.isFinite)))
  repeater.stop()
})

test('stop de reconhecimento/desmontagem cancela timer e todas as fontes já agendadas; permite rearmar', () => {
  const h = audioHarness()
  const repeater = createAlertRepeater(h.ctx, h.timers)
  repeater.start()
  h.tick()
  const scheduled = [...h.oscillators]
  assert.ok(scheduled.length > 0)
  repeater.stop()
  assert.equal(h.intervals.size, 0)
  for (const osc of scheduled) assert.ok(osc.stops.includes(undefined), 'fonte deve receber parada imediata além da parada agendada')
  h.tick()
  assert.equal(h.oscillators.length, scheduled.length)
  repeater.stop()
  repeater.start()
  assert.equal(h.intervals.size, 1)
  assert.ok(h.oscillators.length > scheduled.length)
  repeater.stop()
  assert.equal(h.intervals.size, 0)
})

test('contexto suspenso não agenda áudio; retomada permite novo pulso e suspensão volta a bloquear', () => {
  const h = audioHarness('suspended')
  const repeater = createAlertRepeater(h.ctx, h.timers)
  repeater.start()
  h.tick()
  assert.equal(h.oscillators.length, 0)
  h.ctx.state = 'running'
  h.tick()
  const runningCount = h.oscillators.length
  assert.ok(runningCount > 0)
  h.ctx.state = 'suspended'
  h.tick()
  assert.equal(h.oscillators.length, runningCount)
  repeater.stop()
  assert.equal(h.intervals.size, 0)
})
