import jsQR from 'jsqr'

// 640px no lado maior ainda lê o QR do kit e custa ~5x menos que 1280px.
export const QR_SCAN_MAX_SIDE = 640

export function scaledFrameSize(width, height, maxSide = QR_SCAN_MAX_SIDE) {
  if (!width || !height) return { width: 0, height: 0 }
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export function decodeQrFrame(data, width, height) {
  try {
    const result = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
    return result?.data?.trim() || null
  } catch {
    return null
  }
}
