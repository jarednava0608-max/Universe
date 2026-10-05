// "Hoy" (arriba en Estudio): lo que toca hacer hoy según tu rutina, en orden, para que al abrir la app
// sepas qué sigue. Cada paso se marca solo cuando lo haces:
//   1. Texto diario (pegarlo y analizarlo).
//   2. La Atalaya, desde 3 días antes de la reunión del fin de semana (cuántas preguntas llevas).
//   3. La reunión de entre semana, desde 2 días antes.
//   4. Repasar hoy (lo que toca y las nuevas).
//   5. Reto del día.
import { dailyAnalyzed, dailyVerse } from './kinds.js'
import { answeredCount } from './atalaya.js'
import { addDays } from '../games/progress.js'

export const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const ATALAYA_FROM = 3 // días antes de la reunión en que empieza a salir
const MIDWEEK_FROM = 2

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

const when = (days, weekday) => (days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `El ${DAYS[weekday]}`)
const hasContent = (f) => ['idea', 'aplicacion', 'notas'].some((k) => String(f[k] ?? '').trim()) || (f.parrafos ?? []).some((p) => String(p.nota ?? '').trim())

// meetings: { semana: 0-6, fin: 0-6 } (días de la semana, 0 = domingo) o null si aún no los eliges.
// review: { due, fresh } de Repasar hoy. challenge: el resultado del Reto del día de hoy o null.
export function todayPlan({ entries = [], review = { due: 0, fresh: 0 }, challenge = null, meetings = null, now = new Date() } = {}) {
  const day = iso(now)
  const items = []

  const diario = entries.find((e) => e.kind === 'diario' && e.fields.fecha === day)
  const analyzed = !!diario && dailyAnalyzed(diario.fields)
  items.push({
    key: 'diario',
    title: 'Texto diario',
    sub: !diario ? 'Pégalo y analízalo' : analyzed ? diario.fields.resumen?.trim() || 'Analizado' : 'Falta analizarlo',
    done: analyzed,
    verse: diario ? dailyVerse(diario.fields.texto) : '',
    entry: diario ?? null,
    create: diario ? null : { kind: 'diario', fields: { fecha: day } },
  })

  if (meetings?.fin != null) {
    const { iso: date, days } = nextDay(meetings.fin, now)
    const e = meetingEntry(entries, false, date)
    const progress = e && String(e.fields.articulo ?? '').trim() ? answeredCount(e.fields) : null
    if (days <= ATALAYA_FROM || (e && progress && progress.done < progress.total)) {
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
    if (days <= MIDWEEK_FROM) {
      const e = meetingEntry(entries, true, date)
      const ready = !!e && hasContent(e.fields)
      items.push({
        key: 'entresemana',
        title: 'Reunión de entre semana',
        sub: `${when(days, meetings.semana)} · ${ready ? 'Preparada' : e ? 'Sigue preparándola' : 'Prepárala'}`,
        done: ready,
        entry: e,
        create: e ? null : { kind: 'reunion', fields: { tipo: 'entresemana', fecha: date } },
      })
    }
  }

  const n = Math.min(review.due + review.fresh, 20)
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

  return items
}
