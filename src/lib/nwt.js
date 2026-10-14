// La Biblia completa (TNM) importada del EPUB que el usuario baja de jw.org: se lee en el teléfono y se
// guarda solo ahí (IndexedDB, `meta.bible`); no se sube a la nube ni va dentro de la app publicada.
// En otro teléfono se vuelve a importar el archivo.
import { useSyncExternalStore } from 'react'
import { unzipSync, strFromU8 } from 'fflate'
import { getMeta, setMeta, delMeta } from './db.js'

// { 'libro:capítulo': [{ v, texto }] } o null si no se ha importado.
let chapters = null
let version = 0
const listeners = new Set()

function set(next) {
  chapters = next
  version++
  for (const l of listeners) l()
}

export const hasBible = () => !!chapters
export const bibleChapter = (book, chapter) => chapters?.[`${book}:${chapter}`] ?? null
export const bibleVerse = (book, chapter, v) => bibleChapter(book, chapter)?.find((x) => x.v === v)?.texto ?? null

// Para volver a pintar cuando se carga o se importa la Biblia.
export function useBible() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => version,
  )
}

export async function loadBible() {
  try {
    const saved = await getMeta('bible')
    if (saved?.chapters) set(saved.chapters)
  } catch {
    // sin IndexedDB: la app sigue sin la Biblia importada
  }
}

// Lee el EPUB (ArrayBuffer), lo guarda en el teléfono y devuelve cuántos versículos trae.
export async function importBible(buffer) {
  const parsed = readEpub(new Uint8Array(buffer))
  if (!parsed) return null
  await setMeta('bible', { source: 'nwt-S', importedAt: Date.now(), chapters: parsed.chapters })
  set(parsed.chapters)
  return parsed
}

export async function removeBible() {
  await delMeta('bible')
  set(null)
}

// Los capítulos de la Biblia vienen en archivos 1001061105.xhtml (Génesis) … 1001061170 (Apocalipsis),
// uno por capítulo (1001061147-split3.xhtml = Juan 3).
const BOOK_FILE = /(?:^|\/)1001061(\d{3})(?:-split\d+)?\.xhtml$/

export function readEpub(bytes) {
  let files
  try {
    files = unzipSync(bytes, { filter: (f) => BOOK_FILE.test(f.name) })
  } catch {
    return null
  }
  return parseNwt(Object.entries(files).map(([name, data]) => [name, strFromU8(data)]))
}

// [[nombre, xhtml]] → { chapters, verses } o null si no parece la TNM.
export function parseNwt(files) {
  const chapters = {}
  let verses = 0
  for (const [name, xhtml] of files) {
    const m = name.match(BOOK_FILE)
    const book = m ? Number(m[1]) - 104 : 0
    if (book < 1 || book > 66) continue
    for (const [chapter, list] of parseChapterFile(xhtml)) {
      chapters[`${book}:${chapter}`] = list
      verses += list.length
    }
  }
  return verses > 1000 ? { chapters, verses } : null
}

// Solo cuentan los párrafos del texto bíblico: prosa (sb) y poesía (sl = primer renglón, sz = los demás).
// Se dejan fuera los títulos de los salmos (sw), las letras hebreas de los acrósticos (ss), las notas y la navegación.
const TEXT_P = /<p\b[^>]*class="p\d+ (sb|sl|sz)"[^>]*>([\s\S]*?)<\/p>/g
const ANCHOR = /<span id="chapter(\d+)_verse(\d+)"><\/span>/

function parseChapterFile(xhtml) {
  const body = String(xhtml).split(/<div class="groupFootnote"/)[0]
  const byChapter = new Map()
  let cur = null
  for (const [, cls, inner] of body.matchAll(TEXT_P)) {
    const parts = inner.split(ANCHOR)
    // Lo que va antes del primer número sigue al versículo anterior: un renglón nuevo en la poesía.
    if (cur) cur.texto += (cls === 'sb' ? ' ' : '\n') + clean(parts[0])
    for (let i = 1; i < parts.length; i += 3) {
      const chapter = Number(parts[i])
      cur = { v: Number(parts[i + 1]), texto: clean(parts[i + 2]) }
      if (!byChapter.has(chapter)) byChapter.set(chapter, [])
      byChapter.get(chapter).push(cur)
    }
  }
  // Los versículos que la TNM no tiene en el texto principal (Mateo 17:21…) vienen vacíos: se quitan.
  const out = new Map()
  for (const [chapter, list] of byChapter) {
    for (const x of list) x.texto = x.texto.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim()
    out.set(chapter, list.filter((x) => x.texto).sort((a, b) => a.v - b.v))
  }
  return out
}

function clean(html) {
  return html
    .replace(/<a [^>]*noteref[^>]*>[\s\S]*?<\/a>/g, '') // marcas de notas (*)
    .replace(/<span class="w_ch">[\s\S]*?<\/span>/g, '') // número grande del capítulo
    .replace(/<strong><sup>\d+<\/sup><\/strong>/g, '') // número del versículo
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
}

// Solo para pruebas.
export const _setBible = set
