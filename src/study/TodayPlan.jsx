import { useEffect, useState } from 'react'
import { useMeetings } from './meetings.js'
import Icon, { ICONS } from '../components/Icon.jsx'
import { DAYS, nextStep, todayPlan, looksLikeDailyText, yesterdayLesson, splitVerse, isNight } from './today.js'
import { Refs } from './DailyStudy.jsx'
import { RutinaCard } from './Rutina.jsx'
import { openRef } from '../lib/verses.js'
import { otherDayText, dailyTextAppUrl, today as todayIso } from './kinds.js'
import { dailyTextFor, useDailyTexts } from '../lib/dailytexts.js'

const cap = (s) => s[0].toUpperCase() + s.slice(1)

// La pestaña "Hoy": una sola pantalla tranquila con la fecha, el versículo de hoy (ya pegado) y un botón
// con lo que sigue (ver today.js); al terminarlo, el botón pasa al siguiente paso. Sin lista, sin contador
// y sin abrir solo lo que sigue: al usuario lo abrumaba sentir que la app siempre le pedía más. Cuando ya
// está lo de hoy, lo dice y ya. Todo lo demás vive en Biblioteca.
export default function TodayPlan({ streak, entries, leidos, plan, onBible, onOpenEntry, onOpenMeeting, onCreate, onPasteDaily, rutina, onRutina, onToggleRutina, toast }) {
  const [meetings, setMeetings] = useMeetings()
  useDailyTexts()
  // Con el folleto del año importado, el texto de hoy ya está: no hay que copiarlo ni pegarlo.
  const imported = dailyTextFor(todayIso())
  const items = todayPlan({ entries, meetings, leidos, plan, dailyText: imported })
  const diario = items[0]
  const frase = String(diario.entry?.fields?.resumen ?? '').trim()
  // Ya hecho el texto de hoy, tu "Cuando…, voy a…" queda a la vista para acordarte durante el día.
  const planHoy = diario.done ? String(diario.entry?.fields?.aplicacion ?? '').trim() : ''
  // Antes de empezar el de hoy: el de ayer, para recordar qué te enseñó antes de verlo.
  const started = ['jehova', 'principio', 'aplicacion'].some((k) => String(diario.entry?.fields?.[k] ?? '').trim())
  const ayer = diario.done || started ? null : yesterdayLesson(entries)
  const hasText = !!String(diario.entry?.fields?.texto ?? '').trim()
  // El día de la reunión: un toque al Modo reunión (tus respuestas), sin buscarla en Biblioteca.
  const reunion = items.find((x) => x.meetingToday && x.entry)
  const done = items.filter((x) => x.done).length
  const now = new Date()
  const night = useNight()
  const weekday = cap(now.toLocaleDateString('es', { weekday: 'long' }))
  const date = now.toLocaleDateString('es', { day: 'numeric', month: 'long' })
  const act = (it) => (it.key === 'lectura' ? (it.ref ? openRef(it.ref) : onBible()) : it.entry ? onOpenEntry(it.entry) : onCreate(it.create))
  const next = nextStep(items)
  // El botón grande hace lo que sigue; sin texto de hoy, lo toma del folleto importado o lo pega de lo copiado.
  const doNext = () => (next.key === 'diario' && !hasText && onPasteDaily ? (imported ? onPasteDaily(imported, diario.entry, true) : pasteDaily()) : act(next))
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
    <section className="hoy" data-night={night || undefined}>
      {/* Portada: un amanecer suave detrás de la fecha, como el ícono (el usuario la pidió). */}
      <div className="hoy-cover" data-night={night || undefined}>
        <Sunrise />
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
      </div>
      {diario.verse && <Verse verse={diario.verse} />}
      {planHoy && <p className="hoy-plan"><span>Tu plan de hoy</span>{planHoy}</p>}
      {next && (
        <button className="primary plan-next" onClick={doNext}>
          <span className="plan-next-label">{done || next.entry ? 'Sigue' : 'Empieza'}: {next.title}</span>
          <span className="plan-next-sub">{next.key === 'diario' && !diario.verse ? 'Copia el texto en JW Library y toca aquí' : next.sub}</span>
        </button>
      )}
      {next?.key === 'diario' && !diario.verse && (
        // Para copiarlo sin buscarlo: abre el texto de hoy en JW Library.
        <a className="hoy-jwl" data-direct="1" href={dailyTextAppUrl(diario.create?.fields?.fecha ?? diario.entry?.fields?.fecha)} target="_blank" rel="noopener noreferrer">Abrir el texto de hoy en JW Library</a>
      )}
      {ayer && (
        <details className="hoy-ayer">
          <summary><span>Ayer</span>{ayer.verse}<b>¿Qué te enseñó? Ver</b></summary>
          <p>{ayer.lesson}</p>
        </details>
      )}
      {!next && (
        <>
          <p className="plan-done">Listo por hoy. Lo demás es cuando tú quieras.</p>
          {/* Para cerrar el día: la frase que escribiste en el Texto diario (Recordar). */}
          {frase && <p className="hoy-frase"><span>Tu frase de hoy</span>{frase}</p>}
        </>
      )}
      {/* La rutina bíblica de la mañana (su chat de Gemini) acompaña al Texto diario, no lo cambia: se pega o se
          escribe, y queda la acción con su disparador a la vista y los 3 pasos plegables (pedido de Jared). */}
      {onRutina && (
        <RutinaCard
          entry={rutina}
          onPaste={() => onRutina('pegar')}
          onWrite={() => onRutina('escribir')}
          onEdit={() => onRutina('escribir', rutina)}
          onToggle={() => onToggleRutina(rutina)}
        />
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

// El amanecer de la portada (el mismo del ícono): la constelación arriba a la derecha y el sol saliendo
// detrás de una loma. El cielo es el fondo de .hoy-cover; la loma de enfrente es del color de la página,
// así la portada no es una caja: se funde con el fondo. Colores en styles.css (--sky-*, --sun-*).
function Sunrise() {
  return (
    <div className="hoy-sky" aria-hidden="true">
      <svg className="hoy-stars" viewBox="0 0 140 48">
        <path d="M10 34 48 16 86 30 130 12" />
        <circle cx="10" cy="34" r="2.2" /><circle cx="48" cy="16" r="3" /><circle cx="86" cy="30" r="2.2" /><circle cx="130" cy="12" r="3" />
        <circle className="far" cx="26" cy="6" r="1" /><circle className="far" cx="112" cy="42" r="1" />
      </svg>
      <svg className="hoy-horizon" viewBox="0 0 390 150" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="hoy-halo"><stop offset="0" className="hoy-halo-a" /><stop offset="1" className="hoy-halo-b" /></radialGradient>
          <radialGradient id="hoy-sun"><stop offset="0" className="hoy-sun-a" /><stop offset=".55" className="hoy-sun-b" /><stop offset="1" className="hoy-sun-c" /></radialGradient>
        </defs>
        <ellipse className="hoy-glow" cx="195" cy="134" rx="175" ry="80" fill="url(#hoy-halo)" />
        <circle className="hoy-sun-disc" cx="195" cy="124" r="44" fill="url(#hoy-sun)" />
        <path className="hoy-hill" d="M0 120C70 100 140 112 195 118C260 125 320 100 390 110V150H0Z" />
        <path className="hoy-ground" d="M0 136C110 124 250 146 390 130V150H0Z" />
      </svg>
    </div>
  )
}

// De 19:00 a 06:00 la portada va de noche (data-night). Cambia sola si la app sigue abierta a esa hora
// o vuelve del fondo; los colores de noche están junto a .hoy-cover en styles.css.
export function useNight() {
  const [night, setNight] = useState(() => isNight())
  useEffect(() => {
    const check = () => setNight(isNight())
    const t = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check) }
  }, [])
  return night
}

// El versículo de hoy, grande y con letra de libro; la cita aparte, en azul y tocable (abre su hoja).
function Verse({ verse }) {
  const { text, cite } = splitVerse(verse)
  return (
    <div className={'hoy-verse' + (text.length > 140 ? ' long' : '')}>
      <p className="hoy-verse-text">{text}</p>
      {cite && <p className="hoy-verse-cite"><Refs text={cite} /></p>}
    </div>
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
