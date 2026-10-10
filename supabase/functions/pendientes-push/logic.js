// Reglas de los avisos de Pendientes. Son las mismas de la app (src/tasks/tasks.js: fireAt, slotOn),
// pero aquí la hora local sale de la zona horaria del teléfono (`tz` de universe_push).
// Sin dependencias: lo usan la función de Supabase (Deno) y las pruebas.

// Si un aviso se atrasó más de esto (la función no corrió), ya no se manda.
export const WINDOW_MIN = 60

const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Fecha y hora locales de `date` en la zona `tz`: { day: 'YYYY-MM-DD', dow, min (minutos desde medianoche), h, m }.
export function localParts(date, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  )
  const h = Number(p.hour), m = Number(p.minute)
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  return { day: `${p.year}-${p.month}-${p.day}`, dow, h, m, min: h * 60 + m }
}

const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m }
const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5 }

export function cleanTitle(s) {
  return String(s ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/\s+/g, ' ').trim()
}

// Cuándo suena el aviso de un pendiente (o null).
export function fireAt(f) {
  if (!f?.dueAt || f.reminderMinutes == null || f.done) return null
  const t = new Date(f.dueAt).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t - Number(f.reminderMinutes) * 60000)
}

// ¿Le toca al horario de un hábito el día local `day` (con día de la semana `dow`)?
export function slotOnDay(slot, day, dow) {
  if (!slot?.days?.includes(dow)) return false
  if (!slot.biweekly) return true
  const diff = dayNum(day) - dayNum(slot.biweekly)
  return ((Math.floor(diff / 7) % 2) + 2) % 2 === 0
}

// Avisos que tocan ahora: [{ key, kind: 'pendiente' | 'habito', entry, slot?, at }].
// `key` es única por aviso (si cambias la hora de un pendiente, la llave cambia y vuelve a sonar).
export function dueAlerts(entries, now, tz) {
  const out = []
  const local = localParts(now, tz)
  for (const e of entries) {
    const f = e.fields ?? {}
    if (e.kind === 'pendiente') {
      const at = fireAt(f)
      if (!at) continue
      const late = (now - at) / 60000
      if (late >= 0 && late < WINDOW_MIN) out.push({ key: `p:${e.id}:${at.toISOString()}`, kind: 'pendiente', entry: e, at })
    } else if (e.kind === 'habito') {
      if (f.active === false) continue
      for (const slot of f.slots ?? []) {
        if (!slot?.time || !slotOnDay(slot, local.day, local.dow)) continue
        const late = local.min - toMin(slot.time)
        if (late >= 0 && late < WINDOW_MIN) out.push({ key: `h:${e.id}:${local.day}:${slot.time}`, kind: 'habito', entry: e, slot, at: now })
      }
    }
  }
  return out
}

function clock(h, m) {
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

// "hoy 3:00 pm", "mañana 9:00 am", "vie 17 oct, 7:15 pm" (en la zona del teléfono).
export function whenLabel(iso, now, tz) {
  const d = localParts(new Date(iso), tz)
  const n = localParts(now, tz)
  const diff = dayNum(d.day) - dayNum(n.day)
  const t = clock(d.h, d.m)
  if (diff === 0) return `hoy ${t}`
  if (diff === 1) return `mañana ${t}`
  const [, mo, da] = d.day.split('-').map(Number)
  return `${WD[d.dow]} ${da} ${MO[mo - 1]}, ${t}`
}

const firstLine = (s) => String(s ?? '').split('\n').map((x) => x.trim()).find(Boolean) ?? ''
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

// Lo que dice la notificación. Al tocarla abre la pestaña Pendientes.
export function payloadFor(alert, now, tz) {
  const f = alert.entry.fields ?? {}
  if (alert.kind === 'habito') {
    const title = cleanTitle(alert.slot.label) || cleanTitle(f.title) || 'Hábito'
    const [h, m] = alert.slot.time.split(':').map(Number)
    return { title, body: cut(['Hábito de las ' + clock(h, m), cleanTitle(f.goal)].filter(Boolean).join(' · '), 160), tag: `h-${alert.entry.id}`, tab: 'pendientes' }
  }
  const title = cleanTitle(f.title) || 'Pendiente'
  const note = cut(firstLine(f.notes), 100)
  let body
  if (f.type === 'Recordatorio') body = note || f.category || 'Recordatorio'
  else {
    const when = whenLabel(f.dueAt, now, tz)
    const lead = f.type === 'Evento' ? `Es ${when}` : Number(f.reminderMinutes) === 0 ? `Es ${when}` : `Vence ${when}`
    body = [lead, note].filter(Boolean).join(' · ')
  }
  return { title, body: cut(body, 160), tag: `p-${alert.entry.id}`, tab: 'pendientes' }
}
