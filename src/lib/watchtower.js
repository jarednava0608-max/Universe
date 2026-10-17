// La Atalaya (edición de estudio) importada del EPUB que el usuario baja de jw.org (w_S_202608.epub):
// cada número trae 4 o 5 artículos de estudio. Se lee en el teléfono y se guarda solo ahí (IndexedDB,
// `meta.revistas`), igual que la Biblia (nwt.js) y los textos diarios; no va a la nube ni al repositorio.
// Cada artículo se guarda como texto en el mismo formato que se pega de JW Library ("1. ¿Pregunta?",
// "1 Párrafo…", "## Subtítulo", "## ¿Qué responderías?"), así `parseArticle` (atalaya.js) no cambia.
import { useSyncExternalStore } from 'react'
import { unzipSync, strFromU8 } from 'fflate'
import { getMeta, setMeta, delMeta } from './db.js'
import { programMonday } from '../study/midweek.js'

// { [número]: { titulo, articulos: [{ num, titulo, semana /* lunes AAAA-MM-DD o null */, texto }] } }
let issues = null
let version = 0
const listeners = new Set()

function set(next) {
  issues = next
  version++
  for (const l of listeners) l()
}

export const hasWatchtower = () => !!issues && Object.keys(issues).length > 0

// Todos los artículos, del más reciente al más viejo.
export function watchtowerArticles() {
  return Object.values(issues ?? {}).flatMap((i) => i.articulos).sort((a, b) => String(b.semana ?? '').localeCompare(String(a.semana ?? '')) || b.num - a.num)
}

// El artículo de la semana de esa fecha (la reunión del fin de semana cae en su semana, lunes a domingo).
export function watchtowerFor(iso) {
  if (!iso) return null
  return watchtowerArticles().find((a) => a.semana && a.semana <= iso && iso < addDays(a.semana, 7)) ?? null
}

// Nombres de los números importados ("agosto de 2026"), para avisar cuáles hay.
export const watchtowerIssues = () => Object.values(issues ?? {}).map((i) => i.titulo)

export function useWatchtower() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => version,
  )
}

export async function loadWatchtower() {
  try {
    const saved = await getMeta('revistas')
    if (saved?.issues) set(saved.issues)
  } catch {
    // sin IndexedDB: se sigue pegando el artículo como antes
  }
}

// Lee el EPUB (ArrayBuffer), lo junta con los números que ya había y lo guarda en el teléfono.
// Devuelve { titulo, count } o null si el archivo no es La Atalaya de estudio.
export async function importWatchtower(buffer) {
  const parsed = readWatchtowerEpub(new Uint8Array(buffer))
  if (!parsed) return null
  const prev = (await getMeta('revistas'))?.issues ?? {}
  const merged = { ...prev, [parsed.key]: { titulo: parsed.titulo, articulos: parsed.articulos } }
  await setMeta('revistas', { importedAt: Date.now(), issues: merged })
  set(merged)
  return { titulo: parsed.titulo, count: parsed.articulos.length }
}

export async function removeWatchtower() {
  await delMeta('revistas')
  set(null)
}

export function readWatchtowerEpub(bytes) {
  let files
  try {
    files = unzipSync(bytes, { filter: (f) => (/\.x?html$/.test(f.name) && !/-extracted\.xhtml$/.test(f.name)) || /content\.opf$/.test(f.name) })
  } catch {
    return null
  }
  const list = Object.entries(files).map(([name, data]) => [name, strFromU8(data)])
  const opf = list.find(([name]) => /content\.opf$/.test(name))?.[1] ?? ''
  const order = spine(opf)
  const pages = list.filter(([name]) => /\.x?html$/.test(name))
    .sort(([a], [b]) => rank(order, a) - rank(order, b) || a.localeCompare(b, 'en', { numeric: true }))
    .map(([, x]) => x)
  return parseWatchtower(pages, opf)
}

