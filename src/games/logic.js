// Lógica de los juegos (sin interfaz), para poder probarla.
import { newId, normKey } from '../lib/model.js'
import { BOOKS, parseRef } from '../lib/bible.js'
import { cleanVerseText } from '../lib/verses.js'
import { parseArticle } from '../study/atalaya.js'

export function shuffle(list, rnd = Math.random) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- Trivia (preguntas pegadas desde Claude) ----------

export function parseTrivia(data) {
  const list = Array.isArray(data) ? data : data?.preguntas ?? data?.questions ?? data?.trivia
  if (!Array.isArray(list)) throw new Error('Se esperaba { "preguntas": [...] }.')
  const out = []
  const warnings = []
  list.forEach((q, i) => {
    const pregunta = String(q?.pregunta ?? q?.question ?? '').trim()
    const opciones = (q?.opciones ?? q?.options ?? []).map((o) => String(o).trim()).filter(Boolean)
    let respuesta = q?.respuesta ?? q?.answer ?? q?.correcta
    if (typeof respuesta === 'string') {
      const idx = opciones.findIndex((o) => normKey(o) === normKey(respuesta))
      respuesta = idx >= 0 ? idx : /^[a-d]$/i.test(respuesta.trim()) ? 'abcd'.indexOf(respuesta.trim().toLowerCase()) : -1
    }
    if (!pregunta || opciones.length < 2 || !(respuesta >= 0 && respuesta < opciones.length)) {
      warnings.push(`Pregunta #${i + 1} ignorada: le falta la pregunta, las opciones o la respuesta correcta.`)
      return
    }
    out.push({
      pregunta,
      opciones,
      respuesta: Number(respuesta),
      explicacion: String(q?.explicacion ?? q?.explanation ?? '').trim(),
      cita: String(q?.cita ?? q?.texto ?? q?.ref ?? '').trim(),
    })
  })
  if (!out.length) throw new Error(warnings[0] ?? 'No se encontraron preguntas válidas.')
  return { questions: out, warnings }
}

// Frases; una cita sin punto también corta ("Juan 17:3 Lo dice…" → "Juan 17:3" + "Lo dice…").
const sentences = (t) => t.split(/\n+|(?<=[.!?…])\s+|(?<=\d)\s+(?=\p{Lu})/u).map((x) => x.trim()).filter(Boolean)

function clipText(s, n = 220) {
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s
}

