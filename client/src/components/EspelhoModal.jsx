import { useRef, useState } from 'react'
import {
  DEFAULT_ESPELHO_CONFIG,
  getEspelhoConfig,
  saveEspelhoConfig,
} from '../utils/espelhoSync.js'
import './EspelhoModal.css'

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

export default function EspelhoModal({ isOpen, onClose, event }) {
  const [activeTab, setActiveTab] = useState('acesso') // 'acesso' | 'aparencia'
  const [config, setConfig] = useState(() => getEspelhoConfig(event?.id))
  const [copied, setCopied] = useState(false)
  const bgInputRef = useRef(null)
  const logoInputRef = useRef(null)

  const eventId = event?.id || ''
  const eventName = event?.name || 'EVENTO'

  // URL do espelho (compatível com localhost ou produção)
  const getEspelhoUrl = () => {
    if (typeof window === 'undefined') return '/espelho'
    return `${window.location.origin}/espelho/${eventId}`
  }

  if (!isOpen) return null

  function updateConfig(newPartial) {
    const updated = { ...config, ...newPartial }
    setConfig(updated)
    saveEspelhoConfig(eventId, updated)
  }

  function handleOpenSecondScreen() {
    const url = getEspelhoUrl()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleCopy() {
    const url = getEspelhoUrl()
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleImageUpload(e, field) {
    const file = e.target.files?.[0]
    if (!file) return

    // Crowley (Segurança): apenas imagens até 2.5MB
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).')
      return
    }
    if (file.size > 2.5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2.5 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result
      if (typeof dataUrl === 'string') {
        updateConfig({ [field]: dataUrl })
      }
    }
    reader.readAsDataURL(file)
  }

  function handleRestoreDefault() {
    setConfig(DEFAULT_ESPELHO_CONFIG)
    saveEspelhoConfig(eventId, DEFAULT_ESPELHO_CONFIG)
  }

  return (
    <div className="espelho-modal-backdrop" onClick={onClose}>
      <div
        className={`espelho-modal-card ${activeTab === 'aparencia' ? 'wide-mode' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal: Abas e Botão Fechar */}
        <div className="espelho-modal-header">
          <div className="espelho-tabs-pill">
            <button
              type="button"
              className={`espelho-tab-btn ${activeTab === 'acesso' ? 'active' : ''}`}
              onClick={() => setActiveTab('acesso')}
            >
              ACESSO
            </button>
            <button
              type="button"
              className={`espelho-tab-btn ${activeTab === 'aparencia' ? 'active' : ''}`}
              onClick={() => setActiveTab('aparencia')}
            >
              APARÊNCIA
            </button>
          </div>

          <button
            type="button"
            className="espelho-close-btn"
            onClick={onClose}
            title="Fechar"
          >
            <CloseIcon />
          </button>
        </div>

        {/* CORPO DO MODAL — ABA ACESSO */}
        {activeTab === 'acesso' && (
          <div className="espelho-modal-body acesso-body">
            <div className="espelho-monitor-banner">
              <div className="monitor-icon-badge">
                <MonitorIcon />
              </div>
              <h3 className="espelho-access-title">ESPELHO DA SEGUNDA TELA</h3>
              <p className="espelho-helper-text">
                A segunda tela espelha em tempo real a busca e a ficha aberta aqui.
              </p>
            </div>

            {/* Botão Primário Navy */}
            <button
              type="button"
              className="btn-abrir-segunda-tela-primary"
              onClick={handleOpenSecondScreen}
            >
              ABRIR SEGUNDA TELA
            </button>

            {/* Ação de Copiar Link (sutil) */}
            <button
              type="button"
              className="btn-copy-link-subtle"
              onClick={handleCopy}
              title="Copiar link da segunda tela"
            >
              <CopyIcon />
              <span>{copied ? 'Link copiado com sucesso!' : 'Copiar link da segunda tela'}</span>
            </button>
          </div>
        )}

        {/* CORPO DO MODAL — ABA APARÊNCIA */}
        {activeTab === 'aparencia' && (
          <div className="espelho-modal-body aparencia-body">
            <div className="aparencia-columns-grid">
              {/* Coluna Esquerda: PRÉVIA */}
              <div className="aparencia-left-col">
                <span className="aparencia-section-title">PRÉVIA</span>

                {/* Frame de Prévia Proporcional */}
                <div
                  className="espelho-preview-frame"
                  style={{
                    backgroundColor: config.fundo,
                    backgroundImage: config.bgImage ? `url(${config.bgImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Topo da Prévia */}
                  <div className="preview-top-bar">
                    {config.logo ? (
                      <img
                        src={config.logo}
                        alt="Logo"
                        className="preview-logo-img"
                      />
                    ) : (
                      <span className="preview-event-name">{eventName}</span>
                    )}

                    <span
                      className="preview-badge-livre"
                      style={{ color: config.destaque }}
                    >
                      LIVRE
                    </span>
                  </div>

                  {/* Centro da Prévia */}
                  <div className="preview-center-content">
                    <h2
                      className="preview-headline"
                      style={{
                        color: config.texto,
                        fontSize: `${(config.fontSize / 100) * 19}px`,
                      }}
                    >
                      {config.mensagem?.toUpperCase() || 'GUICHÊ DISPONÍVEL'}
                    </h2>
                    <span className="preview-subheadline">
                      AGUARDANDO ATLETA
                    </span>
                  </div>
                </div>

                {/* Botão ABRIR SEGUNDA TELA com Borda Verde */}
                <button
                  type="button"
                  className="btn-abrir-segunda-tela-outline"
                  onClick={handleOpenSecondScreen}
                >
                  ABRIR SEGUNDA TELA
                </button>
              </div>

              {/* Coluna Direita: CONTROLES */}
              <div className="aparencia-right-col">
                {/* Linha das 3 Cores */}
                <div className="colors-picker-grid">
                  {/* FUNDO */}
                  <div className="color-control-item">
                    <span className="control-label">FUNDO</span>
                    <label
                      className="color-swatch-box"
                      style={{ backgroundColor: config.fundo }}
                      title="Escolher cor de fundo"
                    >
                      <input
                        type="color"
                        value={config.fundo}
                        onChange={(e) => updateConfig({ fundo: e.target.value })}
                        className="native-color-input"
                      />
                    </label>
                  </div>

                  {/* TEXTO */}
                  <div className="color-control-item">
                    <span className="control-label">TEXTO</span>
                    <label
                      className="color-swatch-box"
                      style={{ backgroundColor: config.texto }}
                      title="Escolher cor do texto"
                    >
                      <input
                        type="color"
                        value={config.texto}
                        onChange={(e) => updateConfig({ texto: e.target.value })}
                        className="native-color-input"
                      />
                    </label>
                  </div>

                  {/* DESTAQUE */}
                  <div className="color-control-item">
                    <span className="control-label">DESTAQUE</span>
                    <label
                      className="color-swatch-box"
                      style={{ backgroundColor: config.destaque }}
                      title="Escolher cor de destaque"
                    >
                      <input
                        type="color"
                        value={config.destaque}
                        onChange={(e) => updateConfig({ destaque: e.target.value })}
                        className="native-color-input"
                      />
                    </label>
                  </div>
                </div>

                {/* Slider de Tamanho da Fonte */}
                <div className="font-size-control-group">
                  <span className="control-label">
                    TAMANHO DA FONTE — {config.fontSize}%
                  </span>
                  <div className="range-slider-wrap">
                    <input
                      type="range"
                      min="70"
                      max="150"
                      step="5"
                      value={config.fontSize}
                      onChange={(e) =>
                        updateConfig({ fontSize: Number(e.target.value) })
                      }
                      className="orange-range-slider"
                    />
                  </div>
                </div>

                {/* Mensagem Quando Livre */}
                <div className="message-control-group">
                  <span className="control-label">MENSAGEM QUANDO LIVRE</span>
                  <input
                    type="text"
                    className="control-text-input"
                    value={config.mensagem}
                    onChange={(e) => updateConfig({ mensagem: e.target.value })}
                    placeholder="Guichê disponível"
                  />
                </div>

                {/* Uploads: Imagem de Fundo e Logo */}
                <div className="uploads-row-grid">
                  {/* Imagem de Fundo */}
                  <div className="upload-control-item">
                    <div className="upload-label-row">
                      <span className="control-label">IMAGEM DE FUNDO</span>
                      {config.bgImage && (
                        <button
                          type="button"
                          className="btn-clear-media"
                          onClick={() => updateConfig({ bgImage: null })}
                          title="Remover imagem de fundo"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-upload-media"
                      onClick={() => bgInputRef.current?.click()}
                    >
                      <ImageIcon />
                      <span>{config.bgImage ? 'ALTERAR' : 'ENVIAR'}</span>
                    </button>
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImageUpload(e, 'bgImage')}
                    />
                  </div>

                  {/* Logo */}
                  <div className="upload-control-item">
                    <div className="upload-label-row">
                      <span className="control-label">LOGO</span>
                      {config.logo && (
                        <button
                          type="button"
                          className="btn-clear-media"
                          onClick={() => updateConfig({ logo: null })}
                          title="Remover logo"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-upload-media"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <ImageIcon />
                      <span>{config.logo ? 'ALTERAR' : 'ENVIAR'}</span>
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImageUpload(e, 'logo')}
                    />
                  </div>
                </div>

                {/* Botão Restaurar Padrão */}
                <button
                  type="button"
                  className="btn-restaurar-padrao"
                  onClick={handleRestoreDefault}
                >
                  <UndoIcon />
                  <span>RESTAURAR PADRÃO</span>
                </button>

                {/* Nota de rodapé */}
                <div className="aparencia-footer-note">
                  <span className="note-palette-icon">🎨</span>
                  <span>As alterações são aplicadas na hora na segunda tela.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
