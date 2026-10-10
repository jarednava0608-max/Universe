// Pendientes y hábitos (antes la app Centro). Se guardan como entradas de Estudio
// (`kind: 'pendiente'` y `kind: 'habito'`), así se sincronizan igual que lo demás.
// Los avisos los manda la función `pendientes-push` de Supabase (misma regla que `fireAt` y `slotOn`).

export const TASK = 'pendiente'
export const HABIT = 'habito'

export const CATEGORIES = ['Universidad', 'Trabajo', 'Personal']
export const PRIORITIES = ['Alta', 'Media', 'Baja']
// Recordatorio: solo es un aviso; cuando pasa su hora ya cumplió y se va a Hechos.
export const TYPES = ['Tarea', 'Evento', 'Recordatorio']
export const REPEATS = [
  ['none', 'No se repite'],
  ['daily', 'Cada día'],
  ['weekly', 'Cada semana'],
  ['monthly', 'Cada mes'],
]
export const REMINDERS = [
  [null, 'Sin aviso'],
  [0, 'A la hora'],
  [15, '15 min antes'],
  [30, '30 min antes'],
  [60, '1 hora antes'],
  [120, '2 horas antes'],
  [1440, '1 día antes'],
  [10080, '1 semana antes'],
]
export const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// Quita emojis y espacios de sobra (la app no usa emojis).
export function cleanTitle(s) {
  return String(s ?? '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function makeTask(fields = {}) {
  const now = Date.now()
  return {
    id: uid('p'),
    kind: TASK,
    fields: { title: '', dueAt: null, category: 'Personal', priority: 'Media', type: 'Tarea', repeat: 'none', reminderMinutes: 0, notes: '', source: 'Universe', done: false, ...fields },
    createdAt: now,
    updatedAt: now,
  }
}

export function makeHabit(fields = {}) {
  const now = Date.now()
  return {
    id: uid('h'),
    kind: HABIT,
    fields: { title: '', goal: '', notes: '', slots: [{ days: [1, 2, 3, 4, 5], time: '07:00', label: '', biweekly: null }], log: {}, ...fields },
    createdAt: now,
    updatedAt: now,
  }
}

export function reminderLabel(min) {
  const hit = REMINDERS.find(([m]) => m === min)
  if (hit) return hit[1]
  if (min == null) return 'Sin aviso'
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
  return [d && `${d} ${d === 1 ? 'día' : 'días'}`, h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ') + ' antes'
}

// Cuándo suena el aviso de un pendiente (o null si no tiene).
export function fireAt(f) {
  if (!f?.dueAt || f.reminderMinutes == null || f.done) return null
  const t = new Date(f.dueAt).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t - Number(f.reminderMinutes) * 60000)
}

// Ya no cuenta como pendiente: hecho, o un recordatorio cuya hora ya pasó.
export function isFinished(f, now = new Date()) {
  if (f.done) return true
  return f.type === 'Recordatorio' && !!f.dueAt && new Date(f.dueAt) < now
}

// Fecha local 'YYYY-MM-DD'.
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Sin acentos ni mayúsculas, para buscar.
export function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// ¿Pasa el filtro de categoría y la búsqueda?
export function matches(e, { category = null, query = '' } = {}) {
  const f = e.fields
  if (category && (f.category || 'Personal') !== category) return false
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const text = norm(`${f.title} ${f.notes ?? ''} ${f.category ?? ''}`)
  return words.every((w) => text.includes(w))
}

// Agrupa los pendientes para la lista: Atrasados, Hoy, Mañana, Próximos 7 días, Después, Sin fecha y Hechos.
export function groupTasks(entries, now = new Date(), filter = {}) {
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)
  const after = addDays(today, 2)
  const week = addDays(today, 8)
  const groups = { atrasados: [], hoy: [], manana: [], semana: [], despues: [], sinFecha: [], hechos: [] }
  for (const e of entries) {
    if (e.kind !== TASK || !matches(e, filter)) continue
    const f = e.fields
    if (isFinished(f, now)) { groups.hechos.push(e); continue }
    if (!f.dueAt) { groups.sinFecha.push(e); continue }
    const t = new Date(f.dueAt)
    if (t < today) groups.atrasados.push(e)
    else if (t < tomorrow) groups.hoy.push(e)
    else if (t < after) groups.manana.push(e)
    else if (t < week) groups.semana.push(e)
    else groups.despues.push(e)
  }
  const byDue = (a, b) => new Date(a.fields.dueAt) - new Date(b.fields.dueAt)
  for (const k of ['atrasados', 'hoy', 'manana', 'semana', 'despues']) groups[k].sort(byDue)
  groups.sinFecha.sort((a, b) => b.createdAt - a.createdAt)
  const doneAt = (e) => e.fields.doneAt ?? (e.fields.dueAt ? new Date(e.fields.dueAt).getTime() : e.updatedAt)
  groups.hechos.sort((a, b) => doneAt(b) - doneAt(a))
  return groups
}

