import { GRAVIDADES } from './medico.js'

// O reconhecimento independe do atendimento: inclusive registros antigos sem ACK
// continuam visíveis ao abrir a tela. IDs, nunca relógio do cliente, definem o alvo.
export function pendingAlerts(ocorrencias) {
  return ocorrencias.filter((item) => !item.alertaReconhecidoEm)
}

export function highestAlert(ocorrencias) {
  return pendingAlerts(ocorrencias).reduce((highest, item) => {
    const rank = (value) => GRAVIDADES.findIndex((g) => g.value === value)
    return !highest || rank(item.gravidade) > rank(highest.gravidade) ? item : highest
  }, null)
}

// Cada pulso termina sozinho; stop também cancela as fontes já programadas.
// O controlador é descartado junto com o AudioContext ao sair do painel.
export function createAlertRepeater(ctx, timers = globalThis) {
  let interval = null
  const sources = new Set()
  const pulse = () => {
    if (ctx.state !== 'running') return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const start = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, start)
    for (let i = 0; i < 6; i += 1) {
      const t = start + i * 0.6
      osc.frequency.setValueAtTime(i % 2 ? 880 : 660, t)
      osc.frequency.linearRampToValueAtTime(i % 2 ? 660 : 880, t + 0.12)
    }
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.10, start + 0.05)
    gain.gain.setValueAtTime(0.10, start + 3.5)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 3.6)
    osc.connect(gain).connect(ctx.destination)
    sources.add(osc)
    osc.onended = () => { sources.delete(osc); osc.disconnect(); gain.disconnect() }
    osc.start(start)
    osc.stop(start + 3.62)
  }
  return {
    start() {
      if (interval !== null) return
      pulse()
      interval = timers.setInterval(pulse, 4000)
    },
    stop() {
      if (interval !== null) timers.clearInterval(interval)
      interval = null
      for (const source of sources) {
        try { source.stop() } catch { /* fonte já encerrada */ }
      }
      sources.clear()
    },
  }
}
