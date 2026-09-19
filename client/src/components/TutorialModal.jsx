import './TutorialModal.css'

function SparklesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}

function CalendarStepIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function RotateCcwIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function BellOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
      <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

const TUTORIAL_STEPS = [
  {
    step: 1,
    percent: '17%',
    icon: <SparklesIcon />,
    sub: 'PASSO 1 DE 6 • INÍCIO',
    title: 'VAMOS CONHECER A PLATAFORMA',
    paragraphs: [
      <>
        Este tour vai <strong>abrir cada tela na ordem</strong> em que você as usa no dia do evento e <strong>apontar</strong> exatamente onde clicar. Leva menos de 2 minutos.
      </>,
      <>
        Você pode reabrir este tutorial a qualquer momento pelo botão <strong>Tutorial</strong> no topo.
      </>,
    ],
  },
  {
    step: 2,
    percent: '33%',
    icon: <CalendarStepIcon />,
    sub: 'PASSO 2 DE 6 • TELA EVENTOS',
    title: 'AQUI COMEÇA TUDO: CADASTRE O EVENTO',
    paragraphs: [
      <>
        A tela <strong>Eventos</strong> é o hub. Clique em <strong>Novo evento</strong> (destacado à direita) para cadastrar a prova — nome, data e cidade.
      </>,
      <>
        Depois de criado, cada card leva direto ao <strong>Entregar Kit</strong> ou ao <strong>Dashboard</strong> daquele evento.
      </>,
    ],
  },
  {
    step: 3,
    percent: '50%',
    icon: <BoxIcon />,
    sub: 'PASSO 3 DE 6 • ENTREGAR KIT',
    title: 'ENTREGA DE KIT',
    paragraphs: [
      <>
        Esta é a tela que o operador usa para fazer a <strong>entrega de kit</strong>. As abas destacadas organizam o fluxo:
      </>,
    ],
    list: [
      <><strong>Entrega de Kit</strong> — busque por nome, número, CPF ou chip e confirme a entrega.</>,
      <><strong>Atletas</strong> — lista completa; clique em um atleta para abrir a entrega.</>,
      <><strong>Estatísticas</strong> — pendentes, entregues, camisetas e kits em tempo real.</>,
      <><strong>Auditoria</strong> — histórico completo de tudo que foi feito.</>,
    ],
  },
  {
    step: 4,
    percent: '67%',
    icon: <BoxIcon />,
    sub: 'PASSO 4 DE 6 • BUSCA DE ATLETAS',
    title: 'BUSCA RÁPIDA E EFICIENTE',
    paragraphs: [
      <>
        Utilize o campo de busca com <strong>leitor de código de barras / QR Code</strong> ou digite o nome/CPF do atleta para localizar sua inscrição instantaneamente.
      </>,
    ],
  },
  {
    step: 5,
    percent: '83%',
    icon: <SparklesIcon />,
    sub: 'PASSO 5 DE 6 • ESTATÍSTICAS EM TEMPO REAL',
    title: 'ACOMPANHAMENTO AO VIVO',
    paragraphs: [
      <>
        Monitore a <strong>evolução da entrega dos kits</strong> e tamanho de camisetas em tempo real na aba de Estatísticas.
      </>,
    ],
  },
  {
    step: 6,
    percent: '100%',
    icon: <SparklesIcon />,
    sub: 'PASSO 6 DE 6 • CONCLUÍDO',
    title: 'TUDO PRONTO PARA OPERAR!',
    paragraphs: [
      <>
        Você concluiu o tour da plataforma. Bom evento e ótimas entregas!
      </>,
    ],
  },
]

export default function TutorialModal({
  currentStep = 1,
  totalSteps = 6,
  onStepChange,
  onClose,
}) {
  const stepData = TUTORIAL_STEPS[currentStep - 1] || TUTORIAL_STEPS[0]
  const progressPercent = Math.round((currentStep / totalSteps) * 100)

  return (
    <aside className="tutorial-modal" aria-label="Tutorial do sistema">
      <div className="tutorial-bar-track">
        <div className="tutorial-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="tutorial-inner">
        <div className="tutorial-header-row">
          <span className="tutorial-step-tag">PASSO {currentStep} DE {totalSteps}</span>
          <div className="tutorial-header-actions">
            <button
              type="button"
              className="icon-btn-ghost"
              onClick={() => onStepChange(1)}
              title="Reiniciar tutorial"
            >
              <RotateCcwIcon />
            </button>
            <button
              type="button"
              className="icon-btn-ghost"
              title="Notificações"
            >
              <BellOffIcon />
            </button>
            <span className="percent-badge">{progressPercent}%</span>
          </div>
        </div>

        <div className="tutorial-body">
          <div className="tutorial-icon-box">{stepData.icon}</div>
          <div>
            <div className="tutorial-step-sub">{stepData.sub}</div>
            <h2 className="tutorial-title">{stepData.title}</h2>
          </div>

          {stepData.paragraphs?.map((p, idx) => (
            <p key={idx} className="tutorial-text">{p}</p>
          ))}

          {stepData.list && (
            <ul className="tutorial-list">
              {stepData.list.map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="tutorial-footer">
          <div className="tutorial-dots">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                key={idx}
                className={`dot ${idx + 1 === currentStep ? 'active' : ''}`}
              />
            ))}
          </div>

          <button type="button" className="skip-btn" onClick={onClose}>
            PULAR E CONTINUAR DEPOIS
          </button>

          <div className="tutorial-nav-controls">
            <button
              type="button"
              className="tutorial-prev-btn"
              disabled={currentStep <= 1}
              onClick={() => onStepChange(currentStep - 1)}
              aria-label="Passo anterior"
            >
              <ChevronLeftIcon />
            </button>

            <button
              type="button"
              className="tutorial-next-btn"
              onClick={() => {
                if (currentStep < totalSteps) {
                  onStepChange(currentStep + 1)
                } else {
                  onClose()
                }
              }}
            >
              <span>{currentStep === totalSteps ? 'CONCLUIR' : 'PRÓXIMO'}</span>
              {currentStep < totalSteps && <ChevronRightIcon />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
