import { useState } from 'react'
import { refUrl } from '../lib/bible.js'
import { findSavedVerse, jwLibraryUrl, makeBibleEntry } from '../lib/verses.js'

const SOURCE = { memoria: 'De Memorizar textos', diario: 'De tu Texto diario' }

// Hoja que se abre al tocar una cita: el texto guardado (o para pegarlo una vez)
// y botones para abrir la cita en JW Library o en wol.jw.org.
export default function RefSheet({ refText, entries, onSave, onClose, toast }) {
  const saved = findSavedVerse(entries, refText)
  const [editing, setEditing] = useState(!saved)
  const [text, setText] = useState(saved?.texto ?? '')

  async function save() {
    const texto = text.trim()
    if (!texto) return
    const entry = saved?.source === 'biblia' ? { ...saved.entry, fields: { ...saved.entry.fields, texto } } : makeBibleEntry(refText, texto)
    await onSave(entry)
    setEditing(false)
    toast('Texto guardado. La próxima vez lo verás aquí.')
  }

  async function paste() {
    try {
      setText((await navigator.clipboard.readText()).trim())
    } catch {
      toast('Mantén presionado el cuadro y elige “Pegar”.')
    }
  }

  return (
    <div className="sheet-backdrop ref-sheet-backdrop" onClick={onClose}>
      <div className="sheet ref-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="ref-sheet-head">
          <h2 className="ref-sheet-title">{refText}</h2>
          {saved && !editing && saved.source === 'biblia' && (
            <button className="bar-btn" onClick={() => setEditing(true)}>Editar</button>
          )}
        </div>

        {editing ? (
          <>
            {!saved && <p className="hint">Aún no tienes este texto guardado. Cópialo de JW Library y pégalo aquí una vez; después lo verás sin salir de la app.</p>}
            <textarea className="input ref-sheet-input" rows={5} value={text} placeholder="Pega aquí el texto del versículo" onChange={(e) => setText(e.target.value)} />
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

        <div className="ref-sheet-links">
          <a className="primary as-btn" data-direct="1" href={jwLibraryUrl(refText)} target="_blank" rel="noopener noreferrer">Abrir en JW Library</a>
          <a className="secondary as-btn" data-direct="1" href={refUrl(refText)} target="_blank" rel="noopener noreferrer">Abrir en wol.jw.org</a>
        </div>
      </div>
    </div>
  )
}
