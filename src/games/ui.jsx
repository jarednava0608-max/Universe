// Piezas comunes de la pestaña Juegos.
import { useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { parseJsonLoose } from '../lib/importer.js'
import { shuffle } from './logic.js'

// Pantalla de un juego: barra con "volver" y título.
// Como en iOS, deslizar desde el borde izquierdo hacia la derecha regresa.
export function GameScreen({ title, onExit, right, back = 'Juegos', children }) {
  const [dx, setDx] = useState(0)
  const drag = useRef(null)
  const onTouchStart = (e) => {
    const t = e.touches[0]
    drag.current = t.clientX < 28 ? { x: t.clientX, y: t.clientY, on: false } : null
  }
  const onTouchMove = (e) => {
    const d = drag.current
    if (!d) return
    const t = e.touches[0]
    const x = t.clientX - d.x
    if (!d.on) {
      if (Math.abs(t.clientY - d.y) > Math.abs(x)) { drag.current = null; return }
      if (x > 8) d.on = true
    }
    if (d.on) {
      d.dx = Math.max(0, x)
      setDx(d.dx)
    }
  }
  const onTouchEnd = () => {
    const d = drag.current
    drag.current = null
    setDx(0)
    if (d?.on && d.dx > 90) onExit() // la distancia va en el ref (el estado puede ir atrasado)
  }
  return (
    <div
      className="overlay game"
      style={dx ? { transform: `translateX(${dx}px)`, transition: 'none', boxShadow: '-12px 0 30px rgba(0,0,0,0.35)' } : undefined}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <header className="bar">
        <button className="bar-btn back" onClick={onExit}><Icon d={ICONS.back} size={18} stroke={2} /> {back}</button>
        <span className="bar-title">{title}</span>
        {right ?? <span className="bar-spacer" />}
      </header>
      <div className="editor-body game-body">{children}</div>
    </div>
  )
}

// Sube al inicio la pantalla del juego (cada pregunta y el resultado empiezan arriba).
function toTop(el) {
  el?.closest('.game-body')?.scrollTo({ top: 0 })
}

// 75 -> "1:15"; menos de un minuto -> "45 s".
export const fmtTime = (s) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)

