import { useEffect, useMemo, useRef, useState } from 'react'
import { foldLetter, typeWords } from './logic.js'
import { repasoRound, sayOptions, whereOptions, proofCards, proofOptions, verseMode, firstWords } from './repaso.js'
import { atalayaSourceCards, atalayaSourceCheck } from './logic.js'
import { GameScreen, Result } from './ui.jsx'
import { review, todayISO } from './progress.js'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'

// Repasar (ver repaso.js): 5 preguntas, una a la vez. Si fallas, la opción se marca y lo vuelves a
// intentar (cuenta como no sabida y vuelve pronto). Al final, "Otras 5" si queda algo.
export default function Repaso({ store, onExit }) {
  const [skip] = useState(() => new Set())
  const [round, setRound] = useState(() => repasoRound(store.entries, store.progress.srs ?? {}))
  const [i, setI] = useState(0)
  const [good, setGood] = useState(0)
  const [answered, setAnswered] = useState(null) // true/false de la pregunta actual, ya contestada
  const item = round[i]

  function done(knew) {
    if (answered != null) return
    setAnswered(knew)
    skip.add(item.key)
    if (knew) setGood((g) => g + 1)
    const last = i + 1 === round.length
    store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [item.key]: review(f.srs?.[item.key], knew) }, ...(last ? { repaso: todayISO() } : {}) }))
  }
  function next() {
    setAnswered(null)
    setI(i + 1)
  }
  function more() {
    setRound(repasoRound(store.entries, store.progress.srs ?? {}, { skip }))
    setI(0)
    setGood(0)
  }
  const left = !item && round.length ? repasoRound(store.entries, store.progress.srs ?? {}, { skip, rnd: () => 0.9 }).length : 0

  return (
    <GameScreen title="Repasar" onExit={onExit}>
      {!round.length ? (
        <div className="result-card">
          <p className="result-big">Listo por hoy</p>
          <p className="result-msg">Lo que toca repasar vuelve en los próximos días. Para aprender otro texto, tócalo y elige "Aprenderlo".</p>
          <button className="secondary" onClick={onExit}>Salir</button>
        </div>
      ) : !item ? (
        <Result
          pct={Math.round((good / round.length) * 100)}
          msg={`${good} de ${round.length} a la primera.${good < round.length ? ' Lo que fallaste vuelve pronto.' : ''}`}
          onAgain={onExit}
          againLabel="Terminar"
          onDone={left ? more : undefined}
          doneLabel="Otras 5"
        />
      ) : (
        <>
          <div className="progress"><span style={{ width: `${(i / round.length) * 100}%` }} /></div>
          <div className="quiz-meta"><span className="quiz-count">{i + 1} de {round.length}</span></div>
          {item.type === 'verse' && <VerseStep key={item.key} verse={item.verse} mode={verseMode(store.progress.srs?.[item.key])} entries={store.entries} onDone={done} />}
          {item.type === 'proof' && <ProofStep key={item.key} card={item.card} entries={store.entries} onDone={done} />}
          {item.type === 'source' && <SourceStep key={item.key} card={item.card} entries={store.entries} onDone={done} />}
          {answered != null && <button className="primary" onClick={next}>{i + 1 === round.length ? 'Ver cómo me fue' : 'Siguiente'}</button>}
        </>
      )}
    </GameScreen>
  )
}

const Ref = ({ cita }) => <p className="verse-ref">{findRefs(cita).length ? <RefLink refText={findRefs(cita)[0]} /> : cita}</p>

// Un texto: ¿Dónde está? (elegir su cita entre 4), ¿Qué dice? (elegir el texto) o Escríbelo (primera letra).
function VerseStep({ verse, mode, entries, onDone }) {
  const [say] = useState(() => (mode === 'dice' ? sayOptions(verse, entries) : null))
  const [where] = useState(() => (mode === 'donde' ? whereOptions(verse, entries) : null))
  const m = mode === 'dice' && !say ? 'escribir' : mode === 'donde' && !where ? 'escribir' : mode
  if (m === 'donde') {
    return (
      <Choice
        ask={<><p className="hint">¿Dónde está?</p><p className="verse">{verse.fields.texto}</p></>}
        options={where.options}
        answer={where.answer}
        onDone={onDone}
      />
    )
  }
  if (m === 'dice' && say) {
    return (
      <Choice
        ask={<><p className="quiz-prompt">{verse.fields.cita}</p><p className="hint">¿Qué dice?</p></>}
        options={say.options}
        answer={say.answer}
        long
        hint={`Empieza: «${firstWords(verse.fields.texto, 2)}»`}
        onDone={onDone}
      >
        <p className="verse small">{verse.fields.texto}</p>
      </Choice>
    )
  }
  return (
    <>
      <p className="quiz-prompt">{verse.fields.cita}</p>
      <p className="hint">Escríbelo de memoria: la primera letra de cada palabra.</p>
      <TypeLetters texto={verse.fields.texto} footer={(pct) => <Finish ok={pct >= 90} onDone={onDone} text={pct === 100 ? '¡Perfecto, sin errores!' : `${pct} % a la primera.`} />} />
    </>
  )
}

