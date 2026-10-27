// El libro del estudio de la congregación ("Seamos valientes al andar con Dios", wcg) importado del
// EPUB que el usuario baja de jw.org. Se lee en el teléfono y se guarda solo ahí (IndexedDB,
// `meta.libros`), igual que la Guía (guia.js) y La Atalaya; no va a la nube ni al repositorio.
// Cada capítulo se guarda como texto en el mismo formato que se copia de JW Library ("11 MOISÉS",
// el relato, secciones y "Respuesta" bajo cada pregunta), así `studyChapter` (midweek.js) no cambia:
// el capítulo de la reunión ("wcg cap. 14") se pone solo como si lo hubieras pegado.
import { useSyncExternalStore } from 'react'
import { unzipSync, strFromU8 } from 'fflate'
import { getMeta, setMeta, delMeta } from './db.js'
import { toProgram } from './guia.js'
import { isStoryChapter } from '../study/midweek.js'

// { [clave del libro]: { titulo, capitulos: { [número]: texto } } }
let books = null
let version = 0
const listeners = new Set()

function set(next) {
  books = next
  version++
  for (const l of listeners) l()
}

export const hasLibro = () => !!books && Object.keys(books).length > 0

export const libroTitles = () => Object.values(books ?? {}).map((b) => b.titulo)

export function useLibro() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => version,
  )
}

// "wcg cap. 14." → { pub: 'wcg', n: 14 }; null si el texto no dice el capítulo.
export function chapterRef(text) {
  const m = String(text ?? '').match(/(?:\b([a-z]{2,6})\s+)?\bcap(?:\.|[ií]tulo)\s*(\d{1,3})\b/i)
  return m ? { pub: (m[1] ?? '').toLowerCase(), n: Number(m[2]) } : null
}

// El texto del capítulo que pide esa parte de la reunión, o null si el libro no está en el teléfono.
export function libroFor(partText) {
  const ref = chapterRef(partText)
  if (!ref || !books) return null
  const list = Object.entries(books)
  const [, book] = list.find(([key]) => ref.pub && key.includes(ref.pub)) ?? list.find(([, b]) => b.capitulos[ref.n]) ?? []
  return book?.capitulos[ref.n] ?? null
}

export async function loadLibro() {
  try {
    const saved = await getMeta('libros')
    if (saved?.books) set(saved.books)
  } catch {
    // sin IndexedDB: se sigue pegando el capítulo como antes
  }
}

// Lee el EPUB (ArrayBuffer), lo junta con los libros que ya había y lo guarda en el teléfono.
// Devuelve { titulo, count } o null si el archivo no trae capítulos con preguntas.
export async function importLibro(buffer) {
  const parsed = readLibroEpub(new Uint8Array(buffer))
  if (!parsed) return null
  const prev = (await getMeta('libros'))?.books ?? {}
  const merged = { ...prev, [parsed.key]: { titulo: parsed.titulo, capitulos: parsed.capitulos } }
  await setMeta('libros', { importedAt: Date.now(), books: merged })
  set(merged)
  return { titulo: parsed.titulo, count: Object.keys(parsed.capitulos).length }
}

export async function removeLibro() {
  await delMeta('libros')
  set(null)
}

export function readLibroEpub(bytes) {
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
  return parseLibro(pages, opf)
}

function spine(opf) {
  const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) ?? [])[1] ?? ''
  const files = Object.fromEntries([...String(opf).matchAll(/<item\b[^>]*>/g)].map((m) => [attr(m[0], 'id'), attr(m[0], 'href')]))
  return [...String(opf).matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map((m) => files[m[1]]).filter(Boolean)
}
const rank = (order, name) => {
  const i = order.findIndex((href) => name.endsWith(href))
  return i < 0 ? 1e6 : i
}

const meta = (opf, tag) => (String(opf).match(new RegExp(`<dc:${tag}[^>]*>([^<]*)<`)) ?? [])[1]?.trim() ?? ''

// [xhtml en orden], content.opf → { key, titulo, capitulos } o null si no trae ningún capítulo.
// Un capítulo es una página que abre con su número ("11 MOISÉS") y trae preguntas; si el EPUB parte
// un capítulo largo en varios archivos, lo que sigue sin número se agrega al capítulo anterior.
export function parseLibro(pages, opf = '') {
  const capitulos = {}
  let last = null
  for (const page of pages) {
    const text = toProgram(page)
    const lines = text.split('\n')
    const head = lines[0]?.match(/^(\d{1,3})\s*(\D\S.*)$/)
    const asks = isStoryChapter(text) || lines.some((l) => /^\d+\.\s.+\?$/.test(l))
    if (head && head[2].length < 60 && asks) {
      last = head[1]
      capitulos[last] = `${last} ${head[2]}\n${lines.slice(1).join('\n')}`
    } else if (!head && last && asks) {
      capitulos[last] += '\n' + text
    } else {
      last = null
    }
  }
  if (!Object.keys(capitulos).length) return null
  const titulo = meta(opf, 'title') || 'Libro del estudio'
  return { key: (meta(opf, 'identifier') || titulo).toLowerCase(), titulo, capitulos }
}

// Solo para pruebas.
export const _setLibro = set
