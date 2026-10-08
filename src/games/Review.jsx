import { useState } from 'react'
import { atalayaCards, atalayaCheck, atalayaSourceCards, atalayaSourceCheck, withSources, buildCards, cardCheck, citeSteps, dailyCards, dailyCheck, dailyMix } from './logic.js'
import { GameScreen, Result, SwipeCard } from './ui.jsx'
import { NEW_PER_DAY, isDue, newToday, review } from './progress.js'
import { CiteQuiz } from './Memorize.jsx'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'

const LABEL = { atalaya: 'Tu Atalaya', card: 'Tu concepto', daily: 'Tu texto diario', verse: 'Texto para memorizar', trivia: 'Pregunta', person: 'Personaje' }
// Rondas cortas (unos 3 minutos) para que dé ganas de entrar; al terminar, "Otra ronda" si queda algo.
export const SESSION = 8
const NEW_PER_SESSION = 4

// Solo lo que estudiaste tú: tus reuniones (La Atalaya y entre semana), tus textos diarios y los
// conceptos de tu mapa. Los personajes, la trivia y Memorizar se practican en sus juegos.
function pools(store) {
  return {
    atalaya: withSources(atalayaCards(store.entries), atalayaSourceCards(store.entries)),
    cards: buildCards(store.nodes),
    daily: dailyCards(store.entries),
  }
}

// Las nuevas que aún caben hoy (NEW_PER_DAY por día, contando las que ya empezaste en otros juegos).
const freshLeft = (srs) => Math.max(0, NEW_PER_DAY - newToday(srs))

// Una ronda con lo que toca hoy: primero lo que ya viste, luego unas pocas nuevas.
export function reviewItems(store) {
  const srs = store.progress.srs ?? {}
  return dailyMix(pools(store), srs, (s) => isDue(s), SESSION, Math.random, Math.min(NEW_PER_SESSION, freshLeft(srs)))
}

// Para la tarjeta de Juegos: cuántas toca repasar (todas) y cuántas nuevas hay hoy.
export function reviewSummary(store) {
  const srs = store.progress.srs ?? {}
  const all = dailyMix(pools(store), srs, (s) => isDue(s), Infinity, () => 0.5, freshLeft(srs))
  const fresh = all.filter((x) => x.fresh).length
  return { due: all.length - fresh, fresh }
}

const left = (store) => {
  const { due, fresh } = reviewSummary(store)
  return due + fresh
}

export default function Review(props) {
  const [round, setRound] = useState(0)
  return <ReviewRound key={round} {...props} onMore={() => setRound((r) => r + 1)} />
}

