import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  DEFAULT_ESPELHO_CONFIG,
  compressImageFile,
  getEspelhoConfig,
  publishEspelhoState,
  saveEspelhoConfig,
} from '../utils/espelhoSync.js'
import './EspelhoModal.css'

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

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

const STANDARD_FIELD_DEFS = [
  { key: 'nome', label: 'Nome Completo', category: 'Identificação' },
  { key: 'numero', label: 'Número de Peito', category: 'Identificação' },
  { key: 'doc', label: 'Documento / CPF', category: 'Identificação' },
  { key: 'sexo', label: 'Sexo', category: 'Dados Pessoais' },
  { key: 'nascimento', label: 'Data de Nascimento', category: 'Dados Pessoais' },
  { key: 'modalidade', label: 'Modalidade', category: 'Competição' },
  { key: 'categoria', label: 'Categoria', category: 'Competição' },
  { key: 'equipe', label: 'Equipe / Assessoria', category: 'Competição' },
  { key: 'camiseta', label: 'Tamanho da Camiseta', category: 'Kit & Entrega' },
  { key: 'kit', label: 'Tipo de Kit', category: 'Kit & Entrega' },
  { key: 'chip', label: 'Número do Chip', category: 'Kit & Entrega' },
  { key: 'cidade', label: 'Cidade / UF', category: 'Localização' },
  { key: 'morador', label: 'Morador / Visitante', category: 'Localização' },
  { key: 'contato', label: 'Contato / Telefone', category: 'Comunicação' },
  { key: 'nome_peito', label: 'Nome no Peito', category: 'Personalização' },
  { key: 'pcd', label: 'PCD / Observação', category: 'Atendimento' },
  { key: 'nacionalidade', label: 'Nacionalidade', category: 'Dados Pessoais' },
]

