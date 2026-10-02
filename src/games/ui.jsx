// Piezas comunes de la pestaña Juegos.
import { useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { parseJsonLoose } from '../lib/importer.js'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'
import { shuffle, timedPoints } from './logic.js'

// Pantalla de un juego: barra con "volver" y título.
export function GameScreen({ title, onExit, right, children }) {
  return (
    <div className="overlay game">
      <header className="bar">
        <button className="bar-btn back" onClick={onExit}><Icon d={ICONS.back} size={18} stroke={2} /> Juegos</button>
        <span className="bar-title">{title}</span>
        {right ?? <span className="bar-spacer" />}
      </header>
      <div className="editor-body game-body">{children}</div>
    </div>
  )
}

// Preguntas de opción múltiple: { prompt, options, answer, explain?, ref?, key? }
// onAnswer(q, acerto) se llama en cada respuesta; onFinish(aciertos, total, puntos) al terminar.
// Con `seconds` es contra reloj: cada pregunta tiene tiempo y la rapidez da puntos extra.
export function Quiz({ questions, onDone, onAgain, onAnswer, onFinish, seconds, best: bestNow }) {
  const [best] = useState(bestNow) // el récord de antes de esta ronda (al terminar ya se guardó el nuevo)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null) // índice elegido, o -1 si se acabó el tiempo
  const [score, setScore] = useState(0)
  const [points, setPoints] = useState(0)
  const [run, setRun] = useState(0)
  const [maxRun, setMaxRun] = useState(0)
  const roundStart = useRef(Date.now())
  const [missed, setMissed] = useState([])
  const [left, setLeft] = useState(seconds ? seconds * 1000 : 0)
  const startRef = useRef(0)
  const q = questions[i]
  const answered = picked != null

  function choose(k) {
    if (answered) return
    const ok = k === q.answer
    setPicked(k)
    if (ok) {
      setScore((s) => s + 1)
      setRun((r) => r + 1)
      setMaxRun((m) => Math.max(m, run + 1))
      if (seconds) setPoints((p) => p + timedPoints(seconds * 1000 - (Date.now() - startRef.current), seconds * 1000))
    } else {
      setRun(0)
      setMissed((m) => [...m, q])
    }
    onAnswer?.(q, ok)
  }

  // Cuenta regresiva de cada pregunta.
  useEffect(() => {
    if (!seconds || !q || answered) return
    startRef.current = Date.now()
    setLeft(seconds * 1000)
    const t = setInterval(() => {
      const rest = seconds * 1000 - (Date.now() - startRef.current)
      setLeft(Math.max(0, rest))
      if (rest <= 0) {
        clearInterval(t)
        choose(-1)
      }
    }, 100)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, seconds, answered])

  if (!q) {
    const pct = Math.round((score / questions.length) * 100)
    const record = seconds ? points > (best ?? 0) && points > 0 : best != null && pct > best && pct > 0
    return (
      <Result
        pct={pct}
        value={seconds ? points : score}
        unit={seconds ? 'pts' : `/${questions.length}`}
        msg={(seconds ? `${score} de ${questions.length} correctas. ` : '') + cheer(pct)}
        record={record}
        stats={[
          ['Tiempo', fmtTime(Math.round((Date.now() - roundStart.current) / 1000))],
          ['Mejor racha', maxRun],
          ...(best != null ? [[seconds ? 'Récord' : 'Tu mejor', seconds ? Math.max(best, points) + ' pts' : Math.max(best, pct) + ' %']] : []),
        ]}
        onAgain={onAgain}
        onDone={onDone}
      >
        {missed.length > 0 && (
          <div className="missed">
            <p className="missed-title">Para repasar</p>
            {missed.map((m, k) => (
              <div key={k} className="missed-item">
                <p className="missed-q">{m.prompt}</p>
                <p className="missed-a">{m.options[m.answer]}</p>
                {m.ref && findRefs(m.ref).length > 0 && <p className="missed-ref"><RefLink refText={findRefs(m.ref)[0]} /></p>}
              </div>
            ))}
          </div>
        )}
      </Result>
    )
  }

  return (
    <div className="quiz">
      <div className="progress"><span style={{ width: `${(i / questions.length) * 100}%` }} /></div>
      <div className="quiz-meta">
        <span className="quiz-count">{i + 1} de {questions.length}</span>
        {run >= 2 && <span className="quiz-run" key={run}>{run} seguidas</span>}
        {seconds ? <span className="quiz-points">{points} pts</span> : null}
      </div>
      {seconds ? <div className={'timer' + (left < 4000 ? ' low' : '')}><span style={{ width: `${(left / (seconds * 1000)) * 100}%` }} /></div> : null}
      <p className="quiz-prompt" key={'p' + i}>{q.prompt}</p>
      <div className="options">
        {q.options.map((o, k) => {
          const state = !answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim'
          return (
            <button key={i + ':' + k} className={'option' + state} disabled={answered} onClick={() => choose(k)}>
              {o}
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="feedback">
          <p className={picked === q.answer ? 'ok' : 'bad'}>{picked === q.answer ? 'Correcto' : picked === -1 ? 'Se acabó el tiempo' : 'No era esa'}</p>
          {q.explain && <p className="explain">{q.explain}</p>}
          {q.ref && <p className="ref">{findRefs(q.ref).length ? <RefLink refText={findRefs(q.ref)[0]} /> : q.ref}</p>}
          <button className="primary" onClick={() => {
            if (i + 1 >= questions.length) onFinish?.(score, questions.length, points)
            setPicked(null)
            setI(i + 1)
          }}>
            {i + 1 < questions.length ? 'Siguiente' : 'Ver resultado'}
          </button>
        </div>
      )}
    </div>
  )
}

export const cheer = (pct) => (pct === 100 ? '¡Perfecto!' : pct >= 85 ? '¡Excelente!' : pct >= 70 ? '¡Muy bien!' : pct >= 40 ? 'Vas bien, sigue repasando.' : 'Buen comienzo. ¡Otra vez!')

// 75 -> "1:15"; menos de un minuto -> "45 s".
export const fmtTime = (s) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)

// Pantalla de resultado común: anillo con el porcentaje, el número grande, mensaje,
// datos de la ronda (tiempo, racha, récord) y botones. `children` va abajo (p. ej. "Para repasar").
export function Result({ pct, value, unit, msg, record, stats = [], onAgain, onDone, againLabel = 'Jugar otra vez', doneLabel = 'Salir', compact, body, children }) {
  const R = 52
  const C = 2 * Math.PI * R
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(pct ?? 0))
    return () => cancelAnimationFrame(t)
  }, [pct])
  return (
    <div className={'result-card' + (compact ? ' compact' : '')}>
      {(pct ?? 0) >= 70 && <Confetti />}
      {pct != null && (
        <div className={'ring' + (pct >= 70 ? ' good' : pct >= 40 ? ' mid' : '')}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={R} className="ring-bg" />
            <circle cx="60" cy="60" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
          </svg>
          <span className="ring-in">
            <b>{value ?? pct}</b>
            <small>{value != null ? unit : '%'}</small>
          </span>
        </div>
      )}
      {pct == null && value != null && <p className="result-big">{value}{unit && <span>{unit}</span>}</p>}
      {record && <p className="record-tag">Nuevo récord</p>}
      {msg && <p className="result-msg">{msg}</p>}
      {body}
      {stats.length > 0 && (
        <div className="result-stats">
          {stats.map(([k, v]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}
        </div>
      )}
      {onAgain && <button className="primary" onClick={onAgain}>{againLabel}</button>}
      {onDone && <button className="secondary" onClick={onDone}>{doneLabel}</button>}
      {children}
    </div>
  )
}

// Reto contra reloj: responde todas las que puedas en `seconds` segundos.
// `make()` da una pregunta nueva { prompt, options, answer }. Cada acierto suma 1; un error resta 2 segundos.
// onFinish(aciertos, respondidas) al acabarse el tiempo.
export function Sprint({ make, seconds = 60, best: bestNow = 0, onFinish, onExit, intro }) {
  const [phase, setPhase] = useState('ready') // ready -> play -> done
  const [best, setBest] = useState(bestNow) // el récord de antes de esta ronda
  const [q, setQ] = useState(null)
  const [picked, setPicked] = useState(null)
  const [right, setRight] = useState(0)
  const [total, setTotal] = useState(0)
  const [run, setRun] = useState(0)
  const [maxRun, setMaxRun] = useState(0)
  const [left, setLeft] = useState(seconds * 1000)
  const [penalty, setPenalty] = useState(0)
  const [missed, setMissed] = useState([])
  const end = useRef(0)
  const lock = useRef(false)
  // Una pregunta nueva que no repita la anterior.
  const fresh = (prev) => {
    let n = make()
    for (let k = 0; k < 6 && prev && n.prompt === prev.prompt; k++) n = make()
    return n
  }

  function start() {
    setBest(bestNow)
    end.current = Date.now() + seconds * 1000
    setQ(fresh(null))
    setPicked(null)
    setRight(0)
    setTotal(0)
    setRun(0)
    setMaxRun(0)
    setMissed([])
    setLeft(seconds * 1000)
    setPhase('play')
  }

  useEffect(() => {
    if (phase !== 'play') return
    const t = setInterval(() => {
      const rest = end.current - Date.now()
      setLeft(Math.max(0, rest))
      if (rest <= 0) {
        clearInterval(t)
        setPhase('done')
      }
    }, 100)
    return () => clearInterval(t)
  }, [phase])

  const finished = useRef(false)
  useEffect(() => {
    if (phase === 'done' && !finished.current) {
      finished.current = true
      onFinish?.(right, total)
    }
    if (phase === 'play') finished.current = false
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function choose(k) {
    if (lock.current || phase !== 'play') return
    lock.current = true
    const ok = k === q.answer
    setPicked(k)
    setTotal((n) => n + 1)
    if (ok) {
      setRight((n) => n + 1)
      setRun((r) => r + 1)
      setMaxRun((m) => Math.max(m, run + 1))
    } else {
      setRun(0)
      setMissed((m) => [...m, q])
      end.current -= 2000
      setPenalty((p) => p + 1)
    }
    setTimeout(() => {
      lock.current = false
      setPicked(null)
      setQ((prev) => fresh(prev))
    }, ok ? 280 : 650)
  }

  if (phase === 'ready') {
    return (
      <div className="sprint-ready">
        <div className="sprint-clock">{seconds}<small>s</small></div>
        <p className="result-msg">{intro ?? 'Responde todas las que puedas.'} Cada error te quita 2 segundos.</p>
        {best > 0 && <p className="hint center">Tu récord: {best} {best === 1 ? 'acierto' : 'aciertos'}</p>}
        <button className="primary" onClick={start}>Empezar</button>
      </div>
    )
  }

  if (phase === 'done') {
    const record = right > best
    return (
      <Result
        value={right}
        unit={right === 1 ? ' acierto' : ' aciertos'}
        msg={total ? `${right} de ${total} bien en ${seconds} segundos.` : 'Se acabó el tiempo.'}
        record={record && right > 0}
        stats={[['Precisión', total ? Math.round((right / total) * 100) + ' %' : '—'], ['Mejor racha', maxRun], ['Récord', Math.max(best, right)]]}
        onAgain={start}
        onDone={onExit}
      >
        {record && right > 0 && <Confetti />}
        {missed.length > 0 && (
          <div className="missed">
            <p className="missed-title">Para repasar</p>
            {missed.map((m, k) => (
              <div key={k} className="missed-item">
                <p className="missed-q">{m.prompt}</p>
                <p className="missed-a">{m.options[m.answer]}</p>
              </div>
            ))}
          </div>
        )}
      </Result>
    )
  }

  const answered = picked != null
  return (
    <div className="quiz">
      <div className="sprint-top">
        <span className={'sprint-time' + (left < 10000 ? ' low' : '')} key={penalty}>{Math.ceil(left / 1000)}</span>
        {run >= 3 && <span className="quiz-run" key={run}>{run} seguidas</span>}
        <span className="quiz-points">{right} {right === 1 ? 'acierto' : 'aciertos'}</span>
      </div>
      <div className={'timer' + (left < 10000 ? ' low' : '')}><span style={{ width: `${(left / (seconds * 1000)) * 100}%` }} /></div>
      <p className="quiz-prompt" key={'p' + total}>{q.prompt}</p>
      <div className="options">
        {q.options.map((o, k) => (
          <button key={total + ':' + k} className={'option' + (!answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => choose(k)}>{o}</button>
        ))}
      </div>
    </div>
  )
}

// Sin fallar: preguntas seguidas hasta el primer error. onFinish(aciertos) al terminar.
export function Survival({ questions, best: bestNow = 0, onFinish, onAgain, onDone, onAnswer }) {
  const [best] = useState(bestNow)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [over, setOver] = useState(false)
  const q = questions[i]
  const answered = picked != null
  const ok = answered && picked === q?.answer

  function choose(k) {
    if (answered) return
    setPicked(k)
    onAnswer?.(q, k === q.answer)
  }
  function next() {
    if (!ok || i + 1 >= questions.length) {
      const n = ok ? i + 1 : i
      setOver(true)
      onFinish?.(n)
      return
    }
    setPicked(null)
    setI(i + 1)
  }

  if (over) {
    const n = ok ? i + 1 : i
    const all = ok && i + 1 >= questions.length
    return (
      <Result
        value={n}
        unit={n === 1 ? ' seguida' : ' seguidas'}
        msg={all ? '¡Todas sin fallar!' : n === 0 ? 'A la primera. ¡Otra vez!' : `Llegaste a ${n} sin fallar.`}
        record={n > best}
        stats={[['Récord', Math.max(best, n)], ['Preguntas', questions.length]]}
        onAgain={onAgain}
        onDone={onDone}
      >
        {(all || n > best) && n > 0 && <Confetti />}
        {!ok && (
          <div className="missed">
            <p className="missed-title">La que fallaste</p>
            <div className="missed-item">
              <p className="missed-q">{q.prompt}</p>
              <p className="missed-a">{q.options[q.answer]}</p>
              {q.explain && <p className="missed-q">{q.explain}</p>}
            </div>
          </div>
        )}
      </Result>
    )
  }

  return (
    <div className="quiz">
      <div className="quiz-meta">
        <span className="quiz-count">Pregunta {i + 1}</span>
        {i > 0 && <span className="quiz-run" key={i}>{i} {i === 1 ? 'seguida' : 'seguidas'}</span>}
        <span className="quiz-points">Récord {Math.max(best, i)}</span>
      </div>
      <p className="quiz-prompt" key={'p' + i}>{q.prompt}</p>
      <div className="options">
        {q.options.map((o, k) => (
          <button key={i + ':' + k} className={'option' + (!answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => choose(k)}>{o}</button>
        ))}
      </div>
      {answered && (
        <div className="feedback">
          <p className={ok ? 'ok' : 'bad'}>{ok ? 'Correcto' : 'Fallaste'}</p>
          {q.explain && <p className="explain">{q.explain}</p>}
          {q.ref && <p className="ref">{findRefs(q.ref).length ? <RefLink refText={findRefs(q.ref)[0]} /> : q.ref}</p>}
          <button className="primary" onClick={next}>{ok && i + 1 < questions.length ? 'Siguiente' : 'Ver resultado'}</button>
        </div>
      )}
    </div>
  )
}

// Tarjeta que se voltea con un toque y se desliza como en el iPhone:
// a la derecha = "me la sé", a la izquierda = "repasar otra vez".
export function SwipeCard({ front, back, onAnswer }) {
  const [flip, setFlip] = useState(false)
  const [dx, setDx] = useState(0)
  const [gone, setGone] = useState(0) // -1 / 1 mientras sale volando
  const start = useRef(null)
  const moved = useRef(0)

  function down(e) {
    start.current = { x: e.clientX, y: e.clientY }
    moved.current = 0
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* sin captura */ }
  }
  function move(e) {
    if (!start.current || gone) return
    const x = e.clientX - start.current.x
    if (Math.abs(x) < 6 && !moved.current) return
    moved.current = x
    setDx(x)
  }
  function up() {
    if (!start.current) return
    const x = moved.current
    start.current = null
    if (Math.abs(x) > 90) {
      const dir = x > 0 ? 1 : -1
      setGone(dir)
      setTimeout(() => onAnswer(dir > 0), 220)
    } else {
      if (Math.abs(x) < 6) setFlip((f) => !f)
      setDx(0)
    }
  }

  const x = gone ? gone * 500 : dx
  const lean = Math.max(-1, Math.min(1, dx / 120))
  return (
    <>
      <div className="swipe-wrap">
        <button
          className={'flashcard swipe' + (flip ? ' flipped' : '') + (dx || gone ? ' dragging' : '')}
          style={{ transform: `translateX(${x}px) rotate(${x / 22}deg)`, transition: dx && !gone ? 'none' : undefined }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => { start.current = null; setDx(0) }}
        >
          <span className="swipe-tag yes" style={{ opacity: Math.max(0, lean) }}>Me la sé</span>
          <span className="swipe-tag no" style={{ opacity: Math.max(0, -lean) }}>Repasar</span>
          {flip ? <span className="card-back">{back}</span> : <span className="card-front">{front}</span>}
          <span className="card-hint">{flip ? 'Desliza a la derecha si te la sabías' : 'Toca para ver la respuesta'}</span>
        </button>
      </div>
      <div className="two-btn">
        <button className="secondary" onClick={() => { setGone(-1); setTimeout(() => onAnswer(false), 220) }}>Repasar otra vez</button>
        <button className="primary" onClick={() => { setGone(1); setTimeout(() => onAnswer(true), 220) }}>Me la sé</button>
      </div>
    </>
  )
}

// Ordenar: toca los trozos en el orden correcto. onDone(errores) al terminar.
export function OrderPuzzle({ pieces, onDone, hint = 'Toca los trozos en orden.' }) {
  const [order] = useState(() => shuffle(pieces.map((_, i) => i)))
  const [used, setUsed] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const [errors, setErrors] = useState(0)
  const [stuck, setStuck] = useState(0) // errores seguidos en el mismo lugar: a los 2 se marca el que sigue
  const placed = used.size
  const done = placed >= pieces.length

  function tap(idx) {
    if (done || used.has(idx)) return
    // Vale cualquier trozo con el mismo texto que el que sigue (palabras repetidas).
    if (pieces[idx] === pieces[placed]) {
      const next = new Set(used).add(idx)
      setUsed(next)
      setStuck(0)
      if (next.size >= pieces.length) onDone?.(errors)
    } else {
      setMiss(idx)
      setErrors((e) => e + 1)
      setStuck((n) => n + 1)
      setTimeout(() => setMiss(null), 400)
    }
  }

  return (
    <div className="order">
      <p className="order-built">
        {pieces.slice(0, placed).map((p, k) => <span key={k} className="order-word">{p} </span>)}
        {!done && <span className="order-caret" />}
      </p>
      {!done && <p className="hint center">{hint}</p>}
      <div className="order-chips">
        {order.map((idx) => (
          <button key={idx} className={'order-chip' + (used.has(idx) ? ' used' : '') + (miss === idx ? ' miss' : '') + (stuck >= 2 && !used.has(idx) && pieces[idx] === pieces[placed] ? ' nudge' : '')} disabled={used.has(idx)} onClick={() => tap(idx)}>
            {pieces[idx]}
          </button>
        ))}
      </div>
    </div>
  )
}

// Confeti sencillo hecho con CSS (sin librerías).
const CONFETTI_COLORS = ['#f5d27a', '#86efac', '#93c5fd', '#f9a8d4', '#fdba74', '#c4b5fd']
export function Confetti() {
  const [bits] = useState(() =>
    Array.from({ length: 42 }, (_, k) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.4 + Math.random() * 1.1,
      rot: Math.random() * 360,
      color: CONFETTI_COLORS[k % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 5,
    })),
  )
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, k) => (
        <i key={k} style={{ left: b.left + '%', animationDelay: b.delay + 's', animationDuration: b.dur + 's', background: b.color, width: b.w, height: b.w * 0.45, transform: `rotate(${b.rot}deg)` }} />
      ))}
    </div>
  )
}