// Pantalla de resultado común: anillo con el porcentaje, el número grande, mensaje,
// datos de la ronda (tiempo, racha, récord) y botones. `children` va abajo (p. ej. "Para repasar").
export function Result({ pct, value, unit, msg, record, stats = [], onAgain, onDone, againLabel = 'Jugar otra vez', doneLabel = 'Salir', compact, body, children }) {
  const R = 52
  const C = 2 * Math.PI * R
  const [shown, setShown] = useState(0)
  const box = useRef(null)
  useEffect(() => toTop(box.current), [])
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(pct ?? 0))
    return () => cancelAnimationFrame(t)
  }, [pct])
  return (
    <div ref={box} className={'result-card' + (compact ? ' compact' : '')}>
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
    // Antes de ver la respuesta no se puede deslizar: primero se voltea (nada de "Me la sé" a ojo).
    if (!start.current || gone || !flip) return
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
      {flip ? (
        <div className="two-btn">
          <button className="secondary" onClick={() => { setGone(-1); setTimeout(() => onAnswer(false), 220) }}>Repasar otra vez</button>
          <button className="primary" onClick={() => { setGone(1); setTimeout(() => onAnswer(true), 220) }}>Me la sé</button>
        </div>
      ) : (
        <button className="primary" onClick={() => setFlip(true)}>Ver la respuesta</button>
      )}
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

// Memorama: todas las cartas boca abajo; se voltean de dos en dos y las parejas (mismo id) se quedan descubiertas.
// build() da { left: [{ id, text }], right: [{ id, text }] } (mismos id en ambos lados) o null.
// best/onBest = récord en segundos (menos es mejor). onPair(id, ok) opcional, por si cuenta para el repaso.
function buildDeck(build) {
  const b = build()
  if (!b) return null
  const cards = [
    ...b.left.map((x) => ({ key: 'l' + x.id, id: x.id, text: x.text, title: true })),
    ...b.right.map((x) => ({ key: 'r' + x.id, id: x.id, text: x.text, title: false })),
  ]
  return { cards: shuffle(cards), pairs: b.left.length, wide: cards.every((c) => String(c.text).length <= 28) }
}

export function PairsGame({ title = 'Memorama', back, build, best, onBest, onExit, onPair, hint = 'Toca una carta y busca su pareja.', empty = 'Todavía no hay suficientes para este juego.' }) {
  const [prevBest, setPrevBest] = useState(best)
  const [deck, setDeck] = useState(() => buildDeck(build))
  const [up, setUp] = useState([]) // claves de las cartas volteadas ahora (máx. 2)
  const [done, setDone] = useState(() => new Set()) // ids ya emparejados
  const [tries, setTries] = useState(0)
  const [secs, setSecs] = useState(0)
  const startRef = useRef(null)
  const failed = useRef(new Set())
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!deck) return <GameScreen title={title} back={back} onExit={onExit}><Empty>{empty}</Empty></GameScreen>

  const finished = done.size === deck.pairs
  function flip(c) {
    if (up.length >= 2 || up.includes(c.key) || done.has(c.id)) return
    if (!startRef.current) startRef.current = Date.now()
    const next = [...up, c.key]
    setUp(next)
    if (next.length < 2) return
    const a = deck.cards.find((x) => x.key === next[0])
    setTries((t) => t + 1)
    if (a.id === c.id) {
      const ok = !failed.current.has(a.key) && !failed.current.has(c.key)
      onPair?.(c.id, ok)
      const set = new Set(done).add(c.id)
      timer.current = setTimeout(() => {
        setDone(set)
        setUp([])
        if (set.size === deck.pairs) {
          const t = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
          setSecs(t)
          onBest?.(t)
        }
      }, 500)
    } else {
      failed.current.add(a.key)
      failed.current.add(c.key)
      timer.current = setTimeout(() => setUp([]), 1000)
    }
  }
  function again() {
    clearTimeout(timer.current)
    setPrevBest(best)
    setDeck(buildDeck(build))
    setDone(new Set())
    setUp([])
    setTries(0)
    failed.current = new Set()
    startRef.current = null
  }

  return (
    <GameScreen title={title} back={back} onExit={onExit}>
      {finished ? (
        <Result
          pct={Math.round((deck.pairs / Math.max(tries, 1)) * 100)}
          value={fmtTime(secs)}
          unit=""
          msg={`Lo hiciste en ${tries} ${tries === 1 ? 'intento' : 'intentos'}`}
          record={prevBest != null && secs < prevBest}
          stats={[['Parejas', deck.pairs], ['Intentos', tries], ['Récord', fmtTime(Math.min(prevBest ?? Infinity, secs))]]}
          onAgain={again}
          againLabel="Otra ronda"
          onDone={onExit}
        />
      ) : (
        <>
          {tries === 0 && up.length === 0 && <p className="hint">{hint}</p>}
          <p className="mem-status">Parejas {done.size}/{deck.pairs} · {tries} {tries === 1 ? 'intento' : 'intentos'}</p>
          <div className={'pairs ' + (deck.wide ? 'cols3' : 'cols2')}>
            {deck.cards.map((c) => {
              const matched = done.has(c.id)
              const shown = matched || up.includes(c.key)
              return (
                <button key={c.key} className={'pair-chip' + (shown ? ' up' : '') + (matched ? ' done' : '') + (c.title ? ' title' : '')}
                  aria-label={shown ? c.text : 'Carta boca abajo'} aria-pressed={shown} onClick={() => flip(c)}>
                  <span className="mem-in">
                    <span className="mem-face mem-back" aria-hidden="true" />
                    <span className="mem-face mem-front">{c.text}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </GameScreen>
  )
}
