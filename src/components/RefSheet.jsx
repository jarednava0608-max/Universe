import { useEffect, useRef, useState } from 'react'
import { refUrl, parseRef } from '../lib/bible.js'
import { findSavedVerse, jwLibraryUrl, makeBibleEntry, cleanVerseText, isPub, splitChapter, chapterCheck, chapterSaved, refKey } from '../lib/verses.js'
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
  // Capítulo pegado que no salió completo: se avisa cuáles faltan antes de guardar.
  const [incomplete, setIncomplete] = useState(null)
  // Al guardar, la hoja vuelve al principio del texto (si no, se queda abajo donde estaba el cuadro).
  const textTop = useRef()
  useEffect(() => {
    if (!editing) textTop.current?.scrollIntoView({ block: 'nearest' })
  }, [editing])

  async function saveVerses(verses) {
    const list = verses.map(({ v, texto }) => {
      const cita = `${refText.trim()}:${v}`
      const old = entries.find((e) => e.kind === 'biblia' && refKey(e.fields.cita) === refKey(cita))
      return old ? { ...old, fields: { ...old.fields, texto } } : makeBibleEntry(cita, texto)
    })
    await onSaveMany(list)
    setEditing(false)
    setIncomplete(null)
    const { expected } = chapterCheck(verses, parsed.book, chapter)
    toast(list.length === expected ? `${refText}: los ${expected} versículos guardados.` : `Se guardaron ${list.length} versículos de ${refText}.`)
  }

  async function save() {
    const texto = cleanVerseText(text)
    if (!texto) return
    const verses = chapter && splitChapter(texto, chapter, parsed.book)
    if (verses) {
      const check = chapterCheck(verses, parsed.book, chapter)
      if (check.expected && check.missing.length) return setIncomplete({ verses, ...check })
      return saveVerses(verses)
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
          <textarea className="input ref-sheet-input" rows={5} value={text} placeholder={chapter ? 'Pega aquí el capítulo completo' : pub ? 'Pega aquí el párrafo' : 'Pega aquí el texto del versículo'} onChange={(e) => { setIncomplete(null); setText(e.target.value.replace(/[+*]/g, '')) }} />
          {incomplete ? (
            <>
              <p className="hint warn">
                Encontré {incomplete.got} de {incomplete.expected} versículos. {incomplete.missing.length === 1 ? 'Falta' : 'Faltan'} {listNums(incomplete.missing)}.
                {' '}Revisa que hayas copiado el capítulo completo, desde el principio hasta el final.
              </p>
              <div className="two-btn">
                <button className="secondary" onClick={() => setIncomplete(null)}>Revisar</button>
                <button className="primary" onClick={() => saveVerses(incomplete.verses)}>Guardar así</button>
              </div>
            </>
          ) : (
            <div className="two-btn">
              <button className="secondary" onClick={paste}>Pegar</button>
              <button className="primary" disabled={!text.trim()} onClick={save}>Guardar</button>
            </div>
          )}
        </>
      ) : (
        <div className="ref-sheet-text" ref={textTop}>
          {pub ? <p>{saved.texto}</p> : <VerseText text={saved.texto} multi={saved.source === 'capitulo' || saved.source === 'versos'} verse={parsed?.verse} chapter={parsed?.chapter} />}
          {saved.source === 'capitulo' && chapter ? (
            <span className="ref-sheet-source">{chapterNote(chapterSaved(entries, refText))}</span>
          ) : SOURCE[saved.source] && <span className="ref-sheet-source">{SOURCE[saved.source]}</span>}
        </div>
      )}
    </Sheet>
  )
}

// "el 7", "el 3 y el 9", "del 3 al 16"
function listNums(nums) {
  if (nums.length === 1) return `el ${nums[0]}`
  const seguidos = nums.every((n, i) => !i || n === nums[i - 1] + 1)
  if (seguidos) return `del ${nums[0]} al ${nums.at(-1)}`
  const shown = nums.slice(0, 6)
  return shown.slice(0, -1).join(', ') + ' y ' + shown.at(-1) + (nums.length > 6 ? ' y otros' : '')
}

function chapterNote({ saved, expected }) {
  if (!expected) return SOURCE.capitulo
  return saved >= expected ? `Capítulo completo: los ${expected} versículos guardados` : `Tienes ${saved} de ${expected} versículos de este capítulo`
}

// El texto bíblico como en JW Library: corrido, con letra de libro, el número del capítulo grande
// en lugar del versículo 1 y los demás números chicos en azul. Lo guardado de varios versículos
// viene un versículo por renglón ("2 Ismael hijo de…").
function VerseText({ text, multi, verse, chapter }) {
  const verses = multi
    ? String(text).split('\n').map((l) => l.match(/^(\d{1,3})\s+(.*)$/)).filter(Boolean).map((m) => ({ v: Number(m[1]), t: m[2] }))
    : [{ v: verse, t: String(text).trim() }]
  return (
    <p className="bible-text">
      {verses.map(({ v, t }, i) => (
        <span key={i}>
          {v === 1 && chapter ? <span className="bible-chap">{chapter}</span> : v ? <span className="bible-v">{v}</span> : null}
          {t}{' '}
        </span>
      ))}
    </p>
  )
}
