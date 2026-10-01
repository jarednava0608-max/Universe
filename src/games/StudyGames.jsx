import { useMemo, useState } from 'react'
import { buildCards, buildGuessQuestions, buildPairs, shuffle } from './logic.js'
import { GameScreen, Quiz, Empty } from './ui.jsx'

// Juegos que usan los nodos del mapa y las notas de Estudio.
export default function StudyGames({ store, onExit }) {
  const [mode, setMode] = useState(null)
  const exit = () => setMode(null)

  if (mode === 'guess') return <Guess nodes={store.nodes} onExit={exit} />
  if (mode === 'pairs') return <Pairs nodes={store.nodes} onExit={exit} />
  if (mode === 'cards') return <Cards nodes={store.nodes} entries={store.entries} onExit={exit} />

  return (
    <GameScreen title="Con lo que estudio" onExit={onExit}>
      <p className="hint">Juegos hechos con tus nodos del mapa y tu texto diario. Entre más estudias, más preguntas hay.</p>
      <div className="mode-list">
        <ModeCard title="¿Qué es?" desc="Lee una definición y elige qué nodo es." onClick={() => setMode('guess')} />
        <ModeCard title="Parejas" desc="Une cada título con su definición." onClick={() => setMode('pairs')} />
        <ModeCard title="Tarjetas" desc="Repasa: ve el título y recuerda lo que significa." onClick={() => setMode('cards')} />
      </div>
    </GameScreen>
  )
}

function ModeCard({ title, desc, onClick }) {
  return (
    <button className="mode-card" onClick={onClick}>
      <span className="mode-title">{title}</span>
      <span className="mode-desc">{desc}</span>
    </button>
  )
}

const needMore = 'Necesitas al menos 4 nodos con definición en tu mapa para este juego.'

function Guess({ nodes, onExit }) {
  const [round, setRound] = useState(() => buildGuessQuestions(nodes))
  return (
    <GameScreen title="¿Qué es?" onExit={onExit}>
      {round.length ? (
        <Quiz key={round.map((q) => q.nodeId).join()} questions={round} onDone={onExit} onAgain={() => setRound(buildGuessQuestions(nodes))} />
      ) : (
        <Empty>{needMore}</Empty>
      )}
    </GameScreen>
  )
}

function Pairs({ nodes, onExit }) {
  const [board, setBoard] = useState(() => buildPairs(nodes))
  const [left, setLeft] = useState(null)
  const [done, setDone] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const [errors, setErrors] = useState(0)

  if (!board) return <GameScreen title="Parejas" onExit={onExit}><Empty>Necesitas al menos 3 nodos con definición en tu mapa para este juego.</Empty></GameScreen>

  const finished = done.size === board.left.length
  function pickRight(id) {
    if (!left || done.has(id)) return
    if (left === id) {
      setDone((d) => new Set(d).add(id))
      setLeft(null)
    } else {
      setMiss(id)
      setErrors((e) => e + 1)
      setTimeout(() => setMiss(null), 450)
    }
  }
  function again() {
    setBoard(buildPairs(nodes))
    setDone(new Set())
    setLeft(null)
    setErrors(0)
  }

  return (
    <GameScreen title="Parejas" onExit={onExit}>
      {finished ? (
        <div className="result-card">
          <p className="result-big">{errors === 0 ? '¡Perfecto!' : '¡Listo!'}</p>
          <p className="result-msg">{errors === 0 ? 'Sin errores.' : `${errors} ${errors === 1 ? 'error' : 'errores'}.`}</p>
          <button className="primary" onClick={again}>Jugar otra vez</button>
          <button className="secondary" onClick={onExit}>Salir</button>
        </div>
      ) : (
        <>
          <p className="hint">Toca un título y luego su definición.</p>
          <div className="pairs">
            <div className="pairs-col">
              {board.left.map((x) => (
                <button key={x.id} className={'pair-chip title' + (done.has(x.id) ? ' done' : left === x.id ? ' on' : '')} disabled={done.has(x.id)} onClick={() => setLeft(x.id)}>{x.text}</button>
              ))}
            </div>
            <div className="pairs-col">
              {board.right.map((x) => (
                <button key={x.id} className={'pair-chip' + (done.has(x.id) ? ' done' : miss === x.id ? ' miss' : '')} disabled={done.has(x.id)} onClick={() => pickRight(x.id)}>{x.text}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </GameScreen>
  )
}

function Cards({ nodes, entries, onExit }) {
  const all = useMemo(() => buildCards(nodes, entries), [nodes, entries])
  const [deck, setDeck] = useState(() => shuffle(all))
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  const card = deck[i]

  return (
    <GameScreen title="Tarjetas" onExit={onExit}>
      {!all.length ? (
        <Empty>Agrega definiciones a tus nodos o textos diarios para repasar con tarjetas.</Empty>
      ) : !card ? (
        <div className="result-card">
          <p className="result-big">¡Repasaste {deck.length}!</p>
          <button className="primary" onClick={() => { setDeck(shuffle(all)); setI(0) }}>Otra vez</button>
          <button className="secondary" onClick={onExit}>Salir</button>
        </div>
      ) : (
        <>
          <p className="quiz-count">{i + 1} de {deck.length}</p>
          <button className={'flashcard' + (flip ? ' flipped' : '')} onClick={() => setFlip((f) => !f)}>
            {flip ? <span className="card-back">{card.back}</span> : <span className="card-front">{card.front}</span>}
            <span className="card-hint">{flip ? 'Toca para ver el título' : 'Toca para ver la respuesta'}</span>
          </button>
          <div className="two-btn">
            <button className="secondary" onClick={() => { setDeck((d) => [...d, card]); setFlip(false); setI(i + 1) }}>Repasar después</button>
            <button className="primary" onClick={() => { setFlip(false); setI(i + 1) }}>Me la sé</button>
          </div>
        </>
      )}
    </GameScreen>
  )
}
