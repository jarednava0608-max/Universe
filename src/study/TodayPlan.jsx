import { useState } from 'react'
import { useMeetings } from './meetings.js'
import Icon, { ICONS } from '../components/Icon.jsx'
import { DAYS, todayPlan, looksLikeDailyText } from './today.js'
import { openRef } from '../lib/verses.js'

const cap = (s) => s[0].toUpperCase() + s.slice(1)
const clip = (s, n = 160) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s)

// "Hoy": el texto de hoy arriba y, abajo, los pasos del día en orden. Cada paso se toca para hacerlo
// y se marca solo cuando ya está hecho (ver today.js).
export default function TodayPlan({ entries, review, challenge, leidos, plan, onBible, onOpenEntry, onCreate, onPasteDaily, onReview, onChallenge, toast }) {
  const [meetings, setMeetings] = useMeetings()
  const [changing, setChanging] = useState(false)
  const items = todayPlan({ entries, review, challenge, meetings, leidos, plan })
  const diario = items[0]
  const done = items.filter((x) => x.done).length
  const fecha = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  const act = (it) => (it.key === 'lectura' ? (it.ref ? openRef(it.ref) : onBible()) : it.key === 'repaso' ? onReview() : it.key === 'reto' ? onChallenge() : it.entry ? onOpenEntry(it.entry) : onCreate(it.create))
  const setup = changing || meetings?.semana == null || meetings?.fin == null

  async function pasteDaily() {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      // Sin permiso para leer lo copiado: se abre la entrada para pegarlo a mano.
      return onCreate(diario.create ?? { kind: 'diario', fields: {} })
    }
    if (!looksLikeDailyText(text)) {
      toast?.('Primero copia el texto de hoy en JW Library (con su cita) y vuelve a tocar aquí.')
      return
    }
    onPasteDaily(text.trim(), diario.entry)
  }

  return (
    <section className="today-card plan">
      <div className="plan-head">
        <span className="today-label">Hoy · {fecha}</span>
        <span className="plan-count">{done} de {items.length}</span>
      </div>
      {diario.verse && (
        <button className="today-text" onClick={() => onOpenEntry(diario.entry)}>
          <span className="today-verse">{clip(diario.verse)}</span>
        </button>
      )}
      {!diario.verse && onPasteDaily && (
        // Copias el texto de hoy en JW Library y con un toque queda guardado con su fecha.
        <button className="today-add" onClick={pasteDaily}>
          <Icon d={ICONS.pegar} size={17} /> Pegar el texto de hoy
        </button>
      )}
      <ul className="plan-list">
        {items.map((it) => (
          <li key={it.key}>
            <button className={'plan-row' + (it.done ? ' done' : '')} onClick={() => act(it)}>
              <span className="plan-check" aria-label={it.done ? 'Hecho' : 'Pendiente'}>
                {it.done && (
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="entry-main">
                <span className="plan-title">{it.title}</span>
                <span className="plan-sub">{it.sub}</span>
              </span>
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
          </li>
        ))}
      </ul>
      {setup ? (
        <MeetingDays value={meetings} onChange={(next) => { setMeetings(next); if (next.semana != null && next.fin != null) setChanging(false) }} />
      ) : (
        <p className="plan-foot">
          {done === items.length ? 'Todo listo por hoy. ' : ''}Reuniones: {DAYS[meetings.semana]} y {DAYS[meetings.fin]}
          <button className="plan-change" onClick={() => setChanging(true)}>Cambiar</button>
        </p>
      )}
    </section>
  )
}

// Se pregunta una vez: así "Hoy" te dice cuándo preparar La Atalaya y la reunión de entre semana.
function MeetingDays({ value, onChange }) {
  const v = value ?? {}
  const pick = (k) => (e) => onChange({ ...v, [k]: e.target.value === '' ? null : Number(e.target.value) })
  return (
    <div className="plan-setup">
      <p className="plan-setup-q">¿Qué días son tus reuniones? Así te digo cuándo preparar cada una.</p>
      <div className="plan-setup-row">
        <label>
          <span>Entre semana</span>
          <select className="input" value={v.semana ?? ''} onChange={pick('semana')}>
            <option value="">Elegir</option>
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{cap(DAYS[d])}</option>)}
          </select>
        </label>
        <label>
          <span>Fin de semana</span>
          <select className="input" value={v.fin ?? ''} onChange={pick('fin')}>
            <option value="">Elegir</option>
            {[6, 0].map((d) => <option key={d} value={d}>{cap(DAYS[d])}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}