// "¿De qué Atalaya es?": un trozo de un párrafo de tus artículos (hasta 4 por artículo, repartidos)
// y elegir de qué artículo es (título y fecha). No necesita que hayas respondido nada.
export const SOURCE_PER_ARTICLE = 4
export function articleDate(iso) {
  const [y, m, d] = String(iso ?? '').split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'long' })
}
// Solo con 3 artículos o más: con menos no hay entre qué elegir (y la fecha no es lo que hay que recordar).
export const SOURCE_MIN_ARTICLES = 3
export function atalayaSourceCards(entries) {
  const out = []
  const list = entries
    .filter((e) => e.kind === 'reunion' && e.fields.tipo !== 'entresemana' && String(e.fields.articulo ?? '').trim())
    .sort((a, b) => String(b.fields.fecha ?? '').localeCompare(String(a.fields.fecha ?? '')) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  if (list.length < SOURCE_MIN_ARTICLES) return out
  for (const e of list) {
    const title = e.fields.titulo || 'La Atalaya'
    const date = articleDate(e.fields.fecha)
    const blocks = parseArticle(e.fields.articulo).bloques
      .map((b) => ({ b, s: sentences(b.parrafos.join(' ')).filter((x) => x.split(' ').length >= 8).sort((x, y) => y.length - x.length)[0] }))
      .filter((x) => x.s)
    const n = Math.min(SOURCE_PER_ARTICLE, blocks.length)
    for (let i = 0; i < n; i++) {
      const { b, s } = blocks[Math.floor(((i + 0.5) * blocks.length) / n)]
      out.push({ id: e.id + ':de:' + b.key, kind: 'source', group: e.id, title, date, fecha: e.fields.fecha ?? '', label: `Párr. ${b.key}`, front: clipText(s, 200), back: [title, date].filter(Boolean).join(' · ') })
    }
  }
  return out
}

// Sin trampa: elegir el artículo entre tus otras Atalayas. null si no hay con qué armar opciones.
export function atalayaSourceCheck(card, cards, rnd = Math.random) {
  const seen = new Set([card.group])
  const others = []
  for (const c of shuffle(cards, rnd)) {
    if (others.length >= 3 || seen.has(c.group)) continue
    seen.add(c.group)
    others.push(c.back)
  }
  if (!others.length || others.includes(card.back)) return null
  const options = shuffle([card.back, ...others], rnd)
  return { ask: '¿De qué Atalaya es?', options, answer: options.indexOf(card.back) }
}

// ---------- Memorizar textos ----------

export function makeVerse({ cita = '', texto = '' } = {}) {
  const now = Date.now()
  return { id: newId(), kind: 'memoria', fields: { cita: cita.trim(), texto: cleanVerseText(texto), nivel: 0 }, createdAt: now, updatedAt: now }
}

// Textos con su cita (para Mi Biblia): los de Memorizar + los del Texto diario.
export function verseSources(entries) {
  const own = entries.filter((e) => e.kind === 'memoria')
  const ownKeys = new Set(own.map((e) => normKey(e.fields.texto)))
  const daily = entries
    .filter((e) => e.kind === 'diario' && e.fields.texto?.trim() && !ownKeys.has(normKey(e.fields.texto)))
    .map((e) => ({ id: e.id, kind: 'diario', fields: { cita: refOf(e.fields.texto), texto: stripRef(e.fields.texto), nivel: 0 }, fromDaily: true }))
  return [...own, ...daily]
}

export const VERSES_FORMAT = `Dame los textos bíblicos clave de lo que estudiamos para memorizarlos. Responde SOLO con un JSON así (texto de la Traducción del Nuevo Mundo):

{
  "textos": [
    { "cita": "Juan 17:3", "texto": "Esto significa vida eterna: que lleguen a conocerte a ti, el único Dios verdadero…" }
  ]
}`

export function parseVerses(data) {
  const list = Array.isArray(data) ? data : data?.textos ?? data?.texts ?? data?.versiculos
  if (!Array.isArray(list)) throw new Error('Se esperaba { "textos": [...] }.')
  const out = list
    .map((t) => ({ cita: String(t?.cita ?? t?.ref ?? '').trim(), texto: String(t?.texto ?? t?.text ?? '').trim() }))
    .filter((t) => t.texto)
  if (!out.length) throw new Error('No se encontraron textos.')
  return out
}

// ---------- utilidades ----------

// (?<!…) en vez de \b: en JavaScript la É de Éxodo no cuenta como letra para \b.
const REF_RE = /\(?(?<![\p{L}\d])((?:[1-3]\s?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+\.?\s\d{1,3}:\d{1,3}(?:\s?[-–,]\s?\d{1,3})*)\)?\.?\s*$/u
function refOf(s) {
  return String(s).trim().match(REF_RE)?.[1] ?? ''
}
function stripRef(s) {
  return String(s).trim().replace(REF_RE, '').trim()
}
// Generador pseudoaleatorio con semilla (para las pruebas).
export function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- Libros de la Biblia ----------

export const SECTIONS = [
  { name: 'Pentateuco', from: 1, to: 5 },
  { name: 'Históricos', from: 6, to: 17 },
  { name: 'Poéticos', from: 18, to: 22 },
  { name: 'Proféticos', from: 23, to: 39 },
  { name: 'Evangelios y Hechos', from: 40, to: 44 },
  { name: 'Cartas', from: 45, to: 65 },
  { name: 'Apocalipsis', from: 66, to: 66 },
]
// "Escribir": el texto palabra por palabra; para cada palabra hay que teclear su primera letra
// (sin acentos ni mayúsculas). Lo que no tiene letras (—, números sueltos) se muestra solo.
export const foldLetter = (ch = '') => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export function typeWords(texto) {
  return texto
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^([^\p{L}\d]*)([\p{L}\d][\p{L}\d'’-]*)(.*)$/u)
      if (!m) return { pre: raw, word: '', post: '', letter: '' }
      return { pre: m[1], word: m[2], post: m[3], letter: foldLetter(m[2][0]) }
    })
}

// ---------- Memorizar: "Cita" (armar la cita de un texto) ----------

// La cita en 3 pasos (libro, capítulo, versículo), cada uno con 4 opciones cercanas a la buena.
// null si la cita no se reconoce o no tiene versículo.
export function citeSteps(cita, rnd = Math.random) {
  const r = parseRef(cita ?? '')
  const vs = String(cita ?? '').match(/:\s*(\d{1,3}(?:\s?[-–,]\s?\d{1,3})*)/)
  if (!r || !r.verse || !vs) return null
  const near = (n, span) => {
    const pool = []
    for (let d = 1; pool.length < span * 2 && d < 200; d++) {
      if (n - d >= 1) pool.push(n - d)
      pool.push(n + d)
    }
    return shuffle(pool.slice(0, span * 2), rnd).slice(0, 3)
  }
  const step = (label, right, others) => {
    const options = shuffle([right, ...others], rnd)
    return { label, options, answer: options.indexOf(right) }
  }
  // Versículo: si es un tramo ("16-18") las opciones mueven todo el tramo.
  const verseText = vs[1].replace(/\s+/g, '')
  const shift = (d) => verseText.replace(/\d+/g, (x) => String(Number(x) + d))
  const books = near(r.book, 4).filter((b) => b <= BOOKS.length)
  while (books.length < 3) books.push(...near(r.book, 6).filter((b) => b <= BOOKS.length && !books.includes(b)).slice(0, 3 - books.length))
  return [
    step('Libro', BOOKS[r.book - 1], books.map((b) => BOOKS[b - 1])),
    step('Capítulo', String(r.chapter), near(r.chapter, 3).map(String)),
    step('Versículo', verseText, near(r.verse, 3).map((v) => shift(v - r.verse))),
  ]
}
