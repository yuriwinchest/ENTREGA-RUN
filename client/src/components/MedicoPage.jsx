import { useCallback, useEffect, useRef, useState } from 'react'
import { medicoApi } from '../utils/medicoApi.js'
import {
  calculateAge,
  countByStatus,
  elapsedLabel,
  formatAge,
  formatPhone,
  gravidadeLabel,
  mapsUrl,
  newArrivals,
  sortQueue,
  statusLabel,
} from '../utils/medico.js'
import './MedicoPage.css'

const POLL_MS = 10000
const SOUND_KEY = 'entregas_run_medico_som'

function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) === '1'
  } catch {
    return false
  }
}

// Sirene curta em duas notas, gerada na hora (sem arquivo de áudio).
function playAlert(ctx) {
  if (!ctx) return
  const start = ctx.currentTime
  for (let i = 0; i < 3; i += 1) {
    for (const [offset, freq] of [[0, 880], [0.18, 660]]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      const t = start + i * 0.42 + offset
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.17)
    }
  }
}

function formatTime(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function Info({ label, children }) {
  if (!children) return null
  return (
    <div className="med-info">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default function MedicoPage({ user, eventId, onLogout, onBack }) {
  const [data, setData] = useState({ event: null, ocorrencias: [], version: null })
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('fila')
  const [selectedId, setSelectedId] = useState(null)
  const [soundOn, setSoundOn] = useState(readSoundPref)
  const [flash, setFlash] = useState([])
  const [updating, setUpdating] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const audioRef = useRef(null)
  const knownIds = useRef(null)
  const versionRef = useRef(null)

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) audioRef.current = new AudioCtx()
    }
    audioRef.current?.resume?.()
    return audioRef.current
  }, [])

  const load = useCallback(async () => {
    const res = await medicoApi.ocorrencias(eventId, versionRef.current)
    if (!res.ok) {
      setLoadError(res.status === 401 ? 'Sessão expirada. Entre novamente.' : (res.data?.message || 'Sem conexão com o servidor.'))
      return
    }
    setLoadError('')
    if (res.data.unchanged) return
    const list = res.data.ocorrencias || []
    const arrived = newArrivals(knownIds.current, list)
    knownIds.current = new Set(list.map((item) => item.id))
    versionRef.current = res.data.version
    setData({ event: res.data.event, ocorrencias: list, version: res.data.version })
    if (arrived.length > 0) {
      setFlash(arrived)
      if (readSoundPref()) playAlert(audioRef.current)
      navigator.vibrate?.([300, 120, 300])
    }
  }, [eventId])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void load()
    }, POLL_MS)
    const clock = window.setInterval(() => setNow(Date.now()), 30000)
    function onVisible() {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.clearInterval(clock)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  // O navegador só libera áudio depois de um toque na página: após recarregar,
  // o primeiro toque em qualquer lugar rearma o alerta sonoro.
  useEffect(() => {
    if (!soundOn) return undefined
    const arm = () => ensureAudio()
    document.addEventListener('pointerdown', arm, { once: true })
    return () => document.removeEventListener('pointerdown', arm)
  }, [soundOn, ensureAudio])

  const counts = countByStatus(data.ocorrencias)
  const sorted = sortQueue(data.ocorrencias)
  const visible = sorted.filter((item) =>
    filter === 'fila' ? item.status !== 'ENCERRADA' : filter === 'encerradas' ? item.status === 'ENCERRADA' : true,
  )
  const selected = data.ocorrencias.find((item) => item.id === selectedId) || null
  const pending = counts.ABERTA

  useEffect(() => {
    const original = document.title
    return () => { document.title = original }
  }, [])

  useEffect(() => {
    const base = data.event?.name ? `Médico · ${data.event.name}` : 'Painel médico'
    document.title = pending > 0 ? `(${pending}) ${base}` : base
  }, [pending, data.event?.name])

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
    } catch {
      // preferência só vale nesta aba
    }
    if (next) playAlert(ensureAudio())
  }

  function select(id) {
    if (soundOn) ensureAudio()
    setSelectedId(id)
    setFlash((prev) => prev.filter((item) => item !== id))
  }

  async function changeStatus(status) {
    if (!selected) return
    setUpdating(status)
    const res = await medicoApi.mudarStatus(eventId, selected.id, status)
    setUpdating('')
    if (!res.ok) {
      setLoadError(res.data?.message || 'Não foi possível atualizar o status.')
      return
    }
    versionRef.current = null
    await load()
  }

  const atleta = selected?.atleta
  const atletaIdade = atleta ? (atleta.idadeTexto || (atleta.idade ? `${atleta.idade} anos` : '') || formatAge(calculateAge(atleta))) : ''
  const saude = atleta?.saude || []
  const alertas = saude.filter((item) => item.alerta)
  const outras = saude.filter((item) => !item.alerta)

  return (
    <div className="med-page">
      <header className="med-top">
        <div className="med-top-id">
          <span className="med-top-mark" aria-hidden="true" />
          <div>
            <span className="med-top-kicker">Painel médico</span>
            <h1 className="med-top-title">{data.event?.name || user?.eventName || 'Evento'}</h1>
          </div>
        </div>
        <div className="med-top-actions">
          <button type="button" className={`med-sound ${soundOn ? 'on' : ''}`} onClick={toggleSound} aria-pressed={soundOn}>
            {soundOn ? 'Alerta sonoro ligado' : 'Ligar alerta sonoro'}
          </button>
          {onBack && <button type="button" className="med-ghost" onClick={onBack}>Voltar</button>}
          <button type="button" className="med-ghost" onClick={onLogout}>Sair</button>
        </div>
      </header>

      {loadError && <p className="med-banner" role="alert">{loadError}</p>}

      <nav className="med-filters" role="tablist">
        {[
          ['fila', 'Fila', counts.ABERTA + counts.EM_ATENDIMENTO],
          ['encerradas', 'Encerradas', counts.ENCERRADA],
          ['todas', 'Todas', data.ocorrencias.length],
        ].map(([key, label, count]) => (
          <button key={key} type="button" role="tab" aria-selected={filter === key} className={filter === key ? 'on' : ''} onClick={() => setFilter(key)}>
            {label} <span>{count}</span>
          </button>
        ))}
        <span className="med-legend">
          <b className="s-aberta" /> {counts.ABERTA} aberta{counts.ABERTA === 1 ? '' : 's'}
          <b className="s-atendimento" /> {counts.EM_ATENDIMENTO} em atendimento
        </span>
      </nav>

      <main className={`med-grid ${selected ? 'has-detail' : ''}`}>
        <section className="med-queue" aria-label="Ocorrências">
          {visible.length === 0 ? (
            <div className="med-empty">
              {data.version === null ? 'Carregando ocorrências…' : filter === 'fila' ? 'Nenhuma ocorrência na fila. A tela se atualiza sozinha a cada 10 segundos.' : 'Nada por aqui.'}
            </div>
          ) : (
            visible.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`med-card g-${String(item.gravidade).toLowerCase()} st-${item.status.toLowerCase()} ${selectedId === item.id ? 'sel' : ''} ${flash.includes(item.id) ? 'new' : ''}`}
                onClick={() => select(item.id)}
              >
                <span className="med-card-top">
                  <span className="med-card-proto">#{item.protocolo}</span>
                  <span className="med-card-grav">{gravidadeLabel(item.gravidade)}</span>
                  <span className="med-card-time">{elapsedLabel(item.criadaEm, now)}</span>
                </span>
                <span className="med-card-name">
                  {item.atleta ? (
                    <>
                      <strong>{item.atleta.numero}</strong> {item.atleta.nome}
                      {(item.atleta.idadeTexto || (item.atleta.idade ? `${item.atleta.idade} anos` : '') || formatAge(calculateAge(item.atleta))) && (
                        <span className="med-card-age"> · {item.atleta.idadeTexto || (item.atleta.idade ? `${item.atleta.idade} anos` : '') || formatAge(calculateAge(item.atleta))}</span>
                      )}
                    </>
                  ) : (
                    <em>Pessoa não identificada</em>
                  )}
                </span>
                <span className="med-card-desc">{item.descricao}</span>
                <span className="med-card-foot">
                  <span className={`med-status s-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
                  {item.localTexto && <span className="med-card-loc">{item.localTexto}</span>}
                  {item.geo && !item.localTexto && <span className="med-card-loc">GPS</span>}
                </span>
              </button>
            ))
          )}
        </section>

        <section className="med-detail" aria-label="Detalhe da ocorrência">
          {!selected ? (
            <div className="med-empty">Selecione uma ocorrência para ver a ficha completa.</div>
          ) : (
            <article className={`med-sheet g-${String(selected.gravidade).toLowerCase()}`}>
              <button type="button" className="med-close-mobile" onClick={() => setSelectedId(null)}>← Fila</button>

              <header className="med-sheet-head">
                <div>
                  <span className="med-sheet-proto">Ocorrência #{selected.protocolo} · {formatTime(selected.criadaEm)} ({elapsedLabel(selected.criadaEm, now)})</span>
                  <h2 className="med-sheet-grav">{gravidadeLabel(selected.gravidade)}</h2>
                </div>
                <span className={`med-status big s-${selected.status.toLowerCase()}`}>{statusLabel(selected.status)}</span>
              </header>

              <div className="med-steps">
                {selected.status !== 'EM_ATENDIMENTO' && selected.status !== 'ENCERRADA' && (
                  <button type="button" className="med-step go" disabled={Boolean(updating)} onClick={() => changeStatus('EM_ATENDIMENTO')}>
                    {updating === 'EM_ATENDIMENTO' ? 'Atualizando…' : 'Iniciar atendimento'}
                  </button>
                )}
                {selected.status !== 'ENCERRADA' && (
                  <button type="button" className="med-step done" disabled={Boolean(updating)} onClick={() => changeStatus('ENCERRADA')}>
                    {updating === 'ENCERRADA' ? 'Atualizando…' : 'Encerrar'}
                  </button>
                )}
                {selected.status === 'ENCERRADA' && (
                  <button type="button" className="med-step" disabled={Boolean(updating)} onClick={() => changeStatus('ABERTA')}>
                    Reabrir
                  </button>
                )}
              </div>

              <section className="med-block">
                <h3>O que aconteceu</h3>
                <p className="med-desc">{selected.descricao}</p>
                <dl className="med-dl">
                  <Info label="Aberta por">{selected.solicitanteNome}</Info>
                  <Info label="Telefone">
                    <a href={`tel:${selected.solicitanteTelefone}`}>{formatPhone(selected.solicitanteTelefone)}</a>
                  </Info>
                  <Info label="Local informado">{selected.localTexto}</Info>
                  <Info label="GPS">
                    {selected.geo && (
                      <a href={mapsUrl(selected.geo)} target="_blank" rel="noreferrer">
                        Abrir no mapa{Number.isFinite(selected.geo.accuracy) ? ` (±${selected.geo.accuracy} m)` : ''}
                      </a>
                    )}
                  </Info>
                </dl>
                {!selected.geo && !selected.localTexto && <p className="med-warn">Sem localização: ligue para quem abriu.</p>}
              </section>

              <section className="med-block">
                <h3>Atleta</h3>
                {!atleta ? (
                  <p className="med-muted">Pessoa não identificada.</p>
                ) : (
                  <>
                    <div className="med-athlete">
                      <span className="med-athlete-num">{atleta.numero}</span>
                      <div>
                        <strong>{atleta.nome}</strong>
                        <span>{[atleta.modalidade, atleta.categoria, atletaIdade].filter(Boolean).join(' · ')}</span>
                      </div>
                    </div>
                    <dl className="med-dl">
                      <Info label="Telefone do atleta">
                        {atleta.contato && <a href={`tel:${String(atleta.contato).replace(/\D/g, '')}`}>{atleta.contato}</a>}
                      </Info>
                      <Info label="CPF">{atleta.doc}</Info>
                      <Info label="Idade">{atletaIdade || '—'}</Info>
                      <Info label="Nascimento">
                        {atleta.nascimento
                          ? `${atleta.nascimento}${atletaIdade ? ` (${atletaIdade})` : ''}`
                          : (atletaIdade || '—')}
                      </Info>
                      <Info label="Sexo">{atleta.sexo}</Info>
                      <Info label="Cidade">{atleta.cidade}</Info>
                      <Info label="Equipe">{atleta.equipe}</Info>
                      <Info label="Nacionalidade">{atleta.nacionalidade}</Info>
                    </dl>
                  </>
                )}
              </section>

              {atleta && (
                <section className="med-block">
                  <h3>Saúde (planilha de inscrição)</h3>
                  {saude.length === 0 ? (
                    <p className="med-warn">O evento não marcou colunas de saúde na importação da planilha.</p>
                  ) : (
                    <>
                      {alertas.length === 0 && <p className="med-ok">Nenhum alerta informado.</p>}
                      <ul className="med-answers">
                        {[...alertas, ...outras].map((item) => (
                          <li key={item.key} className={item.alerta ? 'alert' : ''}>
                            <span>
                              {item.label}
                              {!item.publico && <em className="med-private" title="Não aparece na página pública"> · só painel</em>}
                            </span>
                            <strong>{item.value || 'Sem informação'}</strong>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              )}

              <section className="med-block">
                <h3>Histórico</h3>
                <ol className="med-history">
                  {(selected.historico || []).map((entry, index) => (
                    <li key={`${entry.em}-${index}`}>
                      <time>{formatTime(entry.em)}</time> {statusLabel(entry.status)} <span>· {entry.por}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </article>
          )}
        </section>
      </main>
    </div>
  )
}
