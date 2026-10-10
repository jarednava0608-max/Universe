// Pendientes y hábitos (antes la app Centro). Se guardan como entradas de Estudio
// (`kind: 'pendiente'` y `kind: 'habito'`), así se sincronizan igual que lo demás.
// Los avisos los manda la función `pendientes-push` de Supabase con la misma lógica de abajo.

export const TASK = 'pendiente'
export const HABIT = 'habito'

export const CATEGORIES = ['Universidad', 'Trabajo', 'Personal']
export const PRIORITIES = ['Alta', 'Media', 'Baja']
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
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function makeTask(fields = {}) {
  const now = Date.now()
  return {
    id: uid('p'),
    kind: TASK,
    fields: { title: '', dueAt: null, category: 'Personal', priority: 'Media', reminderMinutes: 0, notes: '', source: 'Universe', done: false, ...fields },
    createdAt: now,
    updatedAt: now,
  }
}

export function makeHabit(fields = {}) {
  const now = Date.now()
  return {
    id: uid('h'),
    kind: HABIT,
    fields: { title: '', notes: '', slots: [{ days: [1, 2, 3, 4, 5], time: '07:00', label: '', biweekly: null }], log: {}, ...fields },
    createdAt: now,
    updatedAt: now,
  }
}

export function reminderLabel(min) {
  const hit = REMINDERS.find(([m]) => m === min)
  if (hit) return hit[1]
  if (min == null) return 'Sin aviso'
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
  return [d && `${d} d`, h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ') + ' antes'
}

// Cuándo suena el aviso de un pendiente (o null si no tiene).
export function fireAt(f) {
  if (!f?.dueAt || f.reminderMinutes == null || f.done) return null
  const t = new Date(f.dueAt).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t - Number(f.reminderMinutes) * 60000)
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

// Agrupa los pendientes para la lista: Atrasados, Hoy, Mañana, Próximos 7 días, Después, Sin fecha y Hechos.
export function groupTasks(entries, now = new Date()) {
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)
  const after = addDays(today, 2)
  const week = addDays(today, 8)
  const groups = { atrasados: [], hoy: [], manana: [], semana: [], despues: [], sinFecha: [], hechos: [] }
  for (const e of entries) {
    if (e.kind !== TASK) continue
    const f = e.fields
    if (f.done) { groups.hechos.push(e); continue }
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
  groups.hechos.sort((a, b) => (b.fields.doneAt ?? b.updatedAt) - (a.fields.doneAt ?? a.updatedAt))
  return groups
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
    if (e.kind !== HABIT) continue
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

export function habitStreak(entry, now = new Date()) {
  const log = entry.fields.log ?? {}
  let n = 0
  let d = startOfDay(now)
  if (!log[dayKey(d)]) d = addDays(d, -1)
  for (;;) {
    const has = (entry.fields.slots ?? []).some((s) => slotOn(s, d))
    if (has && !log[dayKey(d)]) break
    if (has) n++
    d = addDays(d, -1)
    if (n > 365 || now - d > 400 * 864e5) break
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
