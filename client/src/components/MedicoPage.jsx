import { useCallback, useEffect, useRef, useState } from 'react'
import { medicoApi } from '../utils/medicoApi.js'
import {
  calculateAge,
  countByStatus,
  DESTINOS,
  destinoExigeDetalhe,
  destinoLabel,
  elapsedLabel,
  formatAge,
  formatPhone,
  gravidadeLabel,
  mapsUrl,
  REGISTRO_VAZIO,
  registroPreenchido,
  sortQueue,
  statusLabel,
} from '../utils/medico.js'
import { createAlertRepeater, highestAlert, pendingAlerts } from '../utils/medicoAlert.js'
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

function formatTime(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const REGISTRO_CAMPOS = [
  ['avaliacao', 'Evolução / avaliação', 'Estado, sinais vitais, queixa, exame'],
  ['condutas', 'Condutas e procedimentos', 'O que foi feito: curativo, imobilização, acesso, hidratação...'],
  ['prescricoes', 'Prescrições e administrações', 'Medicamento, dose, via e horário (digitado pelo profissional)'],
]

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
  const [audioState, setAudioState] = useState('locked')
  const [acknowledging, setAcknowledging] = useState('')
  const [updating, setUpdating] = useState('')
  const [now, setNow] = useState(() => Date.now())
  // Rascunhos por ocorrência ficam só em memória: sobrevivem à atualização a cada
  // 10 s e a erro de rede, e não deixam dado de saúde no navegador.
  const [drafts, setDrafts] = useState({})
  const [closing, setClosing] = useState(null) // { id, destino, detalhe, observacao }
  const [savingRecord, setSavingRecord] = useState(false)
  const [recordError, setRecordError] = useState('')
  const audioRef = useRef(null)
  const repeaterRef = useRef(null)
  const requestSeq = useRef(0)
  const currentEvent = useRef(eventId)
  currentEvent.current = eventId
  const versionRef = useRef(null)

  const ensureAudio = useCallback(async () => {
    try {
      if (!audioRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (!AudioCtx) { setAudioState('unsupported'); return }
        const ctx = new AudioCtx()
        audioRef.current = ctx
        repeaterRef.current = createAlertRepeater(ctx)
        ctx.onstatechange = () => setAudioState(ctx.state)
      }
      await audioRef.current.resume()
      setAudioState(audioRef.current.state)
    } catch {
      setAudioState('locked')
    }
  }, [])

  const load = useCallback(async () => {
    const seq = ++requestSeq.current
    const res = await medicoApi.ocorrencias(eventId, versionRef.current)
    if (seq !== requestSeq.current || eventId !== currentEvent.current) return
    if (!res.ok) {
      setLoadError(res.status === 401 ? 'Sessão expirada. Entre novamente.' : (res.data?.message || 'Sem conexão com o servidor.'))
      return
    }
    setLoadError('')
    if (res.data.unchanged) return
    const list = res.data.ocorrencias || []
    versionRef.current = res.data.version
    setData({ event: res.data.event, ocorrencias: list, version: res.data.version })
  }, [eventId])

  useEffect(() => {
    versionRef.current = null
    requestSeq.current += 1
    setData({ event: null, ocorrencias: [], version: null })
    setSelectedId(null)
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, POLL_MS)
    const clock = window.setInterval(() => setNow(Date.now()), 30000)
    function onVisible() {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      requestSeq.current += 1
      window.clearInterval(timer)
      window.clearInterval(clock)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  useEffect(() => () => {
    repeaterRef.current?.stop()
    if (audioRef.current) {
      audioRef.current.onstatechange = null
      void audioRef.current.close().catch(() => {})
      audioRef.current = null
      repeaterRef.current = null
    }
  }, [])

  const alerts = pendingAlerts(data.ocorrencias)
  const highest = highestAlert(data.ocorrencias)
  const hasAlerts = alerts.length > 0
  useEffect(() => {
    if (hasAlerts && soundOn && audioState === 'running') repeaterRef.current?.start()
    else repeaterRef.current?.stop()
    return () => repeaterRef.current?.stop()
  }, [hasAlerts, soundOn, audioState])

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
    if (next) void ensureAudio()
    else repeaterRef.current?.stop()
  }

  function select(id) {
    if (soundOn) void ensureAudio()
    setSelectedId(id)
  }

  async function acknowledge(item) {
    if (!item || acknowledging || updating) return
    setAcknowledging(item.id)
    const res = item.status === 'ABERTA'
      ? await medicoApi.mudarStatus(eventId, item.id, 'EM_ATENDIMENTO', true)
      : await medicoApi.silenciarAlerta(eventId, item.id)
    setAcknowledging('')
    if (eventId !== currentEvent.current) return
    if (!res.ok) {
      setLoadError(res.data?.message || 'Não foi possível silenciar. O alerta continua ativo.')
      return
    }
    // Invalida consultas anteriores ao ACK, sem reconhecer IDs que chegaram depois.
    requestSeq.current += 1
    setData((prev) => ({ ...prev, ocorrencias: prev.ocorrencias.map((entry) => entry.id === item.id
      ? { ...entry, status: res.data.status || entry.status, alertaReconhecidoEm: res.data.alertaReconhecidoEm } : entry) }))
    versionRef.current = null
    await load()
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

  function updateDraft(id, field, value) {
    setDrafts((prev) => ({ ...prev, [id]: { ...REGISTRO_VAZIO, ...prev[id], [field]: value } }))
    setRecordError('')
  }

  async function saveRecord() {
    if (!selected || savingRecord) return
    const draft = drafts[selected.id]
    if (!registroPreenchido(draft)) {
      setRecordError('Preencha ao menos um campo do registro.')
      return
    }
    setRecordError('')
    setSavingRecord(true)
    const res = await medicoApi.registrar(eventId, selected.id, draft)
    setSavingRecord(false)
    if (!res.ok) {
      setRecordError(res.data?.message || 'Não foi possível salvar. O texto continua na tela.')
      return
    }
    setDrafts((prev) => ({ ...prev, [selected.id]: REGISTRO_VAZIO }))
    versionRef.current = null
    await load()
  }

  function openClosing() {
    if (!selected) return
    setClosing({ id: selected.id, destino: '', detalhe: '', observacao: '' })
    setRecordError('')
  }

  async function confirmClosing() {
    if (!selected || !closing || savingRecord) return
    if (!closing.destino) {
      setRecordError('Escolha o desfecho/destino.')
      return
    }
    if (destinoExigeDetalhe(closing.destino) && closing.detalhe.trim().length < 2) {
      setRecordError('Detalhe o destino antes de encerrar.')
      return
    }
    const draft = drafts[selected.id]
    setRecordError('')
    setSavingRecord(true)
    const res = await medicoApi.encerrar(
      eventId,
      selected.id,
      { destino: closing.destino, detalhe: closing.detalhe, observacao: closing.observacao },
      registroPreenchido(draft) ? draft : undefined,
    )
    setSavingRecord(false)
    if (!res.ok) {
      setRecordError(res.data?.message || 'Não foi possível encerrar. Nada foi perdido; tente de novo.')
      return
    }
    setDrafts((prev) => ({ ...prev, [selected.id]: REGISTRO_VAZIO }))
    setClosing(null)
    versionRef.current = null
    await load()
  }

  const atleta = selected?.atleta
  const atletaIdade = atleta ? (atleta.idadeTexto || (atleta.idade ? `${atleta.idade} anos` : '') || formatAge(calculateAge(atleta))) : ''
  const saude = atleta?.saude || []
  const alertas = saude.filter((item) => item.alerta)
  const outras = saude.filter((item) => !item.alerta)

  return (
    <div className={`med-page ${hasAlerts ? `med-alerting g-${highest.gravidade.toLowerCase()}` : ''}`}>
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
            {soundOn ? 'Desligar som neste dispositivo' : 'Ligar som neste dispositivo'}
          </button>
          {onBack && <button type="button" className="med-ghost" onClick={onBack}>Voltar</button>}
          <button type="button" className="med-ghost" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <div className="med-audio-state" role="status">
        {!soundOn ? 'Som deste dispositivo desligado. Os avisos visuais continuam ativos.'
          : audioState === 'running' ? 'Som deste dispositivo ativo.'
            : audioState === 'unsupported' ? 'Áudio indisponível neste navegador. Os avisos visuais continuam ativos.'
              : 'Som aguardando liberação pelo navegador.'}
        {soundOn && audioState !== 'running' && audioState !== 'unsupported' && (
          <button type="button" onClick={() => void ensureAudio()}>Ativar som neste dispositivo</button>
        )}
      </div>
      {hasAlerts && (
        <section className={`med-alert-band g-${highest.gravidade.toLowerCase()}`} aria-label="Alertas não reconhecidos">
          <div role="status">
            <strong>{alerts.length} alerta{alerts.length === 1 ? '' : 's'} aguardando reconhecimento</strong>
            <p>Maior gravidade pendente: {gravidadeLabel(highest.gravidade)}. O reconhecimento interrompe o aviso em todas as telas médicas deste evento; não encerra atendimento.</p>
          </div>
          <ul>
            {alerts.map((item) => (
              <li key={item.id}>
                <span>#{item.protocolo} · {gravidadeLabel(item.gravidade)}</span>
                <button type="button" disabled={Boolean(acknowledging || updating)} onClick={() => void acknowledge(item)}>
                  {acknowledging === item.id ? 'Salvando…' : item.status === 'ABERTA' ? 'Assumir e silenciar' : 'Silenciar alerta'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                className={`med-card g-${String(item.gravidade).toLowerCase()} st-${item.status.toLowerCase()} ${selectedId === item.id ? 'sel' : ''} ${!item.alertaReconhecidoEm ? 'new' : ''}`}
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
                  {item.status === 'ENCERRADA' && item.desfecho && <span className="med-card-loc">{destinoLabel(item.desfecho.destino)}</span>}
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
                  <button type="button" className="med-step go" disabled={Boolean(updating || acknowledging)} onClick={() => void acknowledge(selected)}>
                    {acknowledging === selected.id ? 'Salvando…' : 'Assumir e silenciar'}
                  </button>
                )}
                {selected.status !== 'ENCERRADA' && (
                  <button
                    type="button"
                    className="med-step done"
                    disabled={Boolean(updating || acknowledging || savingRecord)}
                    onClick={() => {
                      openClosing()
                      setTimeout(() => document.getElementById('med-registro')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
                    }}
                  >
                    Encerrar…
                  </button>
                )}
                {selected.status === 'ENCERRADA' && (
                  <button type="button" className="med-step" disabled={Boolean(updating || acknowledging)} onClick={() => changeStatus('ABERTA')}>
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

              <section className="med-block" id="med-registro" aria-labelledby="med-registro-title">
                <h3 id="med-registro-title">Registro de atendimento</h3>

                {selected.desfecho && (
                  <div className="med-outcome">
                    <span>Desfecho</span>
                    <strong>{destinoLabel(selected.desfecho.destino)}{selected.desfecho.detalhe ? ` — ${selected.desfecho.detalhe}` : ''}</strong>
                    {selected.desfecho.observacao && <p>{selected.desfecho.observacao}</p>}
                    <small>{formatTime(selected.desfecho.em)} · {selected.desfecho.por}</small>
                  </div>
                )}

                {(selected.registros || []).length === 0 ? (
                  <p className="med-muted">Nenhum registro ainda.</p>
                ) : (
                  <ol className="med-records">
                    {selected.registros.map((entry) => (
                      <li key={entry.id}>
                        <header><time>{formatTime(entry.em)}</time> · {entry.por}</header>
                        {REGISTRO_CAMPOS.map(([field, label]) => entry[field] && (
                          <div key={field}>
                            <span>{label}</span>
                            <p>{entry[field]}</p>
                          </div>
                        ))}
                      </li>
                    ))}
                  </ol>
                )}

                <div className="med-record-form">
                  {REGISTRO_CAMPOS.map(([field, label, hint]) => (
                    <label key={field}>
                      <span>{label}</span>
                      <textarea
                        rows={2}
                        maxLength={2000}
                        placeholder={hint}
                        value={drafts[selected.id]?.[field] || ''}
                        onChange={(e) => updateDraft(selected.id, field, e.target.value)}
                      />
                    </label>
                  ))}
                  {closing?.id !== selected.id && (
                    <button type="button" className="med-step" disabled={savingRecord || !registroPreenchido(drafts[selected.id])} onClick={() => void saveRecord()}>
                      {savingRecord ? 'Salvando…' : 'Salvar registro'}
                    </button>
                  )}
                </div>

                {closing?.id === selected.id && (
                  <div className="med-closing" role="group" aria-labelledby="med-closing-title">
                    <h4 id="med-closing-title">Encerrar atendimento</h4>
                    <div className="med-destinos" role="radiogroup" aria-label="Desfecho ou destino">
                      {DESTINOS.map((item) => (
                        <label key={item.value} className={closing.destino === item.value ? 'on' : ''}>
                          <input
                            type="radio"
                            name="med-destino"
                            value={item.value}
                            checked={closing.destino === item.value}
                            onChange={() => { setClosing((prev) => ({ ...prev, destino: item.value })); setRecordError('') }}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    {destinoExigeDetalhe(closing.destino) && (
                      <label className="med-closing-field">
                        <span>{DESTINOS.find((item) => item.value === closing.destino)?.detalhe}</span>
                        <input value={closing.detalhe} maxLength={160} onChange={(e) => setClosing((prev) => ({ ...prev, detalhe: e.target.value }))} />
                      </label>
                    )}
                    <label className="med-closing-field">
                      <span>Observação do encerramento (opcional)</span>
                      <textarea rows={2} maxLength={1000} value={closing.observacao} onChange={(e) => setClosing((prev) => ({ ...prev, observacao: e.target.value }))} />
                    </label>
                    {registroPreenchido(drafts[selected.id]) && (
                      <p className="med-muted">O registro escrito acima será salvo junto com o encerramento.</p>
                    )}
                    <div className="med-steps">
                      <button type="button" className="med-step" disabled={savingRecord} onClick={() => { setClosing(null); setRecordError('') }}>Cancelar</button>
                      <button type="button" className="med-step done" disabled={savingRecord} onClick={() => void confirmClosing()}>
                        {savingRecord ? 'Encerrando…' : 'Confirmar encerramento'}
                      </button>
                    </div>
                  </div>
                )}

                {recordError && <p className="med-banner" role="alert">{recordError}</p>}

                {(selected.desfechosAnteriores || []).length > 0 && (
                  <details className="med-prev-outcomes">
                    <summary>Desfechos anteriores ({selected.desfechosAnteriores.length})</summary>
                    <ul>
                      {selected.desfechosAnteriores.map((item, index) => (
                        <li key={`${item.em}-${index}`}>
                          {formatTime(item.em)} · {destinoLabel(item.destino)}{item.detalhe ? ` — ${item.detalhe}` : ''} · {item.por}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>

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
