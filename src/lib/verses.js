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
  const own = entries.find((e) => e.kind === 'biblia' && anyRefKey(e.fields.cita) === key && e.fields.texto?.trim())
  if (own) return { entry: own, texto: own.fields.texto, source: 'biblia' }
  if (key.startsWith('pub:')) return null
  const other = verseSources(entries).find((v) => v.fields.cita && refKey(v.fields.cita) === key && v.fields.texto?.trim())
  return other ? { entry: other, texto: other.fields.texto, source: other.kind === 'diario' || other.fromDaily ? 'diario' : 'memoria' } : null
}

export function makeBibleEntry(cita, texto) {
  const now = Date.now()
  return { id: newId(), kind: 'biblia', fields: { cita: cita.trim(), texto: texto.trim() }, createdAt: now, updatedAt: now }
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
