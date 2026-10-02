import { useState } from 'react'
import { bookRun, bookSprintQuestion, buildBookQuestions, SECTIONS } from './logic.js'
import { GameScreen, Quiz, ModeCard, OrderPuzzle, Result, Sprint } from './ui.jsx'
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
          best={best}
          onDone={exit}
          onAgain={() => { setRound(buildBookQuestions()); setNonce((x) => x + 1) }}
          onFinish={(score, total) => store.updateProgress((f) => withBest(f, 'libros', Math.round((score / total) * 100)))}
        />
      </GameScreen>
    )
  }
  if (mode === 'order') return <OrderBooks best={store.progress.best?.['libros-orden'] ?? 0} onRecord={(n) => store.updateProgress((f) => withBest(f, 'libros-orden', n))} onExit={exit} />
  if (mode === 'sprint') {
    return (
      <GameScreen title="Reto de 60 segundos" onExit={exit}>
        <Sprint
          make={bookSprintQuestion}
          best={store.progress.best?.['libros-reto'] ?? 0}
          intro="¿Qué libro va antes o después? ¿En qué sección está?"
          onFinish={(n) => store.updateProgress((f) => withBest(f, 'libros-reto', n))}
          onExit={exit}
        />
      </GameScreen>
    )
  }
  if (mode === 'list') return <BookList onExit={exit} />

  return (
    <GameScreen title="Libros de la Biblia" onExit={onExit}>
      <p className="hint">Aprende los 66 libros en orden y en qué sección está cada uno.</p>
      <div className="mode-list">
        <ModeCard title="Preguntas" badge={best ? `Mejor ${best} %` : null} desc="¿Qué libro va antes o después? ¿En qué sección está?" onClick={() => { setRound(buildBookQuestions()); setNonce((x) => x + 1); setMode('quiz') }} />
        <ModeCard title="Reto de 60 segundos" badge={store.progress.best?.['libros-reto'] ? `Récord ${store.progress.best['libros-reto']}` : null} desc="Todas las que puedas contra reloj." onClick={() => setMode('sprint')} />
        <ModeCard title="Ordenar" badge={store.progress.best?.['libros-orden'] ? `${store.progress.best['libros-orden']} seguidas` : null} desc="Pon en orden 6 libros seguidos." onClick={() => setMode('order')} />
        <ModeCard title="Ver la lista" desc="Los 66 libros por sección, para estudiarlos." onClick={() => setMode('list')} />
      </div>
    </GameScreen>
  )
}

function OrderBooks({ best, onRecord, onExit }) {
  const [run, setRun] = useState(() => bookRun())
  const [errors, setErrors] = useState(null)
  const [perfect, setPerfect] = useState(0) // rondas perfectas seguidas
  const [record, setRecord] = useState(false)
  const again = () => { setRun(bookRun()); setErrors(null) }
  function done(e) {
    setErrors(e)
    const n = e === 0 ? perfect + 1 : 0
    setPerfect(n)
    setRecord(n > best)
    if (n > best) onRecord(n)
  }
  return (
    <GameScreen title="Ordenar" onExit={onExit}>
      <div className="quiz-meta tl-meta">
        <span className="quiz-count">En el orden de la Biblia</span>
        {perfect >= 1 && <span className="quiz-run" key={perfect}>{perfect} {perfect === 1 ? 'perfecta' : 'perfectas seguidas'}</span>}
      </div>
      <OrderPuzzle key={run.join()} pieces={run} onDone={done} hint="Toca los libros en el orden de la Biblia." />
      {errors != null && (
        <Result
          compact
          msg={errors === 0 ? '¡Perfecto, sin errores!' : `Listo, con ${errors} ${errors === 1 ? 'error' : 'errores'}.`}
          record={record}
          onAgain={again}
          againLabel="Otra ronda"
          onDone={onExit}
        />
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
