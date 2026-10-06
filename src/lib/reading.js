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
