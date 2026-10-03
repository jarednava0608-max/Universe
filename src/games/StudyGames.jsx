import { useMemo, useRef, useState } from 'react'
import { buildCards, buildGuessQuestions, buildPairs } from './logic.js'
import { GameScreen, Quiz, Empty, ModeCard, Result, SwipeCard, fmtTime } from './ui.jsx'
import { byPriority, dueCount, isDue, nextDue, review, withBest, withBestTime } from './progress.js'
import { formatDate } from '../study/kinds.js'

// Juegos que usan los nodos del mapa y las notas de Estudio.
export default function StudyGames({ store, onExit }) {
  const [mode, setMode] = useState(null)
  const exit = () => setMode(null)

  const best = store.progress.best ?? {}
  const save = (k) => (v) => store.updateProgress((f) => withBest(f, k, v))
  if (mode === 'guess') return <Guess nodes={store.nodes} best={best['que-es'] ?? 0} onBest={save('que-es')} onExit={exit} />
  if (mode === 'pairs') return <Pairs nodes={store.nodes} best={best['parejas-tiempo']} onBest={(secs) => store.updateProgress((f) => withBestTime(f, 'parejas-tiempo', secs))} onExit={exit} />
  if (mode === 'cards') return <Cards store={store} onExit={exit} />
  const cardsDue = dueCount(buildCards(store.nodes, store.entries).map((c) => 'c:' + c.id), store.progress.srs ?? {})

  return (
    <GameScreen title="Con lo que estudio" onExit={onExit}>
      <p className="hint">Juegos hechos con tus nodos del mapa y tu texto diario. Tus textos bíblicos se practican en Memorizar textos. Entre más estudias, más preguntas hay.</p>
      <div className="mode-list">
        <ModeCard title="¿Qué es?" badge={best['que-es'] ? `Mejor ${best['que-es']} %` : null} desc="Lee una definición y elige qué nodo es." onClick={() => setMode('guess')} />
        <ModeCard title="Parejas" badge={best['parejas-tiempo'] ? `Récord ${fmtTime(best['parejas-tiempo'])}` : null} desc="Une cada título con su definición." onClick={() => setMode('pairs')} />
        <ModeCard title="Tarjetas" badge={cardsDue ? `${cardsDue} hoy` : null} desc="Repasa: ve el título y recuerda lo que significa." onClick={() => setMode('cards')} />
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

function Cards({ store, onExit }) {
  const all = useMemo(() => buildCards(store.nodes, store.entries), [store.nodes, store.entries])
  const srs = store.progress.srs ?? {}
  const keys = all.map((c) => 'c:' + c.id)
  const due = dueCount(keys, srs)

  // Repaso inteligente: solo lo que toca hoy (lo que fallas vuelve pronto; lo que sabes, cada vez más espaciado).
  const build = (everything) => {
    const byKey = new Map(all.map((c) => ['c:' + c.id, c]))
    const order = byPriority(keys, srs)
    return (everything ? order : order.filter((k) => isDue(srs[k]))).map((k) => byKey.get(k))
  }
  const [deck, setDeck] = useState(() => build(false))
  const [i, setI] = useState(0)
  const [known, setKnown] = useState(0)
  const card = deck[i]

  function answer(knew) {
    const key = 'c:' + card.id
    store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [key]: review(f.srs?.[key], knew) } }))
    if (knew) setKnown((n) => n + 1)
    else setDeck((d) => [...d, card]) // vuelve al final de esta sesión
    setI(i + 1)
  }

  const next = nextDue(keys, srs)
  return (
    <GameScreen title="Tarjetas" back="Mi estudio" onExit={onExit}>
      {!all.length ? (
        <Empty>Agrega definiciones a tus nodos o textos diarios para repasar con tarjetas.</Empty>
      ) : !deck.length ? (
        <div className="result-card">
          <p className="result-big">¡Al día!</p>
          <p className="result-msg">No tienes tarjetas para repasar hoy.{next ? ` La próxima toca el ${formatDate(next)}.` : ''}</p>
          <button className="primary" onClick={() => { setDeck(build(true)); setI(0) }}>Repasar todas igual</button>
          <button className="secondary" onClick={onExit}>Salir</button>
        </div>
      ) : !card ? (
        <Result
          pct={Math.round((known / deck.length) * 100)}
          value={known}
          unit={known === 1 ? ' tarjeta' : ' tarjetas'}
          msg={deck.length > known ? 'Las que repasaste otra vez volverán pronto.' : '¡Te las sabías todas!'}
          onDone={onExit}
        />
      ) : (
        <>
          <p className="quiz-count">{i + 1} de {deck.length}{due ? ` · ${due} para hoy` : ''}</p>
          <SwipeCard key={i} front={card.front} back={card.back} onAnswer={answer} />
        </>
      )}
    </GameScreen>
  )
}
