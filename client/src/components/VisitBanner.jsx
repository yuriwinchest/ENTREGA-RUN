import './VisitBanner.css'

// Faixa fixa enquanto o Super admin está dentro do ambiente de um Sub-admin.
export default function VisitBanner({ user, onReturn, returning }) {
  return (
    <div className="visit-banner" role="status">
      <span className="visit-banner-text">
        Você está no ambiente de <strong>{user.name}</strong>
      </span>
      <button type="button" className="visit-banner-back" onClick={onReturn} disabled={returning}>
        {returning ? 'VOLTANDO…' : (
          <>
            <span className="visit-banner-long">VOLTAR AO MEU AMBIENTE</span>
            <span className="visit-banner-short">VOLTAR</span>
          </>
        )}
      </button>
    </div>
  )
}
