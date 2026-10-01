// Piezas comunes de la pestaña Juegos.
import { useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { parseJsonLoose } from '../lib/importer.js'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'

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
// onAnswer(q, acerto) se llama en cada respuesta; onFinish(aciertos, total) al terminar.
export function Quiz({ questions, onDone, onAgain, onAnswer, onFinish }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const q = questions[i]

  if (!q) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="result-card">
        <p className="result-big">{score}<span>/{questions.length}</span></p>
        <p className="result-msg">{pct === 100 ? '¡Perfecto!' : pct >= 70 ? '¡Muy bien!' : pct >= 40 ? 'Vas bien, sigue repasando.' : 'Buen comienzo. ¡Otra vez!'}</p>
        <button className="primary" onClick={onAgain}>Jugar otra vez</button>
        <button className="secondary" onClick={onDone}>Salir</button>
      </div>
    )
  }

  const answered = picked != null
  return (
    <div className="quiz">
      <div className="progress"><span style={{ width: `${(i / questions.length) * 100}%` }} /></div>
      <p className="quiz-count">{i + 1} de {questions.length}</p>
      <p className="quiz-prompt">{q.prompt}</p>
      <div className="options">
        {q.options.map((o, k) => {
          const state = !answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim'
          return (
            <button key={k} className={'option' + state} disabled={answered} onClick={() => {
              setPicked(k)
              if (k === q.answer) setScore((s) => s + 1)
              onAnswer?.(q, k === q.answer)
            }}>
              {o}
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="feedback">
          <p className={picked === q.answer ? 'ok' : 'bad'}>{picked === q.answer ? 'Correcto' : 'No era esa'}</p>
          {q.explain && <p className="explain">{q.explain}</p>}
          {q.ref && <p className="ref">{findRefs(q.ref).length ? <RefLink refText={findRefs(q.ref)[0]} /> : q.ref}</p>}
          <button className="primary" onClick={() => {
            if (i + 1 >= questions.length) onFinish?.(score, questions.length)
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
