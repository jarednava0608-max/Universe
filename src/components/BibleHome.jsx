import { useState } from 'react'
import Icon, { ICONS } from './Icon.jsx'
import { BOOKS } from '../lib/bible.js'
import { chapterSaved, openRef } from '../lib/verses.js'
import { hasBible, importBible, useBible } from '../lib/nwt.js'
import { BOOK_ABBR, TOTAL_CHAPTERS, PLAN_LENGTHS, bookRead, chaptersOf, hasPlan, isRead, lastRead, makePlan, readCount, readingToday } from '../lib/reading.js'

// Leer toda la Biblia, como la pestaña "Libros" de JW Library: los 66 libros en cuadros (más
// claros mientras más llevas leído), y al tocar uno, sus capítulos con los leídos marcados.
// Un capítulo se abre en el lector de pantalla completa.
export default function BibleHome({ backLabel = 'Biblioteca', leidos, plan, onSetPlan, entries, toast, onClose }) {
  const [book, setBook] = useState(null)
  useBible()
  const full = hasBible()
  const total = readCount(leidos)
  const pct = Math.floor((total / TOTAL_CHAPTERS) * 100)
  const last = lastRead(leidos)

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
        <button className="bar-btn back" data-inner={book ? '1' : undefined} onClick={() => (book ? setBook(null) : onClose())}>
          <Icon d={ICONS.back} size={18} stroke={2} /> {book ? 'Libros' : backLabel}
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
            {last && <LeftOff last={last} />}
            {onSetPlan && <ReadingGoal leidos={leidos} plan={plan} onSetPlan={onSetPlan} />}
            {!full && <BibleImport toast={toast} />}
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
                const saved = !full && chapterSaved(entries, ref).saved > 0
                return (
                  <button key={c} className={'bh-ch' + (isRead(leidos, book, c) ? ' read' : '') + (saved ? ' saved' : '') + (last?.book === book && last.chapter === c ? ' last' : '')} onClick={() => openRef(ref)}>
                    {c}
                  </button>
                )
              })}
            </div>
            {last?.book === book && <p className="hint">El del borde es donde te quedaste.</p>}
            {!full && <p className="hint">Los capítulos con un punto ya los tienes en Mi Biblia; los demás se pegan una vez desde JW Library.</p>}
          </>
        )}
      </div>
    </div>
  )
}

// Toda la TNM de una vez: el usuario baja el EPUB de jw.org y lo elige aquí. Se lee y se guarda solo
// en este teléfono (no se sube a la nube); en otro teléfono se vuelve a elegir el archivo.
function BibleImport({ toast }) {
  const [busy, setBusy] = useState(false)
  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const done = await importBible(await file.arrayBuffer())
      toast?.(done ? `Listo: la Biblia completa está en este teléfono (${done.verses.toLocaleString('es')} versículos).` : 'Ese archivo no parece la Traducción del Nuevo Mundo en EPUB.')
    } catch (err) {
      toast?.('No se pudo importar: ' + err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="bh-goal">
      <p className="bh-goal-title">Toda la Biblia sin pegar capítulos</p>
      <p className="hint">Baja la Traducción del Nuevo Mundo en EPUB desde jw.org (la Biblia, botón de descargar, EPUB) y elige aquí el archivo. Se guarda solo en este teléfono.</p>
      <label className={'primary as-btn' + (busy ? ' disabled' : '')}>
        {busy ? 'Leyendo la Biblia…' : 'Elegir el archivo EPUB'}
        {/* Sin `accept`: el iPhone deja gris el .epub si se filtra por tipo; el archivo se revisa al leerlo. */}
        <input type="file" hidden disabled={busy} onChange={pick} />
      </label>
      <a className="secondary as-btn" data-direct="1" href="https://www.jw.org/es/biblioteca/biblia/" target="_blank" rel="noopener noreferrer">Ir a la Biblia en jw.org</a>
    </div>
  )
}

// "hoy", "ayer" o "el 12 de octubre" (con el año si no es este).
function whenLabel(t, now = new Date()) {
  const d = new Date(t)
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  return 'el ' + d.toLocaleDateString('es', { day: 'numeric', month: 'long', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })
}

// Dónde te quedaste: el último capítulo que marcaste y un botón para seguir con el que sigue.
function LeftOff({ last }) {
  const [nb, nc] = last.next ?? []
  return (
    <div className="bh-goal">
      <p className="bh-goal-title">Te quedaste en</p>
      <div className="bh-goal-chapters">
        <button className="bh-goal-ch" onClick={() => openRef(`${BOOKS[last.book - 1]} ${last.chapter}`)}>
          {BOOKS[last.book - 1]} {last.chapter}
        </button>
        {last.next && (
          <button className="bh-goal-ch next" onClick={() => openRef(`${BOOKS[nb - 1]} ${nc}`)}>
            Sigue: {BOOKS[nb - 1]} {nc}
          </button>
        )}
      </div>
      <p className="plan-foot">Lo marcaste como leído {whenLabel(last.t)}</p>
    </div>
  )
}

const longDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Meta de lectura: eliges en cuánto tiempo quieres terminar y cada día te dice qué capítulos tocan
// (también sale en "Hoy"). Si un día no lees, los que faltan se reparten entre los días que quedan.
function ReadingGoal({ leidos, plan, onSetPlan }) {
  const [choosing, setChoosing] = useState(false)
  const today = readingToday(leidos, plan)
  if (!hasPlan(plan) || choosing || today?.expired) {
    return (
      <div className="bh-goal">
        <p className="bh-goal-title">{today?.expired ? `Tu meta era el ${longDate(plan.end)}. Elige otra:` : 'Ponte una meta para leer toda la Biblia'}</p>
        <p className="hint">Cada día te digo qué capítulos tocan, aquí y en "Hoy". Cuenta lo que ya leíste.</p>
        <div className="seg2">
          {PLAN_LENGTHS.map(([days, label]) => (
            <button key={days} type="button" onClick={() => { onSetPlan(makePlan(days)); setChoosing(false) }}>{label}</button>
          ))}
        </div>
        {hasPlan(plan) && (
          <div className="bh-goal-links">
            <button className="plan-change" onClick={() => setChoosing(false)}>Dejarla como está</button>
            <button className="plan-change" onClick={() => { onSetPlan({ off: true, t: Date.now() }); setChoosing(false) }}>Quitar la meta</button>
          </div>
        )}
      </div>
    )
  }
  if (today.finished) return <div className="bh-goal"><p className="bh-goal-title">Terminaste de leer toda la Biblia.</p></div>
  const list = today.ok ? today.done : today.next
  return (
    <div className="bh-goal">
      <p className="bh-goal-title">{today.ok ? 'Lectura de hoy: hecha' : 'Lectura de hoy'}</p>
      <div className="bh-goal-chapters">
        {list.map(([b, c]) => (
          <button key={b + ':' + c} className={'bh-goal-ch' + (isRead(leidos, b, c) ? ' read' : '')} onClick={() => openRef(`${BOOKS[b - 1]} ${c}`)}>
            {BOOKS[b - 1]} {c}
          </button>
        ))}
      </div>
      <p className="plan-foot">
        Meta: terminar el {longDate(today.end)} · {today.perDay} {today.perDay === 1 ? 'capítulo' : 'capítulos'} al día
        <button className="plan-change" onClick={() => setChoosing(true)}>Cambiar</button>
      </p>
    </div>
  )
}