// Botones para elegir el modo de un juego.
export function ModeCard({ title, desc, onClick, badge }) {
  return (
    <button className="mode-card" onClick={onClick}>
      <span className="mode-title">{title}{badge && <span className="due-tag">{badge}</span>}</span>
      <span className="mode-desc">{desc}</span>
    </button>
  )
}

// Hoja para pegar un JSON de Claude con su formato.
export function PasteJson({ title, hint, format, toast, onCancel, onApply }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="overlay picker">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">{title}</span>
        <button className="bar-btn strong" disabled={!text.trim()} onClick={() => {
          try {
            onApply(parseJsonLoose(text))
          } catch (e) {
            setError(e.message)
          }
        }}>Agregar</button>
      </header>
      <div className="editor-body">
        <p className="hint">{hint}</p>
        {error && <p className="error">{error}</p>}
        <textarea className="input paste-input" value={text} placeholder="{ … }" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setText(e.target.value)} />
        <div className="stack">
          <button className="secondary" onClick={async () => {
            try { setText(await navigator.clipboard.readText()) } catch { setError('No se pudo leer el portapapeles. Mantén presionado el cuadro y elige “Pegar”.') }
          }}>Pegar del portapapeles</button>
          <button className="secondary" onClick={async () => {
            try { await navigator.clipboard.writeText(format); toast('Formato copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
          }}>Copiar formato para Claude</button>
        </div>
      </div>
    </div>
  )
}

export function Empty({ children, action }) {
  return (
    <div className="empty-state">
      <p>{children}</p>
      {action}
    </div>
  )
}
