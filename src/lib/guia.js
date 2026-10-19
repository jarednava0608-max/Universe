// La Guía de actividades (reunión Vida y Ministerio Cristianos) importada del EPUB que el usuario baja
// de jw.org (mwb_S_202609.epub): cada número trae unas 8 semanas. Se lee en el teléfono y se guarda
// solo ahí (IndexedDB, `meta.guias`), igual que La Atalaya (watchtower.js); no va al repositorio.
// Cada semana se guarda como texto en el mismo formato que se copia de JW Library (la semana, la
// lectura, las secciones, "1. Parte", "(10 mins.)", "Respuesta" bajo cada pregunta), así
// `parseProgram` (midweek.js) no cambia: la semana se pone sola como si la hubieras pegado.
import { useSyncExternalStore } from 'react'
import { unzipSync, strFromU8 } from 'fflate'
import { getMeta, setMeta, delMeta } from './db.js'
import { parseProgram, programMonday, programTitle } from '../study/midweek.js'

// { [lunes AAAA-MM-DD]: { semana, titulo, texto } }
let weeks = null
let version = 0
const listeners = new Set()

function set(next) {
  weeks = next
  version++
  for (const l of listeners) l()
}

export const hasGuia = () => !!weeks && Object.keys(weeks).length > 0

// La semana de esa fecha (la reunión de entre semana cae en su semana, de lunes a domingo).
export function guiaFor(iso) {
  if (!iso || !weeks) return null
  const monday = Object.keys(weeks).filter((m) => m <= iso && iso < addDays(m, 7)).sort().at(-1)
  return monday ? { lunes: monday, ...weeks[monday] } : null
}

// "septiembre a noviembre de 2026": del primer al último mes importado, para avisar qué hay.
export function guiaRange() {
  const list = Object.keys(weeks ?? {}).sort()
  if (!list.length) return ''
  const name = (iso) => MONTHS[Number(iso.slice(5, 7)) - 1]
  const last = addDays(list.at(-1), 6)
  const [a, b] = [name(list[0]), name(last)]
  return `${a === b ? a : `${a} a ${b}`} de ${last.slice(0, 4)}`
}

export function useGuia() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => version,
  )
}

export async function loadGuia() {
  try {
    const saved = await getMeta('guias')
    if (saved?.weeks) set(saved.weeks)
  } catch {
    // sin IndexedDB: se sigue pegando el programa como antes
  }
}

// Lee el EPUB (ArrayBuffer), lo junta con las semanas que ya había y lo guarda en el teléfono.
// Devuelve { titulo, count } o null si el archivo no es la Guía de actividades.
export async function importGuia(buffer) {
  const parsed = readGuiaEpub(new Uint8Array(buffer))
  if (!parsed) return null
  const prev = (await getMeta('guias'))?.weeks ?? {}
  const merged = { ...prev, ...parsed.weeks }
  await setMeta('guias', { importedAt: Date.now(), weeks: merged })
  set(merged)
  return { titulo: parsed.titulo, count: Object.keys(parsed.weeks).length }
}

export async function removeGuia() {
  await delMeta('guias')
  set(null)
}

export function readGuiaEpub(bytes) {
  let files
  try {
    files = unzipSync(bytes, { filter: (f) => (/\.x?html$/.test(f.name) && !/-extracted\.xhtml$/.test(f.name)) || /content\.opf$/.test(f.name) })
  } catch {
    return null
  }
  const list = Object.entries(files).map(([name, data]) => [name, strFromU8(data)])
  const opf = list.find(([name]) => /content\.opf$/.test(name))?.[1] ?? ''
  const pages = list.filter(([name]) => /\.x?html$/.test(name))
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([, x]) => x)
  return parseGuia(pages, opf)
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// [xhtml de cada semana], content.opf → { titulo, weeks } o null si no trae ninguna semana.
export function parseGuia(pages, opf = '') {
  const title = clean((String(opf).match(/<dc:title[^>]*>([^<]*)</) ?? [])[1] ?? '')
  // El año sale del título ("septiembre y octubre de 2026"); sin él, del más cercano a hoy.
  const t = fold(title).match(new RegExp(`(${MONTHS.join('|')})\\s+de\\s+(20\\d\\d)`))
  const ref = t ? `${t[2]}-${String(MONTHS.indexOf(t[1]) + 1).padStart(2, '0')}-15` : undefined
  const out = {}
  for (const page of pages) {
    const texto = toProgram(page)
    const prog = parseProgram(texto)
    if (!prog.semana || !prog.partes.length) continue
    const lunes = programMonday(prog.semana, ref)
    if (lunes) out[lunes] = { semana: prog.semana, titulo: programTitle(prog), texto }
  }
  if (!Object.keys(out).length) return null
  return { titulo: title.replace(/^gu[ií]a de actividades,?\s*/i, '') || 'Guía de actividades', weeks: out }
}

// Una semana en XHTML → renglones como los copia JW Library: cada encabezado, párrafo o elemento
// de lista en su renglón y "Respuesta" bajo cada pregunta; sin los textos bíblicos que el EPUB pone
// al final de la página, ni imágenes ni números de página.
export function toProgram(xhtml) {
  let s = String(xhtml)
  s = (s.match(/<body\b[^>]*>([\s\S]*)<\/body>/) ?? [])[1] ?? s
  s = s.split(/<div\b[^>]*class="(?:groupExt|groupFootnote)\b/)[0]
  s = s
    .replace(/<(nav|script|style|figure)\b[\s\S]*?<\/\1>/g, '')
    .replace(/<aside\b[\s\S]*?<\/aside>/g, '')
    .replace(/<span\b[^>]*class="pageNum\b[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<(textarea|input)\b[^>]*(?:\/>|>[\s\S]*?<\/textarea>)/g, '')
    .replace(/<img\b[^>]*>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/(h[1-6]|p|li|div|label|header|figcaption|section)>/g, '\n')
  return s.split('\n').map(clean).filter(Boolean).join('\n')
}

function clean(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim()
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Solo para pruebas.
export const _setGuia = set