function ReviewRound({ store, onExit, back, onMore }) {
  const [items] = useState(() => reviewItems(store))
  const [cards] = useState(() => buildCards(store.nodes))
  const [days] = useState(() => dailyCards(store.entries))
  const [mine] = useState(() => atalayaCards(store.entries))
  const [sources] = useState(() => atalayaSourceCards(store.entries))
  const [i, setI] = useState(0)
  const [good, setGood] = useState(0)
  const [missed, setMissed] = useState([])
  const item = items[i]
  const doneNew = newToday(store.progress.srs ?? {}) > 0

  async function answer(knew) {
    store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [item.key]: review(f.srs?.[item.key], knew) } }))
    if (knew) setGood((g) => g + 1)
    else setMissed((m) => [...m, item])
    setI(i + 1)
  }

  return (
    <GameScreen title="Repasar hoy" back={back} onExit={onExit}>
      {!items.length ? (
        <div className="result-card">
          <p className="result-big">¡Al día!</p>
          <p className="result-msg">{doneNew ? 'Ya repasaste todo lo de hoy y viste tus cosas nuevas. Mañana hay más.' : 'No tienes nada pendiente para hoy. Sigue estudiando y aquí aparecerá lo que toque repasar.'}</p>
          <button className="secondary" onClick={onExit}>Salir</button>
        </div>
      ) : !item ? (
        <Result
          pct={Math.round((good / items.length) * 100)}
          msg={`Repasaste ${items.length} ${items.length === 1 ? 'cosa' : 'cosas'} y te sabías ${good}.${missed.length ? ' Lo que fallaste vuelve pronto.' : ''}`}
          onAgain={left(store) > 0 ? onMore : undefined}
          againLabel={`Otra ronda (${Math.min(left(store), SESSION)})`}
          onDone={onExit}
          doneLabel="Terminar"
        >
          {missed.length > 0 && (
            <div className="missed">
              <p className="missed-title">Para repasar</p>
              {missed.map((m) => (
                <div key={m.key} className="missed-item">
                  <p className="missed-q">{m.type === 'atalaya' || m.type === 'daily' ? m.item.front : LABEL[m.type]}</p>
                  <p className="missed-a">{m.type === 'card' ? m.item.front : m.item.back}</p>
                </div>
              ))}
            </div>
          )}
        </Result>
      ) : (
        <>
          <div className="progress"><span style={{ width: `${(i / items.length) * 100}%` }} /></div>
          <div className="quiz-meta">
            <span className="quiz-count">{i + 1} de {items.length}</span>
            <span className="review-kind">{item.item?.midweek ? 'Tu reunión entre semana' : LABEL[item.type]}{item.fresh ? ' · Nueva' : ''}</span>
          </div>
          {item.type === 'atalaya' && item.item.kind === 'source' && <SourceStep key={item.key} card={item.item} cards={sources} onAnswer={answer} />}
          {item.type === 'atalaya' && item.item.kind !== 'source' && <AtalayaStep key={item.key} card={item.item} cards={mine} onAnswer={answer} />}
          {item.type === 'card' && <CardStep key={item.key} card={item.item} cards={cards} onAnswer={answer} />}
          {item.type === 'daily' && <DailyStep key={item.key} card={item.item} cards={days} onAnswer={answer} />}
        </>
      )}
    </GameScreen>
  )
}

