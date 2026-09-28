import { decodeQrFrame } from './qrFrame.js'

// Decodifica fora da thread da interface: a digitação no leitor não espera o jsQR.
self.onmessage = ({ data }) => {
  const { id, buffer, width, height } = data
  self.postMessage({ id, value: decodeQrFrame(new Uint8ClampedArray(buffer), width, height) })
}
