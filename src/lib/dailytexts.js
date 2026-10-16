// El texto diario de todo el año, importado del EPUB "Examinemos las Escrituras todos los días" que el
// usuario baja de jw.org (es26 = 2026): se lee en el teléfono y se guarda solo ahí (IndexedDB,
// `meta.dailytexts`), igual que la Biblia (nwt.js); no se sube a la nube ni va dentro de la app publicada.
// Cada día se guarda tal como queda al copiarlo de JW Library ("Jueves 1 de enero", el versículo con su
// cita y el comentario), así el resto de la app (dailyVerse, dailyBody, el Texto diario) no cambia.
import { useSyncExternalStore } from 'react'
import { unzipSync, strFromU8 } from 'fflate'
import { getMeta, setMeta, delMeta } from './db.js'

// { 'AAAA-MM-DD': texto } o null si no se ha importado.
let days = null
let years = []
let version = 0
const listeners = new Set()

function set(next, ys = []) {
  days = next
  years = ys
  version++
  for (const l of listeners) l()
}

export const hasDailyTexts = () => !!days
export const dailyTextYears = () => years
export const dailyTextFor = (iso) => days?.[iso] ?? null

// Para volver a pintar cuando se carga o se importa.
export function useDailyTexts() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => version,
  )
}

export async function loadDailyTexts() {
  try {
    const saved = await getMeta('dailytexts')
    if (saved?.days) set(saved.days, saved.years ?? [])
  } catch {
    // sin IndexedDB: se sigue pegando el texto como antes
  }
}

// Lee el EPUB (ArrayBuffer), junta sus días con los que ya había (otro año) y los guarda en el teléfono.
// Devuelve { year, count } o null si el archivo no es el de los textos diarios.
export async function importDailyTexts(buffer) {
  const parsed = readDailyEpub(new Uint8Array(buffer))
  if (!parsed) return null
  const prev = (await getMeta('dailytexts')) ?? {}
  const merged = { ...(prev.days ?? {}), ...parsed.days }
  const ys = [...new Set([...(prev.years ?? []), parsed.year])].sort()
  await setMeta('dailytexts', { importedAt: Date.now(), years: ys, days: merged })
  set(merged, ys)
  return { year: parsed.year, count: Object.keys(parsed.days).length }
}

export async function removeDailyTexts() {
  await delMeta('dailytexts')
  set(null)
}

const DAY_FILE = /\.xhtml$/
const SKIP = /-extracted\.xhtml$/

export function readDailyEpub(bytes) {
  let files
  try {
    files = unzipSync(bytes, { filter: (f) => (DAY_FILE.test(f.name) && !SKIP.test(f.name)) || /content\.opf$/.test(f.name) })
  } catch {
    return null
  }
  const list = Object.entries(files).map(([name, data]) => [name, strFromU8(data)])
  const opf = list.find(([name]) => /content\.opf$/.test(name))?.[1] ?? ''
  return parseDailyTexts(list.filter(([name]) => DAY_FILE.test(name)).map(([, x]) => x), opf)
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// [xhtml de cada día], content.opf → { year, days: { 'AAAA-MM-DD': texto } } o null si no parece el folleto.
// El año sale del título ("Examinemos 2026 (es26-S)").
export function parseDailyTexts(pages, opf = '') {
  const title = (String(opf).match(/<dc:title[^>]*>([^<]*)</) ?? [])[1] ?? ''
  const year = Number((title.match(/\b(20\d\d)\b/) ?? [])[1])
  if (!year) return null
  const out = {}
  for (const xhtml of pages) {
    const day = parseDay(xhtml, year)
    if (day) out[day.iso] = day.texto
  }
  return Object.keys(out).length >= 300 ? { year, days: out } : null
}

// Un día: el renglón de la fecha (h2), el texto del día (themeScrp) y el comentario (los párrafos de bodyTxt).
function parseDay(xhtml, year) {
  const s = String(xhtml)
  const h2 = s.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)
  const verse = s.match(/<p\b[^>]*class="themeScrp"[^>]*>([\s\S]*?)<\/p>/)
  if (!h2 || !verse) return null
  // El renglón de la fecha puede traer algo antes ("FECHA DE LA CONMEMORACIÓN (tras la puesta del sol)"):
  // la fecha queda sola en el primer renglón y eso va al final del comentario.
  const head = clean(h2[1].replace(/<br\s*\/?>|<\/(p|span|div)>/g, ' '))
  const at = fold(head).search(/((lunes|martes|miercoles|jueves|viernes|sabado|domingo),?\s+)?\d{1,2}\s+de\s+[a-z]+/)
  if (at < 0) return null
  const fecha = head.slice(at).trim()
  const nota = head.slice(0, at).replace(/\s*\(/g, ' (').trim()
  const m = fold(fecha).match(/(\d{1,2})\s+de\s+([a-z]+)/)
  const month = m[2] === 'setiembre' ? 8 : MONTHS.indexOf(m[2])
  if (month < 0) return null
  const body = (s.match(/<div class="bodyTxt">([\s\S]*?)<\/div>/) ?? [])[1] ?? ''
  const parrafos = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((x) => clean(x[1])).filter(Boolean)
  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`
  if (nota) parrafos.push(nota)
  return { iso, texto: [fecha, clean(verse[1]), '', ...parrafos.flatMap((p, i) => (i ? ['', p] : [p]))].join('\n') }
}

function clean(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

// Solo para pruebas.
export const _setDailyTexts = set
