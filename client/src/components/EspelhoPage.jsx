import { useEffect, useState } from 'react'
import {
  DEFAULT_ESPELHO_CONFIG,
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
    return 'EVENTO'
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

  // Suporte a tela cheia (F11 ou duplo clique na tela)
  function handleToggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
  }

  const fontScale = (config.fontSize || 100) / 100

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

      {/* Topo: Logo ou Nome do Evento à esquerda, Tag LIVRE à direita */}
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
            className="espelho-tag-livre"
            style={{ color: config.destaque || '#ff6b00' }}
          >
            LIVRE
          </span>
        </div>
      </header>

      {/* Centro Monumental: Mensagem Livre + Subtítulo */}
      <main className="espelho-screen-main">
        <div className="espelho-hero-box">
          <h2
            className="espelho-hero-headline"
            style={{
              color: config.texto || '#ffffff',
              fontSize: `clamp(34px, ${6.2 * fontScale}vw, ${96 * fontScale}px)`,
            }}
          >
            {config.mensagem?.toUpperCase() || 'GUICHÊ DISPONÍVEL'}
          </h2>

          <p className="espelho-hero-subheadline">
            AGUARDANDO ATLETA
          </p>
        </div>
      </main>

      {/* Rodapé: Indicador de Conexão com o Guichê */}
      <footer className="espelho-screen-footer">
        <div className="espelho-connection-indicator">
          <span className="connection-pulse-dot" />
          <span className="connection-text">CONECTADO AO GUICHÊ</span>
        </div>
      </footer>
    </div>
  )
}