// Tu Atalaya: la pregunta y elegir tu propia respuesta entre 4. Solo si no hay con qué armar
// las opciones queda la tarjeta que se voltea.
function AtalayaStep({ card, cards, onAnswer }) {
  const [q] = useState(() => atalayaCheck(card, cards))
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  if (!q) return <SwipeCard front={card.front} back={card.back} onAnswer={onAnswer} />
  return (
    <div className="quiz">
      <p className="review-source">{card.title} · {card.label}</p>
      <p className="quiz-prompt long">{card.front}</p>
      <p className="hint">¿Cuál fue tu respuesta?</p>
      <div className="options long">
        {q.options.map((o, k) => (
          <button key={k} className={'option' + (!answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => setPicked(k)}>{o}</button>
        ))}
      </div>
      {answered && (
        <div className="feedback">
          <p className={picked === q.answer ? 'ok' : 'bad'}>{picked === q.answer ? 'Correcto' : 'Esa no era'}</p>
          {card.back !== q.options[q.answer] && <p className="explain">{card.back}</p>}
          <button className="primary" onClick={() => onAnswer(picked === q.answer)}>Siguiente</button>
        </div>
      )}
    </div>
  )
}

// "¿De qué Atalaya es?": un trozo de un párrafo y elegir el artículo (o la semana, si solo hay uno).
function SourceStep({ card, cards, onAnswer }) {
  const [q] = useState(() => atalayaSourceCheck(card, cards))
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  if (!q) return <SwipeCard front={card.front} back={card.back} onAnswer={onAnswer} />
  return (
    <div className="quiz">
      <p className="hint">{q.ask}</p>
      <p className="quiz-prompt long">«{card.front}»</p>
      <div className="options long">
        {q.options.map((o, k) => (
          <button key={k} className={'option' + (!answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => setPicked(k)}>{o}</button>
        ))}
      </div>
      {answered && (
        <div className="feedback">
          <p className={picked === q.answer ? 'ok' : 'bad'}>{picked === q.answer ? 'Correcto' : 'Esa no era'}</p>
          <p className="explain">{card.back} · {card.label}</p>
          <button className="primary" onClick={() => onAnswer(picked === q.answer)}>Siguiente</button>
        </div>
      )}
    </div>
  )
}

// Tu texto diario: el versículo y elegir lo que tú dijiste que enseña (o armar su cita).
function DailyStep({ card, cards, onAnswer }) {
  const [check] = useState(() => dailyCheck(card, cards.filter((c) => c.id !== card.id)))
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  if (check?.type === 'cite') return <CiteStep verse={check.verse} onAnswer={onAnswer} />
  if (!check) return <SwipeCard front={card.front} back={[card.back, card.aplicacion].filter(Boolean).join('\n\n')} onAnswer={onAnswer} />
  return (
    <div className="quiz">
      <p className="quiz-prompt long dt-verse flat">{card.front}</p>
      <p className="hint">¿Qué dijiste que enseña?</p>
      <div className="options long">
        {check.options.map((o, k) => (
          <button key={k} className={'option' + (!answered ? '' : k === check.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => setPicked(k)}>{o}</button>
        ))}
      </div>
      {answered && (
        <div className="feedback">
          <p className={picked === check.answer ? 'ok' : 'bad'}>{picked === check.answer ? 'Correcto' : 'Esa no era'}</p>
          {card.aplicacion && <p className="explain">Lo que ibas a hacer: {card.aplicacion}</p>}
          <button className="primary" onClick={() => onAnswer(picked === check.answer)}>Siguiente</button>
        </div>
      )}
    </div>
  )
}

// Sin trampa: un texto se repasa armando su cita; una idea, eligiendo su título entre 4.
// Solo si no hay con qué armar la pregunta queda la tarjeta de siempre.
function CardStep({ card, cards, onAnswer }) {
  const [check] = useState(() => cardCheck(card, cards))
  if (check?.type === 'cite') return <CiteStep verse={check.verse} onAnswer={onAnswer} />
  if (check?.type === 'choice') return <ChoiceStep q={check} onAnswer={onAnswer} />
  return <SwipeCard front={card.front} back={card.back} onAnswer={onAnswer} />
}

function CiteStep({ verse, onAnswer }) {
  const cita = verse.fields.cita
  return (
    <CiteQuiz verse={verse} footer={(errors) => (
      <>
        <p className={'order-result ' + (errors ? 'bad' : 'ok')}>{errors ? `Con ${errors} ${errors === 1 ? 'error' : 'errores'}: vuelve pronto.` : '¡Perfecto!'}</p>
        <p className="verse-ref">{findRefs(cita).length ? <RefLink refText={findRefs(cita)[0]} /> : cita}</p>
        <TwoButtons onAnswer={() => onAnswer(errors === 0)} single="Siguiente" />
      </>
    )} />
  )
}

function ChoiceStep({ q, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  return (
    <div className="quiz">
      <p className="hint">¿Qué concepto es?</p>
      <p className="quiz-prompt">{q.prompt}</p>
      <div className="options">
        {q.options.map((o, k) => (
          <button key={k} className={'option' + (!answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => setPicked(k)}>{o}</button>
        ))}
      </div>
      {answered && (
        <div className="feedback">
          <p className={picked === q.answer ? 'ok' : 'bad'}>{picked === q.answer ? 'Correcto' : `Era ${q.options[q.answer]}`}</p>
          <button className="primary" onClick={() => onAnswer(picked === q.answer)}>Siguiente</button>
        </div>
      )}
    </div>
  )
}

function TwoButtons({ onAnswer, no, yes, single }) {
  const [busy, setBusy] = useState(false)
  const go = async (v) => { if (busy) return; setBusy(true); await onAnswer(v) }
  if (single) return <button className="primary" onClick={() => go()}>{single}</button>
  return (
    <div className="two-btn">
      <button className="secondary" onClick={() => go(false)}>{no}</button>
      <button className="primary" onClick={() => go(true)}>{yes}</button>
    </div>
  )
}
