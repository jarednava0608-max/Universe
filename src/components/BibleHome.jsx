import { useState } from 'react'
import Icon, { ICONS } from './Icon.jsx'
import { BOOKS } from '../lib/bible.js'
import { chapterSaved, openRef } from '../lib/verses.js'
import { BOOK_ABBR, TOTAL_CHAPTERS, bookRead, chaptersOf, isRead, readCount } from '../lib/reading.js'

// Leer toda la Biblia, como la pestaña "Libros" de JW Library: los 66 libros en cuadros (más
// claros mientras más llevas leído), y al tocar uno, sus capítulos con los leídos marcados.
// Un capítulo se abre en el lector de pantalla completa.
export default function BibleHome({ leidos, entries, onClose }) {
  const [book, setBook] = useState(null)
  const total = readCount(leidos)
  const pct = Math.floor((total / TOTAL_CHAPTERS) * 100)

  const grid = (from, to) => (
    <div className="bh-grid">
      {BOOK_ABBR.slice(from, to).map((abbr, i) => {
        const b = from + i + 1
        const { read, total: n } = bookRead(leidos, b)
        const level = read === 0 ? 0 : read === n ? 3 : read / n >= 0.5 ? 2 : 1
        return (
          <button key={b} className={'bh-book lv' + level} onClick={() => setBook(b)} aria-label={`${BOOKS[b - 1]}: ${read} de ${n} capítulos`}>
            {abbr}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="overlay bible-home">
      <header className="bar">
        <button className="bar-btn back" onClick={() => (book ? setBook(null) : onClose())}>
          <Icon d={ICONS.back} size={18} stroke={2} /> {book ? 'Libros' : 'Estudio'}
        </button>
        <span className="bar-title">{book ? BOOKS[book - 1] : 'Leer la Biblia'}</span>
        <span />
      </header>
      <div className="editor-body">
        {!book ? (
          <>
            <div className="bh-progress">
              <p className="bh-count"><b>{total}</b> de {TOTAL_CHAPTERS} capítulos leídos{total ? ` · ${pct} %` : ''}</p>
              <div className="progress"><span style={{ width: `${(total / TOTAL_CHAPTERS) * 100}%` }} /></div>
              <p className="hint">Marca cada capítulo al terminar de leerlo (abajo, en el lector). Los de la lectura de la semana también cuentan.</p>
            </div>
            <h2 className="bh-h">Escrituras Hebreoarameas</h2>
            {grid(0, 39)}
            <h2 className="bh-h">Escrituras Griegas Cristianas</h2>
            {grid(39, 66)}
          </>
        ) : (
          <>
            <p className="bh-count">{bookRead(leidos, book).read} de {chaptersOf(book)} capítulos leídos</p>
            <div className="bh-chapters">
              {Array.from({ length: chaptersOf(book) }, (_, i) => i + 1).map((c) => {
                const ref = `${BOOKS[book - 1]} ${c}`
                const saved = chapterSaved(entries, ref).saved > 0
                return (
                  <button key={c} className={'bh-ch' + (isRead(leidos, book, c) ? ' read' : '') + (saved ? ' saved' : '')} onClick={() => openRef(ref)}>
                    {c}
                  </button>
                )
              })}
            </div>
            <p className="hint">Los capítulos con un punto ya los tienes en Mi Biblia; los demás se pegan una vez desde JW Library.</p>
          </>
        )}
      </div>
    </div>
  )
}
