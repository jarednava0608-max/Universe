// "Mi Biblia": los textos bíblicos que el usuario pega (no se descarga la Biblia completa).
// Se guardan como entradas `kind: 'biblia'` ({ cita, texto }) y se sincronizan como las demás.
import { parseRef, refUrl, findRefs } from './bible.js'
import { findPubs, isPubRef, pubUrl } from './pubs.js'
import { newId } from './model.js'
import { verseSources } from '../games/logic.js'

// Clave para comparar citas escritas de formas distintas ("Sal. 83:18" = "Salmo 83:18").
export function refKey(ref) {
  const r = parseRef(ref)
  if (!r) return null
  const spec = String(ref).split(':')[1]?.replace(/\s+/g, '').replace(/–/g, '-').replace(/\.$/, '')
  return spec ? `${r.book}:${r.chapter}:${spec}` : `${r.book}:${r.chapter}`
}

// Clave de cualquier referencia: cita bíblica o publicación ("Seamos valientes, cap. 3").
export function anyRefKey(ref) {
  const k = refKey(ref)
  if (k) return k
  return isPubRef(ref) ? 'pub:' + String(ref).toLowerCase().replace(/[«»“”"]/g, '').replace(/\s+/g, ' ').trim() : null
}

// Citas bíblicas y referencias a publicaciones de un texto.
export function findAllRefs(...texts) {
  return [...findRefs(...texts), ...findPubs(...texts)]
}

export const isPub = (ref) => !parseRef(ref) && isPubRef(ref)

// Dónde abrir una referencia fuera de la app.
export function anyRefUrl(ref) {
  return isPub(ref) ? pubUrl(ref) : refUrl(ref)
}

// Texto guardado para una cita (o un párrafo de una publicación): primero lo guardado aquí,
// luego (solo citas bíblicas) Memorizar textos y el Texto diario.
export function findSavedVerse(entries, ref) {
  const key = anyRefKey(ref)
  if (!key) return null
  const exact = findExact(entries, key)
  if (exact || key.startsWith('pub:')) return exact
  return joinVerses(entries, ref)
}

// "Jeremías 38:7-9", "Mateo 6:9, 10" o el capítulo entero ("Jeremías 39"): se arma con los
// versículos guardados uno por uno (cada uno con su número).
function joinVerses(entries, ref) {
  const r = parseRef(ref)
  if (!r) return null
  const spec = String(ref).split(':')[1]
  let nums
  if (spec) {
    nums = []
    for (const part of spec.split(',')) {
      const [a, b] = part.split(/[-–]/).map((x) => parseInt(x, 10))
      if (!a) continue
      for (let v = a; v <= (b || a); v++) nums.push(v)
    }
    if (nums.length < 2) return null
  } else {
    nums = Array.from({ length: 176 }, (_, i) => i + 1)
  }
  // Índice de lo guardado (una sola pasada, para no buscar 176 veces).
  const index = new Map()
  for (const v of verseSources(entries)) if (v.fields.cita && v.fields.texto?.trim()) index.set(refKey(v.fields.cita), v.fields.texto)
  for (const e of entries) if (e.kind === 'biblia' && e.fields.texto?.trim()) index.set(anyRefKey(e.fields.cita), e.fields.texto)
  const parts = []
  for (const v of nums) {
    const texto = index.get(`${r.book}:${r.chapter}:${v}`)
    if (texto) parts.push(`${v} ${texto.trim()}`)
    else if (spec) return null // falta un versículo del rango: mejor no mostrar algo incompleto
  }
  if (!parts.length) return null
  return { entry: null, texto: parts.join('\n'), source: spec ? 'versos' : 'capitulo' }
}

function findExact(entries, key) {
  const own = entries.find((e) => e.kind === 'biblia' && anyRefKey(e.fields.cita) === key && e.fields.texto?.trim())
  if (own) return { entry: own, texto: own.fields.texto, source: 'biblia' }
  if (key.startsWith('pub:')) return null
  const other = verseSources(entries).find((v) => v.fields.cita && refKey(v.fields.cita) === key && v.fields.texto?.trim())
  return other ? { entry: other, texto: other.fields.texto, source: other.kind === 'diario' || other.fromDaily ? 'diario' : 'memoria' } : null
}

// Texto copiado de JW Library o wol: quita las marcas de notas al pie (+ y *) y los espacios que dejan.
export function cleanVerseText(s) {
  return String(s ?? '')
    .replace(/[+*]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,.;:!?”’)])/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .trim()
}

// Un capítulo entero pegado de JW Library ("Daniel\n2 En el segundo año… 2 Así que…") en versículos:
// el número del capítulo ocupa el lugar del versículo 1 y los demás números van en orden.
// Devuelve [{ v, texto }] o null si no se encuentran al menos 2 versículos.
export function splitChapter(text, chapter) {
  let s = cleanVerseText(text)
  const lines = s.split('\n')
  if (lines.length > 1 && !/\d\s+\S/.test(lines[0].replace(/^\d\s+/, '')) && lines[0].length < 40) s = lines.slice(1).join('\n') // renglón del libro
  s = s.trim()
  const lead = s.match(/^(\d{1,3})\s+(?=\D)/)
  if (lead && (Number(lead[1]) === chapter || lead[1] === '1')) s = s.slice(lead[0].length)
  const out = []
  let v = 1
  let start = 0
  for (;;) {
    const re = new RegExp(`(^|[\\s“”"(])${v + 1}(?:\\s+(?=\\D)|(?=[”“"]))`, 'g')
    re.lastIndex = start
    const m = re.exec(s)
    out.push({ v, texto: s.slice(start, m ? m.index : s.length).replace(/\s+/g, ' ').trim() })
    if (!m) break
    start = m.index + m[0].length
    v++
  }
  const verses = out.filter((x) => x.texto)
  return verses.length >= 2 ? verses : null
}

export function makeBibleEntry(cita, texto) {
  const now = Date.now()
  return { id: newId(), kind: 'biblia', fields: { cita: cita.trim(), texto: cleanVerseText(texto) }, createdAt: now, updatedAt: now }
}

// Enlace que abre la cita en JW Library si está instalada (si no, en jw.org).
export function jwLibraryUrl(ref) {
  const r = parseRef(ref)
  if (!r) return refUrl(ref)
  const code = (v) => String(r.book).padStart(2, '0') + String(r.chapter).padStart(3, '0') + String(v).padStart(3, '0')
  const nums = (String(ref).split(':')[1] ?? '').match(/\d+/g)?.map(Number) ?? []
  const first = nums[0] ?? 1
  const last = nums.at(-1) ?? first
  const bible = last > first ? `${code(first)}-${code(last)}` : code(first)
  return `https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&bible=${bible}&pub=nwtsty`
}

// Pedir que se abra la hoja de una cita desde cualquier parte de la app.
export const OPEN_REF = 'universe:open-ref'
export function openRef(ref) {
  window.dispatchEvent(new CustomEvent(OPEN_REF, { detail: ref }))
}
