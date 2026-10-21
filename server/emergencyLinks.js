import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const EMERGENCY_CODE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/

export function createEmergencyLinksStore(dataDir) {
  const file = path.join(dataDir, 'emergency_links.json')
  let state = { version: 1, links: {}, history: [] }
  if (fs.existsSync(file)) {
    state = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (state.version !== 1 || !state.links || !Array.isArray(state.history)) throw new Error('Registro de QR inválido; restaure o backup antes de iniciar.')
  }
  const get = (code) => Object.hasOwn(state.links, code) ? state.links[code] : null
  function change(code, eventId, actor) {
    const previous = get(code)
    const at = new Date().toISOString()
    const next = structuredClone(state)
    next.links[code] = { code, eventId, revision: (previous?.revision || 0) + 1, createdAt: previous?.createdAt || at, updatedAt: at }
    next.history.push({ code, from: previous?.eventId || null, to: eventId, by: actor, at })
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
    const temp = `${file}.${crypto.randomUUID()}.tmp`
    try {
      fs.writeFileSync(temp, JSON.stringify(next), { mode: 0o600 })
      fs.renameSync(temp, file)
      state = next
    } finally { fs.rmSync(temp, { force: true }) }
    return get(code)
  }
  return {
    get,
    resolve(code) { return get(code)?.eventId ?? (get(code) ? null : code) },
    reserved(code) { return Boolean(get(code)) },
    forEvent(id) { return Object.values(state.links).filter((link) => link.eventId === id) },
    issue(eventId, actor) {
      const existing = this.forEvent(eventId)
      if (existing.length) return existing.find((link) => link.code === eventId) || existing[0]
      // Um endereço transferido nunca volta ao evento original por efeito de restauração.
      const code = get(eventId) ? `qr-${crypto.randomUUID()}` : eventId
      return change(code, eventId, actor)
    },
    bind({ code, eventId, expectedRevision, actor, knownDeleted, currentEvent }) {
      if (!EMERGENCY_CODE.test(code)) return { status: 400, message: 'Código de QR inválido.' }
      const previous = get(code)
      const source = currentEvent(previous?.eventId || code)
      if (!previous && !knownDeleted && !source) return { status: 404, message: 'Este endereço não pertence a um evento conhecido. Confira o QR impresso.' }
      if (expectedRevision !== (previous?.revision || 0)) return { status: 409, message: 'O vínculo mudou. Confira novamente antes de confirmar.' }
      if (source && source.id !== eventId && source.status !== 'ARQUIVADO') return { status: 409, message: 'O QR ainda pertence a um evento disponível. Arquive o evento anterior antes de transferir.' }
      if (previous?.eventId === eventId) return { link: previous }
      return { link: change(code, eventId, actor) }
    },
  }
}
