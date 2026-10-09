// "Hoy" (arriba en Estudio): lo que toca hacer hoy según tu rutina, en orden, para que al abrir la app
// sepas qué sigue. Cada paso se marca solo cuando lo haces:
//   1. Texto diario (pegarlo y analizarlo).
//      Lectura de la Biblia, si te pusiste una meta (los capítulos que tocan hoy).
//   2. La Atalaya, desde 3 días antes de la reunión del fin de semana (cuántas preguntas llevas).
//   3. La reunión de entre semana, desde 2 días antes.
//      Tu asignación, desde 7 días antes (se marca hecha si ya la practicaste hoy).
//   4. Repasar hoy (lo que toca y las nuevas).
//   5. Reto del día.
import { clock, dailyMinimum, dailyVerse, partLabel, practicedOn } from './kinds.js'
import { answeredCount } from './atalaya.js'
import { addDays } from '../games/progress.js'
import { midweekCount } from './midweek.js'
import { BOOKS, findRefs } from '../lib/bible.js'
import { chaptersLabel, readingToday } from '../lib/reading.js'

export const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const ATALAYA_FROM = 3 // días antes de la reunión en que empieza a salir
const MIDWEEK_FROM = 2
const ASSIGNMENT_FROM = 7

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// La próxima vez que cae ese día de la semana (hoy cuenta): { iso, days } (days = cuántos faltan).
export function nextDay(weekday, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = (weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + days)
  return { iso: iso(d), days }
}

// La entrada de esa reunión: del mismo tipo y con fecha en la semana que termina ese día.
function meetingEntry(entries, midweek, day) {
  const from = addDays(day, -6)
  return entries
    .filter((e) => e.kind === 'reunion' && (e.fields.tipo === 'entresemana') === midweek)
    .filter((e) => e.fields.fecha >= from && e.fields.fecha <= day)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? null
}

const when = (days, weekday) => (days === 0 ? 'Hoy' : `El ${DAYS[weekday]}`)
const hasContent = (f) => ['idea', 'aplicacion', 'notas'].some((k) => String(f[k] ?? '').trim()) || (f.parrafos ?? []).some((p) => String(p.nota ?? '').trim()) || Object.values(f.respuestas ?? {}).some((v) => String(v ?? '').trim())

