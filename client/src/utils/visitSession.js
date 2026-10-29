// Visita do Super admin ao ambiente de um Sub-admin: guarda o login de origem
// para o botão "voltar" não pedir senha de novo.
const ORIGIN_KEY = 'entregas_run_visit_origin'

export function saveVisitOrigin(token, user, storage = localStorage) {
  try { storage.setItem(ORIGIN_KEY, JSON.stringify({ token, user })) } catch { /* sem armazenamento, voltar exige novo login */ }
}

export function readVisitOrigin(storage = localStorage) {
  try {
    const origin = JSON.parse(storage.getItem(ORIGIN_KEY) || 'null')
    return origin && typeof origin.token === 'string' && origin.token ? origin : null
  } catch {
    return null
  }
}

export function clearVisitOrigin(storage = localStorage) {
  try { storage.removeItem(ORIGIN_KEY) } catch { /* nada a limpar */ }
}
