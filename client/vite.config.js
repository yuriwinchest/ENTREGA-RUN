import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    // Sem isto o minificador reescreve "max-width: 768px" como "width <= 768px",
    // que iPhones antes do iOS 16.4 ignoram — o layout de celular some neles.
    cssTarget: ['safari14', 'ios14', 'chrome90'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