// La Atalaya: una idea del artículo y el texto que se leyó para probarla.
function ProofStep({ card, entries, onDone }) {
  const [q] = useState(() => proofOptions(card, proofCards(entries), entries))
  useEffect(() => { if (!q) onDone(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!q) return <p className="quiz-prompt long">{card.front}</p>
  return (
    <Choice
      ask={<><p className="review-source">{card.title}</p><p className="quiz-prompt long">{card.front}</p><p className="hint">¿Qué texto lo prueba?</p></>}
      options={q.options}
      answer={q.answer}
      onDone={onDone}
    >
      <Ref cita={card.cita} />
    </Choice>
  )
}

// De vez en cuando: ¿De qué Atalaya es?
function SourceStep({ card, entries, onDone }) {
  const [q] = useState(() => atalayaSourceCheck(card, atalayaSourceCards(entries)))
  useEffect(() => { if (!q) onDone(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!q) return <p className="quiz-prompt long">{card.front}</p>
  return (
    <Choice
      ask={<><p className="quiz-prompt long">{card.front}</p><p className="hint">{q.ask}</p></>}
      options={q.options}
      answer={q.answer}
      long
      onDone={onDone}
    />
  )
}

// Opción múltiple: si fallas, esa se marca, sale la pista (si hay) y vuelves a intentar.
function Choice({ ask, options, answer, long, hint, onDone, children }) {
  const [wrong, setWrong] = useState(() => new Set())
  const [right, setRight] = useState(false)
  function pick(k) {
    if (right || wrong.has(k)) return
    if (k === answer) {
      setRight(true)
      onDone(wrong.size === 0)
    } else setWrong((w) => new Set(w).add(k))
  }
  return (
    <div className="quiz">
      {ask}
      <div className={'options' + (long ? ' long' : '')}>
        {options.map((o, k) => (
          <button key={k} className={'option' + (right && k === answer ? ' right' : wrong.has(k) ? ' wrong' : right ? ' dim' : '')} disabled={right || wrong.has(k)} onClick={() => pick(k)}>{o}</button>
        ))}
      </div>
      {!right && wrong.size > 0 && hint && <p className="hint center">{hint}</p>}
      {right && children}
    </div>
  )
}

function Finish({ ok, text, onDone, children }) {
  useEffect(() => onDone(ok), []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <p className={'order-result ' + (ok ? 'ok' : 'bad')}>{text ?? (ok ? '¡Bien, a la primera!' : 'Lo armaste. Vuelve pronto para que se te grabe.')}</p>
      {children}
    </>
  )
}

// Escribir: teclea la primera letra de cada palabra. Si aciertas, aparece la palabra;
// a los 3 intentos fallidos se muestra sola (cuenta como error).
function TypeLetters({ texto, footer }) {
  const words = useMemo(() => typeWords(texto), [texto])
  const skip = (from) => {
    let k = from
    while (k < words.length && !words[k].letter) k++
    return k
  }
  const [pos, setPos] = useState(() => skip(0))
  const [wrong, setWrong] = useState(() => new Set()) // palabras que se mostraron solas o con error
  const [tries, setTries] = useState(0)
  const [shake, setShake] = useState(0)
  const [focused, setFocused] = useState(false)
  const input = useRef(null)
  const done = pos >= words.length
  const total = words.filter((w) => w.letter).length
  const pct = total ? Math.round(((total - wrong.size) / total) * 100) : 100

  useEffect(() => {
    if (done) input.current?.blur()
  }, [done])

  function type(ch) {
    if (done || !ch) return
    const w = words[pos]
    if (foldLetter(ch) === w.letter) {
      setTries(0)
      setPos(skip(pos + 1))
    } else {
      setShake((n) => n + 1)
      setWrong((s) => new Set(s).add(pos))
      if (tries + 1 >= 3) {
        setTries(0)
        setPos(skip(pos + 1))
      } else setTries(tries + 1)
    }
  }

  return (
    <>
      <p className="verse type-verse" onClick={() => input.current?.focus()}>
        {words.map((w, i) => (
          <span key={i}>
            {i < pos || !w.letter ? (
              <span className={wrong.has(i) ? 'type-bad' : i === pos - 1 ? 'type-new' : ''}>{w.pre}{w.word}{w.post}</span>
            ) : (
              <>
                {w.pre}
                <span key={i === pos ? 'c' + shake : 'w'} className={'type-blank' + (i === pos ? ' now' : '') + (i === pos && shake ? ' miss' : '')} style={{ width: `${Math.max(2, w.word.length) * 0.55}em` }} />
                {w.post}
              </>
            )}{' '}
          </span>
        ))}
      </p>
      {!done ? (
        <>
          <input
            ref={input}
            className="type-input"
            value=""
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label="Primera letra de la palabra"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => type(e.target.value.slice(-1))}
          />
          {!focused && <button className="primary" onClick={() => input.current?.focus()}>Empezar a escribir</button>}
          <p className="hint center">Escribe la primera letra de cada palabra. {words.length - pos > 0 && `${total - words.slice(0, pos).filter((w) => w.letter).length} por escribir.`}</p>
        </>
      ) : (
        footer(pct)
      )}
    </>
  )
}
