import { useMemo, useState } from 'react'
import { atalayaCards, atalayaCheck, buildCards, cardCheck, citeSteps, dailyMix, initials, triviaToQuestion, memorizeSources } from './logic.js'
import { GameScreen, Result, SwipeCard } from './ui.jsx'
import { NEW_PER_DAY, isDue, newToday, review } from './progress.js'
import { CiteQuiz, saveVerseResult } from './Memorize.jsx'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'
import { CHARACTERS } from './memoria/characters.js'
import { whoRound } from './memoria/logic.js'

const LABEL = { atalaya: 'Tu Atalaya', card: 'Tu mapa', verse: 'Texto para memorizar', trivia: 'Pregunta', person: 'Personaje' }
export const SESSION = 20

// Todo lo que puede entrar al repaso: tu Atalaya, tus nodos y textos diarios, tus textos, tus preguntas y los personajes.
function pools(store) {
  return {
    atalaya: atalayaCards(store.entries),
    cards: buildCards(store.nodes, store.entries),
    verses: memorizeSources(store.entries),
    trivia: store.entries.filter((e) => e.kind === 'trivia'),
    people: CHARACTERS,
  }
}

// Las nuevas que aún caben hoy (NEW_PER_DAY por día, contando las que ya empezaste en otros juegos).
const freshLeft = (srs) => Math.max(0, NEW_PER_DAY - newToday(srs))

// Una sola sesión con lo que toca hoy: primero lo que ya viste, luego unas pocas nuevas.
export function reviewItems(store) {
  const srs = store.progress.srs ?? {}
  return dailyMix(pools(store), srs, (s) => isDue(s), SESSION, Math.random, freshLeft(srs))
}

// Para la tarjeta de Juegos: cuántas toca repasar (todas) y cuántas nuevas hay hoy.
export function reviewSummary(store) {
  const srs = store.progress.srs ?? {}
  const all = dailyMix(pools(store), srs, (s) => isDue(s), Infinity, () => 0.5, freshLeft(srs))
  const fresh = all.filter((x) => x.fresh).length
  return { due: all.length - fresh, fresh }
}

export default function Review({ store, onExit, back }) {
  const [items] = useState(() => reviewItems(store))
  const [cards] = useState(() => buildCards(store.nodes, store.entries))
  const [mine] = useState(() => atalayaCards(store.entries))
  const [i, setI] = useState(0)
  const [good, setGood] = useState(0)
  const [missed, setMissed] = useState([])
  const item = items[i]
  const doneNew = newToday(store.progress.srs ?? {}) > 0

  async function answer(knew) {
    if (item.type === 'verse') await saveVerseResult(store, item.item, knew)
    else store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [item.key]: review(f.srs?.[item.key], knew) } }))
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
          onDone={onExit}
          doneLabel="Terminar"
        >
          {missed.length > 0 && (
            <div className="missed">
              <p className="missed-title">Para repasar</p>
              {missed.map((m) => (
                <div key={m.key} className="missed-item">
                  <p className="missed-q">{m.type === 'trivia' ? m.item.fields.pregunta : m.type === 'atalaya' ? m.item.front : LABEL[m.type]}</p>
                  <p className="missed-a">{m.type === 'card' ? m.item.front : m.type === 'atalaya' ? m.item.back : m.type === 'verse' ? m.item.fields.cita || m.item.fields.texto.slice(0, 60) : m.type === 'person' ? m.item.n : m.item.fields.opciones[m.item.fields.respuesta]}</p>
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
            <span className="review-kind">{LABEL[item.type]}{item.fresh ? ' · Nueva' : ''}</span>
          </div>
          {item.type === 'atalaya' && <AtalayaStep key={item.key} card={item.item} cards={mine} onAnswer={answer} />}
          {item.type === 'card' && <CardStep key={item.key} card={item.item} cards={cards} onAnswer={answer} />}
          {item.type === 'verse' && <VerseStep key={item.key} verse={item.item} onAnswer={answer} />}
          {item.type === 'trivia' && <QuestionStep key={item.key} fields={item.item.fields} onAnswer={answer} />}
          {item.type === 'person' && <PersonStep key={item.key} ch={item.item} onAnswer={answer} />}
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
      <p className="hint">¿De qué nodo es?</p>
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

// Los textos se repasan armando su cita (no se puede hacer trampa). Si la cita no tiene
// versículo, con las iniciales.
function VerseStep({ verse, onAnswer }) {
  const [peek, setPeek] = useState(false)
  const cita = verse.fields.cita
  if (citeSteps(cita)) return <CiteStep verse={verse} onAnswer={onAnswer} />
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

// Personaje: sus pistas y elegir quién es (como ¿Quién soy?).
function PersonStep({ ch, onAnswer }) {
  const q = useMemo(() => whoRound([ch], {}, Math.random, CHARACTERS)[0], [ch])
  const [shown, setShown] = useState(1)
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  // Con las 3 pistas no cuenta como sabido (vuelve mañana), como en ¿Quién soy?.
  const result = () => (picked === q.answer ? (shown >= 3 ? 'help' : true) : false)
  return (
    <div className="quiz">
      <div className="mb-clues">
        {q.clues.slice(0, answered ? 3 : shown).map((c, k) => <p key={k} className={'mb-clue' + (k === 2 ? ' last' : '')}>{k < 2 ? `«${c}»` : c}</p>)}
        {!answered && shown < 3 && <button className="mb-more" onClick={() => setShown((s) => s + 1)}>Otra pista</button>}
      </div>
      <div className="options">
        {q.options.map((o, k) => (
          <button key={k} className={'option' + (!answered ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim')} disabled={answered} onClick={() => setPicked(k)}>{o}</button>
        ))}
      </div>
      {answered && (
        <div className="feedback">
          <p className={picked === q.answer ? 'ok' : 'bad'}>{picked === q.answer ? 'Correcto' : `Era ${ch.n}`}</p>
          <p className="explain">{ch.t}.</p>
          <p className="ref"><RefLink refText={ch.c} /></p>
          <button className="primary" onClick={() => onAnswer(result())}>Siguiente</button>
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