// meetings: { semana: 0-6, fin: 0-6 } (días de la semana, 0 = domingo) o null si aún no los eliges.
// review: { due, fresh } de Repasar hoy. challenge: el resultado del Reto del día de hoy o null.
// leidos / plan: capítulos leídos y la meta de lectura (del progreso).
export function todayPlan({ entries = [], review = { due: 0, fresh: 0 }, challenge = null, meetings = null, leidos = {}, plan = null, now = new Date() } = {}) {
  const day = iso(now)
  const items = []

  const diario = entries.find((e) => e.kind === 'diario' && e.fields.fecha === day)
  // Hecho con lo mínimo: Principio y Aplicación (Contexto y Relato suman, pero son opcionales).
  const analyzed = !!diario && dailyMinimum(diario.fields)
  const falta = diario ? ['principio', 'aplicacion'].filter((k) => !String(diario.fields[k] ?? '').trim()) : []
  items.push({
    key: 'diario',
    title: 'Texto diario',
    sub: !diario ? 'Pégalo y contesta 2 preguntas · unos 3 min'
      : analyzed ? diario.fields.resumen?.trim() || 'Lo de hoy, cumplido'
      : falta.length === 1 ? `Te falta: ${falta[0] === 'principio' ? 'Principio' : 'Aplicación'}`
      : 'Principio y Aplicación · unos 3 min',
    done: analyzed,
    verse: diario ? dailyVerse(diario.fields.texto) : '',
    entry: diario ?? null,
    create: diario ? null : { kind: 'diario', fields: { fecha: day } },
  })

  const lectura = readingToday(leidos, plan, now)
  if (lectura && !lectura.finished) {
    items.push({
      key: 'lectura',
      title: 'Lectura de la Biblia',
      sub: lectura.expired ? 'Tu meta ya pasó · Elige otra'
        : lectura.ok ? `Hecho: ${chaptersLabel(lectura.done, BOOKS)}`
        : chaptersLabel(lectura.next, BOOKS),
      done: lectura.ok,
      // El primer capítulo que toca (para abrirlo en el lector).
      ref: lectura.next[0] ? `${BOOKS[lectura.next[0][0] - 1]} ${lectura.next[0][1]}` : null,
    })
  }

  // Se prepara la reunión que sigue (en las mañanas): después de la de entre semana, La Atalaya, y al
  // revés. La otra solo sale si ya la empezaste y te falta.
  const finDays = meetings?.fin != null ? nextDay(meetings.fin, now).days : null
  const semDays = meetings?.semana != null ? nextDay(meetings.semana, now).days : null
  const nextIsFin = semDays == null || (finDays != null && finDays < semDays)

  if (meetings?.fin != null) {
    const { iso: date, days } = nextDay(meetings.fin, now)
    const e = meetingEntry(entries, false, date)
    const progress = e && String(e.fields.articulo ?? '').trim() ? answeredCount(e.fields) : null
    if ((semDays == null ? days <= ATALAYA_FROM : nextIsFin) || (e && progress && progress.done < progress.total)) {
      const ready = !!progress?.total && progress.done === progress.total
      items.push({
        key: 'atalaya',
        title: 'La Atalaya',
        sub: `${when(days, meetings.fin)} · ${ready ? 'Lista para la reunión' : progress?.total ? `${progress.done} de ${progress.total} respondidas` : e ? 'Pega el artículo' : 'Prepárala por pasos'}`,
        done: ready,
        entry: e,
        create: e ? null : { kind: 'reunion', fields: { tipo: 'atalaya', fecha: date } },
      })
    }
  }

  if (meetings?.semana != null) {
    const { iso: date, days } = nextDay(meetings.semana, now)
    const e = meetingEntry(entries, true, date)
    const started = e && String(e.fields.programa ?? '').trim() && midweekCount(e.fields).done > 0
    if ((finDays == null ? days <= MIDWEEK_FROM : !nextIsFin) || started) {
      // Con el programa pegado cuenta las preguntas; sin él, basta con haber escrito algo.
      const progress = e && String(e.fields.programa ?? '').trim() ? midweekCount(e.fields) : null
      const ready = progress?.total ? progress.done === progress.total : !!e && hasContent(e.fields)
      const state = ready ? 'Lista para la reunión'
        : progress?.total ? `${progress.done} de ${progress.total} contestadas`
        : e ? (String(e.fields.programa ?? '').trim() ? 'Sigue preparándola' : 'Pega el programa')
        : 'Prepárala'
      items.push({
        key: 'entresemana',
        title: 'Reunión de entre semana',
        sub: `${when(days, meetings.semana)} · ${state}`,
        done: ready,
        entry: e,
        create: e ? null : { kind: 'reunion', fields: { tipo: 'entresemana', fecha: date } },
      })
    }
  }

  // Tu asignación más cercana de esta semana: practicarla cada día hasta la reunión.
  const asignacion = entries
    .filter((e) => e.kind === 'asignacion' && e.fields.fecha >= day && e.fields.fecha <= addDays(day, ASSIGNMENT_FROM))
    .sort((a, b) => a.fields.fecha.localeCompare(b.fields.fecha))[0]
  if (asignacion) {
    const [y, m, d] = asignacion.fields.fecha.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const days = Math.round((date - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5)
    const hoy = practicedOn(asignacion.fields, day)
    items.push({
      key: 'asignacion',
      title: 'Tu asignación',
      sub: `${when(days, date.getDay())} · ${hoy.length ? `Practicada hoy (${clock(hoy.at(-1).secs)})` : `Practica: ${asignacion.fields.titulo || partLabel(asignacion.fields.parte)}`}`,
      done: hoy.length > 0,
      entry: asignacion,
    })
  }

  const n = Math.min(review.due + review.fresh, 8) // una ronda de Repasar hoy (SESSION en Review.jsx)
  items.push({
    key: 'repaso',
    title: 'Repasar hoy',
    sub: n ? `${n} ${n === 1 ? 'cosa' : 'cosas'} · unos ${Math.max(1, Math.ceil(n / 3))} min` : 'Al día',
    done: n === 0,
  })

  items.push({
    key: 'reto',
    title: 'Reto del día',
    sub: challenge ? `Hecho: ${challenge.score} de 5` : '5 preguntas · 1 min',
    done: !!challenge,
  })

  // Cada paso en su momento del día, como en tu calendario.
  const wd = now.getDay()
  const order = Object.fromEntries(MOMENTS.map((m, i) => [m.key, i]))
  for (const it of items) {
    it.moment = it.key === 'lectura' || it.key === 'reto' ? 'noche'
      : wd === 0 && (it.key === 'atalaya' || it.key === 'entresemana') ? 'tarde'
      : 'manana'
  }
  return items.sort((a, b) => order[a.moment] - order[b.moment])
}

// Los momentos de tu rutina (de tu calendario): entre semana sales a las 6:30 con el texto diario y
// la reunión; el fin de semana, texto diario a las 6:45; el domingo a las 3:00, estudio personal; y
// cada noche a las 9:00, lectura de la Biblia y oración. `from` = la hora en que empieza a contar.
export const MOMENTS = [
  { key: 'manana', title: 'Mañana', from: 0 },
  { key: 'tarde', title: 'Tarde', from: 15 },
  { key: 'noche', title: 'Noche', from: 18 },
]
export function momentLabel(key, now = new Date()) {
  const wd = now.getDay()
  if (key === 'manana') return wd >= 1 && wd <= 5 ? 'Mañana · 6:30 · camino a clase' : 'Mañana · 6:45'
  if (key === 'tarde') return 'Tarde · 3:00 · estudio personal'
  return 'Noche · 9:00 · antes de orar'
}

// Lo que sigue: el primer paso sin hacer de este momento del día o de uno anterior; si ya hiciste
// todo lo de ahora, el primero de más tarde (later: true). null si ya terminaste el día.
export function nextStep(items, now = new Date()) {
  const h = now.getHours()
  const started = new Set(MOMENTS.filter((m) => m.from <= h).map((m) => m.key))
  const pending = items.filter((it) => !it.done)
  const nowItem = pending.find((it) => !it.moment || started.has(it.moment))
  if (nowItem) return nowItem
  return pending[0] ? { ...pending[0], later: true } : null
}

// ¿Lo copiado parece el texto diario? (un texto con su cita entre paréntesis: "… (Heb. 10:1).").
export function looksLikeDailyText(text) {
  const t = String(text ?? '').trim()
  return t.length >= 20 && t.length <= 6000 && findRefs(t.slice(0, 600)).length > 0
}
