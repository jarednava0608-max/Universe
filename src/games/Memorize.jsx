import { useEffect, useMemo, useRef, useState } from 'react'
import { chunkText, clozeWords, foldLetter, initials, makeVerse, parseVerses, typeWords, memorizeSources, VERSES_FORMAT } from './logic.js'
import { GameScreen, PasteJson, Empty, OrderPuzzle } from './ui.jsx'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'
import SwipeRow from '../components/SwipeRow.jsx'
import UndoBar, { useUndoDelete } from '../components/UndoBar.jsx'
import { byPriority, isDue, review } from './progress.js'

const LEVELS = ['Fácil', 'Medio', 'Difícil', 'De memoria']
const MODES = [['hide', 'Ocultar'], ['initials', 'Iniciales'], ['type', 'Escribir'], ['order', 'Ordenar']]

// Guarda el resultado de practicar un texto: sube o baja de nivel y agenda el próximo repaso.
// Los textos del diario se copian a "mis textos" la primera vez que se practican.
export async function saveVerseResult(store, verse, knewIt, nivel = verse.fields.nivel ?? 0) {
  const lvl = knewIt ? Math.min(nivel + 1, 3) : Math.max(nivel - 1, 0)
  const saved = verse.fromDaily ? { ...makeVerse(verse.fields), fields: { ...verse.fields, nivel: lvl } } : { ...verse, fields: { ...verse.fields, nivel: lvl } }
  const stored = await store.saveEntry(saved)
  const key = 'v:' + stored.id
  await store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [key]: review(f.srs?.[key], knewIt) } }))
  return { stored, lvl }
}

// Memorizar textos: cada nivel oculta más palabras. Toca una palabra oculta para verla.
export default function Memorize({ store, toast, onExit }) {
  const srs = store.progress.srs ?? {}
  // Repaso inteligente: arriba los textos que toca repasar hoy.
  const verses = useMemo(() => {
    const list = memorizeSources(store.entries)
    const byKey = new Map(list.map((v) => ['v:' + v.id, v]))
    return byPriority([...byKey.keys()], srs, undefined, () => 0.5).map((k) => byKey.get(k))
  }, [store.entries, srs])
  const [current, setCurrent] = useState(null)
  const [adding, setAdding] = useState(false)
  const [paste, setPaste] = useState(false)
  // Solo tus textos se borran aquí (los del Texto diario se quitan desde Estudio).
  const undoDel = useUndoDelete((v) => store.deleteEntry(v.id), (v) => store.saveEntry(v))

  if (current) return <Practice key={current.id} verse={current} store={store} onSaved={setCurrent} onBack={() => setCurrent(null)} />

  return (
    <GameScreen title="Memorizar textos" onExit={onExit} right={<button className="bar-btn strong" onClick={() => setAdding(true)}>Agregar</button>}>
      {verses.length ? (
        <>
          <MemoHero verses={verses} srs={srs} />
          <ul className="entry-list">
            {verses.map((v) => {
              const row = (
                <button className="entry-row" onClick={() => setCurrent(v)}>
                  <span className="entry-main">
                    <span className="entry-title">{v.fields.cita || v.fields.texto.slice(0, 40)}</span>
                    <span className="entry-sub">{v.fromDaily ? 'Del texto diario' : LEVELS[v.fields.nivel ?? 0]}</span>
                  </span>
                  {isDue(srs['v:' + v.id]) && <span className="due-tag">Hoy</span>}
                  <Dots n={v.fields.nivel ?? 0} />
                </button>
              )
              return v.fromDaily ? <li key={v.id}>{row}</li> : <SwipeRow key={v.id} onDelete={() => undoDel.remove(v)}>{row}</SwipeRow>
            })}
          </ul>
          <button className="secondary" style={{ marginTop: 14 }} onClick={() => setPaste(true)}>Agregar textos de Claude</button>
        </>
      ) : (
        <Empty action={<><button className="primary" onClick={() => setAdding(true)}>Agregar un texto</button><button className="secondary" onClick={() => setPaste(true)}>Agregar textos de Claude</button></>}>
          Agrega los textos de la Biblia que quieras memorizar.
        </Empty>
      )}

      {undoDel.pending && <UndoBar inGame text="Texto eliminado" onUndo={undoDel.undo} />}
      {adding && <AddVerse onCancel={() => setAdding(false)} onSave={async (v) => { await store.saveEntry(makeVerse(v)); setAdding(false); toast('Texto agregado.') }} />}
      {paste && (
        <PasteJson
          title="Textos"
          hint="Pega el JSON con los textos que te dio Claude."
          format={VERSES_FORMAT}
          toast={toast}
          onCancel={() => setPaste(false)}
          onApply={async (data) => {
            const list = parseVerses(data)
            await store.saveEntries(list.map(makeVerse))
            setPaste(false)
            toast(`${list.length} textos agregados.`)
          }}
        />
      )}
    </GameScreen>
  )
}

function Dots({ n }) {
  return (
    <span className="level-dots" aria-label={`Nivel ${n + 1} de 4`}>
      {[0, 1, 2, 3].map((i) => <i key={i} className={i <= n - 1 ? 'on' : ''} />)}
    </span>
  )
}

