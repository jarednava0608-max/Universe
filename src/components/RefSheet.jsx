import { useState } from 'react'
import { refUrl, parseRef } from '../lib/bible.js'
import { findSavedVerse, jwLibraryUrl, makeBibleEntry, cleanVerseText, isPub, splitChapter, refKey } from '../lib/verses.js'
import { pubTitle, pubUrl } from '../lib/pubs.js'
import Sheet from './Sheet.jsx'

const SOURCE = { memoria: 'De Memorizar textos', diario: 'De tu Texto diario', capitulo: 'Los versículos que tienes guardados de este capítulo' }

// Hoja que se abre al tocar una cita: el texto guardado (o para pegarlo una vez)
// y botones para abrir la cita en JW Library o en wol.jw.org.
export default function RefSheet({ refText, entries, onSave, onSaveMany, onClose, toast }) {
  const pub = isPub(refText)
  // Capítulo entero ("Daniel 2"): lo pegado se guarda versículo por versículo.
  const parsed = pub ? null : parseRef(refText)
  const chapter = parsed && parsed.verse == null ? parsed.chapter : null
  const saved = findSavedVerse(entries, refText)
  const [editing, setEditing] = useState(!saved)
  const [text, setText] = useState(saved?.texto ?? '')

  async function save() {
    const texto = cleanVerseText(text)
    if (!texto) return
    const verses = chapter && splitChapter(texto, chapter)
    if (verses) {
      const list = verses.map(({ v, texto }) => {
        const cita = `${refText.trim()}:${v}`
        const old = entries.find((e) => e.kind === 'biblia' && refKey(e.fields.cita) === refKey(cita))
        return old ? { ...old, fields: { ...old.fields, texto } } : makeBibleEntry(cita, texto)
      })
      await onSaveMany(list)
      setEditing(false)
      toast(`Se guardaron ${list.length} versículos. Toca cualquier cita de ${refText} para verla.`)
      return
    }
    const entry = saved?.source === 'biblia' ? { ...saved.entry, fields: { ...saved.entry.fields, texto } } : makeBibleEntry(refText, texto)
    await onSave(entry)
    setEditing(false)
    toast(pub ? 'Párrafo guardado. La próxima vez lo verás aquí.' : 'Texto guardado. La próxima vez lo verás aquí.')
  }

  async function paste() {
    try {
      setText(cleanVerseText(await navigator.clipboard.readText()))
    } catch {
      toast('Mantén presionado el cuadro y elige “Pegar”.')
    }
  }

  const links = pub ? (
    <div className="ref-sheet-links">
      <a className="primary as-btn" data-direct="1" href={pubUrl(refText)} target="_blank" rel="noopener noreferrer">Buscar «{pubTitle(refText)}» en wol.jw.org</a>
    </div>
  ) : (
    <div className="ref-sheet-links">
      <a className="primary as-btn" data-direct="1" href={jwLibraryUrl(refText)} target="_blank" rel="noopener noreferrer">Abrir en JW Library</a>
      <a className="secondary as-btn" data-direct="1" href={refUrl(refText)} target="_blank" rel="noopener noreferrer">Abrir en wol.jw.org</a>
    </div>
  )

  return (
    <Sheet
      title={refText}
      backdropClass="ref-sheet-backdrop"
      className="ref-sheet"
      onClose={onClose}
      actions={saved && !editing && (saved.source === 'biblia' || saved.source === 'capitulo') && <button className="bar-btn" onClick={() => setEditing(true)}>Editar</button>}
      footer={links}
    >
      {editing ? (
        <>
          {!saved && (
            <p className="hint">
              {chapter
                ? 'Aún no tienes este capítulo guardado. Copia el capítulo completo de JW Library y pégalo aquí; se guarda versículo por versículo.'
                : pub
                ? 'Aún no guardas nada de esta publicación. Copia de JW Library el párrafo que te sirvió y pégalo aquí; después lo verás sin salir de la app.'
                : 'Aún no tienes este texto guardado. Cópialo de JW Library y pégalo aquí una vez; después lo verás sin salir de la app.'}
            </p>
          )}
          <textarea className="input ref-sheet-input" rows={5} value={text} placeholder={chapter ? 'Pega aquí el capítulo completo' : pub ? 'Pega aquí el párrafo' : 'Pega aquí el texto del versículo'} onChange={(e) => setText(e.target.value.replace(/[+*]/g, ''))} />
          <div className="two-btn">
            <button className="secondary" onClick={paste}>Pegar</button>
            <button className="primary" disabled={!text.trim()} onClick={save}>Guardar</button>
          </div>
        </>
      ) : (
        <div className="ref-sheet-text">
          <p>{saved.texto}</p>
          {SOURCE[saved.source] && <span className="ref-sheet-source">{SOURCE[saved.source]}</span>}
        </div>
      )}
    </Sheet>
  )
}
