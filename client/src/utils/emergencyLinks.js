const CODE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/

export function parseEmergencyCode(input, origin) {
  const value = String(input || '').trim()
  if (CODE.test(value)) return value
  try {
    const url = new URL(value, origin)
    const current = new URL(origin)
    const hosts = new Set([current.host, 'entregasrunning.com.br', 'www.entregasrunning.com.br', 'app.entregasrun.com.br'])
    if (!['http:', 'https:'].includes(url.protocol) || !hosts.has(url.host) || url.username || url.password) return null
    const match = url.pathname.match(/^\/emergencia\/([^/]+)\/?$/)
    const code = match ? decodeURIComponent(match[1]) : ''
    return CODE.test(code) ? code : null
  } catch { return null }
}