function Practice({ verse, store, onSaved, onBack }) {
  const [mode, setMode] = useState('hide')
  const [nivel, setNivel] = useState(Math.min(verse.fields.nivel ?? 0, 3))
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6))
  const [shown, setShown] = useState(() => new Set())
  const [peek, setPeek] = useState(false)
  const [ordered, setOrdered] = useState(null) // errores al terminar de ordenar
  const [note, setNote] = useState(null) // aviso de nivel después de "Lo sé" / "Repasar"
  const words = useMemo(() => clozeWords(verse.fields.texto, nivel, seed), [verse.fields.texto, nivel, seed])
  const pieces = useMemo(() => chunkText(verse.fields.texto), [verse.fields.texto])
  const hiddenLeft = words.filter((w, i) => w.hidden && !shown.has(i)).length

  function reset() {
    setSeed(Math.floor(Math.random() * 1e6))
    setShown(new Set())
    setPeek(false)
    setOrdered(null)
  }

  async function next(knewIt) {
    const { stored, lvl } = await saveVerseResult(store, verse, knewIt, nivel)
    if (verse.fromDaily) onSaved(stored)
    setNote({ k: Date.now(), up: lvl > nivel, text: lvl > nivel ? `Subiste a ${LEVELS[lvl]}` : lvl < nivel ? `Bajó a ${LEVELS[lvl]}` : knewIt ? '¡Ya lo sabes de memoria!' : 'Otra vez, con calma' })
    setNivel(lvl)
    reset()
  }

  const ref = verse.fields.cita && <p className="verse-ref">{findRefs(verse.fields.cita).length ? <RefLink refText={findRefs(verse.fields.cita)[0]} /> : verse.fields.cita}</p>
  const answer = (
    <div className="two-btn">
      <button className="secondary" onClick={() => next(false)}>Repasar</button>
      <button className="primary" onClick={() => next(true)}>Lo sé</button>
    </div>
  )

  return (
    <GameScreen title={verse.fields.cita || 'Texto'} back="Textos" onExit={onBack}>
      <div className="seg-modes">
        {MODES.map(([m, l]) => (
          <button key={m} className={mode === m ? 'on' : ''} onClick={() => { setMode(m); setNote(null); reset() }}>{l}</button>
        ))}
      </div>

      {note && <p key={note.k} className={'level-note' + (note.up ? ' up' : '')}>{note.text}</p>}

      {mode === 'hide' && (
        <>
          <div className="level-tabs">
            {LEVELS.map((l, i) => (
              <button key={l} className={i === nivel ? 'on' : ''} onClick={() => { setNivel(i); setShown(new Set()) }}>{l}</button>
            ))}
          </div>
          <p className="verse">
            {words.map((w, i) => (
              <span key={i}>
                {w.pre}
                {w.hidden && !shown.has(i) ? (
                  <button className="blank" style={{ width: `${Math.max(2, w.word.length) * 0.62}em` }} onClick={() => setShown((s) => new Set(s).add(i))} aria-label="Ver palabra" />
                ) : (
                  <span className={w.hidden ? 'revealed' : ''}>{w.word}</span>
                )}
                {w.post}{' '}
              </span>
            ))}
          </p>
          {ref}
          <p className="hint center">{hiddenLeft ? 'Dilo de memoria. Toca un espacio para ver la palabra.' : '¿Lo dijiste completo?'}</p>
          {answer}
        </>
      )}

      {mode === 'initials' && (
        <>
          <button className="verse initials" onClick={() => setPeek((p) => !p)}>
            {peek ? verse.fields.texto : initials(verse.fields.texto)}
          </button>
          {ref}
          <p className="hint center">{peek ? 'Toca el texto para volver a las iniciales.' : 'Solo ves la primera letra de cada palabra. Dilo completo; toca el texto si te atoras.'}</p>
          {answer}
        </>
      )}

      {mode === 'type' && (
        <TypeLetters key={seed} texto={verse.fields.texto} footer={(pct) => (
          <>
            <p className={'order-result ' + (pct >= 90 ? 'ok' : 'bad')}>{pct === 100 ? '¡Perfecto, sin errores!' : `${pct} % a la primera.`}</p>
            {ref}
            {answer}
          </>
        )} />
      )}

      {mode === 'order' && (
        <>
          <OrderPuzzle key={seed} pieces={pieces} onDone={setOrdered} hint="Toca los trozos del texto en orden." />
          {ordered != null && (
            <>
              <p className={'order-result ' + (ordered ? 'bad' : 'ok')}>{ordered ? `Listo, con ${ordered} ${ordered === 1 ? 'error' : 'errores'}.` : '¡Perfecto, sin errores!'}</p>
              {ref}
              {answer}
            </>
          )}
        </>
      )}
    </GameScreen>
  )
}

function AddVerse({ onCancel, onSave }) {
  const [cita, setCita] = useState('')
  const [texto, setTexto] = useState('')
  return (
    <div className="overlay picker">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">Nuevo texto</span>
        <button className="bar-btn strong" disabled={!texto.trim()} onClick={() => onSave({ cita, texto })}>Guardar</button>
      </header>
      <div className="editor-body">
        <label className="sfield"><span className="sfield-label">Cita</span><input className="input" placeholder="Juan 17:3" value={cita} onChange={(e) => setCita(e.target.value)} /></label>
        <label className="sfield"><span className="sfield-label">Texto</span><textarea className="input" rows={6} placeholder="Escribe el texto tal como quieres memorizarlo" value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
      </div>
    </div>
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

// Resumen arriba de la lista: cuántos textos ya sabes de memoria y cuántos tocan hoy.
function MemoHero({ verses, srs }) {
  const memorized = verses.filter((v) => (v.fields.nivel ?? 0) >= 3).length
  const today = verses.filter((v) => isDue(srs['v:' + v.id])).length
  return (
    <div className="mb-hero">
      <p className="mb-count"><b>{memorized}</b> de {verses.length} {verses.length === 1 ? 'texto' : 'textos'} de memoria{today ? ` · ${today} para hoy` : ''}</p>
      <div className="mb-bar memo"><span style={{ width: `${(memorized / verses.length) * 100}%` }} /></div>
    </div>
  )
}
