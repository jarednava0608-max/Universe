import { useState } from 'react'
import { bookRun, buildBookQuestions, SECTIONS } from './logic.js'
import { GameScreen, Quiz, ModeCard, OrderPuzzle, Confetti } from './ui.jsx'
import { withBest } from './progress.js'
import { BOOKS } from '../lib/bible.js'

// Libros de la Biblia: preguntas (antes / después / sección), ordenar libros seguidos y la lista para estudiarla.
export default function Books({ store, onExit }) {
  const [mode, setMode] = useState(null)
  const [nonce, setNonce] = useState(0)
  const [round, setRound] = useState(null)
  const exit = () => setMode(null)
  const best = store.progress.best?.libros ?? 0

  if (mode === 'quiz') {
    return (
      <GameScreen title="Preguntas" onExit={exit}>
        <Quiz
          key={nonce}
          questions={round}
          onDone={exit}
          onAgain={() => { setRound(buildBookQuestions()); setNonce((x) => x + 1) }}
          onFinish={(score, total) => store.updateProgress((f) => withBest(f, 'libros', Math.round((score / total) * 100)))}
        />
      </GameScreen>
    )
  }
  if (mode === 'order') return <OrderBooks onExit={exit} />
  if (mode === 'list') return <BookList onExit={exit} />

  return (
    <GameScreen title="Libros de la Biblia" onExit={onExit}>
      <p className="hint">Aprende los 66 libros en orden y en qué sección está cada uno.</p>
      <div className="mode-list">
        <ModeCard title="Preguntas" desc={`¿Qué libro va antes o después? ¿En qué sección está?${best ? ` Mejor: ${best}%` : ''}`} onClick={() => { setRound(buildBookQuestions()); setNonce((x) => x + 1); setMode('quiz') }} />
        <ModeCard title="Ordenar" desc="Pon en orden 6 libros seguidos." onClick={() => setMode('order')} />
        <ModeCard title="Ver la lista" desc="Los 66 libros por sección, para estudiarlos." onClick={() => setMode('list')} />
      </div>
    </GameScreen>
  )
}

function OrderBooks({ onExit }) {
  const [run, setRun] = useState(() => bookRun())
  const [errors, setErrors] = useState(null)
  const again = () => { setRun(bookRun()); setErrors(null) }
  return (
    <GameScreen title="Ordenar" onExit={onExit}>
      <OrderPuzzle key={run.join()} pieces={run} onDone={setErrors} hint="Toca los libros en el orden de la Biblia." />
      {errors != null && (
        <div className="result-card compact">
          {errors === 0 && <Confetti />}
          <p className="result-msg">{errors === 0 ? '¡Perfecto, sin errores!' : `Listo, con ${errors} ${errors === 1 ? 'error' : 'errores'}.`}</p>
          <button className="primary" onClick={again}>Otra ronda</button>
          <button className="secondary" onClick={onExit}>Salir</button>
        </div>
      )}
    </GameScreen>
  )
}

function BookList({ onExit }) {
  return (
    <GameScreen title="Los 66 libros" onExit={onExit}>
      {SECTIONS.map((s) => (
        <section key={s.name} className="book-section">
          <p className="book-section-title">{s.name}</p>
          <ol className="book-list" start={s.from}>
            {BOOKS.slice(s.from - 1, s.to).map((b) => <li key={b}>{b}</li>)}
          </ol>
        </section>
      ))}
    </GameScreen>
  )
}
