import { useState } from 'react'
import { useMeetings } from './meetings.js'
import Icon, { ICONS } from '../components/Icon.jsx'
import { DAYS, nextStep, todayPlan, looksLikeDailyText } from './today.js'
import { openRef } from '../lib/verses.js'
import { otherDayText } from './kinds.js'

const cap = (s) => s[0].toUpperCase() + s.slice(1)

// La pestaña "Hoy": una sola pantalla tranquila con la fecha, el versículo de hoy (ya pegado) y un botón
// con lo que sigue (ver today.js); al terminarlo, el botón pasa al siguiente paso. Sin lista, sin contador
// y sin abrir solo lo que sigue: al usuario lo abrumaba sentir que la app siempre le pedía más. Cuando ya
// está lo de hoy, lo dice y ya. Todo lo demás vive en Biblioteca.
export default function TodayPlan({ streak, entries, leidos, plan, onBible, onOpenEntry, onOpenMeeting, onCreate, onPasteDaily, toast }) {
  const [meetings, setMeetings] = useMeetings()
  const items = todayPlan({ entries, meetings, leidos, plan })
  const diario = items[0]
  const frase = String(diario.entry?.fields?.resumen ?? '').trim()
  // El día de la reunión: un toque al Modo reunión (tus respuestas), sin buscarla en Biblioteca.
  const reunion = items.find((x) => x.meetingToday && x.entry)
  const done = items.filter((x) => x.done).length
  const now = new Date()
  const weekday = cap(now.toLocaleDateString('es', { weekday: 'long' }))
  const date = now.toLocaleDateString('es', { day: 'numeric', month: 'long' })
  const act = (it) => (it.key === 'lectura' ? (it.ref ? openRef(it.ref) : onBible()) : it.entry ? onOpenEntry(it.entry) : onCreate(it.create))
  const next = nextStep(items)
  // El botón grande hace lo que sigue; sin texto de hoy, lo pega de lo copiado.
  const doNext = () => (next.key === 'diario' && !diario.verse && onPasteDaily ? pasteDaily() : act(next))
  const setup = meetings?.semana == null || meetings?.fin == null

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
    const other = otherDayText(text)
    if (other) {
      toast?.(`Ese es el texto del ${other}. Copia el de hoy en JW Library y vuelve a tocar aquí.`)
      return
    }
    onPasteDaily(text.trim(), diario.entry)
  }

  return (
    <section className="hoy">
      <div className="hoy-head">
        <p className="hoy-weekday">{weekday}</p>
        <h1 className="hoy-date">{date}</h1>
      </div>
      {streak && (
        // Constancia en un renglón bajo la fecha (el usuario la quiere mero enfrente).
        <button className="plan-streak" onClick={streak.onClick}>
          Constancia <span>{streak.label}</span>
          <Icon d={ICONS.chev} size={14} stroke={2} />
        </button>
      )}
      {diario.verse && <p className="hoy-verse">{diario.verse}</p>}
      {next ? (
        <button className="primary plan-next" onClick={doNext}>
          <span className="plan-next-label">{done || next.entry ? 'Sigue' : 'Empieza'}: {next.title}</span>
          <span className="plan-next-sub">{next.key === 'diario' && !diario.verse ? 'Copia el texto en JW Library y toca aquí' : next.sub}</span>
        </button>
      ) : (
        <>
          <p className="plan-done">Listo por hoy. Lo demás es cuando tú quieras.</p>
          {/* Para cerrar el día: la frase que escribiste en el Texto diario (Recordar). */}
          {frase && <p className="hoy-frase"><span>Tu frase de hoy</span>{frase}</p>}
        </>
      )}
      {reunion && (
        <button className="hoy-meeting" onClick={() => onOpenMeeting(reunion.entry)}>
          <span>{reunion.key === 'atalaya' ? 'La Atalaya' : 'La reunión'} es hoy</span>
          <b>Mis respuestas</b>
          <Icon d={ICONS.chev} size={16} stroke={2} />
        </button>
      )}
      {setup && <MeetingDays value={meetings} onChange={setMeetings} />}
    </section>
  )
}

// En Biblioteca: "Reuniones: jueves y sábado · Cambiar" (antes salía todos los días en Hoy).
export function MeetingDaysRow() {
  const [meetings, setMeetings] = useMeetings()
  const [changing, setChanging] = useState(false)
  if (changing || meetings?.semana == null || meetings?.fin == null) {
    return <MeetingDays value={meetings} onChange={(next) => { setMeetings(next); if (next.semana != null && next.fin != null) setChanging(false) }} />
  }
  return (
    <p className="plan-foot lib-meetings">
      Reuniones: {DAYS[meetings.semana]} y {DAYS[meetings.fin]}
      <button className="plan-change" onClick={() => setChanging(true)}>Cambiar</button>
    </p>
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
