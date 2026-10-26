import { useEffect, useRef, useState } from 'react'
import { repasoRound, sayOptions, whereOptions, proofCards, proofOptions, verseMode, firstWords, compareWords, sameCite, fullCite } from './repaso.js'
import { atalayaSourceCards, atalayaSourceCheck } from './logic.js'
import { GameScreen, Result } from './ui.jsx'
import { review, todayISO } from './progress.js'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'

// Repasar (ver repaso.js): 5 preguntas, una a la vez. Si fallas, la opción se marca y lo vuelves a
// intentar (cuenta como no sabida y vuelve pronto). Al final, "Otras 5" si queda algo.
export default function Repaso({ store, onExit, practice = false }) {
  const [skip] = useState(() => new Set())
  const [round, setRound] = useState(() => repasoRound(store.entries, store.progress.srs ?? {}, { practice }))
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
    setRound(repasoRound(store.entries, store.progress.srs ?? {}, { skip, practice }))
    setI(0)
    setGood(0)
  }
  const left = !item && round.length ? repasoRound(store.entries, store.progress.srs ?? {}, { skip, practice, rnd: () => 0.9 }).length : 0

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

// Un texto: Apréndetelo (leer y escribirlo), ¿Dónde está? (su cita entre 4), ¿Qué dice? (el texto entre 4)
// o Escríbelo de memoria con todo y cita.
function VerseStep({ verse, mode: startMode, entries, onDone }) {
  // El modo se fija al empezar: al contestar, el repaso cambia y no debe cambiar la pregunta a medias.
  const [mode] = useState(startMode)
  const [say] = useState(() => (mode === 'dice' ? sayOptions(verse, entries) : null))
  const [where] = useState(() => (mode === 'donde' ? whereOptions(verse, entries) : null))
  const m = mode === 'dice' && !say ? 'escribir' : mode === 'donde' && !where ? 'escribir' : mode
  // Al acertar la opción, hay que escribirla (la cita o el texto), no solo reconocerla.
  const [picked, setPicked] = useState(null) // null = aún eligiendo; true/false = si acertó a la primera
  // "Ya me lo sé": sin opciones, escribirlo completo con cita; si sale, pasa a pedirse siempre así.
  const [sabe, setSabe] = useState(false)
  if (sabe) return <WriteIt verse={verse} onDone={(ok) => onDone(ok ? 'sabe' : false)} />
  if (picked != null) return <TypeIt verse={verse} mode={m} firstTry={picked} onDone={onDone} />
  const skip = <button className="secondary" onClick={() => setSabe(true)}>Ya me lo sé, escribirlo</button>
  if (m === 'donde') {
    return (
      <Choice
        ask={<><p className="hint">¿Dónde está?</p><p className="verse">{verse.fields.texto}</p></>}
        options={where.options}
        answer={where.answer}
        onDone={setPicked}
        after={skip}
      />
    )
  }
  if (m === 'dice' && say) {
    return (
      <Choice
        ask={<><p className="quiz-prompt">{fullCite(verse.fields.cita) ?? verse.fields.cita}</p><p className="hint">¿Qué dice?</p></>}
        options={say.options}
        answer={say.answer}
        long
        hint={`Empieza: «${firstWords(verse.fields.texto, 2)}»`}
        onDone={setPicked}
        after={skip}
      />
    )
  }
  return <WriteIt key={m} verse={verse} learn={m === 'aprender'} onDone={onDone} />
}

