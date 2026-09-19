import { useState } from 'react'
import './LoginPage.css'

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim() || !password) {
      setError('Informe usuário e senha para entrar.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.message || 'Não foi possível entrar. Verifique os dados.')
        return
      }
      setSuccess(`Bem-vindo à operação!`)
      if (onLoginSuccess) {
        setTimeout(() => {
          onLoginSuccess(data.user || { email: email.trim() })
        }, 300)
      }
    } catch {
      setError('Servidor indisponível. Tente novamente em instantes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="streaks" aria-hidden="true">
        <span className="streak s1" />
        <span className="streak s2" />
        <span className="streak s3" />
        <span className="streak s4" />
        <span className="streak s5" />
      </div>

      <main className="login-wrap">
        <div className="brand-badge">
          <img src="/logo.png" alt="Entregas Run" />
        </div>

        <h1 className="login-title">
          OPERAÇÃO DE KITS EM{' '}
          <span className="accent">TEMPO</span>
          <br />
          <span className="accent">REAL</span>
        </h1>

        <form className="login-card" onSubmit={handleSubmit} noValidate={false}>
          <div className="field">
            <label htmlFor="email">USUÁRIO</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">SENHA</label>
            <div className="pass-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="form-success" role="status">
              {success}
            </p>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            <BoltIcon />
            {loading ? 'ENTRANDO...' : 'ENTRAR NA OPERAÇÃO'}
          </button>

          <div className="login-divider" />

          <p className="login-note">
            Acesso restrito a operadores autorizados. Solicite convite ao administrador.
          </p>
        </form>
      </main>
    </div>
  )
}
