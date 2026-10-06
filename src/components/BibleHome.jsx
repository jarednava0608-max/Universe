import { useState } from 'react'
import Icon, { ICONS } from './Icon.jsx'
import { BOOKS } from '../lib/bible.js'
import { chapterSaved, openRef } from '../lib/verses.js'
import { BOOK_ABBR, TOTAL_CHAPTERS, PLAN_LENGTHS, bookRead, chaptersOf, hasPlan, isRead, makePlan, readCount, readingToday } from '../lib/reading.js'

// Leer toda la Biblia, como la pestaña "Libros" de JW Library: los 66 libros en cuadros (más
// claros mientras más llevas leído), y al tocar uno, sus capítulos con los leídos marcados.
// Un capítulo se abre en el lector de pantalla completa.
export default function BibleHome({ leidos, plan, onSetPlan, entries, onClose }) {
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
            {onSetPlan && <ReadingGoal leidos={leidos} plan={plan} onSetPlan={onSetPlan} />}
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
