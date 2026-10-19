// Piezas comunes de la pestaña Juegos.
import { useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { parseJsonLoose } from '../lib/importer.js'

// Pantalla de un juego: barra con "volver" y título.
// Como en iOS, deslizar desde el borde izquierdo hacia la derecha regresa.
export function GameScreen({ title, onExit, right, back = 'Repasar', children }) {
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
