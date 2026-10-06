// Leer toda la Biblia: qué capítulos ya leíste. Vive en el progreso (`progreso.fields.leidos`,
// { 'libro:capítulo': { on, t } }) para que se sincronice entre teléfonos; al combinar gana el
// cambio más reciente de cada capítulo (así también se puede desmarcar).
import { VERSE_COUNTS } from './verseCounts.js'

export const TOTAL_CHAPTERS = VERSE_COUNTS.reduce((n, b) => n + b.length, 0) // 1189

// Abreviaturas como en la Biblia de JW Library (en el orden de BOOKS).
export const BOOK_ABBR = ['Gé', 'Éx', 'Le', 'Nú', 'Dt', 'Jos', 'Jue', 'Rut', '1Sa', '2Sa', '1Re', '2Re', '1Cr', '2Cr', 'Esd', 'Ne', 'Est', 'Job', 'Sl', 'Pr', 'Ec', 'Can', 'Is', 'Jer', 'Lam', 'Eze', 'Da', 'Os', 'Joe', 'Am', 'Abd', 'Jon', 'Miq', 'Na', 'Hab', 'Sof', 'Ag', 'Zac', 'Mal', 'Mt', 'Mr', 'Lu', 'Jn', 'Hch', 'Ro', '1Co', '2Co', 'Gál', 'Efe', 'Flp', 'Col', '1Te', '2Te', '1Ti', '2Ti', 'Tit', 'Flm', 'Heb', 'Snt', '1Pe', '2Pe', '1Jn', '2Jn', '3Jn', 'Jud', 'Ap']

export const chaptersOf = (book) => VERSE_COUNTS[book - 1]?.length ?? 0
const key = (book, chapter) => `${book}:${chapter}`

export const isRead = (leidos, book, chapter) => !!leidos?.[key(book, chapter)]?.on

// Devuelve los campos del progreso con ese capítulo marcado (o desmarcado).
export function withRead(fields = {}, book, chapter, on, t = Date.now()) {
  return { ...fields, leidos: { ...(fields.leidos ?? {}), [key(book, chapter)]: { on: !!on, t } } }
}

export function readCount(leidos) {
  return Object.values(leidos ?? {}).filter((x) => x?.on).length
}

export function bookRead(leidos, book) {
  const total = chaptersOf(book)
  let read = 0
  for (let c = 1; c <= total; c++) if (isRead(leidos, book, c)) read++
  return { read, total }
}

// Para combinar entre teléfonos: por capítulo gana el cambio más reciente.
export function mergeLeidos(a = {}, b = {}) {
  const out = { ...b }
  for (const [k, v] of Object.entries(a)) if (!out[k] || (v?.t ?? 0) >= (out[k]?.t ?? 0)) out[k] = v
  return out
}

// ---------- Plan de lectura con meta ----------
// Vive en el progreso (`progreso.fields.plan` = { start, end, t } o { off: true, t }) para que se
// sincronice; al combinar gana el cambio más reciente. Lo de cada día se calcula solo: los capítulos
// que faltan repartidos entre los días que quedan (si un día no lees, los siguientes se ajustan).
export const PLAN_LENGTHS = [[182, '6 meses'], [365, '1 año'], [730, '2 años']]

const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayNum = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 864e5)
}

export function makePlan(days, now = new Date(), t = Date.now()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days - 1)
  return { start: isoDay(now), end: isoDay(end), t }
}

export const hasPlan = (plan) => !!plan?.end && !plan.off

export function mergePlan(a, b) {
  if (!a) return b
  if (!b) return a
  return (a.t ?? 0) >= (b.t ?? 0) ? a : b
}

// Todos los capítulos en orden: [[libro, capítulo], …].
function* allChapters() {
  for (let b = 1; b <= 66; b++) for (let c = 1; c <= chaptersOf(b); c++) yield [b, c]
}

// Lo que toca hoy: { perDay, done: [[libro, cap]…] leídos hoy, next: los que faltan hoy, ok, finished, expired, end }.
export function readingToday(leidos = {}, plan, now = new Date()) {
  if (!hasPlan(plan)) return null
  const day = isoDay(now)
  const done = []
  for (const [b, c] of allChapters()) {
    const x = leidos[key(b, c)]
    if (x?.on && x.t && isoDay(new Date(x.t)) === day) done.push([b, c])
  }
  const total = readCount(leidos)
  const finished = total >= TOTAL_CHAPTERS
  const expired = !finished && day > plan.end
  const daysLeft = Math.max(1, dayNum(plan.end) - dayNum(day) + 1)
  const remaining = TOTAL_CHAPTERS - total + done.length
  const perDay = finished || expired ? 0 : Math.ceil(remaining / daysLeft)
  const need = Math.max(0, perDay - done.length)
  const next = []
  if (need) for (const [b, c] of allChapters()) {
    if (!isRead(leidos, b, c)) next.push([b, c])
    if (next.length >= need) break
  }
  return { perDay, done, next, ok: !expired && need === 0, finished, expired, end: plan.end }
}

// [[23, 12], [23, 13], [24, 1]] → "Isaías 12, 13 · Jeremías 1" (names = BOOKS).
export function chaptersLabel(list, names) {
  const parts = []
  let prev = null
  for (const [b, c] of list) {
    if (b === prev) parts[parts.length - 1] += `, ${c}`
    else parts.push(`${names[b - 1]} ${c}`)
    prev = b
  }
  return parts.join(' · ')
}
