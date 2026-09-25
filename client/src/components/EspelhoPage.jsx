import { useEffect, useState } from 'react'
import {
  DEFAULT_ESPELHO_CONFIG,
  fetchEspelhoState,
  getEspelhoConfig,
  subscribeEspelhoSSE,
  subscribeEspelhoSync,
} from '../utils/espelhoSync.js'
import './EspelhoPage.css'

function mergeEspelhoConfig(prevConfig, incomingConfig) {
  if (!incomingConfig || typeof incomingConfig !== 'object') return prevConfig
  const merged = { ...prevConfig, ...incomingConfig }
  // Proteção: não anula imagem de fundo ou logo se a atualização remota vier parcial
  if (!incomingConfig.bgImage && prevConfig?.bgImage && incomingConfig.bgImage === undefined) {
    merged.bgImage = prevConfig.bgImage
  }
  if (!incomingConfig.logo && prevConfig?.logo && incomingConfig.logo === undefined) {
    merged.logo = prevConfig.logo
  }
  return merged
}

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

  // 1. Conexão SSE (Server-Sent Events) - Stream em tempo real contínuo (<15ms de latência)
  useEffect(() => {
    if (!eventId) return undefined

    // Consulta inicial imediata para exibir o estado mesmo antes do stream estabelecer
    fetchEspelhoState(eventId)
      .then((state) => {
        if (state) {
          setMirrorState(state)
          setConnected(true)
          if (state.eventName) setRemoteName(state.eventName)
          if (state.config) {
            setConfig((prev) => mergeEspelhoConfig(prev, state.config))
          }
        }
      })
      .catch(() => {})

    const unsubscribeSSE = subscribeEspelhoSSE(
      eventId,
      (state) => {
        setMirrorState(state)
        setConnected(true)
        if (state?.eventName) setRemoteName(state.eventName)
        if (state?.config) {
          setConfig((prev) => mergeEspelhoConfig(prev, state.config))
        }
      },
      (isConnected) => {
        setConnected(isConnected)
      }
    )

    return () => {
      unsubscribeSSE()
    }
  }, [eventId])

  // 2. Sincronização local em 0ms no mesmo navegador (BroadcastChannel + storage events)
  useEffect(() => {
    const unsubscribeSync = subscribeEspelhoSync((msg) => {
      if (msg.type === 'STATE_CHANGE' && (!msg.eventId || msg.eventId === eventId)) {
        if (msg.state) {
          setMirrorState(msg.state)
          setConnected(true)
          if (msg.state.eventName) setRemoteName(msg.state.eventName)
          if (msg.state.config) {
            setConfig((prev) => mergeEspelhoConfig(prev, msg.state.config))
          }
        }
      } else if (msg.type === 'CONFIG_CHANGE' && (!msg.eventId || msg.eventId === eventId)) {
        setConfig((prev) => mergeEspelhoConfig(prev, msg.config || DEFAULT_ESPELHO_CONFIG))
      } else if (msg.type === 'STORAGE_UPDATE') {
        setConfig(getEspelhoConfig(eventId))
      }
    })

    return () => {
      unsubscribeSync()
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

  const thirdPartyName = (() => {
    if (!atleta) return ''
    const recipient = String(atleta.entreguePara || atleta.retiradoPor || '').trim()
    const athleteName = String(atleta.nome || '').trim()
    if (recipient && athleteName && recipient.toUpperCase() !== athleteName.toUpperCase()) {
      return recipient
    }
    return ''
  })()

  function athleteInfoRows() {
    if (!atleta) return []
    const rows = [
      { key: 'numero', label: 'NÚMERO', value: atleta.numero },
      { key: 'nome', label: 'NOME DO ATLETA', value: atleta.nome },
      { key: 'doc', label: 'DOCUMENTO / CPF', value: atleta.doc || atleta.cpf },
      { key: 'sexo', label: 'SEXO', value: atleta.sexo },
      { key: 'nascimento', label: 'NASCIMENTO', value: atleta.nascimento || (atleta.idade ? `${atleta.idade} anos` : '') },
      { key: 'modalidade', label: 'MODALIDADE', value: atleta.modalidade },
      { key: 'categoria', label: 'CATEGORIA', value: atleta.categoria },
      { key: 'equipe', label: 'EQUIPE / ASSESSORIA', value: atleta.equipe },
      { key: 'camiseta', label: 'CAMISETA', value: atleta.camiseta },
      { key: 'kit', label: 'KIT', value: atleta.kit },
      { key: 'chip', label: 'CHIP', value: atleta.chip },
      { key: 'contato', label: 'CONTATO', value: atleta.contato },
      { key: 'cidade', label: 'CIDADE', value: atleta.cidade },
      { key: 'nacionalidade', label: 'NACIONALIDADE', value: atleta.nacionalidade },
      { key: 'morador', label: 'MORADOR / VISITANTE', value: atleta.morador },
      { key: 'nome_peito', label: 'NOME NO PEITO', value: atleta.nome_peito },
      { key: 'pcd', label: 'PCD / OBSERVAÇÃO', value: atleta.pcd },
    ]

    if (atleta.customFields && typeof atleta.customFields === 'object') {
      Object.entries(atleta.customFields).forEach(([key, val]) => {
        if (val && String(val).trim() !== '') {
          rows.push({
            key: `custom:${key}`,
            label: key.toUpperCase(),
            value: String(val),
          })
        }
      })
    }

    const filled = rows.filter((row) => row.value && String(row.value).trim() !== '' && String(row.value).trim() !== '—')

    if (Array.isArray(config?.visibleFields)) {
      const allowed = new Set(config.visibleFields)
      return filled.filter(
        (row) =>
          allowed.has(row.key) ||
          allowed.has(row.key.replace(/^custom:/, '')) ||
          allowed.has(`custom:${row.key}`)
      )
    }

    return filled
  }

  return (
    <div
      className="espelho-screen-container"
      onDoubleClick={handleToggleFullscreen}
      style={{
        backgroundColor: config.fundo || '#071526',
        backgroundImage: config.bgImage
          ? (config.bgImage.startsWith('url(') ? config.bgImage : `url("${config.bgImage}")`)
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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

      {/* Centro: Ficha do atleta rigorosamente espelhada da tela do operador */}
      <main className="espelho-screen-main">
        {atleta ? (
          <div className={`espelho-athlete-card ${statusClass}`}>
            
            {/* Bloco 1: Cards Superiores de Destaque (Idênticos ao topo da ficha de operação) */}
            {(config.showBibCard !== false || config.showShirtCard !== false || (config.showKitCard !== false && atleta.kit && atleta.kit !== '—')) && (
              <div className="espelho-top-highlights-row">
                {/* Card Esquerdo: Modalidade + Categoria no topo, Número gigante no centro, Chip abaixo */}
                {config.showBibCard !== false && (
                  <div className="espelho-highlight-card espelho-bib-card">
                    <div className="espelho-bib-header">
                      <span className="espelho-bib-modalidade" style={{ color: config.destaque || '#ff6b00' }}>
                        {atleta.modalidade || '—'}
                      </span>
                      <span className="espelho-bib-categoria">
                        {atleta.categoria || '—'}
                      </span>
                    </div>
                    <div className="espelho-bib-center">
                      <span
                        className="espelho-bib-number"
                        style={{
                          color: config.texto || '#ffffff',
                          fontSize: `clamp(64px, ${10 * fontScale}vw, ${140 * fontScale}px)`,
                        }}
                      >
                        {atleta.numero || 'Não associado'}
                      </span>
                    </div>
                    <div className="espelho-bib-footer">
                      <span className="espelho-bib-chip">
                        {atleta.chip ? `CHIP: ${atleta.chip}` : 'Chip não associado'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Direito: Camiseta em destaque com letra grande */}
                {config.showShirtCard !== false && (
                  <div className="espelho-highlight-card espelho-shirt-card">
                    <span
                      className="espelho-shirt-size"
                      style={{
                        color: config.texto || '#ffffff',
                        fontSize: `clamp(56px, ${9 * fontScale}vw, ${120 * fontScale}px)`,
                      }}
                    >
                      {atleta.camiseta || '—'}
                    </span>
                    <span className="espelho-shirt-label">CAMISETA</span>
                  </div>
                )}

                {/* Card Kit (se existir na planilha/evento e habilitado) */}
                {config.showKitCard !== false && Boolean(atleta.kit && atleta.kit !== '—' && atleta.kit.trim() !== '') && (
                  <div className="espelho-highlight-card espelho-kit-card">
                    <span className="espelho-kit-name">{atleta.kit}</span>
                    <span className="espelho-kit-label">KIT</span>
                  </div>
                )}
              </div>
            )}

            {/* Bloco 2: Aviso de Retirada por Terceiro (se aplicável e habilitado) */}
            {config.showThirdParty !== false && thirdPartyName && (
              <div className="espelho-third-party-card">
                <span className="espelho-third-party-icon">👤</span>
                <span className="espelho-third-party-label">RETIRADO POR:</span>
                <strong className="espelho-third-party-name">{thirdPartyName}</strong>
                <span className="espelho-third-party-badge">TERCEIRO AUTORIZADO</span>
              </div>
            )}

            {/* Bloco 3: Grid Completo de Dados Rigorosamente Fiel à Planilha Anexada */}
            <div className="espelho-athlete-details-card">
              <div className="espelho-details-header">
                <span className="espelho-details-header-label">DADOS DO ATLETA</span>
                <h2 className="espelho-details-athlete-name">{atleta.nome || 'ATLETA'}</h2>
              </div>

              {athleteInfoRows().length > 0 && (
                <div className="espelho-athlete-info-grid">
                  {athleteInfoRows().map((row) => (
                    <div key={row.key || row.label} className="espelho-athlete-info-item">
                      <span className="espelho-athlete-info-label">{row.label}</span>
                      <span className="espelho-athlete-info-value">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloco 4: Banner Comemorativo de Entrega */}
            {isDelivered && (
              <div className="espelho-athlete-entregue-banner">
                ✓ KIT ENTREGUE COM SUCESSO — BOA CORRIDA!
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

      {/* Rodapé: Indicador de Conexão em Tempo Real */}
      <footer className="espelho-screen-footer">
        <div className={`espelho-connection-indicator ${connected ? '' : 'disconnected'}`}>
          <span className="connection-pulse-dot" />
          <span className="connection-text">
            {connected ? 'TEMPO REAL ATIVO (SSE)' : 'CONECTANDO AO GUICHÊ...'}
          </span>
        </div>
      </footer>
    </div>
  )
}
