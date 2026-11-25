// Rutina bíblica: la de cada mañana en su chat de Gemini «rutina bíblica» (1. oración y recuerdo activo con
// sus palabras, 2. mapa de 3 puntos con ganchos A/B/C y uno elegido, 3. cierre con una acción y su disparador).
// La oración va fija aparte, nunca como opción: las opciones del cierre son acciones concretas, nunca orar.
// Una por fecha (id `rutina-AAAA-MM-DD`); acompaña al Texto diario, no lo cambia. Sin IA en la app: el bloque
// JSON que entrega Gemini se lee aquí con código local y, si algo falta, se dice qué y no se guarda nada.

export const RUTINA = 'rutina'
export const LETRAS = ['A', 'B', 'C']
export const rutinaId = (fecha) => `${RUTINA}-${fecha}`

const str = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const keyOf = (k) => fold(k).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

// Rutina vacía para escribirla a mano (la oración fija se toma de la última, si hay).
export function emptyRutina(fecha, oracion = '') {
  return {
    fecha,
    cita: '',
    tema: '',
    recuerdo: '',
    puntos: [0, 1, 2].map(() => ({ titulo: '', ganchos: { A: '', B: '', C: '' }, elegido: '' })),
    cierre: { accion: '', disparador: '', hecha: false },
    oracion,
  }
}

// Lo escrito a mano, limpio: sin espacios de más y con la misma forma que lo pegado (conserva "hecha").
export function tidyRutina(f = {}) {
  return {
    fecha: str(f.fecha),
    cita: str(f.cita),
    tema: str(f.tema),
    recuerdo: str(f.recuerdo),
    puntos: (f.puntos ?? []).map((p) => ({
      titulo: str(p?.titulo),
      ganchos: { A: str(p?.ganchos?.A), B: str(p?.ganchos?.B), C: str(p?.ganchos?.C) },
      elegido: LETRAS.includes(p?.elegido) ? p.elegido : '',
    })),
    cierre: { accion: str(f.cierre?.accion), disparador: str(f.cierre?.disparador), ...(f.cierre?.opcion ? { opcion: f.cierre.opcion } : {}), hecha: !!f.cierre?.hecha },
    oracion: str(f.oracion),
  }
}

// La entrada que se guarda: la fecha es la clave (no se duplica); al reemplazar se conserva cuándo se creó.
export function makeRutina(fields, prev = null, now = Date.now()) {
  return { id: rutinaId(fields.fecha), kind: RUTINA, fields, createdAt: prev?.createdAt ?? now, updatedAt: now }
}

export const findRutina = (entries, fecha) => entries.find((e) => e.kind === RUTINA && e.fields?.fecha === fecha) ?? null

// La oración fija de la rutina más reciente, para no escribirla cada vez.
export function lastOracion(entries) {
  const list = entries.filter((e) => e.kind === RUTINA && str(e.fields?.oracion))
  list.sort((a, b) => String(b.fields.fecha).localeCompare(String(a.fields.fecha)))
  return list.length ? str(list[0].fields.oracion) : ''
}

// ¿Es orar? Regla de Jared: la acción (y las opciones A, B y C del cierre) son acciones concretas, nunca orar.
const PRAYER = / (orar|ora|oramos|orare|orando|oracion|oraciones|rezar|reza|rezo|rezando) | pedir(le)? a jehova | habla(r|rle)? (con|a) jehova /
export const isPrayer = (text) => PRAYER.test(` ${fold(text).replace(/[^a-z]+/g, ' ')} `)

const validDate = (iso) => {
  const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = new Date(y, mo - 1, d)
  return t.getFullYear() === y && t.getMonth() === mo - 1 && t.getDate() === d
}

