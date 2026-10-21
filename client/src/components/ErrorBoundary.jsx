import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Erro capturado na árvore de componentes:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoEvents = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onNavigate) {
      this.props.onNavigate('eventos')
    } else {
      window.location.href = '/eventos'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #070c1e 0%, #0d1733 100%)',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          padding: '24px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'rgba(18, 28, 58, 0.85)',
            border: '1px solid rgba(255, 82, 0, 0.35)',
            borderRadius: '16px',
            padding: '36px 28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255, 82, 0, 0.15)',
              border: '2px solid #ff5200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '26px'
            }}>
              ⚠️
            </div>

            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: '0 0 10px',
              color: '#ffffff'
            }}>
              Algo deu errado nesta tela
            </h2>

            <p style={{
              fontSize: '14px',
              color: '#94a3b8',
              lineHeight: 1.5,
              margin: '0 0 24px'
            }}>
              Ocorreu uma falha inesperada na visualização. Seus dados estão seguros e salvos no sistema.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: '#ff5200',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 12px rgba(255, 82, 0, 0.3)'
                }}
              >
                Recarregar página
              </button>

              <button
                type="button"
                onClick={this.handleGoEvents}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Voltar aos Eventos
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
