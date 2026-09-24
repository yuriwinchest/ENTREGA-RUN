import { useEffect, useState } from 'react'
import {
  DEFAULT_ESPELHO_CONFIG,
  fetchEspelhoState,
  getEspelhoConfig,
  subscribeEspelhoSync,
} from '../utils/espelhoSync.js'
import './EspelhoPage.css'

export default function EspelhoPage({ eventId: propEventId, eventName: propEventName }) {
  // Obtém eventId da prop ou da URL (/espelho/:id)
  const eventId = (() => {
    if (propEventId) return propEventId
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/')
      if (parts[2]) return parts[2]
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('eventId')) return urlParams.get('eventId')
    }
    return ''
  })()

  const [config, setConfig] = useState(() => getEspelhoConfig(eventId))
  const [mirrorState, setMirrorState] = useState(null)
  const [remoteName, setRemoteName] = useState('')
  const [connected, setConnected] = useState(false)
  const eventName = (() => {
    if (propEventName) return propEventName
    try {
      const savedEvents = localStorage.getItem('entregas_run_events')
      if (savedEvents) {
        const events = JSON.parse(savedEvents)
        const found = events.find((e) => e.id === eventId)
        if (found?.name) return found.name
      }
    } catch {
      // fallback
    }
    return remoteName || 'EVENTO'
  })()

  // Sincronização em tempo real via BroadcastChannel e Storage Events
  useEffect(() => {
    const unsubscribe = subscribeEspelhoSync((msg) => {
      if (msg.type === 'CONFIG_CHANGE' && (!msg.eventId || msg.eventId === eventId)) {
        setConfig(msg.config || DEFAULT_ESPELHO_CONFIG)
      } else if (msg.type === 'STORAGE_UPDATE') {
        setConfig(getEspelhoConfig(eventId))
      }
    })

    return () => {
      unsubscribe()
    }
  }, [eventId])

  // Polling do estado público publicado pelo guichê (funciona em
  // qualquer aparelho que abrir o link/QR Code, não só neste PC).
  useEffect(() => {
    if (!eventId) return undefined
    let cancelled = false

    async function poll() {
      try {
        const state = await fetchEspelhoState(eventId)
        if (cancelled) return
        setMirrorState(state)
        setConnected(true)
        if (state?.eventName) setRemoteName(state.eventName)
        if (state?.config) setConfig({ ...DEFAULT_ESPELHO_CONFIG, ...state.config })
      } catch {
        if (!cancelled) setConnected(false)
      }
    }

    poll()
    const interval = window.setInterval(poll, 2000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [eventId])

  // Suporte a tela cheia (F11 ou duplo clique na tela)
  function handleToggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
  }

  const fontScale = (config.fontSize || 100) / 100
  const mirrorStatus = mirrorState?.status || 'LIVRE'
  const atleta = mirrorState?.atleta || null
  const isDelivered = mirrorStatus === 'ENTREGUE' && atleta
  const isAttending = mirrorStatus === 'ATENDENDO' && atleta
  const statusLabel = isDelivered ? 'ENTREGUE' : isAttending ? 'ATENDENDO' : 'LIVRE'
  const statusClass = isDelivered
    ? 'status-entregue'
    : isAttending
      ? 'status-atendendo'
      : 'status-livre'

  function athleteInfoRows() {
    if (!atleta) return []
    const rows = [
      { label: 'DOCUMENTO / CPF', value: atleta.doc || atleta.cpf },
      { label: 'CIDADE / UF', value: atleta.cidade },
      { label: 'NASCIMENTO', value: atleta.nascimento || (atleta.idade ? `${atleta.idade} anos` : '') },
      { label: 'CATEGORIA', value: atleta.categoria },
      { label: 'SEXO', value: atleta.sexo },
      { label: 'EQUIPE / ASSESSORIA', value: atleta.equipe },
      { label: 'NOME NO PEITO', value: atleta.nome_peito },
      { label: 'PCD / OBSERVAÇÃO', value: atleta.pcd },
    ]

    if (atleta.customFields && typeof atleta.customFields === 'object') {
      Object.entries(atleta.customFields).forEach(([key, val]) => {
        if (val && String(val).trim() !== '') {
          rows.push({ label: key.toUpperCase(), value: String(val) })
        }
      })
    }

    return rows.filter((row) => row.value && String(row.value).trim() !== '' && String(row.value).trim() !== '—')
  }

  return (
    <div
      className="espelho-screen-container"
      onDoubleClick={handleToggleFullscreen}
      style={{
        backgroundColor: config.fundo || '#071526',
        backgroundImage: config.bgImage ? `url(${config.bgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay escuro sutil para garantir legibilidade perfeita se houver foto de fundo */}
      {config.bgImage && <div className="espelho-screen-overlay" />}

      {/* Topo: Logo ou Nome do Evento à esquerda, Status do guichê à direita */}
      <header className="espelho-screen-header">
        <div className="espelho-header-brand">
          {config.logo ? (
            <img
              src={config.logo}
              alt="Logo do Evento"
              className="espelho-brand-logo"
            />
          ) : (
            <h1 className="espelho-brand-title">{eventName}</h1>
          )}
        </div>

        <div className="espelho-header-status">
          <span
            className={`espelho-tag-livre ${statusClass}`}
            style={!isDelivered && !isAttending ? { color: config.destaque || '#ff6b00' } : undefined}
          >
            {statusLabel}
          </span>
        </div>
      </header>

      {/* Centro: Ficha do atleta espelhada ou mensagem de guichê livre */}
      <main className="espelho-screen-main">
        {atleta ? (
          <div className={`espelho-athlete-card ${statusClass}`}>
            <div className="espelho-athlete-topline">
              <span
                className="espelho-athlete-modalidade"
                style={{ color: config.destaque || '#ff6b00' }}
              >
                {[atleta.modalidade, atleta.categoria].filter(Boolean).join(' • ') || 'ATLETA'}
              </span>
            </div>

            <div className="espelho-numero-box">
              <span className="espelho-numero-label">NÚMERO DE PEITO</span>
              <h2
                className="espelho-athlete-numero"
                style={{
                  color: config.texto || '#ffffff',
                  fontSize: `clamp(64px, ${11 * fontScale}vw, ${160 * fontScale}px)`,
                }}
              >
                {atleta.numero || '—'}
              </h2>
            </div>

            {atleta.nome && (
              <h3
                className="espelho-athlete-nome"
                style={{ color: config.texto || '#ffffff' }}
              >
                {atleta.nome}
              </h3>
            )}

            <div className="espelho-athlete-chips-row">
              {atleta.kit && (
                <div className="espelho-athlete-chip">
                  <strong className="espelho-athlete-chip-value">{atleta.kit}</strong>
                  <span className="espelho-athlete-chip-label">KIT</span>
                </div>
              )}
              {atleta.camiseta && (
                <div className="espelho-athlete-chip">
                  <strong className="espelho-athlete-chip-value">{atleta.camiseta}</strong>
                  <span className="espelho-athlete-chip-label">CAMISETA</span>
                </div>
              )}
              {atleta.chip && (
                <div className="espelho-athlete-chip">
                  <strong className="espelho-athlete-chip-value">{atleta.chip}</strong>
                  <span className="espelho-athlete-chip-label">CHIP</span>
                </div>
              )}
            </div>

            {athleteInfoRows().length > 0 && (
              <div className="espelho-athlete-info-grid">
                {athleteInfoRows().map((row) => (
                  <div key={row.label} className="espelho-athlete-info-item">
                    <span className="espelho-athlete-info-label">{row.label}</span>
                    <span className="espelho-athlete-info-value">{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {isDelivered && (
              <div className="espelho-athlete-entregue-banner">
                ✓ KIT ENTREGUE — BOM PROVEITO E BOA CORRIDA!
              </div>
            )}
          </div>
        ) : (
          <div className="espelho-hero-box">
            <span className="espelho-badge-aguardando">AGUARDANDO LEITURA</span>
            <h2
              className="espelho-hero-headline"
              style={{
                color: config.texto || '#ffffff',
                fontSize: `clamp(32px, ${5.5 * fontScale}vw, ${88 * fontScale}px)`,
              }}
            >
              {config.mensagem?.toUpperCase() || 'GUICHÊ DISPONÍVEL'}
            </h2>

            <p className="espelho-hero-subheadline">
              APRESENTE SEU DOCUMENTO NO BALCÃO
            </p>
          </div>
        )}
      </main>

      {/* Rodapé: Indicador de Conexão com o Guichê */}
      <footer className="espelho-screen-footer">
        <div className={`espelho-connection-indicator ${connected ? '' : 'disconnected'}`}>
          <span className="connection-pulse-dot" />
          <span className="connection-text">
            {connected ? 'CONECTADO AO GUICHÊ' : 'CONECTANDO AO GUICHÊ...'}
          </span>
        </div>
      </footer>
    </div>
  )
}
