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

// Los últimos 7 días (para dibujar la semana).
export function lastWeek(days, today = todayISO()) {
  const set = new Set(days)
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6)
    return { day: d, done: set.has(d) }
  })
}

// ---------- Repaso inteligente ----------

// Lo que sabes sube de caja (se repasa cada vez más espaciado); lo que fallas vuelve al inicio.
export function review(item, knew, today = todayISO()) {
  const box = knew ? Math.min((item?.box ?? 0) + 1, INTERVALS.length - 1) : 0
  return { box, due: addDays(today, knew ? INTERVALS[box] : 0) }
}

export function isDue(item, today = todayISO()) {
  return !item || item.due <= today
}

// Ordena para repasar: primero lo vencido (lo más atrasado y lo nuevo), luego el resto.
export function byPriority(keys, srs, today = todayISO(), rnd = Math.random) {
  const withKey = keys.map((k) => ({ k, s: srs[k], r: rnd() }))
  return withKey
    .sort((a, b) => {
      const da = isDue(a.s, today)
      const db = isDue(b.s, today)
      if (da !== db) return da ? -1 : 1
      const ua = a.s?.due ?? ''
      const ub = b.s?.due ?? ''
      return ua === ub ? a.r - b.r : ua < ub ? -1 : 1
    })
    .map((x) => x.k)
}

export function dueCount(keys, srs, today = todayISO()) {
  return keys.filter((k) => isDue(srs[k], today)).length
}

export function nextDue(keys, srs) {
  const dates = keys.map((k) => srs[k]?.due).filter(Boolean).sort()
  return dates[0] ?? null
}

// Une el progreso de dos dispositivos: todos los días de estudio, el repaso más reciente de cada cosa y el mejor récord.
export function mergeProgress(a = {}, b = {}) {
  const days = [...new Set([...(a.days ?? []), ...(b.days ?? [])])].sort().slice(-400)
  const srs = { ...(b.srs ?? {}) }
  for (const [k, v] of Object.entries(a.srs ?? {})) {
    if (!srs[k] || (v?.due ?? '') > (srs[k]?.due ?? '')) srs[k] = v
  }
  return { ...b, ...a, days, srs, triviaBest: Math.max(a.triviaBest ?? 0, b.triviaBest ?? 0) }
}