// Cuántos hay atrasados o para hoy (el puntito de la pestaña).
export function dueCount(entries, now = new Date()) {
  const g = groupTasks(entries, now)
  return g.atrasados.length + g.hoy.length
}

// Categorías en uso, en el orden de siempre (y las que vengan de otro lado al final).
export function categoriesIn(entries) {
  const used = new Set()
  for (const e of entries) if (e.kind === TASK) used.add(e.fields.category || 'Personal')
  return [...CATEGORIES.filter((c) => used.has(c)), ...[...used].filter((c) => !CATEGORIES.includes(c)).sort()]
}

// Al terminar un pendiente que se repite, el siguiente (con fecha después de ahora), o null.
export function nextOccurrence(entry, now = new Date()) {
  const f = entry.fields
  if (!f.dueAt || !f.repeat || f.repeat === 'none') return null
  const d = new Date(f.dueAt)
  const step = () => {
    if (f.repeat === 'daily') d.setDate(d.getDate() + 1)
    else if (f.repeat === 'weekly') d.setDate(d.getDate() + 7)
    else if (f.repeat === 'monthly') d.setMonth(d.getMonth() + 1)
    else return false
    return true
  }
  if (!step()) return null
  for (let i = 0; i < 400 && d <= now; i++) step()
  const { done, doneAt, ...rest } = f // eslint-disable-line no-unused-vars
  return makeTask({ ...rest, dueAt: d.toISOString(), done: false })
}

// ¿Le toca a este horario de hábito el día dado? (`biweekly`: cada 2 semanas desde esa fecha).
export function slotOn(slot, date) {
  if (!slot?.days?.includes(date.getDay())) return false
  if (!slot.biweekly) return true
  const [y, m, d] = slot.biweekly.split('-').map(Number)
  const diff = Math.round((startOfDay(date) - new Date(y, m - 1, d)) / 864e5)
  return ((Math.floor(diff / 7) % 2) + 2) % 2 === 0
}

// Hábitos que tocan hoy, con su primer horario del día, ordenados por hora.
export function habitsToday(entries, now = new Date()) {
  const key = dayKey(now)
  const list = []
  for (const e of entries) {
    if (e.kind !== HABIT || e.fields.active === false) continue
    const slots = (e.fields.slots ?? []).filter((s) => slotOn(s, now)).sort((a, b) => a.time.localeCompare(b.time))
    if (!slots.length) continue
    list.push({ entry: e, slot: slots[0], done: !!e.fields.log?.[key] })
  }
  return list.sort((a, b) => a.slot.time.localeCompare(b.slot.time))
}

export function toggleHabitDay(entry, now = new Date()) {
  const key = dayKey(now)
  const log = { ...(entry.fields.log ?? {}) }
  if (log[key]) delete log[key]
  else log[key] = true
  // Solo se guardan los últimos 120 días.
  const cut = dayKey(addDays(now, -120))
  for (const k of Object.keys(log)) if (k < cut) delete log[k]
  return { ...entry, fields: { ...entry.fields, log } }
}

// Días seguidos cumplidos (los días que no le tocan no rompen la racha; hoy sin palomear tampoco).
export function habitStreak(entry, now = new Date()) {
  const log = entry.fields.log ?? {}
  const slots = entry.fields.slots ?? []
  if (!slots.some((s) => s.days?.length)) return 0
  let n = 0
  let d = startOfDay(now)
  if (!log[dayKey(d)]) d = addDays(d, -1)
  for (let i = 0; i < 400; i++) {
    const has = slots.some((s) => slotOn(s, d))
    if (has && !log[dayKey(d)]) break
    if (has) n++
    d = addDays(d, -1)
  }
  return n
}

const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function timeLabel(d) {
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}
// "Hoy 3:00 pm", "Mañana 9:00 am", "vie 17 oct, 7:15 pm".
export function dueLabel(iso, now = new Date()) {
  if (!iso) return 'Sin fecha'
  const d = new Date(iso)
  const today = startOfDay(now)
  const diff = Math.round((startOfDay(d) - today) / 864e5)
  const t = timeLabel(d)
  if (diff === 0) return `Hoy ${t}`
  if (diff === 1) return `Mañana ${t}`
  if (diff === -1) return `Ayer ${t}`
  const year = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''
  return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}${year}, ${t}`
}

// Para los campos <input type="date"> y <input type="time">.
export function splitLocal(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  return { date: dayKey(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
}
export function joinLocal(date, time) {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = (time || '09:00').split(':').map(Number)
  return new Date(y, m - 1, d, h, mi).toISOString()
}

// Ajustes de Pendientes (una sola entrada). `avisos`: si la función de Supabase manda los avisos.
export const SETTINGS_ID = 'pendientes-ajustes'
export const SETTINGS = 'ajustes'
export function makeSettings() {
  return { id: SETTINGS_ID, kind: SETTINGS, fields: { avisos: false }, createdAt: 0, updatedAt: 0 }
}

// Pendientes, hábitos y sus ajustes no cuentan como día de estudio (racha).
export function isPlannerEntry(e) {
  return e?.kind === TASK || e?.kind === HABIT || e?.kind === SETTINGS
}
