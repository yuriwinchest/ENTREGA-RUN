import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { decodeQrFrame, scaledFrameSize } from './qrFrame.js'

const require = createRequire(import.meta.url)
const QRCode = require('qrcode')

function sceneWithQr(width, height, text) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const size = qr.modules.size
  const data = new Uint8ClampedArray(width * height * 4).fill(200)
  const moduleSize = Math.max(1, Math.floor((width * 0.22) / (size + 8)))
  const ox = Math.floor(width / 2 - (size * moduleSize) / 2)
  const oy = Math.floor(height / 2 - (size * moduleSize) / 2)
  for (let y = 0; y < size * moduleSize; y++) {
    for (let x = 0; x < size * moduleSize; x++) {
      const dark = qr.modules.get(Math.floor(y / moduleSize), Math.floor(x / moduleSize))
      const i = ((oy + y) * width + ox + x) * 4
      data[i] = data[i + 1] = data[i + 2] = dark ? 20 : 235
    }
  }
  for (let i = 3; i < data.length; i += 4) data[i] = 255
  return data
}

test('reduz o quadro da câmera mantendo a proporção', () => {
  assert.deepEqual(scaledFrameSize(1280, 720), { width: 640, height: 360 })
  assert.deepEqual(scaledFrameSize(720, 1280), { width: 360, height: 640 })
  assert.deepEqual(scaledFrameSize(480, 320), { width: 480, height: 320 })
  assert.deepEqual(scaledFrameSize(0, 0), { width: 0, height: 0 })
})

test('lê o QR do kit no quadro reduzido', () => {
  const { width, height } = scaledFrameSize(1280, 720)
  assert.equal(decodeQrFrame(sceneWithQr(width, height, 'QR00123'), width, height), 'QR00123')
})

test('quadro sem QR devolve null', () => {
  const data = new Uint8ClampedArray(64 * 36 * 4).fill(255)
  assert.equal(decodeQrFrame(data, 64, 36), null)
})
