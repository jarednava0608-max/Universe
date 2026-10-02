import { useMemo, useState } from 'react'
import { buildCards, dailyMix, initials, triviaToQuestion, verseSources } from './logic.js'
import { GameScreen, Result, SwipeCard } from './ui.jsx'
import { isDue, review } from './progress.js'
import { saveVerseResult } from './Memorize.jsx'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'

const LABEL = { card: 'Tarjeta', verse: 'Texto para memorizar', trivia: 'Pregunta' }

// Una sola sesión con todo lo que toca hoy: tarjetas, textos y preguntas, alternados.
export function reviewItems(store) {
  const trivia = store.entries.filter((e) => e.kind === 'trivia')
  return dailyMix({ cards: buildCards(store.nodes, store.entries), verses: verseSources(store.entries), trivia }, store.progress.srs ?? {}, (s) => isDue(s))
}

export default function Review({ store, onExit }) {
  const [items] = useState(() => reviewItems(store))
  const [i, setI] = useState(0)
  const [good, setGood] = useState(0)
  const [missed, setMissed] = useState([])
  const item = items[i]

  async function answer(knew) {
    if (item.type === 'verse') await saveVerseResult(store, item.item, knew)
    else store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [item.key]: review(f.srs?.[item.key], knew) } }))
    if (knew) setGood((g) => g + 1)
    else setMissed((m) => [...m, item])
    setI(i + 1)
  }

  return (
    <GameScreen title="Repasar hoy" onExit={onExit}>
      {!items.length ? (
        <div className="result-card">
          <p className="result-big">¡Al día!</p>
          <p className="result-msg">No tienes nada pendiente para hoy. Sigue estudiando y aquí aparecerá lo que toque repasar.</p>
          <button className="secondary" onClick={onExit}>Salir</button>
        </div>
      ) : !item ? (
        <Result
          pct={Math.round((good / items.length) * 100)}
          msg={`Repasaste ${items.length} ${items.length === 1 ? 'cosa' : 'cosas'} y te sabías ${good}.${missed.length ? ' Lo que fallaste vuelve pronto.' : ''}`}
          onDone={onExit}
          doneLabel="Terminar"
        >
          {missed.length > 0 && (
            <div className="missed">
              <p className="missed-title">Para repasar</p>
              {missed.map((m) => (
                <div key={m.key} className="missed-item">
                  <p className="missed-q">{LABEL[m.type]}</p>
                  <p className="missed-a">{m.type === 'card' ? m.item.front : m.type === 'verse' ? m.item.fields.cita || m.item.fields.texto.slice(0, 60) : m.item.fields.pregunta}</p>
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
            <span className="review-kind">{LABEL[item.type]}</span>
          </div>
          {item.type === 'card' && <CardStep key={item.key} card={item.item} onAnswer={answer} />}
          {item.type === 'verse' && <VerseStep key={item.key} verse={item.item} onAnswer={answer} />}
          {item.type === 'trivia' && <QuestionStep key={item.key} fields={item.item.fields} onAnswer={answer} />}
        </>
      )}
    </GameScreen>
  )
}

function CardStep({ card, onAnswer }) {
  return <SwipeCard front={card.front} back={card.back} onAnswer={onAnswer} />
}

function VerseStep({ verse, onAnswer }) {
  const [peek, setPeek] = useState(false)
  const cita = verse.fields.cita
  return (
    <>
      <button className="verse initials" onClick={() => setPeek((p) => !p)}>{peek ? verse.fields.texto : initials(verse.fields.texto)}</button>
      {cita && <p className="verse-ref">{findRefs(cita).length ? <RefLink refText={findRefs(cita)[0]} /> : cita}</p>}
      <p className="hint center">{peek ? 'Toca el texto para volver a las iniciales.' : 'Dilo completo con ayuda de las iniciales. Toca el texto para verlo.'}</p>
      <TwoButtons onAnswer={onAnswer} no="Repasar" yes="Lo sé" />
    </>
  )
}

function QuestionStep({ fields, onAnswer }) {
  const q = useMemo(() => triviaToQuestion(fields), [fields])
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  return (
    <div className="quiz">
      <p className="quiz-prompt">{q.prompt}</p>
      <div className="options">
        {q.options.map((o, k) => (
          <button key={k} className={'option' + (!answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => setPicked(k)}>{o}</button>
        ))}
      </div>
      {answered && (
        <div className="feedback">
          <p className={picked === q.answer ? 'ok' : 'bad'}>{picked === q.answer ? 'Correcto' : 'No era esa'}</p>
          {q.explain && <p className="explain">{q.explain}</p>}
          {q.ref && <p className="ref">{findRefs(q.ref).length ? <RefLink refText={findRefs(q.ref)[0]} /> : q.ref}</p>}
          <button className="primary" onClick={() => onAnswer(picked === q.answer)}>Siguiente</button>
        </div>
      )}
    </div>
  )
}

function TwoButtons({ onAnswer, no, yes }) {
  const [busy, setBusy] = useState(false)
  const go = async (v) => { if (busy) return; setBusy(true); await onAnswer(v) }
  return (
    <div className="two-btn">
      <button className="secondary" onClick={() => go(false)}>{no}</button>
      <button className="primary" onClick={() => go(true)}>{yes}</button>
    </div>
  )
}