// Lo primero que falta o está mal, en palabras (con el nombre del campo del bloque de Gemini); '' si está completa.
// Sirve igual para lo pegado y para lo escrito a mano. `opciones`: las A/B/C del cierre, si vinieron.
export function validateRutina(f, opciones = null) {
  if (!validDate(f?.fecha)) return 'La fecha debe ir como AAAA-MM-DD (por ejemplo, 2026-11-25).'
  if (!f.cita) return 'Falta el texto o cita base («texto»).'
  if (!f.recuerdo) return 'Falta el recuerdo activo («recuerdo_activo»): tus palabras explicando el texto.'
  if (!Array.isArray(f.puntos)) return 'Falta el mapa («mapa»): los 3 puntos clave.'
  if (f.puntos.length !== 3) return `El mapa debe tener 3 puntos (trae ${f.puntos.length}).`
  for (const [i, p] of f.puntos.entries()) {
    const n = i + 1
    if (!p.titulo) return `Punto ${n}: falta el título («titulo»).`
    if (!LETRAS.includes(p.elegido)) return `Punto ${n}: falta el gancho elegido («gancho_elegido»: A, B o C).`
    if (!p.ganchos?.[p.elegido]) return `Punto ${n}: el gancho elegido (${p.elegido}) está vacío.`
  }
  if (!f.cierre?.accion) return 'Falta la acción de hoy («cierre.accion»).'
  if (!f.cierre?.disparador) return 'Falta el disparador de la acción («cierre.disparador»).'
  if (isPrayer(f.cierre.accion)) return 'La acción no puede ser orar: la oración va fija aparte («oracion_fija»). Elige una acción concreta.'
  if (opciones) for (const L of LETRAS) if (isPrayer(opciones[L])) return `La opción ${L} del cierre es orar: las opciones A, B y C son acciones concretas (la oración va fija aparte).`
  if (!f.oracion) return 'Falta la oración fija del cierre («oracion_fija»).'
  return ''
}

// ---------- El bloque de Gemini ----------

// Primer campo que exista con alguno de esos nombres (sin importar mayúsculas, acentos ni espacios).
function pick(obj, ...names) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined
  const map = new Map(Object.entries(obj).map(([k, v]) => [keyOf(k), v]))
  for (const n of names) if (map.has(n)) return map.get(n)
  return undefined
}

// "A", "b", "Gancho C", "opción A" o 1/2/3 → "A" | "B" | "C" ('' si no se entiende).
function letra(v) {
  const t = keyOf(str(v))
  const m = t.match(/^(?:gancho_|opcion_)?([abc])$/) || t.match(/^(?:gancho_|opcion_)?([123])$/)
  if (!m) return ''
  return /[123]/.test(m[1]) ? LETRAS[Number(m[1]) - 1] : m[1].toUpperCase()
}

const ganchosOf = (v) => (Array.isArray(v)
  ? { A: str(v[0]), B: str(v[1]), C: str(v[2]) }
  : { A: str(pick(v, 'a', 'gancho_a')), B: str(pick(v, 'b', 'gancho_b')), C: str(pick(v, 'c', 'gancho_c')) })

// El objeto del bloque → los campos de la rutina (y las opciones del cierre, si vinieron, para revisarlas).
function fromData(d, today) {
  const mapa = pick(d, 'mapa', 'puntos', 'puntos_clave')
  const raw = pick(d, 'cierre')
  const cierre = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const opcionesRaw = pick(cierre, 'opciones')
  const opciones = opcionesRaw && typeof opcionesRaw === 'object' ? ganchosOf(opcionesRaw) : null
  const opcion = letra(pick(cierre, 'opcion', 'opcion_elegida', 'eleccion', 'elegida'))
  const accion = str(pick(cierre, 'accion')) || str(pick(d, 'accion')) || (opcion && opciones ? opciones[opcion] : '')
  const fields = {
    fecha: str(pick(d, 'fecha')) || today,
    cita: str(pick(d, 'texto', 'cita', 'texto_base', 'cita_base', 'versiculo')),
    tema: str(pick(d, 'tema', 'titulo')),
    recuerdo: str(pick(d, 'recuerdo_activo', 'recuerdoactivo', 'recuerdo')),
    puntos: Array.isArray(mapa)
      ? mapa.map((p) => ({
        titulo: str(pick(p, 'titulo', 'punto', 'nombre')),
        ganchos: ganchosOf(pick(p, 'ganchos')),
        elegido: letra(pick(p, 'gancho_elegido', 'elegido', 'eleccion', 'elegida')),
      }))
      : null,
    cierre: { accion, disparador: str(pick(cierre, 'disparador')) || str(pick(d, 'disparador')), ...(opcion ? { opcion } : {}), hecha: false },
    oracion: str(pick(d, 'oracion_fija', 'oracion')) || str(pick(cierre, 'oracion_fija', 'oracion')),
  }
  return { fields, opciones }
}

