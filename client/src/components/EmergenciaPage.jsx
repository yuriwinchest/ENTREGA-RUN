import { useEffect, useRef, useState } from 'react'
import { emergenciaApi } from '../utils/medicoApi.js'
import { GRAVIDADES, maskPhoneInput, calculateAge, formatAge } from '../utils/medico.js'
import './EmergenciaPage.css'

const EMPTY_FORM = { gravidade: '', solicitanteNome: '', solicitanteTelefone: '', descricao: '', localTexto: '' }

function useGeolocation() {
  const [geo, setGeo] = useState({ state: 'idle', coords: null })

  function request() {
    if (!('geolocation' in navigator)) {
      setGeo({ state: 'indisponivel', coords: null })
      return
    }
    setGeo((prev) => ({ ...prev, state: 'pedindo' }))
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({
        state: 'ok',
        coords: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
      }),
      (err) => setGeo({ state: err.code === 1 ? 'negada' : 'falhou', coords: null }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  return [geo, request]
}

function LocationChip({ geo, onRetry }) {
  if (geo.state === 'ok') {
    return (
      <p className="emg-loc ok">
        <span className="emg-loc-dot" /> Localização capturada
        {Number.isFinite(geo.coords?.accuracy) && <span className="emg-loc-acc"> · precisão ±{Math.round(geo.coords.accuracy)} m</span>}
      </p>
    )
  }
  if (geo.state === 'pedindo' || geo.state === 'idle') {
    return <p className="emg-loc wait"><span className="emg-loc-dot" /> Pedindo sua localização… toque em <strong>Permitir</strong></p>
  }
  return (
    <p className="emg-loc off">
      <span className="emg-loc-dot" />
      <span className="emg-loc-text">
        {geo.state === 'negada' ? 'Localização bloqueada.' : 'Não foi possível obter a localização.'} Descreva o local no formulário.
      </span>
      {geo.state !== 'indisponivel' && (
        <button type="button" className="emg-loc-retry" onClick={onRetry}>Tentar de novo</button>
      )}
    </p>
  )
}

export default function EmergenciaPage({ eventId }) {
  const [event, setEvent] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [geo, requestGeo] = useGeolocation()

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState(null)
  const [searchMsg, setSearchMsg] = useState('')

  const [mode, setMode] = useState('busca') // busca | atleta | anonimo | enviado
  const [athlete, setAthlete] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [protocolo, setProtocolo] = useState(null)
  const formRef = useRef(null)

  useEffect(() => {
    let alive = true
    emergenciaApi.evento(eventId).then((res) => {
      if (!alive) return
      if (res.ok) setEvent(res.data.event)
      else setLoadError(res.data?.message || 'Evento não encontrado.')
    })
    requestGeo()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function openAthlete(ref) {
    setSearching(true)
    const res = await emergenciaApi.atleta(eventId, ref)
    setSearching(false)
    if (!res.ok) {
      setSearchMsg(res.data?.message || 'Não foi possível abrir a ficha.')
      return
    }
    setAthlete(res.data.athlete)
    setMode('atleta')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSearch(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchMsg('')
    setResults(null)
    const res = await emergenciaApi.buscar(eventId, q)
    setSearching(false)
    if (!res.ok) {
      setSearchMsg(res.data?.message || 'Falha na busca.')
      return
    }
    const list = res.data.results || []
    if (res.data.kind === 'curto') {
      setSearchMsg('Digite pelo menos 3 letras do nome.')
      return
    }
    if (list.length === 0) {
      setSearchMsg(res.data.kind === 'nome'
        ? 'Ninguém com esse nome. Confira o número de peito ou use "Pessoa não identificada".'
        : 'Nenhum atleta com esse número ou CPF neste evento.')
      return
    }
    if (list.length === 1 && res.data.kind !== 'nome') {
      await openAthlete(list[0].ref)
      return
    }
    setResults({ list, truncated: res.data.truncated })
  }

  function startAnonymous() {
    setAthlete(null)
    setMode('anonimo')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function backToSearch() {
    setMode('busca')
    setAthlete(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.gravidade) {
      setFormError('Selecione o nível de gravidade.')
      formRef.current?.querySelector('.emg-grav')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSending(true)
    setFormError('')
    const res = await emergenciaApi.abrirOcorrencia(eventId, {
      ...form,
      athleteRef: athlete?.ref || null,
      geo: geo.coords,
    })
    setSending(false)
    if (!res.ok) {
      setFormError(res.data?.message || 'Não foi possível enviar. Ligue para o socorro do evento.')
      return
    }
    setProtocolo(res.data.protocolo)
    setMode('enviado')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saude = athlete?.saude || []
  const alertas = saude.filter((item) => item.alerta)

  return (
    <div className="emg-page">
      <div className="emg-shell">
        <header className="emg-top">
          <div className="emg-top-row">
            <span className="emg-tag">Emergência médica</span>
            <a className="emg-samu" href="tel:192">Risco de vida? Ligue 192</a>
          </div>
          <h1 className="emg-event">{event?.name || (loadError ? 'Evento' : 'Carregando…')}</h1>
          {event?.location && <p className="emg-event-meta">{event.date} · {event.location}</p>}
          <LocationChip geo={geo} onRetry={requestGeo} />
        </header>

        {loadError ? (
          <div className="emg-panel emg-panel-error" role="alert">{loadError} Confira o QR Code ou ligue 192.</div>
        ) : mode === 'enviado' ? (
          <div className="emg-panel emg-panel-ok" role="status">
            <span className="emg-proto">Ocorrência nº {protocolo}</span>
            <h2 className="emg-h2">A equipe médica foi avisada</h2>
            <p className="emg-muted">
              Fique com a pessoa e mantenha o telefone {form.solicitanteTelefone} por perto: a equipe pode ligar para confirmar o local.
              {!geo.coords && ' Como a localização não foi enviada, descreva bem onde vocês estão se ligarem.'}
            </p>
            <button type="button" className="emg-btn emg-btn-ghost" onClick={backToSearch}>Abrir outra ocorrência</button>
          </div>
        ) : mode === 'busca' ? (
          <>
            <form className="emg-panel" onSubmit={handleSearch}>
              <h2 className="emg-h2">Quem precisa de ajuda?</h2>
              <label className="emg-field">
                <span>Número de peito, nome ou CPF</span>
                <div className="emg-search">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: 1234"
                    autoComplete="off"
                    enterKeyHint="search"
                    maxLength={80}
                    autoFocus
                  />
                  <button type="submit" className="emg-btn emg-btn-dark" disabled={searching || !query.trim()}>
                    {searching ? '…' : 'Buscar'}
                  </button>
                </div>
              </label>
              {searchMsg && <p className="emg-error" role="alert">{searchMsg}</p>}
              {results && (
                <ul className="emg-results">
                  {results.list.map((item) => (
                    <li key={item.ref}>
                      <button type="button" onClick={() => openAthlete(item.ref)}>
                        <span className="emg-res-num">{item.numero || '—'}</span>
                        <span className="emg-res-name">{item.nome}</span>
                        <span className="emg-res-mod">
                          {[item.modalidade, item.idadeTexto || (item.idade ? `${item.idade} anos` : '') || formatAge(calculateAge(item))].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                  {results.truncated && <li className="emg-muted">Mais pessoas com esse nome: digite o sobrenome ou o número de peito.</li>}
                </ul>
              )}
            </form>

            <div className="emg-or"><span>ou</span></div>

            <button type="button" className="emg-btn emg-btn-anon" onClick={startAnonymous}>
              Pessoa não identificada
              <small>Sem número de peito ou não é atleta</small>
            </button>

          </>
        ) : (
          <form className="emg-flow" onSubmit={handleSubmit} ref={formRef} noValidate>
            {mode === 'atleta' && athlete ? (
              <section className="emg-panel">
                <div className="emg-bib">
                  <i className="emg-pin tl" /><i className="emg-pin tr" /><i className="emg-pin bl" /><i className="emg-pin br" />
                  <span className="emg-bib-num">{athlete.numero}</span>
                  <span className="emg-bib-name">{athlete.nome}</span>
                  {([athlete.modalidade, athlete.idadeTexto || (athlete.idade ? `${athlete.idade} anos` : '') || formatAge(calculateAge(athlete))].some(Boolean)) && (
                    <span className="emg-bib-mod">
                      {[athlete.modalidade, athlete.idadeTexto || (athlete.idade ? `${athlete.idade} anos` : '') || formatAge(calculateAge(athlete))].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                {alertas.length > 0 && (
                  <a className="emg-jump" href="#emg-saude">
                    {alertas.length === 1 ? '1 informação de saúde importante' : `${alertas.length} informações de saúde importantes`} — ver abaixo
                  </a>
                )}
              </section>
            ) : (
              <section className="emg-panel emg-panel-anon">
                <h2 className="emg-h2">Pessoa não identificada</h2>
                <p className="emg-muted">Descreva a pessoa na ocorrência (roupa, idade aproximada, se está consciente).</p>
              </section>
            )}

            <section className="emg-panel">
              <h2 className="emg-h2">Dados do socorro</h2>

              <fieldset className="emg-grav">
                <legend>Nível de gravidade <em className="emg-req">*</em></legend>
                <div className="emg-grav-grid">
                  {GRAVIDADES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`emg-grav-btn g-${item.value.toLowerCase()} ${form.gravidade === item.value ? 'on' : ''}`}
                      aria-pressed={form.gravidade === item.value}
                      onClick={() => update('gravidade', item.value)}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="emg-field">
                <span>Nome de quem está abrindo a ocorrência <em className="emg-req">*</em></span>
                <input value={form.solicitanteNome} onChange={(e) => update('solicitanteNome', e.target.value)} maxLength={80} autoComplete="name" required />
              </label>
              <label className="emg-field">
                <span>Telefone de quem está abrindo <em className="emg-req">*</em></span>
                <input
                  value={form.solicitanteTelefone}
                  onChange={(e) => update('solicitanteTelefone', maskPhoneInput(e.target.value))}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  required
                />
              </label>
              <label className="emg-field">
                <span>O que aconteceu? <em className="emg-req">*</em></span>
                <textarea
                  value={form.descricao}
                  onChange={(e) => update('descricao', e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Ex: caiu, está consciente, reclama de dor no peito"
                  required
                />
              </label>
              <label className="emg-field">
                <span>Onde vocês estão? {geo.coords ? '(opcional)' : ''}</span>
                <input
                  value={form.localTexto}
                  onChange={(e) => update('localTexto', e.target.value)}
                  maxLength={160}
                  placeholder="Km, rua, ponto de referência"
                />
              </label>

            </section>

            {mode === 'atleta' && athlete && (
              <section className="emg-panel" id="emg-saude" aria-labelledby="emg-saude-title">
                <h2 className="emg-h2" id="emg-saude-title">Informações de saúde</h2>
                {saude.length === 0 ? (
                  <p className="emg-nofile">
                    {athlete.saudeConfigurada
                      ? 'Nenhuma informação de saúde informada na inscrição.'
                      : 'O evento não publicou informações de saúde.'}
                    {' '}Se a pessoa estiver consciente, pergunte sobre alergias e remédios.
                  </p>
                ) : (
                  <ul className="emg-alerts" aria-label="Informações de saúde da inscrição">
                    {saude.map((item) => (
                      <li key={item.key} className={item.alerta ? '' : 'calm'}>
                        <span className="emg-alert-q">{item.label}</span>
                        <strong>{item.value}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <div className="emg-sendbar">
              {formError && <p className="emg-error" role="alert">{formError}</p>}
              <div className="emg-actions">
                <button type="button" className="emg-btn emg-btn-ghost" onClick={backToSearch} disabled={sending}>Cancelar</button>
                <button type="submit" className="emg-btn emg-btn-send" disabled={sending}>{sending ? 'Enviando…' : 'Enviar'}</button>
              </div>
            </div>
          </form>
        )}

        <footer className="emg-foot">Entregas RUN · página de socorro do evento</footer>
      </div>
    </div>
  )
}