// Después de elegir bien: escribir la cita (¿Dónde está?) o el texto (¿Qué dice?). Cuenta a la primera
// solo si la opción y lo escrito salieron bien al primer intento.
function TypeIt({ verse, mode, firstTry, onDone }) {
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState(null)
  const first = useRef(true)
  const donde = mode === 'donde'
  const shown = fullCite(verse.fields.cita) ?? verse.fields.cita

  function check() {
    const r = donde ? { ok: sameCite(typed, verse.fields.cita) } : (({ words, pct }) => ({ ok: pct >= 90, words, pct }))(compareWords(verse.fields.texto, typed))
    setResult(r)
    if (first.current) {
      first.current = false
      onDone(firstTry && r.ok)
    }
  }
  if (result?.ok) {
    return (
      <>
        <p className="order-result ok">{donde || result.pct === 100 ? '¡Perfecto!' : `¡Muy bien! ${result.pct} %.`}</p>
        <p className="quiz-prompt">{shown}</p>
        <p className="verse small">{verse.fields.texto}</p>
      </>
    )
  }
  return (
    <>
      {donde ? <p className="verse small">{verse.fields.texto}</p> : <p className="quiz-prompt">{shown}</p>}
      <p className="hint">{donde ? 'Ahora escribe la cita.' : `Ahora escríbelo. Empieza: «${firstWords(verse.fields.texto, 2)}»`}</p>
      {donde
        ? <input className="input" value={typed} autoCapitalize="words" autoCorrect="off" onChange={(e) => { setTyped(e.target.value); setResult(null) }} />
        : <textarea className="input" rows={6} value={typed} onChange={(e) => { setTyped(e.target.value); setResult(null) }} />}
      {result && !donde && (
        <>
          <p className="order-result bad">{result.pct} % del texto.</p>
          <p className="verse small">{result.words.map((x, i) => <span key={i} className={x.ok ? '' : 'type-bad'}>{x.w} </span>)}</p>
          <p className="hint">En rojo, lo que faltó o cambió. Sigue escribiendo.</p>
        </>
      )}
      {result && donde && <p className="order-result bad">Esa no es la cita. Inténtalo otra vez.</p>}
      <button className="primary" disabled={!typed.trim()} onClick={check}>Revisar</button>
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
function Choice({ ask, options, answer, long, hint, onDone, after, children }) {
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
      {!right && wrong.size === 0 && after}
    </div>
  )
}

// Escribirlo completo, con todo y cita. Para aprenderlo (`learn`): primero lo lees con su cita; para
// repasarlo, solo una pista de cómo empieza. Se revisa sin importar acentos ni signos; lo que faltó se
// marca y sigues escribiendo donde te quedaste, o borras y empiezas (cuenta lo del primer intento).
export function WriteIt({ verse, learn, onDone, onAgain }) {
  const [phase, setPhase] = useState(learn ? 'leer' : 'escribir')
  const [cita, setCita] = useState('')
  const [texto, setTexto] = useState('')
  const [result, setResult] = useState(null)
  const first = useRef(true)
  const shown = fullCite(verse.fields.cita) ?? verse.fields.cita

  function check() {
    const r = { ...compareWords(verse.fields.texto, texto), cita: sameCite(cita, verse.fields.cita) }
    setResult(r)
    setPhase('resultado')
    if (first.current) {
      first.current = false
      onDone(r.cita && r.pct >= 90)
    }
  }
  // "Seguir escribiendo" deja lo que llevabas; "Borrar y empezar" lo limpia y vuelve a leerlo.
  function again(clear) {
    if (clear) {
      setCita('')
      setTexto('')
    }
    setResult(null)
    setPhase(clear ? 'leer' : 'escribir')
    onAgain?.()
  }

  if (phase === 'leer') {
    return (
      <>
        <p className="hint">{learn ? 'Apréndetelo: léelo con calma, con su cita.' : 'Léelo otra vez con calma.'}</p>
        <p className="quiz-prompt">{shown}</p>
        <p className="verse small">{verse.fields.texto}</p>
        <button className="primary" onClick={() => setPhase('escribir')}>Ya lo leí, ahora lo escribo</button>
      </>
    )
  }
  if (phase === 'escribir') {
    return (
      <>
        <p className="hint">{learn ? 'Escríbelo completo, con todo y cita.' : `Escríbelo de memoria, con todo y cita. Empieza: «${firstWords(verse.fields.texto, 2)}»`}</p>
        <label className="sfield"><span className="sfield-label">Cita</span><input className="input" value={cita} autoCapitalize="words" autoCorrect="off" onChange={(e) => setCita(e.target.value)} /></label>
        <label className="sfield"><span className="sfield-label">Texto</span><textarea className="input" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
        <button className="primary" disabled={!texto.trim() || !cita.trim()} onClick={check}>Revisar</button>
      </>
    )
  }
  const ok = result.cita && result.pct >= 90
  return (
    <>
      <p className={'order-result ' + (ok ? 'ok' : 'bad')}>{ok ? (result.pct === 100 ? '¡Perfecto!' : `¡Muy bien! ${result.pct} %.`) : `${result.pct} % del texto.${result.cita ? '' : ' La cita no quedó.'}`}</p>
      <p className={'quiz-prompt' + (result.cita ? '' : ' type-bad')}>{shown}</p>
      <p className="verse small">
        {result.words.map((x, i) => <span key={i} className={x.ok ? '' : 'type-bad'}>{x.w} </span>)}
      </p>
      {!ok && <p className="hint">En rojo, lo que faltó o cambió.</p>}
      {!ok && (
        <div className="two-btn">
          <button className="secondary" onClick={() => again(true)}>Borrar y empezar</button>
          <button className="primary" onClick={() => again(false)}>Seguir escribiendo</button>
        </div>
      )}
    </>
  )
}
