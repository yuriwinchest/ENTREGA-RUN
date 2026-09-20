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

// ============================================================
// SINCRONIZAÇÃO VIA SERVIDOR (espelho público em outro aparelho)
// O BroadcastChannel/localStorage só alcança abas do mesmo
// navegador. Para o QR Code abrir no celular do atleta ou em uma
// TV separada, o guichê publica o estado no backend e o espelho
// consulta periodicamente (polling leve, resposta ~200 bytes).
// ============================================================

function text(value) {
  return value == null ? '' : String(value)
}

export function buildEspelhoAthlete(athlete) {
  if (!athlete) return null
  return {
    numero: text(athlete.numero ?? athlete.id),
    nome: text(athlete.nome),
    modalidade: text(athlete.modalidade),
    categoria: text(athlete.categoria),
    camiseta: text(athlete.camiseta),
    kit: text(athlete.kit),
    chip: text(athlete.chip),
    sexo: text(athlete.sexo),
    equipe: text(athlete.equipe),
  }
}

export async function publishEspelhoState(eventId, state) {
  if (!eventId || typeof fetch !== 'function') return
  const payload = {
    status: state?.status || 'LIVRE',
    eventName: text(state?.eventName),
    atleta: buildEspelhoAthlete(state?.atleta),
  }
  if (state?.config && typeof state.config === 'object') {
    payload.config = state.config
  } else if (state?.status) {
    // Post de ficha/status: envia atleta explicitamente (null limpa a ficha)
    payload.atleta = buildEspelhoAthlete(state?.atleta)
  }
  try {
    await fetch(`/api/espelho/${encodeURIComponent(eventId)}/estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // rede indisponível: o espelho remoto aguarda o próximo ciclo
  }
}

export async function fetchEspelhoState(eventId) {
  if (!eventId || typeof fetch !== 'function') return null
  const response = await fetch(`/api/espelho/${encodeURIComponent(eventId)}/estado`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  return data?.state || null
}
