import { useRef, useState } from 'react'
import { buildGuessQuestions, buildPairs, buildProofQuestions } from './logic.js'
import { GameScreen, Quiz, Empty, ModeCard, Result, fmtTime } from './ui.jsx'
import { withBest, withBestTime } from './progress.js'
import { findSavedVerse } from '../lib/verses.js'

// Juegos que usan los nodos del mapa. Repasar lo que toca hoy (nodos y textos diarios) va en Repasar hoy.
export default function StudyGames({ store, onExit }) {
  const [mode, setMode] = useState(null)
  const exit = () => setMode(null)

  const best = store.progress.best ?? {}
  const save = (k) => (v) => store.updateProgress((f) => withBest(f, k, v))
  if (mode === 'guess') return <Guess nodes={store.nodes} best={best['que-es'] ?? 0} onBest={save('que-es')} onExit={exit} />
  if (mode === 'proof') return <Proof store={store} best={best.prueba ?? 0} onBest={save('prueba')} onExit={exit} />
  if (mode === 'pairs') return <Pairs nodes={store.nodes} best={best['parejas-tiempo']} onBest={(secs) => store.updateProgress((f) => withBestTime(f, 'parejas-tiempo', secs))} onExit={exit} />

  return (
    <GameScreen title="Con lo que estudio" onExit={onExit}>
      <p className="hint">Juegos hechos con tus nodos del mapa. Entre más estudias, más preguntas hay. Lo que toca repasar hoy está en Repasar hoy.</p>
      <div className="mode-list">
        <ModeCard title="¿Qué es?" badge={best['que-es'] ? `Mejor ${best['que-es']} %` : null} desc="Lee una definición y elige qué nodo es." onClick={() => setMode('guess')} />
        <ModeCard title="¿Con qué texto lo pruebas?" badge={best.prueba ? `Mejor ${best.prueba} %` : null} desc="Ve una idea de tu mapa y elige el texto bíblico que la apoya." onClick={() => setMode('proof')} />
        <ModeCard title="Parejas" badge={best['parejas-tiempo'] ? `Récord ${fmtTime(best['parejas-tiempo'])}` : null} desc="Une cada título con su definición." onClick={() => setMode('pairs')} />
      </div>
    </GameScreen>
  )
}


const needMore = 'Necesitas al menos 4 nodos con definición en tu mapa para este juego.'

function Guess({ nodes, best, onBest, onExit }) {
  const [round, setRound] = useState(() => buildGuessQuestions(nodes))
  const [nonce, setNonce] = useState(0)
  return (
    <GameScreen title="¿Qué es?" back="Mi estudio" onExit={onExit}>
      {round.length ? (
        <Quiz key={nonce} questions={round} best={best} onFinish={(sc, t) => onBest(Math.round((sc / t) * 100))} onDone={onExit} onAgain={() => { setRound(buildGuessQuestions(nodes)); setNonce((x) => x + 1) }} />
      ) : (
        <Empty>{needMore}</Empty>
      )}
    </GameScreen>
  )
}

// Una idea de tu mapa → el texto bíblico con el que la pruebas (el que enlazaste o citaste en su definición).
// Al responder se ve el texto si ya está en Mi Biblia.
function Proof({ store, best, onBest, onExit }) {
  const build = () => buildProofQuestions(store.nodes).map((q) => {
    const texto = findSavedVerse(store.entries, q.ref)?.texto
    const also = q.also.length ? `También la apoya${q.also.length > 1 ? 'n' : ''}: ${q.also.join('; ')}.` : ''
    return { ...q, explain: [texto && `«${texto.trim()}»`, also].filter(Boolean).join(' ') }
  })
  const [round, setRound] = useState(build)
  const [nonce, setNonce] = useState(0)
  return (
    <GameScreen title="¿Con qué texto lo pruebas?" back="Mi estudio" onExit={onExit}>
      {round.length ? (
        <Quiz key={nonce} questions={round} best={best} onFinish={(sc, t) => onBest(Math.round((sc / t) * 100))} onDone={onExit} onAgain={() => { setRound(build()); setNonce((x) => x + 1) }} />
      ) : (
        <Empty>Este juego usa los textos bíblicos que pones en las definiciones de tus nodos (por ejemplo [[Juan 17:3]]). Necesitas al menos 4 textos distintos en tu mapa.</Empty>
      )}
    </GameScreen>
  )
}

function Pairs({ nodes, best, onBest, onExit }) {
  const [prevBest, setPrevBest] = useState(best)
  const [board, setBoard] = useState(() => buildPairs(nodes))
  const [left, setLeft] = useState(null)
  const [done, setDone] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const [errors, setErrors] = useState(0)
  const startRef = useRef(Date.now())
  const [secs, setSecs] = useState(0)

  if (!board) return <GameScreen title="Parejas" back="Mi estudio" onExit={onExit}><Empty>Necesitas al menos 3 nodos con definición en tu mapa para este juego.</Empty></GameScreen>

  const finished = done.size === board.left.length
  function pickRight(id) {
    if (!left || done.has(id)) return
    if (left === id) {
      const next = new Set(done).add(id)
      setDone(next)
      setLeft(null)
      if (next.size === board.left.length) {
        const t = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
        setSecs(t)
        onBest(t)
      }
    } else {
      setMiss(id)
      setErrors((e) => e + 1)
      setTimeout(() => setMiss(null), 450)
    }
  }
  function again() {
    setPrevBest(best)
    setBoard(buildPairs(nodes))
    setDone(new Set())
    setLeft(null)
    setErrors(0)
    startRef.current = Date.now()
  }

  return (
    <GameScreen title="Parejas" back="Mi estudio" onExit={onExit}>
      {finished ? (
        <Result
          pct={Math.round((board.left.length / (board.left.length + errors)) * 100)}
          value={fmtTime(secs)}
          unit=""
          msg={errors === 0 ? '¡Perfecto, sin errores!' : `Listo, con ${errors} ${errors === 1 ? 'error' : 'errores'}.`}
          record={prevBest != null && secs < prevBest}
          stats={[['Parejas', board.left.length], ['Errores', errors], ['Récord', fmtTime(Math.min(prevBest ?? Infinity, secs))]]}
          onAgain={again}
          againLabel="Otra ronda"
          onDone={onExit}
        />
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
