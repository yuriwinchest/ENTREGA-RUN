export const DEFAULT_ESPELHO_CONFIG = {
  fundo: '#071526', // Navy escuro idêntico ao Screenshot 1
  texto: '#ffffff', // Branco puro
  destaque: '#ff6b00', // Laranja vibrante idêntico à tag LIVRE
  fontSize: 100, // 100%
  mensagem: 'Guichê disponível',
  bgImage: null,
  logo: null,
  showBibCard: true,
  showShirtCard: true,
  showKitCard: true,
  showThirdParty: true,
  visibleFields: null, // null indica que todos os campos preenchidos são visíveis por padrão
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

export function compressImageFile(file, maxWidth = 1920, maxHeight = 1080, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null)
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const isPng = file.type === 'image/png'
        // Preserva PNG para logos com transparência menores que 800KB; banners em JPEG para máxima performance
        const mimeType = isPng && file.size < 800 * 1024 ? 'image/png' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(mimeType, quality)
        resolve(dataUrl)
      }
      img.src = e.target?.result
    }
    reader.readAsDataURL(file)
  })
}

export function saveEspelhoConfig(eventId, config) {
  try {
    localStorage.setItem(getEspelhoStorageKey(eventId), JSON.stringify(config))
  } catch (err) {
    console.warn('[espelho] Aviso ao salvar config no localStorage:', err?.message)
    // Se a imagem for muito pesada para o storage local, salva os demais campos sem estourar
    if (config?.bgImage || config?.logo) {
      try {
        const lightweight = { ...config, bgImage: null, logo: null }
        localStorage.setItem(getEspelhoStorageKey(eventId), JSON.stringify(lightweight))
      } catch {
        // ignore
      }
    }
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
    doc: text(athlete.doc || athlete.cpf),
    modalidade: text(athlete.modalidade),
    categoria: text(athlete.categoria),
    camiseta: text(athlete.camiseta),
    kit: text(athlete.kit),
    chip: text(athlete.chip),
    sexo: text(athlete.sexo),
    equipe: text(athlete.equipe),
    cidade: text(athlete.cidade),
    nascimento: text(athlete.nascimento),
    nome_peito: text(athlete.nome_peito),
    pcd: text(athlete.pcd),
    contato: text(athlete.contato),
    morador: text(athlete.morador),
    nacionalidade: text(athlete.nacionalidade),
    entreguePara: text(athlete.entreguePara || athlete.retiradoPor),
    retiradoPor: text(athlete.retiradoPor || athlete.entreguePara),
    entregueEm: text(athlete.entregueEm),
    entreguePor: text(athlete.entreguePor),
    status: text(athlete.status),
    customFields: athlete.customFields && typeof athlete.customFields === 'object' ? athlete.customFields : {},
  }
}

export async function publishEspelhoState(eventId, state) {
  if (!eventId) return
  const payload = {
    status: state?.status || 'LIVRE',
    eventName: text(state?.eventName),
    atleta: buildEspelhoAthlete(state?.atleta),
    updatedAt: Date.now(),
  }
  if (state?.config && typeof state.config === 'object') {
    payload.config = state.config
  }

  // 1. Sincronização em tempo real instantânea (0ms) no mesmo navegador via BroadcastChannel e localStorage
  broadcastEspelhoChange({
    type: 'STATE_CHANGE',
    eventId,
    state: payload,
  })

  try {
    localStorage.setItem(`entregas_run_espelho_live_${eventId}`, JSON.stringify(payload))
  } catch {
    // ignore
  }

  // 2. Publicação remota para outros dispositivos/segundas telas via backend (transmitida via SSE)
  if (typeof fetch === 'function') {
    try {
      await fetch(`/api/espelho/${encodeURIComponent(eventId)}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      // rede indisponível: o espelho remoto aguarda o próximo ciclo
    }
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

export function subscribeEspelhoSSE(eventId, onStateChange, onStatusChange) {
  if (!eventId || typeof window === 'undefined' || !('EventSource' in window)) {
    return () => {}
  }

  let eventSource = null
  let isAlive = true

  function initSSE() {
    if (!isAlive) return
    try {
      eventSource = new EventSource(`/api/espelho/${encodeURIComponent(eventId)}/stream`)

      eventSource.onopen = () => {
        if (typeof onStatusChange === 'function') {
          onStatusChange(true)
        }
      }

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (parsed && 'state' in parsed) {
            onStateChange(parsed.state)
          }
        } catch {
          // ignore parsing error
        }
      }

      eventSource.onerror = () => {
        if (typeof onStatusChange === 'function') {
          onStatusChange(false)
        }
        // EventSource nativo reconecta automaticamente
      }
    } catch {
      if (typeof onStatusChange === 'function') {
        onStatusChange(false)
      }
    }
  }

  initSSE()

  return () => {
    isAlive = false
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }
}
