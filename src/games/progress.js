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

// Cosas nuevas por día en el repaso (lo demás es repasar lo que ya viste).
export const NEW_PER_DAY = 10
// Desde esta caja algo cuenta como "conocido": lo acertaste en dos días distintos.
export const KNOWN_BOX = 2
export const isKnown = (item) => (item?.box ?? 0) >= KNOWN_BOX

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

// Cosas nuevas que ya empezaste hoy (los personajes no cuentan: al repaso solo entran los ya vistos).
export function newToday(srs = {}, today = todayISO()) {
  return Object.entries(srs).filter(([k, s]) => s?.first === today && !k.startsWith('mb:')).length
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

// Cuántas toca repasar hoy (solo lo que ya viste).
export function dueCount(keys, srs, today = todayISO()) {
  return keys.filter((k) => isReview(srs[k], today)).length
}

export function nextDue(keys, srs) {
  const dates = keys.map((k) => srs[k]?.due).filter(Boolean).sort()
  return dates[0] ?? null
}

const isTime = (k) => k.endsWith('-tiempo')

// Récord de tiempo: se guarda solo si es más rápido que el anterior.
export function withBestTime(fields, key, secs) {
  const prev = fields.best?.[key]
  return prev == null || secs < prev ? { ...fields, best: { ...(fields.best ?? {}), [key]: secs } } : fields
}

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
  return { ...b, ...a, days, srs, best, triviaBest: Math.max(a.triviaBest ?? 0, b.triviaBest ?? 0), ...(daily ? { daily } : {}) }
}

// Guarda un récord solo si supera el anterior. Devuelve los campos nuevos (o los mismos).
export function withBest(fields, key, value) {
  const prev = fields.best?.[key] ?? 0
  return value > prev ? { ...fields, best: { ...(fields.best ?? {}), [key]: value } } : fields
}

// Logros calculados con lo que ya hay (no se guardan aparte).
export function achievements({ days = [], srs = {}, triviaBest = 0, best = {} } = {}, { nodes = 0, memorized = 0 } = {}) {
  const { best: bestStreak } = streak(days)
  const mastered = Object.values(srs).filter((s) => (s?.box ?? 0) >= 4).length
  const characters = Object.entries(srs).filter(([k, s]) => k.startsWith('mb:') && isKnown(s)).length
  const worldBest = Math.max(0, ...Object.keys(best).filter((k) => /^mb-w\d+$/.test(k)).map((k) => best[k]))
  const opened = 1 + [1, 2, 3, 4, 5, 6, 7].filter((w) => (best['mb-w' + w] ?? 0) >= 70).length
  // [id, título, descripción, lo que llevas, la meta]
  const list = [
    ['racha-3', 'Constante', '3 días seguidos estudiando', bestStreak, 3],
    ['racha-7', 'Una semana', '7 días seguidos estudiando', bestStreak, 7],
    ['racha-30', 'Un mes entero', '30 días seguidos estudiando', bestStreak, 30],
    ['dias-50', 'Estudiante fiel', '50 días de estudio en total', days.length, 50],
    ['texto-1', 'Primer texto', 'Memorizaste tu primer texto', memorized, 1],
    ['texto-10', 'Diez de memoria', '10 textos memorizados', memorized, 10],
    ['nodos-10', 'Mapa en marcha', '10 ideas en tu mapa', nodes, 10],
    ['nodos-50', 'Gran mapa', '50 ideas en tu mapa', nodes, 50],
    ['trivia-100', 'Ronda perfecta', '100 % en una ronda de trivia', triviaBest, 100],
    ['reloj-1500', 'Rápido y certero', '1500 puntos contra reloj', best['trivia-reloj'] ?? 0, 1500],
    ['libros-100', 'Conozco los libros', '100 % en Libros de la Biblia', best.libros ?? 0, 100],
    ['dominado-25', 'Bien sembrado', '25 cosas dominadas en el repaso', mastered, 25],
    ['mb-estrellas', 'Tres estrellas', '100 % en un mundo de Memoria Bíblica', worldBest, 100],
    ['mb-personajes', 'Medio camino', '64 personajes conocidos', characters, 64],
    ['mb-mundos', 'De Génesis a Hechos', 'Abriste los 8 mundos', opened, 8],
    ['reto-15', 'Contra el reloj', '15 aciertos en un reto de 60 segundos', Math.max(best['mb-reto'] ?? 0, best['libros-reto'] ?? 0), 15],
    ['sin-fallar-10', 'Sin un error', '10 seguidas en Trivia Sin fallar', best['trivia-racha'] ?? 0, 10],
    ['linea-5', 'Historiador', '5 líneas del tiempo perfectas seguidas', best['mb-linea'] ?? 0, 5],
  ]
  return list.map(([id, title, desc, have, need]) => ({ id, title, desc, done: have >= need, have: Math.min(have, need), need }))
}
