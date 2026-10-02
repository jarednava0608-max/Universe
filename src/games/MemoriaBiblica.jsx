import { useMemo, useState } from 'react'
import { GameScreen, Quiz, ModeCard, OrderPuzzle, Confetti } from './ui.jsx'
import { CHARACTERS, WORLDS } from './memoria/characters.js'
import { KEY, PASS, inWorld, knownIn, unlockedWorlds, whoRound, whatRound, whereRound, timelineRound, dailyDue } from './memoria/logic.js'
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
  const finish = (world, pct) => world && store.updateProgress((f) => withBest(f, 'mb-w' + world, pct))

  if (screen.name === 'world') {
    const w = WORLDS.find((x) => x.id === screen.world)
    return <World world={w} srs={srs} best={best[`mb-w${w.id}`] ?? 0} next={WORLDS[w.id]} onBack={toMap} onMode={(mode) => go(mode, { world: w.id, back: 'world' })} />
  }
  if (screen.name === 'who' || screen.name === 'daily') {
    const chars = screen.name === 'daily' ? due.slice(0, 15) : inWorld(screen.world)
    const back = () => (screen.world ? go('world', { world: screen.world }) : toMap())
    return (
      <WhoAmI
        title={screen.name === 'daily' ? 'Repaso de hoy' : '¿Quién soy?'}
        chars={chars}
        daily={screen.name === 'daily'}
        srs={srs}
        onAnswer={answer}
        onFinish={(pct) => finish(screen.world, pct)}
        onBack={back}
      />
    )
  }
  if (screen.name === 'what' || screen.name === 'where') {
    return <ChoiceMode kind={screen.name} world={screen.world} srs={srs} onAnswer={answer} onFinish={(pct) => finish(screen.world, pct)} onBack={() => go('world', { world: screen.world })} />
  }
  if (screen.name === 'timeline') return <Timeline open={open} onBack={toMap} />
  if (screen.name === 'people') return <People world={screen.world} srs={srs} onBack={() => go('world', { world: screen.world })} />

  const known = CHARACTERS.filter((c) => (srs[KEY(c)]?.box ?? 0) >= 1).length
  return (
    <GameScreen title="Memoria Bíblica" onExit={onExit}>
      <div className="mb-hero">
        <p className="mb-count"><b>{known}</b> de {CHARACTERS.length} personajes</p>
        <div className="mb-bar"><span style={{ width: `${(known / CHARACTERS.length) * 100}%` }} /></div>
      </div>
      <div className="mode-list">
        <ModeCard title="Repaso de hoy" badge={due.length ? `${due.length}` : null} desc={due.length ? 'Los personajes que fallaste o que ya toca repasar.' : 'Al día. Juega un mundo y aquí aparecerá lo que toque repasar.'} onClick={() => due.length && go('daily')} />
        <ModeCard title="Línea del tiempo" desc="Ordena personajes de distintas épocas." onClick={() => go('timeline')} />
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
                {!locked && b > 0 && <span className="mb-best">{b} %</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </GameScreen>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function World({ world, srs, best, next, onBack, onMode }) {
  const total = inWorld(world.id).length
  return (
    <GameScreen title={world.name} onExit={onBack}>
      <p className="hint">{world.books} · {knownIn(world.id, srs)}/{total} personajes conocidos{best ? ` · mejor: ${best} %` : ''}</p>
      {next && best < PASS && <p className="mb-goal">Saca {PASS} % o más en cualquier modo para abrir «{next.name}».</p>}
      <div className="mode-list">
        <ModeCard title="¿Quién soy?" desc="Lee las pistas y adivina el personaje. Con menos pistas, más puntos." onClick={() => onMode('who')} />
        <ModeCard title="¿Qué hizo?" desc="Ves el nombre y eliges quién fue." onClick={() => onMode('what')} />
        <ModeCard title="¿Dónde está?" desc="Elige en qué parte de la Biblia está su historia." onClick={() => onMode('where')} />
        <ModeCard title="Personajes" desc="Las fichas de todos los personajes de este mundo." onClick={() => onMode('people')} />
      </div>
    </GameScreen>
  )
}

// ¿Quién soy?: hasta 3 pistas; 3 puntos con una pista, 2 con dos, 1 con tres.
function WhoAmI({ title, chars, daily, srs, onAnswer, onFinish, onBack }) {
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
  const q = round[i]

  function again() {
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
      <GameScreen title={title} onExit={onBack}>
        <div className="result-card"><p className="result-msg">No hay personajes para repasar hoy.</p><button className="secondary" onClick={onBack}>Volver</button></div>
      </GameScreen>
    )
  }

  if (!q) {
    const pct = Math.round((right / round.length) * 100)
    return (
      <GameScreen title={title} onExit={onBack}>
        <div className="result-card">
          {pct >= PASS && <Confetti />}
          <p className="result-big">{points}<span> pts</span></p>
          <p className="result-msg">{right} de {round.length} correctas ({pct} %). {pct === 100 ? '¡Perfecto!' : pct >= PASS ? '¡Muy bien!' : 'Sigue practicando.'}</p>
          <button className="primary" onClick={again}>Jugar otra vez</button>
          <button className="secondary" onClick={onBack}>Salir</button>
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
        </div>
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
    } else setMissed((m) => [...m, q.ch])
    onAnswer(q.ch, ok)
  }
  function next() {
    if (i + 1 >= round.length) onFinish(Math.round(((right) / round.length) * 100))
    setI(i + 1)
    setShown(1)
    setPicked(null)
  }

  return (
    <GameScreen title={title} onExit={onBack}>
      <div className="quiz">
        <div className="progress"><span style={{ width: `${(i / round.length) * 100}%` }} /></div>
        <div className="quiz-meta">
          <span className="quiz-count">{i + 1} de {round.length}</span>
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
function ChoiceMode({ kind, world, srs, onAnswer, onFinish, onBack }) {
  const build = () => (kind === 'what' ? whatRound : whereRound)(inWorld(world), srs)
  const [round, setRound] = useState(build)
  const [nonce, setNonce] = useState(0)
  const byKey = useMemo(() => new Map(CHARACTERS.map((c) => [KEY(c), c])), [])
  return (
    <GameScreen title={kind === 'what' ? '¿Qué hizo?' : '¿Dónde está?'} onExit={onBack}>
      <Quiz
        key={nonce}
        questions={round}
        onDone={onBack}
        onAgain={() => { setRound(build()); setNonce((n) => n + 1) }}
        onAnswer={(q, ok) => onAnswer(byKey.get(q.key), ok)}
        onFinish={(score, total) => onFinish(Math.round((score / total) * 100))}
      />
    </GameScreen>
  )
}

function Timeline({ open, onBack }) {
  const [run, setRun] = useState(() => timelineRound(open))
  const [errors, setErrors] = useState(null)
  const again = () => { setRun(timelineRound(open)); setErrors(null) }
  const worldName = (w) => WORLDS.find((x) => x.id === w).name
  return (
    <GameScreen title="Línea del tiempo" onExit={onBack}>
      <OrderPuzzle key={run.map((c) => c.id).join()} pieces={run.map((c) => c.n)} onDone={setErrors} hint="Toca los personajes del más antiguo al más reciente." />
      {errors != null && (
        <div className="result-card compact">
          {errors === 0 && <Confetti />}
          <p className="result-msg">{errors === 0 ? '¡Perfecto, sin errores!' : `Listo, con ${errors} ${errors === 1 ? 'error' : 'errores'}.`}</p>
          <ol className="mb-order">
            {run.map((c) => <li key={c.id}><b>{c.n}</b> <span>· {worldName(c.w)}</span></li>)}
          </ol>
          <button className="primary" onClick={again}>Otra ronda</button>
          <button className="secondary" onClick={onBack}>Salir</button>
        </div>
      )}
    </GameScreen>
  )
}

function People({ world, srs, onBack }) {
  const [open, setOpen] = useState(null)
  const chars = inWorld(world)
  return (
    <GameScreen title="Personajes" onExit={onBack}>
      <ul className="entry-list">
        {chars.map((c) => (
          <li key={c.id}>
            <button className="entry-row" onClick={() => setOpen(c)}>
              <span className="entry-main">
                <span className="entry-title">{c.n}</span>
                <span className="entry-sub">{c.t}</span>
              </span>
              {(srs[KEY(c)]?.box ?? 0) >= 1 && <span className="due-tag">Conocido</span>}
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <Sheet title={open.n} className="mb-card" onClose={() => setOpen(null)}>
          <p className="mb-card-t">{open.t}</p>
          {open.p.map((x, k) => <p key={k} className="mb-clue">«{x}»</p>)}
          <p className="mb-clue last">{open.d}</p>
          <p className="ref"><RefLink refText={open.c} /></p>
        </Sheet>
      )}
    </GameScreen>
  )
}

