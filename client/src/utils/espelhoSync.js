import { espelhoChannelQuery } from './espelhoStation.js'

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
  showEventName: true,
  visibleFields: null, // null indica que todos os campos preenchidos são visíveis por padrão
}

export function getEspelhoStorageKey(eventId) {
  return `entregas_run_espelho_${eventId || 'default'}`
}

const configCache = new Map()

export function getEspelhoConfig(eventId) {
  const key = getEspelhoStorageKey(eventId)
  if (configCache.has(key)) return { ...configCache.get(key) }
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

// Limite do arquivo bruto escolhido no aparelho. A imagem é reduzida antes de
// subir (fundo até 1920×1080, logo até 600×300), então o servidor recebe bem menos.
export const MAX_RAW_IMAGE_BYTES = 25 * 1024 * 1024

// Celular manda HEIC (iPhone) ou tipo vazio (alguns Android): não recusa pelo tipo,
// deixa a decodificação do próprio navegador decidir. Retorna mensagem de erro ou ''.
export function checkImageFile(file) {
  if (!file) return 'Nenhuma imagem selecionada.'
  if (file.type && !file.type.startsWith('image/')) return 'Selecione um arquivo de imagem.'
  if (file.size > MAX_RAW_IMAGE_BYTES) return 'A imagem deve ter no máximo 25 MB.'
  return ''
}

export function compressImageFile(file, maxWidth = 1920, maxHeight = 1080, quality = 0.82, preserveTransparency = false) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null)
    const unreadable = () => reject(new Error('Este aparelho não conseguiu abrir a imagem. Tente JPG ou PNG (no iPhone, um print da foto funciona).'))
    const reader = new FileReader()
    reader.onerror = unreadable
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = unreadable
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
        const mimeType = (preserveTransparency || (isPng && file.size < 800 * 1024)) ? 'image/png' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(mimeType, quality)
        resolve(dataUrl)
      }
      img.src = e.target?.result
    }
    reader.readAsDataURL(file)
  })
}

export function saveEspelhoConfig(eventId, config, notify = true) {
  configCache.set(getEspelhoStorageKey(eventId), { ...config })
  try {
    localStorage.setItem(getEspelhoStorageKey(eventId), JSON.stringify(config))
  } catch (err) {
    console.warn('[espelho] Aviso ao salvar config no localStorage:', err?.message)
    // O cache em memória mantém a prévia. A cópia persistente é a do servidor.
  }
  if (notify) broadcastEspelhoChange({ type: 'CONFIG_CHANGE', eventId, config })
}

export function subscribeEspelhoSync(callback) {
  function handleStorage(e) {
    if (e.key && e.key.startsWith('entregas_run_espelho_')) {
      configCache.delete(e.key)
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

export async function publishEspelhoState(eventId, state, canalId = '') {
  if (!eventId) return false
  const hasLiveState = state?.status !== undefined || state?.atleta !== undefined
  if (hasLiveState && !canalId) return false
  const payload = {
    eventName: text(state?.eventName),
    ...(hasLiveState ? { status: state?.status || 'LIVRE', atleta: buildEspelhoAthlete(state?.atleta) } : {}),
    updatedAt: Date.now(),
  }
  if (state?.config && typeof state.config === 'object') {
    payload.config = state.config
  }

  let token = ''
  try { token = localStorage.getItem('entregas_run_token') || '' } catch {}

  // 2. Publicação remota para outros dispositivos/segundas telas via backend (transmitida via SSE)
  if (typeof fetch === 'function') {
    try {
      const response = await fetch(`/api/espelho/${encodeURIComponent(eventId)}/estado${espelhoChannelQuery(canalId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      const saved = response.ok && result.ok === true && !result.ignored
      if (saved && hasLiveState) broadcastEspelhoChange({ type: 'STATE_CHANGE', eventId, canalId, state: payload })
      if (saved && !hasLiveState) broadcastEspelhoChange({ type: 'CONFIG_CHANGE', eventId, config: payload.config })
      return saved
    } catch {
      // rede indisponível: o espelho remoto aguarda o próximo ciclo
    }
  }
  return false
}

export async function fetchEspelhoState(eventId, canalId = '') {
  if (!eventId || typeof fetch !== 'function') return null
  const response = await fetch(`/api/espelho/${encodeURIComponent(eventId)}/estado${espelhoChannelQuery(canalId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  return data?.state || null
}

export function subscribeEspelhoSSE(eventId, onStateChange, onStatusChange, canalId = '') {
  if (!eventId || typeof window === 'undefined' || !('EventSource' in window)) {
    return () => {}
  }

  let eventSource = null
  let isAlive = true

  function initSSE() {
    if (!isAlive) return
    try {
      eventSource = new EventSource(`/api/espelho/${encodeURIComponent(eventId)}/stream${espelhoChannelQuery(canalId)}`)

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

// Uma fila por evento sobrevive ao fechamento do modal e isola callbacks de outros eventos.
const editors = new Map()
export function getEspelhoEditor(eventId) {
  if (editors.has(eventId)) return editors.get(eventId)
  let config = getEspelhoConfig(eventId)
  let status = 'loading'
  let pending = 0
  let failed = false
  let dirtyPatch = {}
  let revision = 0
  let queue = Promise.resolve()
  const listeners = new Set()
  const snapshot = () => ({ config, status })
  const emit = () => listeners.forEach((listener) => listener(snapshot()))
  const editor = {
    snapshot,
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener) },
    applyRemote(state) {
      if (pending || failed) return
      config = { ...DEFAULT_ESPELHO_CONFIG, ...state?.config }
      revision += 1
      status = 'saved'
      saveEspelhoConfig(eventId, config, false)
      emit()
    },
    async load() {
      if (pending || failed) { emit(); return }
      const startedRevision = revision
      status = 'loading'
      emit()
      try {
        const state = await fetchEspelhoState(eventId)
        if (revision === startedRevision) editor.applyRemote(state)
      } catch {
        if (revision === startedRevision && !pending && !failed) { status = 'load-error'; emit() }
      }
    },
    retry(eventName) { return editor.update(dirtyPatch, eventName) },
    update(patch, eventName) {
      if (status === 'loading' || status === 'load-error') return Promise.resolve(false)
      config = { ...config, ...patch }
      revision += 1
      const draft = { ...config }
      dirtyPatch = { ...dirtyPatch, ...patch }
      const payload = failed ? { ...dirtyPatch } : patch
      if (!pending) failed = false
      pending += 1
      status = 'saving'
      emit()
      const save = queue.then(async () => {
        const saved = await publishEspelhoState(eventId, { config: payload, eventName })
        pending -= 1
        if (!saved) failed = true
        if (!pending) {
          status = failed ? 'error' : 'saved'
          if (!failed) { saveEspelhoConfig(eventId, draft, false); dirtyPatch = {} }
        }
        emit()
        // Reconciliar campos editados por outro aparelho durante nossa gravação.
        if (saved && !pending && !failed) {
          const savedRevision = revision
          try {
            const fresh = await fetchEspelhoState(eventId)
            if (revision === savedRevision && fresh?.config) editor.applyRemote(fresh)
          } catch { /* O POST já confirmou persistência; falha de releitura não desfaz o salvo. */ }
        }
        return saved
      })
      queue = save.catch(() => false)
      return save
    },
  }
  editors.set(eventId, editor)
  return editor
}
