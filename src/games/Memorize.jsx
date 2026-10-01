import { useMemo, useState } from 'react'
import { clozeWords, makeVerse, parseVerses, verseSources, VERSES_FORMAT } from './logic.js'
import { GameScreen, PasteJson, Empty } from './ui.jsx'
import { findRefs } from '../lib/bible.js'
import RefLink from '../components/RefLink.jsx'
import { byPriority, isDue, review } from './progress.js'

const LEVELS = ['Fácil', 'Medio', 'Difícil', 'De memoria']

// Memorizar textos: cada nivel oculta más palabras. Toca una palabra oculta para verla.
export default function Memorize({ store, toast, onExit }) {
  const srs = store.progress.srs ?? {}
  // Repaso inteligente: arriba los textos que toca repasar hoy.
  const verses = useMemo(() => {
    const list = verseSources(store.entries)
    const byKey = new Map(list.map((v) => ['v:' + v.id, v]))
    return byPriority([...byKey.keys()], srs, undefined, () => 0.5).map((k) => byKey.get(k))
  }, [store.entries, srs])
  const [current, setCurrent] = useState(null)
  const [adding, setAdding] = useState(false)
  const [paste, setPaste] = useState(false)

  if (current) return <Practice key={current.id} verse={current} store={store} onSaved={setCurrent} onBack={() => setCurrent(null)} />

  return (
    <GameScreen title="Memorizar textos" onExit={onExit} right={<button className="bar-btn strong" onClick={() => setAdding(true)}>Agregar</button>}>
      {verses.length ? (
        <>
          <ul className="entry-list">
            {verses.map((v) => (
              <li key={v.id}>
                <button className="entry-row" onClick={() => setCurrent(v)}>
                  <span className="entry-main">
                    <span className="entry-title">{v.fields.cita || v.fields.texto.slice(0, 40)}</span>
                    <span className="entry-sub">{v.fromDaily ? 'Del texto diario' : LEVELS[v.fields.nivel ?? 0]}</span>
                  </span>
                  {isDue(srs['v:' + v.id]) && <span className="due-tag">Hoy</span>}
                  <Dots n={v.fields.nivel ?? 0} />
                </button>
              </li>
            ))}
          </ul>
          <button className="secondary" style={{ marginTop: 14 }} onClick={() => setPaste(true)}>Agregar textos de Claude</button>
        </>
      ) : (
        <Empty action={<><button className="primary" onClick={() => setAdding(true)}>Agregar un texto</button><button className="secondary" onClick={() => setPaste(true)}>Agregar textos de Claude</button></>}>
          Agrega los textos que quieras memorizar. Los de tu Texto diario aparecen aquí solos.
        </Empty>
      )}

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
  const [nivel, setNivel] = useState(Math.min(verse.fields.nivel ?? 0, 3))
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6))
  const [shown, setShown] = useState(() => new Set())
  const words = useMemo(() => clozeWords(verse.fields.texto, nivel, seed), [verse.fields.texto, nivel, seed])
  const hiddenLeft = words.filter((w, i) => w.hidden && !shown.has(i)).length

  async function next(knewIt) {
    const lvl = knewIt ? Math.min(nivel + 1, 3) : Math.max(nivel - 1, 0)
    // Los textos del diario se copian a "mis textos" la primera vez que se practican.
    const saved = verse.fromDaily ? { ...makeVerse(verse.fields), fields: { ...verse.fields, nivel: lvl } } : { ...verse, fields: { ...verse.fields, nivel: lvl } }
    const stored = await store.saveEntry(saved)
    const key = 'v:' + stored.id
    await store.updateProgress((f) => ({ ...f, srs: { ...(f.srs ?? {}), [key]: review(f.srs?.[key], knewIt) } }))
    if (verse.fromDaily) onSaved(stored)
    setNivel(lvl)
    setSeed(Math.floor(Math.random() * 1e6))
    setShown(new Set())
  }

  return (
    <GameScreen title={verse.fields.cita || 'Texto'} onExit={onBack}>
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
      {verse.fields.cita && <p className="verse-ref">{findRefs(verse.fields.cita).length ? <RefLink refText={findRefs(verse.fields.cita)[0]} /> : verse.fields.cita}</p>}
      <p className="hint center">{hiddenLeft ? 'Dilo de memoria. Toca un espacio para ver la palabra.' : '¿Lo dijiste completo?'}</p>
      <div className="two-btn">
        <button className="secondary" onClick={() => next(false)}>Repasar</button>
        <button className="primary" onClick={() => next(true)}>Lo sé</button>
      </div>
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
