import { useEffect, useMemo, useRef, useState } from 'react'
import { GameScreen, Quiz, ModeCard, OrderPuzzle, Result, Sprint, cheer, fmtTime, toTop } from './ui.jsx'
import { CHARACTERS, WORLDS } from './memoria/characters.js'
import { KEY, PASS, inWorld, knownIn, unlockedWorlds, whoRound, whatRound, whereRound, timelineRound, dailyDue, sprintQuestion, stars } from './memoria/logic.js'
import { review, withBest } from './progress.js'
import RefLink from '../components/RefLink.jsx'
import Sheet from '../components/Sheet.jsx'

// Memoria Bíblica: 8 mundos de personajes, 4 modos (¿Quién soy?, ¿Qué hizo?, ¿Dónde está?,
// Línea del tiempo), mapa de mundos que se abren al sacar 70 % y repaso diario.
export default function MemoriaBiblica({ store, onExit }) {
  const [screen, setScreen] = useState({ name: 'map' })
  const srs = store.progress.srs ?? {}
  const best = store.progress.best ?? {}
  const open = unlockedWorlds(best)
  const due = dailyDue(srs)
  const go = (name, extra = {}) => setScreen({ name, ...extra })
  const toMap = () => go('map')

  // Guarda cada respuesta en el repaso inteligente y el resultado del mundo.
  const answer = (ch, ok) => store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [KEY(ch)]: review(f.srs?.[KEY(ch)], ok) } }))
  const finish = (world, pct, mode) => world && store.updateProgress((f) => withBest(withBest(f, 'mb-w' + world, pct), `mb-w${world}-${mode}`, pct))

  if (screen.name === 'world') {
    const w = WORLDS.find((x) => x.id === screen.world)
    return <World world={w} srs={srs} best={best[`mb-w${w.id}`] ?? 0} bests={best} next={WORLDS[w.id]} onBack={toMap} onMode={(mode) => go(mode, { world: w.id, back: 'world' })} />
  }
  if (screen.name === 'who' || screen.name === 'daily') {
    const chars = screen.name === 'daily' ? due.slice(0, 15) : inWorld(screen.world)
    const back = () => (screen.world ? go('world', { world: screen.world }) : toMap())
    return (
      <WhoAmI
        title={screen.name === 'daily' ? 'Repaso de hoy' : '¿Quién soy?'}
        back={screen.world ? `Mundo ${screen.world}` : 'Mundos'}
        chars={chars}
        daily={screen.name === 'daily'}
        srs={srs}
        onAnswer={answer}
        onFinish={(pct) => finish(screen.world, pct, 'who')}
        best={screen.world ? best[`mb-w${screen.world}-who`] : undefined}
        onBack={back}
      />
    )
  }
  if (screen.name === 'what' || screen.name === 'where') {
    return <ChoiceMode kind={screen.name} world={screen.world} srs={srs} best={best[`mb-w${screen.world}-${screen.name}`] ?? 0} onAnswer={answer} onFinish={(pct) => finish(screen.world, pct, screen.name)} onBack={() => go('world', { world: screen.world })} />
  }
  if (screen.name === 'timeline') return <Timeline open={open} best={best['mb-linea'] ?? 0} onRecord={(n) => store.updateProgress((f) => withBest(f, 'mb-linea', n))} onBack={toMap} />
  if (screen.name === 'sprint') {
    return (
      <GameScreen title="Reto de 60 segundos" back="Mundos" onExit={toMap}>
        <Sprint
          make={() => sprintQuestion(open)}
          best={best['mb-reto'] ?? 0}
          intro={`Personajes de ${open.length === 1 ? 'tu primer mundo' : `tus ${open.length} mundos abiertos`}: ¿quién hizo esto?, ¿quién fue?`}
          onFinish={(n) => store.updateProgress((f) => withBest(f, 'mb-reto', n))}
          onExit={toMap}
        />
      </GameScreen>
    )
  }
  if (screen.name === 'people') return <People world={screen.world} srs={srs} onBack={() => go('world', { world: screen.world })} />

  const known = CHARACTERS.filter((c) => (srs[KEY(c)]?.box ?? 0) >= 1).length
  return (
    <GameScreen title="Memoria Bíblica" onExit={onExit}>
      <div className="mb-hero">
        <p className="mb-count">
          <b>{known}</b> de {CHARACTERS.length} personajes
          <span className="mb-stars-total"><Stars n={1} of={1} /> {WORLDS.reduce((n, w) => n + stars(best[`mb-w${w.id}`]), 0)} de {WORLDS.length * 3}</span>
        </p>
        <div className="mb-bar"><span style={{ width: `${(known / CHARACTERS.length) * 100}%` }} /></div>
      </div>
      <div className="mode-list">
        <ModeCard title="Repaso de hoy" badge={due.length ? `${due.length}` : null} desc={due.length ? 'Los personajes que fallaste o que ya toca repasar.' : 'Al día. Juega un mundo y aquí aparecerá lo que toque repasar.'} onClick={() => due.length && go('daily')} />
        <ModeCard title="Reto de 60 segundos" badge={best['mb-reto'] ? `Récord ${best['mb-reto']}` : null} desc="Todas las que puedas contra reloj, con los personajes de tus mundos abiertos." onClick={() => go('sprint')} />
        <ModeCard title="Línea del tiempo" badge={best['mb-linea'] ? `${best['mb-linea']} seguidas` : null} desc="Ordena personajes de distintas épocas." onClick={() => go('timeline')} />
      </div>
      <p className="section-label mb-section">Mundos</p>
      <ol className="mb-path">
        {WORLDS.map((w) => {
          const locked = !open.includes(w.id)
          const total = inWorld(w.id).length
          const k = knownIn(w.id, srs)
          const b = best[`mb-w${w.id}`] ?? 0
          return (
            <li key={w.id}>
              <button className={'mb-world' + (locked ? ' locked' : '') + (b >= PASS ? ' passed' : '')} disabled={locked} onClick={() => go('world', { world: w.id })}>
                <span className="mb-num">{locked ? <LockIcon /> : w.id}</span>
                <span className="entry-main">
                  <span className="mb-wname">{w.name}</span>
                  <span className="entry-sub">{locked ? `Saca ${PASS} % en el mundo ${w.id - 1} para abrirlo` : `${k}/${total} personajes · ${w.books}`}</span>
                </span>
                {!locked && b > 0 && (
                  <span className="mb-best">
                    <Stars n={stars(b)} />
                    {b} %
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </GameScreen>
  )
}

function Stars({ n, of = 3 }) {
  return (
    <span className="stars" aria-label={`${n} de ${of} estrellas`}>
      {Array.from({ length: of }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="12" height="12" className={i < n ? 'on' : ''} aria-hidden="true">
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01z" />
        </svg>
      ))}
    </span>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function World({ world, srs, best, bests, next, onBack, onMode }) {
  const total = inWorld(world.id).length
  const known = knownIn(world.id, srs)
  const mode = (m) => bests[`mb-w${world.id}-${m}`] ? `Mejor ${bests[`mb-w${world.id}-${m}`]} %` : null
  return (
    <GameScreen title={world.name} back="Mundos" onExit={onBack}>
      <div className="mb-world-hero">
        <span className="mb-num big">{world.id}</span>
        <div className="entry-main">
          <span className="entry-sub">{world.books}</span>
          <span className="mb-world-stats">{known} de {total} conocidos</span>
          <div className="mb-bar"><span style={{ width: `${(known / total) * 100}%` }} /></div>
        </div>
        <span className="mb-best">
          <Stars n={stars(best)} />
          {best > 0 && `${best} %`}
        </span>
      </div>
      {next && best < PASS && <p className="mb-goal">Saca {PASS} % o más en cualquier modo para abrir «{next.name}».</p>}
      <div className="mode-list">
        <ModeCard title="¿Quién soy?" badge={mode('who')} desc="Lee las pistas y adivina el personaje. Con menos pistas, más puntos." onClick={() => onMode('who')} />
        <ModeCard title="¿Qué hizo?" badge={mode('what')} desc="Ves el nombre y eliges quién fue." onClick={() => onMode('what')} />
        <ModeCard title="¿Dónde está?" badge={mode('where')} desc="Elige en qué parte de la Biblia está su historia." onClick={() => onMode('where')} />
        <ModeCard title="Personajes" badge={`${known}/${total}`} desc="Las fichas de todos los personajes de este mundo." onClick={() => onMode('people')} />
      </div>
    </GameScreen>
  )
}

// ¿Quién soy?: hasta 3 pistas; 3 puntos con una pista, 2 con dos, 1 con tres.
function WhoAmI({ title, back, chars, daily, srs, best: bestNow, onAnswer, onFinish, onBack }) {
  const [best, setBest] = useState(bestNow) // el récord de antes de esta ronda
  const [nonce, setNonce] = useState(0)
  // En el repaso diario las opciones salen de todos los personajes (vienen de mundos distintos).
  const round = useMemo(() => whoRound(chars, daily ? {} : srs, Math.random, daily ? CHARACTERS : undefined), [nonce]) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(1)
  const [picked, setPicked] = useState(null)
  const [points, setPoints] = useState(0)
  const [earned, setEarned] = useState(0)
  const [right, setRight] = useState(0)
  const [missed, setMissed] = useState([])
  const [run, setRun] = useState(0)
  const [maxRun, setMaxRun] = useState(0)
  const started = useRef(Date.now())
  const box = useRef(null)
  const q = round[i]
  useEffect(() => toTop(box.current), [i])

  function again() {
    setBest(bestNow)
    started.current = Date.now()
    setRun(0)
    setMaxRun(0)
    setNonce((n) => n + 1)
    setI(0)
    setShown(1)
    setPicked(null)
    setPoints(0)
    setRight(0)
    setMissed([])
  }

  if (!round.length) {
    return (
      <GameScreen title={title} back={back} onExit={onBack}>
        <div className="result-card"><p className="result-msg">No hay personajes para repasar hoy.</p><button className="secondary" onClick={onBack}>Volver</button></div>
      </GameScreen>
    )
  }

  if (!q) {
    const pct = Math.round((right / round.length) * 100)
    return (
      <GameScreen title={title} back={back} onExit={onBack}>
        <Result
          pct={pct}
          msg={`${right} de ${round.length} correctas · ${points} ${points === 1 ? 'punto' : 'puntos'}. ${cheer(pct)}`}
          record={best > 0 && pct > best}
          stats={[['Tiempo', fmtTime(Math.round((Date.now() - started.current) / 1000))], ['Mejor racha', maxRun], ...(best != null ? [['Tu mejor', Math.max(best, pct) + ' %']] : [])]}
          onAgain={again}
          onDone={onBack}
        >
          {missed.length > 0 && (
            <div className="missed">
              <p className="missed-title">Para repasar</p>
              {missed.map((c) => (
                <div key={c.id} className="missed-item">
                  <p className="missed-a">{c.n}</p>
                  <p className="missed-q">{c.t} · <RefLink refText={c.c} /></p>
                </div>
              ))}
            </div>
          )}
        </Result>
      </GameScreen>
    )
  }

  const answered = picked != null
  function choose(k) {
    if (answered) return
    const ok = k === q.answer
    setPicked(k)
    setShown(3)
    if (ok) {
      setRight((r) => r + 1)
      setEarned(4 - shown)
      setPoints((p) => p + (4 - shown))
      setRun((r) => r + 1)
      setMaxRun((m) => Math.max(m, run + 1))
    } else {
      setMissed((m) => [...m, q.ch])
      setRun(0)
    }
    onAnswer(q.ch, ok)
  }
  function next() {
    if (i + 1 >= round.length) onFinish(Math.round(((right) / round.length) * 100))
    setI(i + 1)
    setShown(1)
    setPicked(null)
  }

  return (
    <GameScreen title={title} back={back} onExit={onBack}>
      <div className="quiz" ref={box}>
        <div className="progress"><span style={{ width: `${(i / round.length) * 100}%` }} /></div>
        <div className="quiz-meta">
          <span className="quiz-count">{i + 1} de {round.length}</span>
          {run >= 2 && <span className="quiz-run" key={run}>{run} seguidas</span>}
          <span className="quiz-points">{points} pts</span>
        </div>
        <div className="mb-clues" key={i}>
          {q.clues.slice(0, shown).map((c, k) => (
            <p key={k} className={'mb-clue' + (k === 2 ? ' last' : '')}>{k < 2 ? `«${c}»` : c}</p>
          ))}
          {!answered && shown < 3 && (
            <button className="mb-more" onClick={() => setShown((s) => s + 1)}>Otra pista (vale {3 - shown} {3 - shown === 1 ? 'punto' : 'puntos'})</button>
          )}
        </div>
        <div className="options">
          {q.options.map((o, k) => (
            <button key={i + ':' + k} className={'option' + (!answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => choose(k)}>{o}</button>
          ))}
        </div>
        {answered && (
          <div className="feedback">
            <p className={picked === q.answer ? 'ok' : 'bad'}>{picked === q.answer ? `¡Correcto! +${earned} ${earned === 1 ? 'punto' : 'puntos'}` : `Era ${q.ch.n}`}</p>
            <p className="explain">{q.ch.t}.</p>
            <p className="ref"><RefLink refText={q.ch.c} /></p>
            <button className="primary" onClick={next}>{i + 1 < round.length ? 'Siguiente' : 'Ver resultado'}</button>
          </div>
        )}
      </div>
    </GameScreen>
  )
}

// ¿Qué hizo? y ¿Dónde está?: preguntas de opción múltiple con el Quiz común.
function ChoiceMode({ kind, world, srs, best, onAnswer, onFinish, onBack }) {
  const build = () => (kind === 'what' ? whatRound : whereRound)(inWorld(world), srs)
  const [round, setRound] = useState(build)
  const [nonce, setNonce] = useState(0)
  const byKey = useMemo(() => new Map(CHARACTERS.map((c) => [KEY(c), c])), [])
  return (
    <GameScreen title={kind === 'what' ? '¿Qué hizo?' : '¿Dónde está?'} back={`Mundo ${world}`} onExit={onBack}>
      <Quiz
        key={nonce}
        questions={round}
        best={best}
        onDone={onBack}
        onAgain={() => { setRound(build()); setNonce((n) => n + 1) }}
        onAnswer={(q, ok) => onAnswer(byKey.get(q.key), ok)}
        onFinish={(score, total) => onFinish(Math.round((score / total) * 100))}
      />
    </GameScreen>
  )
}

function Timeline({ open, best, onRecord, onBack }) {
  const [run, setRun] = useState(() => timelineRound(open))
  const [errors, setErrors] = useState(null)
  const [perfect, setPerfect] = useState(0) // rondas perfectas seguidas
  const [record, setRecord] = useState(false)
  const again = () => { setRun(timelineRound(open)); setErrors(null) }
  const worldName = (w) => WORLDS.find((x) => x.id === w).name
  function done(e) {
    setErrors(e)
    const n = e === 0 ? perfect + 1 : 0
    setPerfect(n)
    setRecord(best > 0 && n > best)
    if (n > best) onRecord(n)
  }
  return (
    <GameScreen title="Línea del tiempo" back="Mundos" onExit={onBack}>
      <div className="quiz-meta tl-meta">
        <span className="quiz-count">Del más antiguo al más reciente</span>
        {perfect >= 1 && <span className="quiz-run" key={perfect}>{perfect} {perfect === 1 ? 'perfecta' : 'perfectas seguidas'}</span>}
      </div>
      <OrderPuzzle key={run.map((c) => c.id).join()} pieces={run.map((c) => c.n)} onDone={done} hint="Toca los personajes en el orden en que vivieron." />
      {errors != null && (
        <Result
          compact
          msg={errors === 0 ? '¡Perfecto, sin errores!' : `Listo, con ${errors} ${errors === 1 ? 'error' : 'errores'}.`}
          record={record}
          onAgain={again}
          againLabel="Otra ronda"
          onDone={onBack}
          body={
            <ol className="mb-order">
              {run.map((c) => <li key={c.id}><b>{c.n}</b> <span>· {worldName(c.w)} · </span><RefLink refText={c.c} /></li>)}
            </ol>
          }
        />
      )}
    </GameScreen>
  )
}

function People({ world, srs, onBack }) {
  const [open, setOpen] = useState(null)
  const [q, setQ] = useState('')
  const [only, setOnly] = useState('all')
  const fold = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const isKnown = (c) => (srs[KEY(c)]?.box ?? 0) >= 1
  const chars = inWorld(world).filter((c) => (!q.trim() || fold(c.n + ' ' + c.t).includes(fold(q.trim()))) && (only === 'all' || (only === 'known') === isKnown(c)))
  const idx = open ? chars.findIndex((c) => c.id === open.id) : -1
  return (
    <GameScreen title="Personajes" back={`Mundo ${world}`} onExit={onBack}>
      <input className="input mb-search" type="search" placeholder="Buscar personaje" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="seg-modes small">
        {[['all', 'Todos'], ['known', 'Conocidos'], ['new', 'Por aprender']].map(([k, l]) => (
          <button key={k} className={only === k ? 'on' : ''} onClick={() => setOnly(k)}>{l}</button>
        ))}
      </div>
      {!chars.length && <p className="hint center">No hay personajes aquí.</p>}
      <ul className="entry-list">
        {chars.map((c) => (
          <li key={c.id}>
            <button className="entry-row" onClick={() => setOpen(c)}>
              <span className={'mb-dot' + (isKnown(c) ? ' on' : '')} />
              <span className="entry-main">
                <span className="entry-title">{c.n}</span>
                <span className="entry-sub">{c.t}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <Sheet
          title={open.n}
          className="mb-card"
          onClose={() => setOpen(null)}
          footer={chars.length > 1 && idx >= 0 && (
            <div className="two-btn">
              <button className="secondary" disabled={idx === 0} onClick={() => setOpen(chars[idx - 1])}>Anterior</button>
              <button className="secondary" disabled={idx === chars.length - 1} onClick={() => setOpen(chars[idx + 1])}>Siguiente</button>
            </div>
          )}
        >
          <p className="mb-card-t">{open.t}</p>
          <p className={'mb-status' + (isKnown(open) ? ' on' : '')}>{isKnown(open) ? 'Ya lo conoces' : 'Aún por aprender'}</p>
          {open.p.map((x, k) => <p key={k} className="mb-clue">«{x}»</p>)}
          <p className="mb-clue last">{open.d}</p>
          <p className="ref"><RefLink refText={open.c} /></p>
        </Sheet>
      )}
    </GameScreen>
  )
}
