import { mergeLeidos, mergePlan } from '../lib/reading.js'
// Racha, progreso y repaso inteligente (repetición espaciada tipo Leitner).
// Todo vive en una sola entrada `kind: 'progreso'` (id fijo), que se sincroniza como las demás.

export const PROGRESS_ID = 'progreso'

// Días que hay que esperar según la "caja" en la que está cada tarjeta o texto.
export const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60]

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  return todayISO(new Date(y, m - 1, d + n))
}

export function makeProgress() {
  return { id: PROGRESS_ID, kind: 'progreso', fields: { days: [], srs: {}, triviaBest: 0 }, createdAt: 0, updatedAt: 0 }
}

// Agrega hoy a los días con estudio (máximo ~1 año guardado).
export function withDay(fields, day = todayISO()) {
  const days = fields.days ?? []
  if (days.includes(day)) return fields
  return { ...fields, days: [...days, day].sort().slice(-400) }
}

// Racha actual (días seguidos hasta hoy, o hasta ayer si hoy aún no estudia) y la mejor.
export function streak(days, today = todayISO()) {
  const set = new Set(days)
  let start = set.has(today) ? today : addDays(today, -1)
  let current = 0
  while (set.has(start)) {
    current++
    start = addDays(start, -1)
  }
  let best = 0
  let run = 0
  let prev = null
  for (const d of [...set].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return { current, best: Math.max(best, current) }
}

// `knew`: true (lo sabías), false (fallaste) o 'help' (acertaste, pero con todas las pistas).
// - Lo que sabes sube de caja y se repasa cada vez más espaciado. Si aún no tocaba, se queda
//   igual: así no sube dos veces el mismo día ni por atinarle de suerte a algo ya repasado.
// - Lo que fallas vuelve hoy y baja 2 cajas (un error no borra todo lo que ya sabías).
// - Con todas las pistas no sube: vuelve mañana.
// `first` es el día en que se vio por primera vez (para contar las nuevas de hoy).
export function review(item, knew, today = todayISO()) {
  if (knew === true && item && !isDue(item, today)) return item
  const box = item?.box ?? 0
  const next =
    knew === true ? { box: Math.min(box + 1, INTERVALS.length - 1) } : knew === 'help' ? { box } : { box: Math.max(box - 2, 0) }
  next.due = addDays(today, knew === true ? INTERVALS[next.box] : knew === 'help' ? 1 : 0)
  const first = item ? item.first : today
  return first ? { ...next, first } : next
}

export function isDue(item, today = todayISO()) {
  return !item || item.due <= today
}

// Para repasar: lo que ya viste y hoy toca (lo nunca visto es "nuevo", no cuenta aquí).
export const isReview = (item, today = todayISO()) => !!item && item.due <= today

// Cuántas toca repasar hoy (solo lo que ya viste).
export function dueCount(keys, srs, today = todayISO()) {
  return keys.filter((k) => isReview(srs[k], today)).length
}

const isTime = (k) => k.endsWith('-tiempo')

// Une el progreso de dos dispositivos: todos los días de estudio, el repaso más reciente de cada cosa y el mejor récord.
export function mergeProgress(a = {}, b = {}) {
  const days = [...new Set([...(a.days ?? []), ...(b.days ?? [])])].sort().slice(-400)
  const srs = { ...(b.srs ?? {}) }
  for (const [k, v] of Object.entries(a.srs ?? {})) {
    if (!srs[k] || (v?.due ?? '') > (srs[k]?.due ?? '')) srs[k] = v
  }
  const best = { ...(b.best ?? {}) }
  // Los récords de tiempo (terminan en "-tiempo") se quedan con el menor; los demás con el mayor.
  for (const [k, v] of Object.entries(a.best ?? {})) best[k] = isTime(k) ? Math.min(v ?? Infinity, best[k] ?? Infinity) : Math.max(v ?? 0, best[k] ?? 0)
  // Reto del día: el del día más reciente; si es el mismo día, el mejor resultado.
  const da = a.daily
  const db = b.daily
  const daily = !da ? db : !db ? da : da.day !== db.day ? (da.day > db.day ? da : db) : (da.score >= db.score ? da : db)
  // Capítulos leídos de la Biblia: por capítulo gana el cambio más reciente.
  const leidos = a.leidos || b.leidos ? { leidos: mergeLeidos(a.leidos, b.leidos) } : {}
  // Meta de lectura: gana el cambio más reciente.
  const plan = mergePlan(a.plan, b.plan)
  const constancia = mergeConstancia(a.constancia, b.constancia)
  // Último día en que terminaste una ronda de Repasar hoy: el más reciente.
  // Juego de hoy: el día más reciente.
  const juegoHoy = [a.juegoHoy, b.juegoHoy].filter(Boolean).sort((x, y) => (x.day > y.day ? 1 : -1)).at(-1)
  const repaso = [a.repaso, b.repaso].filter(Boolean).sort().at(-1)
  return { ...b, ...a, days, srs, best, ...(repaso ? { repaso } : {}), ...(juegoHoy ? { juegoHoy } : {}), triviaBest: Math.max(a.triviaBest ?? 0, b.triviaBest ?? 0), ...(daily ? { daily } : {}), ...leidos, ...(plan ? { plan } : {}), ...(constancia ? { constancia } : {}) }
}

// Constancia: `{ start, best, at }`. Días desde `start` (el día en que empezó o volvió a empezar).
export function constanciaDays(c, today = todayISO()) {
  if (!c?.start) return 0
  const [y1, m1, d1] = c.start.split('-').map(Number)
  const [y2, m2, d2] = today.split('-').map(Number)
  return Math.max(0, Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000))
}

// Volver a empezar ahora: la racha que llevaba cuenta para la mejor. `startAt` es el instante exacto.
export function restartConstancia(c, today = todayISO(), now = Date.now()) {
  const best = Math.max(c?.best ?? 0, constanciaDays(c, today))
  return { start: today, startAt: now, best, at: now }
}

// Tiempo corrido desde el inicio, en horas, minutos y segundos. Sin `startAt`, desde la medianoche de `start`.
export function constanciaElapsed(c, now = Date.now()) {
  if (!c?.start) return { h: 0, m: 0, s: 0 }
  const [y, mo, d] = c.start.split('-').map(Number)
  const from = c.startAt ?? new Date(y, mo - 1, d).getTime()
  const total = Math.max(0, Math.floor((now - from) / 1000))
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
}

// Al sincronizar gana el cambio más reciente, y la mejor se queda con la mayor.
export function mergeConstancia(a, b) {
  if (!a || !b) return a ?? b
  const last = (a.at ?? 0) >= (b.at ?? 0) ? a : b
  return { ...last, best: Math.max(a.best ?? 0, b.best ?? 0) }
}