// Orden de lectura del content.opf (manifest id → archivo; spine en orden).
function spine(opf) {
  const files = Object.fromEntries([...String(opf).matchAll(/<item\b[^>]*>/g)].map((m) => [attr(m[0], 'id'), attr(m[0], 'href')]))
  return [...String(opf).matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map((m) => files[m[1]]).filter(Boolean)
}
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) ?? [])[1] ?? ''
const rank = (order, name) => {
  const i = order.findIndex((href) => name.endsWith(href))
  return i < 0 ? 1e6 : i
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STUDY = /art[ií]culo de estudio\s+(\d+)/i
// "5-11 de octubre", "28 de septiembre a 4 de octubre", "del 5 al 11 de octubre" (con o sin año).
const WEEK = /(\d{1,2})(?:\s+de\s+([a-z]+))?\s*(?:-|–|a|al)\s*(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(20\d\d))?/

// [xhtml en orden], content.opf → { key, titulo, articulos } o null si no trae artículos de estudio.
export function parseWatchtower(pages, opf = '') {
  const title = clean((String(opf).match(/<dc:title[^>]*>([^<]*)</) ?? [])[1] ?? '')
  const ident = clean((String(opf).match(/<dc:identifier[^>]*>([^<]*)</) ?? [])[1] ?? '')
  const issue = issueDate(title, ident)
  // Cada página como renglones de texto; un artículo de estudio puede venir en varias páginas (-split).
  const isQuestion = (l) => /^\d+(?:\s*(?:,|y|-|–)\s*\d+)*\.\s+\S/.test(l)
  const docs = pages.map(toLines)
  const articulos = []
  pages.forEach((page, i) => {
    const lines = docs[i]
    const head = lines.slice(0, 6).map((l) => l.replace(/^#+\s*/, ''))
    const label = head.map((l) => l.match(STUDY)).find(Boolean)
    const prev = articulos.at(-1)
    if (lines.some(isQuestion) && (label || !prev || prev.done || head.some((l) => weekIn(l)))) {
      // Arriba de cada artículo va su semana ("5-11 DE OCTUBRE DE 2026"); antes decía "Artículo de estudio N".
      const own = head.map((l) => weekIn(l, issue && addDays(issue, 60))).find(Boolean) ?? null
      articulos.push({ num: label ? Number(label[1]) : (prev?.num ?? 0) + 1, lines, own, titulo: clean((String(page).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1] ?? '') })
    } else if (prev && !prev.done && !lines.some((l) => STUDY.test(l)) && (lines.some(isQuestion) || /^\d+\s/.test(lines[0] ?? '') || /responder[ií]as/i.test(lines.join(' ')))) {
      prev.lines.push(...lines) // continuación del artículo anterior (el EPUB parte los archivos largos)
    } else if (prev) prev.done = true
  })
  if (!articulos.length) return null

  // Semana de cada artículo: la del índice (o del propio artículo) junto a "Artículo de estudio N".
  // El índice puede traer la semana después o antes de la etiqueta: se toma el lado que encuentra más.
  const all = docs.flat().join('\n')
  const ref = issue ? addDays(issue, 60) : undefined
  const side = (where) => Object.fromEntries(articulos.map((a) => [a.num, weekOf(all, a.num, ref, where)]))
  const after = side('after')
  const before = side('before')
  const count = (w) => Object.values(w).filter(Boolean).length
  const fromToc = count(before) > count(after) ? before : after
  const weeks = Object.fromEntries(articulos.map((a) => [a.num, a.own ?? fromToc[a.num]]))
  // Si alguno no la trae, se calcula de otro: un artículo por semana, en orden.
  const known = articulos.find((a) => weeks[a.num])
  const out = articulos.map((a) => {
    const semana = weeks[a.num] ?? (known ? addDays(weeks[known.num], 7 * (a.num - known.num)) : null)
    const texto = a.lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
    return { num: a.num, titulo: a.titulo || articleTitle(a.lines), semana, texto }
  })
  return { key: title || ident || out.map((a) => a.num).join('-'), titulo: issueName(title, issue), articulos: out }
}

function weekOf(all, num, ref, side) {
  const re = new RegExp(`art[ií]culo de estudio\\s+${num}\\b`, 'gi')
  for (const m of all.matchAll(re)) {
    // Solo hasta la etiqueta vecina, para no tomar la semana de otro artículo.
    const part = side === 'after'
      ? all.slice(m.index + m[0].length, m.index + m[0].length + 400).split(STUDY)[0]
      : all.slice(Math.max(0, m.index - 400), m.index).split(STUDY).at(-1)
    const found = [...fold(part).replace(/setiembre/g, 'septiembre').matchAll(new RegExp(WEEK.source, 'g'))].filter((w) => MONTHS.includes(w[4]))
    const w = side === 'after' ? found[0] : found.at(-1)
    const monday = w && mondayOf(w, ref)
    if (monday) return monday
  }
  return null
}

// La semana escrita en un renglón ("26 DE OCTUBRE-1 DE NOVIEMBRE DE 2026") → su lunes, o null.
function weekIn(line, ref) {
  const w = fold(line).replace(/setiembre/g, 'septiembre').match(WEEK)
  return w && MONTHS.includes(w[4]) ? mondayOf(w, ref) : null
}

function mondayOf(w, ref) {
  const semana = `${w[1]}${w[2] ? ` de ${w[2]}` : ''}-${w[3]} de ${w[4]}`
  return programMonday(semana, w[5] ? `${w[5]}-${String(MONTHS.indexOf(w[4]) + 1).padStart(2, '0')}-15` : ref)
}

// Fecha (día 1) del número, del título ("La Atalaya … agosto de 2026") o del símbolo ("w_S_202608").
function issueDate(title, ident) {
  const t = fold(title).match(new RegExp(`(${MONTHS.join('|')})\\s+(?:de\\s+)?(20\\d\\d)`))
  if (t) return `${t[2]}-${String(MONTHS.indexOf(t[1]) + 1).padStart(2, '0')}-01`
  const s = String(ident).match(/(20\d\d)(0[1-9]|1[0-2])/)
  return s ? `${s[1]}-${s[2]}-01` : null
}

function issueName(title, issue) {
  if (!issue) return title || 'La Atalaya'
  const [y, m] = issue.split('-')
  return `${MONTHS[Number(m) - 1]} de ${y}`
}

// El título: el primer renglón que no es la etiqueta, la canción ni el texto temático.
function articleTitle(lines) {
  return (lines.map((l) => l.replace(/^#+\s*/, '')).find((l) => l && !STUDY.test(l) && !/^canci[oó]n\b/i.test(l) && !/[“"«]/.test(l) && l.length < 120) ?? '').trim()
}

// Una página XHTML → renglones como los copia JW Library. Encabezados con "## " (menos el título),
// preguntas "1. ¿…?", párrafos "1 …", listas "- …"; sin notas al pie, imágenes ni enlaces de navegación.
export function toLines(xhtml) {
  let s = String(xhtml)
  s = (s.match(/<body\b[^>]*>([\s\S]*)<\/body>/) ?? [])[1] ?? s
  // Lo que va después del artículo (notas al pie y el texto de cada cita) no se lee.
  s = s.split(/<div\b[^>]*class="(?:groupFootnote|groupExt)\b/)[0]
  s = s
    .replace(/<(nav|script|style)\b[\s\S]*?<\/\1>/g, '')
    .replace(/<aside\b[^>]*epub:type="footnote"[\s\S]*?<\/aside>/g, '')
    .replace(/<a\b[^>]*href="#footnote[^"]*"[^>]*>[\s\S]*?<\/a>/g, '') // el asterisco de la nota
    .replace(/<div\b[^>]*class="gen-field\b[^>]*>[\s\S]*?<\/div>/g, '') // el cuadro "Respuesta" de JW Library
    .replace(/<span\b[^>]*class="pageNum\b[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<span\b[^>]*class="parNum"[^>]*data-pnum="(\d+)"[^>]*>[\s\S]*?<\/span>/g, '$1 ') // "1 Párrafo…"
    .replace(/<div\b[^>]*class="blockTeach\b[^>]*>[\s\S]*?<\/aside>/g, reviewBox)
    .replace(/<img\b[^>]*>/g, '')
  const out = []
  let h1 = false
  for (const m of s.matchAll(/<(h[1-6]|p|li|figcaption)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const [, tag, attrs, inner] = m
    const cls = attr(attrs, 'class')
    let t = clean(inner)
    if (!t) continue
    if (/footnote|groupFootnote|pageNum/i.test(cls)) continue
    if (tag === 'h1' && !h1) { h1 = true; out.push(t); continue }
    if (/^h[2-6]$/.test(tag) && !STUDY.test(t)) { out.push('## ' + t); continue }
    if (/^(¿?qu[eé] responder[ií]as\??|preguntas de repaso|avance|tema)$/i.test(t)) { out.push('## ' + t); continue }
    if (tag === 'li') { out.push('- ' + t); continue }
    // Preguntas: "1. ¿…?" (si el EPUB no trae el punto, se lo pone).
    if (/\bqu\b/.test(cls)) t = t.replace(/^(\d+(?:\s*(?:,|y|-|–)\s*\d+)*)\.?\s+/, '$1. ')
    out.push(t)
  }
  return out
}

// El cuadro de repaso del final: su título varía ("¿QUÉ RESPONDERÍAS?", "BASÁNDOTE EN LUCAS 1:68-79,
// ¿QUÉ CONTESTARÍAS?", "¿QUÉ APRENDEMOS DE LOS SIGUIENTES PERSONAJES BÍBLICOS?"); siempre queda como
// "## ¿Qué responderías?" para `parseArticle`. Si sus renglones no son preguntas ("Onésimo"), llevan el título.
function reviewBox(box) {
  const title = clean((box.match(/class="boxTtl\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>/) ?? [])[1] ?? '')
  const items = [...box.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => clean(m[1])).filter(Boolean)
  return '<h2>¿Qué responderías?</h2>' + items.map((t) => `<li>${/[¿?]/.test(t) || !title ? t : `${sentence(title)} ${t}`}</li>`).join('')
}

// "¿QUÉ APRENDEMOS DE JEHOVÁ?" → "¿Qué aprendemos de Jehová?"
const NAMES = /\b(jehová|jesús|jesucristo|dios|cristo|biblia|satanás|reino)\b/g
function sentence(t) {
  if (t !== t.toUpperCase()) return t
  return t.toLowerCase().replace(/^([¿¡"“]*)(\p{L})/u, (_, a, b) => a + b.toUpperCase()).replace(NAMES, (w) => w[0].toUpperCase() + w.slice(1))
}

function clean(html) {
  return String(html)
    .replace(/<br\s*\/?>/g, ' ')
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
export const _setWatchtower = set
