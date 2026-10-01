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
export function Quiz({ questions, onDone, onAgain, onAnswer, onFinish, seconds, best }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null) // índice elegido, o -1 si se acabó el tiempo
  const [score, setScore] = useState(0)
  const [points, setPoints] = useState(0)
  const [run, setRun] = useState(0)
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
    const record = seconds ? points > (best ?? 0) && points > 0 : pct === 100
    return (
      <div className="result-card">
        {pct >= 70 && <Confetti />}
        <p className="result-big">{seconds ? points : score}<span>{seconds ? ' pts' : `/${questions.length}`}</span></p>
        <p className="result-msg">
          {seconds ? `${score} de ${questions.length} correctas. ` : ''}
          {pct === 100 ? '¡Perfecto!' : pct >= 70 ? '¡Muy bien!' : pct >= 40 ? 'Vas bien, sigue repasando.' : 'Buen comienzo. ¡Otra vez!'}
          {seconds && record ? ' ¡Nuevo récord!' : ''}
        </p>
        <button className="primary" onClick={onAgain}>Jugar otra vez</button>
        <button className="secondary" onClick={onDone}>Salir</button>
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
      </div>
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

// Ordenar: toca los trozos en el orden correcto. onDone(errores) al terminar.
export function OrderPuzzle({ pieces, onDone, hint = 'Toca los trozos en orden.' }) {
  const [order] = useState(() => shuffle(pieces.map((_, i) => i)))
  const [used, setUsed] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const [errors, setErrors] = useState(0)
  const placed = used.size
  const done = placed >= pieces.length

  function tap(idx) {
    if (done || used.has(idx)) return
    // Vale cualquier trozo con el mismo texto que el que sigue (palabras repetidas).
    if (pieces[idx] === pieces[placed]) {
      const next = new Set(used).add(idx)
      setUsed(next)
      if (next.size >= pieces.length) onDone?.(errors)
    } else {
      setMiss(idx)
      setErrors((e) => e + 1)
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
          <button key={idx} className={'order-chip' + (used.has(idx) ? ' used' : '') + (miss === idx ? ' miss' : '')} disabled={used.has(idx)} onClick={() => tap(idx)}>
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
