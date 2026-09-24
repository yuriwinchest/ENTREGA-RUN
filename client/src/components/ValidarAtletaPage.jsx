import { useEffect, useState } from 'react'
import { apiPublicValidateAthlete } from '../utils/eventsApi.js'
import './ValidarAtletaPage.css'

function CheckCircleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function RefreshCwIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export default function ValidarAtletaPage({ eventId, numero }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function loadAthleteData(isManual = false) {
    if (isManual) setRefreshing(true)
    else setLoading(true)
    setErrorMsg('')

    const res = await apiPublicValidateAthlete(eventId, numero)

    if (res?.data?.ok && res.data.athlete) {
      setData(res.data)
      setErrorMsg('')
    } else {
      setErrorMsg(res?.data?.message || 'Atleta não encontrado para este evento.')
      if (res?.data?.eventName) {
        setData((prev) => ({ ...prev, eventName: res.data.eventName }))
      }
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    if (eventId && numero) {
      loadAthleteData()
    } else {
      setLoading(false)
      setErrorMsg('Parâmetros de validação inválidos na URL.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, numero])

  const athlete = data?.athlete
  const isEntregue = athlete?.status === 'ENTREGUE'
  const eventName = data?.eventName || 'EVENTO ESPORTIVO'

  return (
    <div className="validar-page-wrapper">
      <div className="validar-page-container">
        {/* Header Oficial */}
        <header className="validar-header">
          <div className="validar-brand">
            <span className="validar-brand-badge">ENTREGAS RUN</span>
            <span className="validar-brand-sub">SISTEMA OFICIAL DE CRONOMETRAGEM & KITS</span>
          </div>
          <h1 className="validar-event-title">{eventName}</h1>
        </header>

        {loading ? (
          <div className="validar-card-loading">
            <div className="validar-spinner" />
            <p>Consultando base oficial do evento...</p>
          </div>
        ) : errorMsg ? (
          <div className="validar-card-error">
            <div className="validar-error-icon">
              <AlertTriangleIcon />
            </div>
            <h2>Ficha Não Localizada</h2>
            <p>{errorMsg}</p>
            <div className="validar-error-tip">
              Certifique-se de que o número do atleta ou o link lido pertença ao evento ativo.
            </div>
            <button
              type="button"
              className="validar-retry-btn"
              onClick={() => loadAthleteData(true)}
            >
              <RefreshCwIcon />
              <span>Tentar Novamente</span>
            </button>
          </div>
        ) : (
          <div className="validar-card-main">
            {/* Status Banner */}
            <div className={`validar-status-banner ${isEntregue ? 'status-entregue' : 'status-pendente'}`}>
              <div className="validar-status-icon">
                {isEntregue ? <CheckCircleIcon /> : <ClockIcon />}
              </div>
              <div className="validar-status-info">
                <span className="validar-status-label">STATUS DA ENTREGA</span>
                <h2 className="validar-status-text">
                  {isEntregue ? 'KIT ENTREGUE' : 'PENDENTE DE RETIRADA'}
                </h2>
                {isEntregue && athlete.entregueEm && (
                  <p className="validar-status-details">
                    Entregue em: <strong>{athlete.entregueEm}</strong>
                    {athlete.entreguePor ? ` · Por: ${athlete.entreguePor}` : ''}
                  </p>
                )}
                {!isEntregue && (
                  <p className="validar-status-details">
                    Apresente documento original com foto no guichê para retirada.
                  </p>
                )}
              </div>
            </div>

            {/* Destaque do Atleta */}
            <div className="validar-athlete-hero">
              <div className="validar-number-box">
                <span className="validar-number-label">NÚMERO DE PEITO</span>
                <span className="validar-number-value">#{athlete.numero}</span>
              </div>
              <div className="validar-name-box">
                <span className="validar-name-label">ATLETA</span>
                <h3 className="validar-name-value">{athlete.nome}</h3>
              </div>
            </div>

            {/* Grade de Detalhes do Atleta */}
            <div className="validar-details-grid">
              <div className="validar-detail-item">
                <span className="detail-item-label">DOCUMENTO / CPF</span>
                <span className="detail-item-value">{athlete.doc || '—'}</span>
              </div>

              <div className="validar-detail-item">
                <span className="detail-item-label">MODALIDADE</span>
                <span className="detail-item-value highlight">{athlete.modalidade || '—'}</span>
              </div>

              <div className="validar-detail-item">
                <span className="detail-item-label">CATEGORIA</span>
                <span className="detail-item-value">{athlete.categoria || '—'}</span>
              </div>

              <div className="validar-detail-item">
                <span className="detail-item-label">TAMANHO DA CAMISETA</span>
                <span className="detail-item-value highlight-shirt">{athlete.camiseta || '—'}</span>
              </div>

              {athlete.kit && (
                <div className="validar-detail-item">
                  <span className="detail-item-label">KIT</span>
                  <span className="detail-item-value">{athlete.kit}</span>
                </div>
              )}

              {athlete.chip && (
                <div className="validar-detail-item">
                  <span className="detail-item-label">CHIP DE CRONOMETRAGEM</span>
                  <span className="detail-item-value chip-badge">{athlete.chip}</span>
                </div>
              )}

              {athlete.sexo && (
                <div className="validar-detail-item">
                  <span className="detail-item-label">SEXO</span>
                  <span className="detail-item-value">{athlete.sexo}</span>
                </div>
              )}

              {athlete.equipe && athlete.equipe !== 'SEM EQUIPE' && (
                <div className="validar-detail-item">
                  <span className="detail-item-label">EQUIPE / ASSESSORIA</span>
                  <span className="detail-item-value">{athlete.equipe}</span>
                </div>
              )}

              {/* Campos personalizados da planilha */}
              {athlete.customFields && Object.entries(athlete.customFields).map(([k, v]) => (
                <div key={k} className="validar-detail-item">
                  <span className="detail-item-label">{String(k).toUpperCase()}</span>
                  <span className="detail-item-value">{String(v || '—')}</span>
                </div>
              ))}
            </div>

            {/* Ações e Atualização */}
            <div className="validar-footer-actions">
              <button
                type="button"
                className="validar-refresh-btn"
                onClick={() => loadAthleteData(true)}
                disabled={refreshing}
              >
                <RefreshCwIcon />
                <span>{refreshing ? 'Atualizando...' : 'Atualizar Status em Tempo Real'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Rodapé de Segurança */}
        <footer className="validar-security-footer">
          <div className="validar-security-seal">
            <ShieldCheckIcon />
            <span>Validação Autenticada · Entregas Run</span>
          </div>
          <p className="validar-security-text">
            Este comprovante digital reflete os registros do banco de dados oficial do evento em tempo real.
          </p>
        </footer>
      </div>
    </div>
  )
}
