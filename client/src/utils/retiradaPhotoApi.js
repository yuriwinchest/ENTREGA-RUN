// Foto de retirada do kit: comprimida no aparelho (≈50 KB) antes de subir, para
// não pesar na rede do evento nem no disco do servidor.
export const PHOTO_MAX_SIDE = 720
const PHOTO_QUALITY = 0.72

function authHeaders(extra = {}) {
  let token = ''
  try {
    token = localStorage.getItem('entregas_run_token') || ''
  } catch {
    token = ''
  }
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
}

function photoRoute(eventId, athleteId) {
  return `/api/events/${encodeURIComponent(eventId)}/athletes/${encodeURIComponent(athleteId)}/photo`
}

export function fitWithin(width, height, maxSide = PHOTO_MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

async function loadBitmap(file) {
  // createImageBitmap aplica a rotação EXIF da câmera do celular.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Safari antigo: cai para <img>, que também respeita EXIF.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressPhotoFile(file) {
  const source = await loadBitmap(file)
  const { width, height } = fitWithin(source.width, source.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(source, 0, 0, width, height)
  source.close?.()
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY)
}

export async function uploadRetiradaPhoto(eventId, athleteId, image) {
  const res = await fetch(photoRoute(eventId, athleteId), {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify({ image }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) throw new Error(data.message || 'Não foi possível salvar a foto.')
  return data
}

// Devolve { url, takenAt, takenBy, expiresAt } ou null quando não há foto.
export async function fetchRetiradaPhoto(eventId, athleteId) {
  const res = await fetch(photoRoute(eventId, athleteId), { headers: authHeaders(), cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Não foi possível carregar a foto.')
  const blob = await res.blob()
  return {
    url: URL.createObjectURL(blob),
    takenAt: Number(res.headers.get('X-Foto-Tirada-Em')) || null,
    takenBy: decodeURIComponent(res.headers.get('X-Foto-Por') || ''),
    expiresAt: Number(res.headers.get('X-Foto-Expira-Em')) || null,
  }
}

export async function deleteRetiradaPhoto(eventId, athleteId) {
  const res = await fetch(photoRoute(eventId, athleteId), { method: 'DELETE', headers: authHeaders() })
  return res.ok
}
