import { useMemo, useState } from 'react'
import { newId } from '../lib/model.js'
import { parseTrivia, shuffle, triviaToQuestion, TRIVIA_FORMAT } from './logic.js'
import { GameScreen, Quiz, PasteJson, Empty, ModeCard, Survival } from './ui.jsx'
import { byPriority, dueCount, isDue, review, withBest } from './progress.js'

const SECONDS = 15

// Trivia: preguntas que el usuario pega desde Claude (se guardan como entradas 'trivia').
export default function Trivia({ store, toast, onExit }) {
  const bank = useMemo(() => store.entries.filter((e) => e.kind === 'trivia'), [store.entries])
  const [round, setRound] = useState(null)
  const [timed, setTimed] = useState(false)
  const [survival, setSurvival] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [paste, setPaste] = useState(false)
  const [list, setList] = useState(false)

  const srs = store.progress.srs ?? {}
  const keys = bank.map((e) => 'q:' + e.id)
  const due = dueCount(keys, srs)

  // Repaso inteligente: primero las preguntas que fallaste o que ya toca repasar.
  function start(withTimer = timed) {
    setSurvival(false)
    setTimed(withTimer)
    setNonce((x) => x + 1)
    const byKey = new Map(bank.map((e) => ['q:' + e.id, e]))
    const pick = byPriority(keys, srs).slice(0, 10)
    setRound(shuffle(pick).map((k) => ({ ...triviaToQuestion(byKey.get(k).fields), key: k })))
  }
  // Sin fallar: todas las preguntas revueltas hasta el primer error.
  function startSurvival() {
    setSurvival(true)
    setNonce((x) => x + 1)
    setRound(shuffle(bank).map((e) => ({ ...triviaToQuestion(e.fields), key: 'q:' + e.id })))
  }
  // Solo las que fallaste o que toca repasar hoy.
  function startDue() {
    setSurvival(false)
    setTimed(false)
    setNonce((x) => x + 1)
    const byKey = new Map(bank.map((e) => ['q:' + e.id, e]))
    const pick = byPriority(keys, srs).filter((k) => isDue(srs[k]) && srs[k]).slice(0, 10)
    setRound(shuffle(pick).map((k) => ({ ...triviaToQuestion(byKey.get(k).fields), key: k })))
  }
  const failed = keys.filter((k) => srs[k] && isDue(srs[k])).length
  const bestRun = store.progress.best?.['trivia-racha'] ?? 0
  const onAnswer = (q, ok) => store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [q.key]: review(f.srs?.[q.key], ok) } }))
  const onFinish = (score, total, points) => {
    const pct = Math.round((score / total) * 100)
    if (timed) store.updateProgress((f) => withBest(f, 'trivia-reloj', points))
    else if (pct > (store.progress.triviaBest ?? 0)) store.updateProgress((f) => ({ ...f, triviaBest: pct }))
  }
  const bestTimed = store.progress.best?.['trivia-reloj'] ?? 0
  const n = Math.min(10, bank.length)

  if (list) return <QuestionList bank={bank} store={store} onBack={() => setList(false)} />

  return (
    <GameScreen title="Trivia" onExit={round ? () => setRound(null) : onExit}>
      {round && survival ? (
        <Survival
          key={nonce}
          questions={round}
          best={bestRun}
          onAnswer={onAnswer}
          onFinish={(n) => store.updateProgress((f) => withBest(f, 'trivia-racha', n))}
          onAgain={startSurvival}
          onDone={() => setRound(null)}
        />
      ) : round ? (
        <Quiz key={nonce} questions={round} seconds={timed ? SECONDS : 0} best={timed ? bestTimed : store.progress.triviaBest ?? 0} onDone={() => setRound(null)} onAgain={() => start()} onAnswer={onAnswer} onFinish={onFinish} />
      ) : bank.length ? (
        <div className="game-home">
          <p className="game-stat"><b>{bank.length}</b> {bank.length === 1 ? 'pregunta guardada' : 'preguntas guardadas'}</p>
          <p className="game-sub">{due ? `${due} para repasar hoy` : 'Al día con el repaso'}{store.progress.triviaBest ? ` · Mejor ronda: ${store.progress.triviaBest}%` : ''}</p>
          <div className="mode-list">
            <ModeCard title="Normal" desc={`${n} preguntas a tu ritmo. Primero las que fallaste.`} badge={due ? `${due} hoy` : null} onClick={() => start(false)} />
            <ModeCard title="Contra reloj" badge={bestTimed ? `Récord ${bestTimed}` : null} desc={`${SECONDS} segundos por pregunta. Más rápido, más puntos.`} onClick={() => start(true)} />
            {bank.length >= 3 && <ModeCard title="Sin fallar" badge={bestRun ? `Récord ${bestRun}` : null} desc="Todas tus preguntas revueltas. ¿Hasta dónde llegas sin un error?" onClick={startSurvival} />}
            {failed > 0 && <ModeCard title="Solo las que fallé" badge={`${failed}`} desc="Las preguntas que fallaste o que ya toca repasar." onClick={startDue} />}
          </div>
          <button className="secondary" onClick={() => setPaste(true)}>Agregar preguntas de Claude</button>
          <button className="secondary" onClick={() => setList(true)}>Ver mis preguntas</button>
        </div>
      ) : (
        <Empty action={<button className="primary" onClick={() => setPaste(true)}>Agregar preguntas de Claude</button>}>
          Pídele a Claude preguntas sobre lo que estudiaste y pégalas aquí.
        </Empty>
      )}

      {paste && (
        <PasteJson
          title="Preguntas"
          hint="Pega el JSON de preguntas que te dio Claude."
          format={TRIVIA_FORMAT}
          toast={toast}
          onCancel={() => setPaste(false)}
          onApply={async (data) => {
            const { questions, warnings } = parseTrivia(data)
            const now = Date.now()
            await store.saveEntries(questions.map((f) => ({ id: newId(), kind: 'trivia', fields: f, createdAt: now, updatedAt: now })))
            setPaste(false)
            toast(`${questions.length} preguntas agregadas${warnings.length ? ` (${warnings.length} ignoradas)` : ''}.`)
          }}
        />
      )}
    </GameScreen>
  )
}

// Lista de preguntas guardadas: se pueden borrar una por una o todas.
function QuestionList({ bank, store, onBack }) {
  return (
    <GameScreen title="Mis preguntas" onExit={onBack}>
      <ul className="q-list">
        {bank.map((e) => (
          <li key={e.id} className="q-item">
            <span className="entry-main">
              <span className="q-text">{e.fields.pregunta}</span>
              <span className="entry-sub">{e.fields.opciones[e.fields.respuesta]}</span>
            </span>
            <button className="q-del" aria-label="Borrar pregunta" onClick={() => store.deleteEntry(e.id)}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </li>
        ))}
      </ul>
      {bank.length > 0 && (
        <button className="link-danger" onClick={() => confirm('¿Borrar todas las preguntas de trivia?') && store.deleteEntries(bank.map((e) => e.id))}>
          Borrar todas las preguntas
        </button>
      )}
    </GameScreen>
  )
}
