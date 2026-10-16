import { useState } from 'react'
import { buildGuessQuestions, buildPairs, buildProofQuestions } from './logic.js'
import { GameScreen, Quiz, Empty, ModeCard, PairsGame, fmtTime } from './ui.jsx'
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
  return (
    <PairsGame title="Parejas" back="Mi estudio" build={() => buildPairs(nodes)} best={best} onBest={onBest} onExit={onExit}
      hint="Toca un título y luego su definición." empty="Necesitas al menos 3 nodos con definición en tu mapa para este juego." />
  )
}
