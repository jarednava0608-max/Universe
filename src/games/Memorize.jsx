import { useMemo, useState } from 'react'
import { makeVerse, parseVerses, VERSES_FORMAT } from './logic.js'
import { learnSources } from './repaso.js'
import { GameScreen, PasteJson, Empty } from './ui.jsx'
import { openRef } from '../lib/verses.js'
import { findRefs } from '../lib/bible.js'
import SwipeRow from '../components/SwipeRow.jsx'
import UndoBar, { useUndoDelete } from '../components/UndoBar.jsx'

const learnVerse = (v) => {
  const e = makeVerse(v)
  return { ...e, fields: { ...e.fields, aprender: true } }
}
// Cómo lo llevas, según la caja del repaso (ver verseMode en repaso.js).
const stage = (item) => (!item ? 'Nuevo' : item.box < 2 ? 'Ubicándolo' : item.box < 4 ? 'Reconociéndolo' : 'De memoria')

// Mis textos: solo la lista de lo que elegiste aprender ("Aprenderlo"); se practica en Repasar.
// Deslizar lo quita de Repasar (el texto sigue guardado para Mi Biblia).
export default function Memorize({ store, toast, onExit }) {
  const srs = store.progress.srs ?? {}
  const verses = useMemo(() => learnSources(store.entries), [store.entries])
  const [adding, setAdding] = useState(false)
  const [paste, setPaste] = useState(false)
  const undoDel = useUndoDelete(
    (v) => store.saveEntry({ ...v, fields: { ...v.fields, aprender: false } }),
    (v) => store.saveEntry(v),
  )

  return (
    <GameScreen title="Mis textos" onExit={onExit} right={<button className="bar-btn strong" onClick={() => setAdding(true)}>Agregar</button>}>
      {verses.length ? (
        <>
          <ul className="entry-list">
            {verses.map((v) => (
              <SwipeRow key={v.id} onDelete={() => undoDel.remove(v)}>
                <button className="entry-row" onClick={() => findRefs(v.fields.cita ?? '').length && openRef(findRefs(v.fields.cita)[0])}>
                  <span className="entry-main">
                    <span className="entry-title">{v.fields.cita || v.fields.texto.slice(0, 40)}</span>
                    <span className="entry-sub">{stage(srs['v:' + v.id])}</span>
                  </span>
                </button>
              </SwipeRow>
            ))}
          </ul>
          <button className="secondary" style={{ marginTop: 16 }} onClick={() => setPaste(true)}>Agregar textos de Claude</button>
        </>
      ) : (
        <Empty action={<button className="primary" onClick={() => setAdding(true)}>Agregar un texto</button>}>
          Toca un texto (en el texto diario, La Atalaya o la reunión) y elige "Aprenderlo". Aquí verás los que estás aprendiendo.
        </Empty>
      )}

      {undoDel.pending && <UndoBar inGame text="Quitado de Repasar" onUndo={undoDel.undo} />}
      {adding && <AddVerse onCancel={() => setAdding(false)} onSave={async (v) => { await store.saveEntry(learnVerse(v)); setAdding(false); toast('Texto agregado.') }} />}
      {paste && (
        <PasteJson
          title="Textos"
          hint="Pega el JSON con los textos que te dio Claude."
          format={VERSES_FORMAT}
          toast={toast}
          onCancel={() => setPaste(false)}
          onApply={async (data) => {
            const list = parseVerses(data)
            await store.saveEntries(list.map(learnVerse))
            setPaste(false)
            toast(`${list.length} textos agregados.`)
          }}
        />
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
