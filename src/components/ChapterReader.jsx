import { useEffect, useMemo, useRef } from 'react'
import Icon, { ICONS } from './Icon.jsx'
import BibleText from './BibleText.jsx'
import { BOOKS } from '../lib/bible.js'
import { savedChapterVerses, neighborChapter, chapterSaved, jwLibraryUrl } from '../lib/verses.js'
import { canSpeak, useSpeech } from '../lib/speech.js'

const nameOf = (book, chapter) => `${BOOKS[book - 1]} ${chapter}`

// Un capítulo de Mi Biblia a pantalla completa, como la Biblia de JW Library: el texto corrido con la
// poesía en sus renglones, el capítulo anterior y el siguiente (botones o deslizar) y "Escuchar",
// que lo lee en voz alta con la voz del iPhone marcando el versículo que va.
// Si el capítulo no está guardado completo, se ofrece pegarlo (abre la hoja de Mi Biblia).
export default function ChapterReader({ book, chapter, verse, entries, onGo, onPaste, onClose }) {
  const verses = useMemo(() => savedChapterVerses(entries, book, chapter), [entries, book, chapter])
  const { saved, expected } = chapterSaved(entries, nameOf(book, chapter))
  const prev = neighborChapter(book, chapter, -1)
  const next = neighborChapter(book, chapter, 1)
  const speech = useSpeech()
  const body = useRef()
  const marks = useRef({})

  // Al abrir en un versículo ("Jer 40:2-4" → leer el capítulo) se baja hasta él.
  useEffect(() => {
    speech.stop()
    const el = verse ? marks.current[verse] : null
    if (el) el.scrollIntoView({ block: 'center' })
    else body.current?.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, chapter])

  // Mientras lee en voz alta, el versículo que va se mantiene a la vista.
  const current = speech.speaking ? verses[speech.index]?.v : null
  useEffect(() => {
    if (current) marks.current[current]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [current])

  // Deslizar a la izquierda = capítulo siguiente; a la derecha = el anterior.
  const touch = useRef(null)
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY } }
  const onTouchEnd = (e) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(t.clientY - s.y) * 1.5) return
    const to = dx < 0 ? next : prev
    if (to) onGo(to)
  }

  const listen = () => (speech.speaking ? speech.stop() : speech.start(verses.map((x) => x.texto), Math.max(0, verses.findIndex((x) => x.v === verse))))

  return (
    <div className="overlay reader">
      <header className="bar">
        <button className="bar-btn back" onClick={onClose}><Icon d={ICONS.back} size={18} stroke={2} /> Atrás</button>
        <span className="bar-title reader-title">
          {nameOf(book, chapter)}
          <small>Mi Biblia</small>
        </span>
        <span className="reader-actions">
          {canSpeak && verses.length > 0 && (
            <button className="bar-btn icon" aria-label={speech.speaking ? 'Dejar de escuchar' : 'Escuchar'} onClick={listen}>
              <Icon d={speech.speaking ? ICONS.parar : ICONS.audio} size={22} />
            </button>
          )}
        </span>
      </header>

      <div className="editor-body reader-body" ref={body} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {verses.length > 0 && (
          <BibleText verses={verses} chapter={chapter} current={current} target={verse} refFor={(v) => (el) => { marks.current[v] = el }} />
        )}
        {saved < expected && (
          <div className="reader-missing">
            <p>{saved ? `Tienes ${saved} de ${expected} versículos de este capítulo.` : 'Aún no tienes este capítulo en Mi Biblia.'}</p>
            <button className="primary" onClick={() => onPaste(nameOf(book, chapter))}>Pegar el capítulo</button>
            <a className="secondary as-btn" data-direct="1" href={jwLibraryUrl(nameOf(book, chapter))} target="_blank" rel="noopener noreferrer">Abrir en JW Library</a>
          </div>
        )}
        <nav className="reader-nav">
          <button className="secondary" disabled={!prev} onClick={() => onGo(prev)}>{prev ? `‹ ${nameOf(prev.book, prev.chapter)}` : ' '}</button>
          <button className="secondary" disabled={!next} onClick={() => onGo(next)}>{next ? `${nameOf(next.book, next.chapter)} ›` : ' '}</button>
        </nav>
      </div>
    </div>
  )
}