export default function EspelhoModal({ isOpen, onClose, event, columns = [] }) {
  const [activeTab, setActiveTab] = useState('acesso') // 'acesso' | 'aparencia' | 'campos'
  const [config, setConfig] = useState(() => getEspelhoConfig(event?.id))
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const bgInputRef = useRef(null)
  const logoInputRef = useRef(null)

  const eventId = event?.id || ''
  const eventName = event?.name || 'EVENTO'

  // URL do espelho (compatível com localhost ou produção)
  const getEspelhoUrl = () => {
    if (typeof window === 'undefined') return '/espelho'
    return `${window.location.origin}/espelho/${eventId}`
  }

  // Gera o QR Code da URL pública sempre que o modal abre/troca de evento
  useEffect(() => {
    if (!isOpen || !eventId) {
      setQrDataUrl('')
      return
    }
    let cancelled = false
    QRCode.toDataURL(getEspelhoUrl(), {
      width: 640,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0c142c', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventId])

  const customColumns = useMemo(() => {
    if (!Array.isArray(columns)) return []
    return columns
      .filter((col) => col.type === 'custom' && col.customKey)
      .map((col) => ({
        key: col.key || `custom:${col.customKey}`,
        customKey: col.customKey,
        label: col.label || col.customKey.toUpperCase(),
        category: 'Coluna da Planilha',
      }))
  }, [columns])

  const allSelectableKeys = useMemo(() => {
    const keys = STANDARD_FIELD_DEFS.map((f) => f.key)
    customColumns.forEach((c) => {
      if (!keys.includes(c.key)) keys.push(c.key)
    })
    return keys
  }, [customColumns])

  const visibleFieldsCount = useMemo(() => {
    if (!config.visibleFields) return allSelectableKeys.length
    const vfSet = new Set(config.visibleFields)
    return allSelectableKeys.filter(
      (k) =>
        vfSet.has(k) ||
        vfSet.has(k.replace(/^custom:/, '')) ||
        vfSet.has(`custom:${k}`)
    ).length
  }, [config.visibleFields, allSelectableKeys])

  if (!isOpen) return null

  function isFieldVisible(fieldKey) {
    if (!config.visibleFields) return true
    return (
      config.visibleFields.includes(fieldKey) ||
      config.visibleFields.includes(fieldKey.replace(/^custom:/, '')) ||
      config.visibleFields.includes(`custom:${fieldKey}`)
    )
  }

  function updateConfig(newPartial) {
    const updated = { ...config, ...newPartial }
    setConfig(updated)
    saveEspelhoConfig(eventId, updated)
    // Espelho remoto (celular/TV via QR) herda a aparência pelo servidor
    publishEspelhoState(eventId, { config: updated, eventName })
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

    // Crowley (Segurança): apenas imagens até 5MB
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5 MB.')
      return
    }

    // Se for SVG e menor que 500KB, lê direto como dataUrl
    if (file.type === 'image/svg+xml' && file.size < 500 * 1024) {
      const reader = new FileReader()
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target?.result
        if (typeof dataUrl === 'string') {
          updateConfig({ [field]: dataUrl })
        }
      }
      reader.readAsDataURL(file)
      return
    }

    // Otimização automática: redimensionar client-side para carregar instantaneamente no espelho
    const maxWidth = field === 'bgImage' ? 1920 : 600
    const maxHeight = field === 'bgImage' ? 1080 : 300
    const quality = field === 'bgImage' ? 0.82 : 0.88

    compressImageFile(file, maxWidth, maxHeight, quality)
      .then((dataUrl) => {
        if (dataUrl) {
          updateConfig({ [field]: dataUrl })
        }
      })
      .catch(() => {
        const reader = new FileReader()
        reader.onload = (loadEvt) => {
          const dataUrl = loadEvt.target?.result
          if (typeof dataUrl === 'string') {
            updateConfig({ [field]: dataUrl })
          }
        }
        reader.readAsDataURL(file)
      })
  }

  function toggleField(fieldKey) {
    let current = config.visibleFields
    if (!current) {
      current = [...allSelectableKeys]
    }
    const isVis = isFieldVisible(fieldKey)
    let next
    if (isVis) {
      next = current.filter(
        (k) =>
          k !== fieldKey &&
          k !== fieldKey.replace(/^custom:/, '') &&
          k !== `custom:${fieldKey}`
      )
    } else {
      next = [...current, fieldKey]
    }
    updateConfig({ visibleFields: next })
  }

  function handleSelectAllFields() {
    updateConfig({
      visibleFields: [...allSelectableKeys],
      showBibCard: true,
      showShirtCard: true,
      showKitCard: true,
      showThirdParty: true,
    })
  }

  function handleDeselectAllFields() {
    updateConfig({
      visibleFields: [],
    })
  }

  function handleRestoreFieldsDefault() {
    updateConfig({
      visibleFields: null,
      showBibCard: true,
      showShirtCard: true,
      showKitCard: true,
      showThirdParty: true,
    })
  }

  function handleRestoreDefault() {
    setConfig(DEFAULT_ESPELHO_CONFIG)
    saveEspelhoConfig(eventId, DEFAULT_ESPELHO_CONFIG)
    publishEspelhoState(eventId, { config: DEFAULT_ESPELHO_CONFIG, eventName })
  }

  return (
    <div className="espelho-modal-backdrop" onClick={onClose}>
      <div
        className={`espelho-modal-card ${activeTab !== 'acesso' ? 'wide-mode' : ''}`}
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
            <button
              type="button"
              className={`espelho-tab-btn ${activeTab === 'campos' ? 'active' : ''}`}
              onClick={() => setActiveTab('campos')}
            >
              CAMPOS DO TELÃO
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

            {/* QR Code para abrir o espelho em outro aparelho */}
            <div className="espelho-qr-section">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code para abrir o espelho do evento ${eventName}`}
                  className="espelho-qr-image"
                />
              ) : (
                <div className="espelho-qr-placeholder" aria-hidden="true" />
              )}
              <p className="espelho-qr-hint">
                Aponte a câmera do celular para abrir a tela pública do espelho em
                qualquer aparelho.
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

        {/* CORPO DO MODAL — ABA CAMPOS DO TELÃO */}
        {activeTab === 'campos' && (
          <div className="espelho-modal-body campos-body">
            {/* Toolbar Superior */}
            <div className="campos-top-toolbar">
              <div className="campos-toolbar-info">
                <h3 className="campos-title">INFORMAÇÕES EXIBIDAS NO TELÃO</h3>
                <p className="campos-subtitle">
                  Marque ou desmarque os blocos e informações cadastrais que serão exibidos na segunda tela para o competidor.
                </p>
              </div>

              <div className="campos-toolbar-actions">
                <span className="campos-count-badge">
                  <strong>{visibleFieldsCount}</strong> de {allSelectableKeys.length} campos ativos
                </span>
                <button
                  type="button"
                  className="btn-campos-action"
                  onClick={handleSelectAllFields}
                >
                  SELECIONAR TODOS
                </button>
                <button
                  type="button"
                  className="btn-campos-action"
                  onClick={handleDeselectAllFields}
                >
                  DESMARCAR TODOS
                </button>
                <button
                  type="button"
                  className="btn-campos-action btn-campos-restore"
                  onClick={handleRestoreFieldsDefault}
                >
                  <UndoIcon />
                  <span>PADRÃO</span>
                </button>
              </div>
            </div>

            {/* Seção 1: CARDS DE DESTAQUE (TOPO DO TELÃO) */}
            <div className="campos-section">
              <div className="campos-section-header">
                <span className="campos-section-tag">CARDS DE DESTAQUE</span>
                <h4 className="campos-section-title">Topo da Segunda Tela</h4>
              </div>
              <div className="campos-cards-grid">
                <div
                  className={`campo-toggle-card ${config.showBibCard !== false ? 'checked' : ''}`}
                  onClick={() => updateConfig({ showBibCard: config.showBibCard === false })}
                >
                  <div className="campo-toggle-left">
                    <span className="campo-custom-checkbox">
                      {config.showBibCard !== false && <CheckIcon />}
                    </span>
                    <div className="campo-toggle-meta">
                      <strong className="campo-toggle-label">Número de Peito</strong>
                      <span className="campo-toggle-desc">Número gigante com modalidade e categoria</span>
                    </div>
                  </div>
                  <span className="campo-badge-tag">CARD TOPO</span>
                </div>

                <div
                  className={`campo-toggle-card ${config.showShirtCard !== false ? 'checked' : ''}`}
                  onClick={() => updateConfig({ showShirtCard: config.showShirtCard === false })}
                >
                  <div className="campo-toggle-left">
                    <span className="campo-custom-checkbox">
                      {config.showShirtCard !== false && <CheckIcon />}
                    </span>
                    <div className="campo-toggle-meta">
                      <strong className="campo-toggle-label">Tamanho da Camiseta</strong>
                      <span className="campo-toggle-desc">Destaque com letra grande no topo</span>
                    </div>
                  </div>
                  <span className="campo-badge-tag">CARD TOPO</span>
                </div>

                <div
                  className={`campo-toggle-card ${config.showKitCard !== false ? 'checked' : ''}`}
                  onClick={() => updateConfig({ showKitCard: config.showKitCard === false })}
                >
                  <div className="campo-toggle-left">
                    <span className="campo-custom-checkbox">
                      {config.showKitCard !== false && <CheckIcon />}
                    </span>
                    <div className="campo-toggle-meta">
                      <strong className="campo-toggle-label">Tipo de Kit</strong>
                      <span className="campo-toggle-desc">Exibe nome do kit quando aplicável</span>
                    </div>
                  </div>
                  <span className="campo-badge-tag">CARD TOPO</span>
                </div>

                <div
                  className={`campo-toggle-card ${config.showThirdParty !== false ? 'checked' : ''}`}
                  onClick={() => updateConfig({ showThirdParty: config.showThirdParty === false })}
                >
                  <div className="campo-toggle-left">
                    <span className="campo-custom-checkbox">
                      {config.showThirdParty !== false && <CheckIcon />}
                    </span>
                    <div className="campo-toggle-meta">
                      <strong className="campo-toggle-label">Retirada por Terceiro</strong>
                      <span className="campo-toggle-desc">Aviso quando retirado por terceiro</span>
                    </div>
                  </div>
                  <span className="campo-badge-tag">ALERTA</span>
                </div>
              </div>
            </div>

            {/* Seção 2: DADOS DO ATLETA (GRADE PRINCIPAL) */}
            <div className="campos-section">
              <div className="campos-section-header">
                <span className="campos-section-tag">GRADE DE DADOS</span>
                <h4 className="campos-section-title">Campos do Cadastro do Atleta</h4>
              </div>
              <div className="campos-items-grid">
                {STANDARD_FIELD_DEFS.map((field) => {
                  const visible = isFieldVisible(field.key)
                  return (
                    <div
                      key={field.key}
                      className={`campo-item-pill ${visible ? 'active' : ''}`}
                      onClick={() => toggleField(field.key)}
                    >
                      <span className="campo-custom-checkbox">
                        {visible && <CheckIcon />}
                      </span>
                      <div className="campo-item-text">
                        <span className="campo-item-label">{field.label}</span>
                        <span className="campo-item-category">{field.category}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Seção 3: COLUNAS PERSONALIZADAS DA PLANILHA (SE HOUVER) */}
            {customColumns.length > 0 && (
              <div className="campos-section">
                <div className="campos-section-header">
                  <span className="campos-section-tag custom">PERSONALIZADOS</span>
                  <h4 className="campos-section-title">Colunas da Planilha do Evento</h4>
                </div>
                <div className="campos-items-grid">
                  {customColumns.map((col) => {
                    const visible = isFieldVisible(col.key)
                    return (
                      <div
                        key={col.key}
                        className={`campo-item-pill custom-pill ${visible ? 'active' : ''}`}
                        onClick={() => toggleField(col.key)}
                      >
                        <span className="campo-custom-checkbox">
                          {visible && <CheckIcon />}
                        </span>
                        <div className="campo-item-text">
                          <span className="campo-item-label">{col.label}</span>
                          <span className="campo-item-category">Coluna da Planilha</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Rodapé da aba de campos */}
            <div className="campos-footer-bar">
              <div className="campos-footer-note">
                <span className="note-pulse-dot" />
                <span>As alterações são transmitidas em tempo real para a segunda tela via SSE.</span>
              </div>
              <button
                type="button"
                className="btn-abrir-telao-campos"
                onClick={handleOpenSecondScreen}
              >
                <MonitorIcon />
                <span>ABRIR SEGUNDA TELA</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