// Del texto pegado sale el bloque { … }: el de ```json … ``` si viene así, si no del primer { al último }
// (si se cortó y no cierra, se toma hasta el final y saldrá como roto).
function jsonBlock(t) {
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const s = fence && fence[1].includes('{') ? fence[1] : t
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  return a < 0 ? '' : s.slice(a, b > a ? b + 1 : undefined)
}

// En el iPhone a veces llegan comillas tipográficas, espacios duros o una coma de más: se intenta arreglar.
function parseLoose(s) {
  const fixed = s.replace(/[“”„‟]/g, '"').replace(/[‘’]/g, "'").replace(/ /g, ' ')
  for (const t of [s, fixed, fixed.replace(/,\s*([}\]])/g, '$1')]) {
    try {
      return JSON.parse(t)
    } catch {
      // se prueba la siguiente forma
    }
  }
  return undefined
}

// Lo que pegó Jared (la rutina en texto y el bloque final) → { ok: true, fields } o { ok: false, error }.
// Nunca a medias: si falta algo, se dice qué y no hay campos que guardar.
export function parseRutina(text, today) {
  const raw = String(text ?? '').trim()
  if (!raw) return { ok: false, error: 'No hay nada pegado. Copia el bloque final de tu chat «rutina bíblica».' }
  const block = jsonBlock(raw)
  if (!block) return { ok: false, error: 'No encontré el bloque { … } de la rutina. Copia el bloque final completo de Gemini.' }
  const data = parseLoose(block)
  if (data === undefined) return { ok: false, error: 'El bloque está roto (no es un JSON válido). Cópialo completo, desde { hasta }. No se guardó nada.' }
  const { fields, opciones } = fromData(data, today)
  const error = validateRutina(fields, opciones)
  return error ? { ok: false, error } : { ok: true, fields }
}

// ---------- Para mostrar y buscar ----------

export const rutinaTitle = (f = {}) => f.tema || f.cita || 'Rutina bíblica'
export const rutinaSub = (f = {}) => [f.tema ? f.cita : '', f.cierre?.hecha ? 'Acción hecha' : 'Acción pendiente'].filter(Boolean).join(' · ')

// Todo su texto, para buscar en el historial.
export function rutinaText(f = {}) {
  const puntos = (f.puntos ?? []).flatMap((p) => [p.titulo, ...LETRAS.map((L) => p.ganchos?.[L])])
  return [f.cita, f.tema, f.recuerdo, ...puntos, f.cierre?.accion, f.cierre?.disparador, f.oracion].filter(Boolean).join('\n')
}

// La instrucción para el chat «rutina bíblica» de Gemini (botón "Copiar formato para Gemini" y docs/estudio.md).
export const RUTINA_FORMAT = `Al terminar la rutina, escribe primero la rutina completa en texto normal. Al final, en un bloque aparte, escribe SOLO este JSON (sin comentarios) con lo que elegí:

{
  "fecha": "AAAA-MM-DD",
  "texto": "Cita base, por ejemplo Salmo 83:18",
  "tema": "Tema del día",
  "recuerdo_activo": "Lo que expliqué con mis palabras",
  "mapa": [
    { "titulo": "Punto 1", "ganchos": { "A": "…", "B": "…", "C": "…" }, "gancho_elegido": "A" },
    { "titulo": "Punto 2", "ganchos": { "A": "…", "B": "…", "C": "…" }, "gancho_elegido": "A" },
    { "titulo": "Punto 3", "ganchos": { "A": "…", "B": "…", "C": "…" }, "gancho_elegido": "A" }
  ],
  "cierre": { "opcion": "A", "accion": "La acción concreta de hoy", "disparador": "Cuándo la voy a hacer" },
  "oracion_fija": "La oración fija del cierre"
}

Las opciones A, B y C del cierre son acciones concretas, nunca orar; la oración va siempre aparte, en "oracion_fija".`
