export const DEFAULT_ESPELHO_CONFIG = {
  fundo: '#071526', // Navy escuro idêntico ao Screenshot 1
  texto: '#ffffff', // Branco puro
  destaque: '#ff6b00', // Laranja vibrante idêntico à tag LIVRE
  fontSize: 100, // 100%
  mensagem: 'Guichê disponível',
  bgImage: null,
  logo: null,
}

export function getEspelhoStorageKey(eventId) {
  return `entregas_run_espelho_${eventId || 'default'}`
}

export function getEspelhoConfig(eventId) {
  try {
    const raw = localStorage.getItem(getEspelhoStorageKey(eventId))
    if (raw) {
      return { ...DEFAULT_ESPELHO_CONFIG, ...JSON.parse(raw) }
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_ESPELHO_CONFIG }
}

let syncChannel = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('entregas_run_espelho_sync')
  }
} catch {
  // BroadcastChannel fallback
}

export function broadcastEspelhoChange(payload) {
  if (syncChannel) {
    try {
      syncChannel.postMessage(payload)
    } catch {
      // ignore
    }
  }
}

export function saveEspelhoConfig(eventId, config) {
  try {
    localStorage.setItem(getEspelhoStorageKey(eventId), JSON.stringify(config))
  } catch {
    // ignore
  }
  broadcastEspelhoChange({ type: 'CONFIG_CHANGE', eventId, config })
}

export function subscribeEspelhoSync(callback) {
  function handleStorage(e) {
    if (e.key && e.key.startsWith('entregas_run_espelho_')) {
      callback({ type: 'STORAGE_UPDATE', key: e.key, newValue: e.newValue })
    }
  }
  window.addEventListener('storage', handleStorage)

  function handleMessage(e) {
    if (e.data) {
      callback(e.data)
    }
  }

  if (syncChannel) {
    syncChannel.addEventListener('message', handleMessage)
  }

  return () => {
    window.removeEventListener('storage', handleStorage)
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleMessage)
    }
  }
}
