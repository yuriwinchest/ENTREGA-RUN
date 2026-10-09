import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// Sessões sobrevivem a deploy/restart do container: sem isto cada publicação
// desloga todos os operadores no meio do evento. O disco guarda só o hash do
// token (vazar o arquivo não permite entrar) e o arquivo fica fora do backup.
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex')

export function createSessionStore(file, { flushDelayMs = 300 } = {}) {
  const sessions = new Map()
  let timer = null

  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
    const now = Date.now()
    for (const [key, session] of Object.entries(saved || {})) {
      if (session && session.expiresAt > now) sessions.set(key, session)
    }
  } catch {
    // primeiro start ou arquivo ilegível: começa vazio
  }

  function flushNow() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      const tmp = `${file}.${process.pid}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(sessions)), { mode: 0o600 })
      fs.renameSync(tmp, file)
    } catch (err) {
      console.error('[sessoes] Falha ao gravar sessões:', err?.message)
    }
  }

  function scheduleFlush() {
    if (!timer) timer = setTimeout(flushNow, flushDelayMs)
  }

  return {
    get(token) {
      if (!token) return null
      const key = hashToken(token)
      const session = sessions.get(key)
      if (!session) return null
      if (session.expiresAt < Date.now()) {
        sessions.delete(key)
        scheduleFlush()
        return null
      }
      return session
    },
    set(token, session) {
      sessions.set(hashToken(token), session)
      scheduleFlush()
    },
    delete(token) {
      if (sessions.delete(hashToken(token))) scheduleFlush()
    },
    revokeUser(userId) {
      let changed = false
      for (const [key, session] of sessions) {
        if (session.userId === userId) {
          sessions.delete(key)
          changed = true
        }
      }
      if (changed) scheduleFlush()
    },
    prune(now = Date.now()) {
      let changed = false
      for (const [key, session] of sessions) {
        if (session.expiresAt < now) {
          sessions.delete(key)
          changed = true
        }
      }
      if (changed) scheduleFlush()
    },
    flushNow,
    get size() {
      return sessions.size
    },
  }
}
