import { useMemo, useState } from 'react'
import { newId } from '../lib/model.js'
import { parseTrivia, shuffle, triviaToQuestion, TRIVIA_FORMAT } from './logic.js'
import { GameScreen, Quiz, PasteJson, Empty } from './ui.jsx'

// Trivia: preguntas que el usuario pega desde Claude (se guardan como entradas 'trivia').
export default function Trivia({ store, toast, onExit }) {
  const bank = useMemo(() => store.entries.filter((e) => e.kind === 'trivia'), [store.entries])
  const [round, setRound] = useState(null)
  const [paste, setPaste] = useState(false)

  const start = () => setRound(shuffle(bank).slice(0, 10).map((e) => triviaToQuestion(e.fields)))

  return (
    <GameScreen title="Trivia" onExit={round ? () => setRound(null) : onExit}>
      {round ? (
        <Quiz key={round[0]?.prompt} questions={round} onDone={() => setRound(null)} onAgain={start} />
      ) : bank.length ? (
        <div className="game-home">
          <p className="game-stat"><b>{bank.length}</b> {bank.length === 1 ? 'pregunta guardada' : 'preguntas guardadas'}</p>
          <button className="primary" onClick={start}>Jugar {Math.min(10, bank.length)} preguntas</button>
          <button className="secondary" onClick={() => setPaste(true)}>Agregar preguntas de Claude</button>
          <button className="link-danger" onClick={() => confirm('¿Borrar todas las preguntas de trivia?') && store.deleteEntries(bank.map((e) => e.id))}>
            Borrar todas las preguntas
          </button>
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
