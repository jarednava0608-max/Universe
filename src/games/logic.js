// Lógica de los juegos (sin interfaz), para poder probarla.
import { newId, normKey, ROOT_ID } from '../lib/model.js'
import { plainText } from '../lib/markdown.js'
import { BOOKS, parseRef } from '../lib/bible.js'

export function shuffle(list, rnd = Math.random) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pregunta común a todos los juegos de opción múltiple.
// { prompt, options: string[], answer: number, explain?, ref? }

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

export function triviaToQuestion(f) {
  const order = shuffle(f.opciones.map((_, i) => i))
  return {
    prompt: f.pregunta,
    options: order.map((i) => f.opciones[i]),
    answer: order.indexOf(f.respuesta),
    explain: f.explicacion,
    ref: f.cita,
  }
}

export const TRIVIA_FORMAT = `Hazme preguntas de trivia bíblica sobre lo que acabamos de estudiar. Responde SOLO con un JSON así:

{
  "preguntas": [
    {
      "pregunta": "¿…?",
      "opciones": ["A", "B", "C", "D"],
      "respuesta": "B",
      "explicacion": "Por qué es la correcta (breve).",
      "cita": "Juan 17:3"
    }
  ]
}

Usa solo información de la Biblia y de jw.org / wol.jw.org. Entre 10 y 20 preguntas.`

// ---------- Juegos con mis nodos ----------

// Nodos con definición útil para jugar (sin la raíz si está vacía).
export function playableNodes(nodes) {
  return nodes.filter((n) => plainText(n.note).length >= 12 && n.title.trim())
}

// Oculta el título dentro de la definición para no regalar la respuesta.
export function maskTitle(text, title) {
  const all = title.split(/\s+/).filter(Boolean)
  const words = all.length === 1 ? all : all.filter((w) => w.length > 3)
  let out = text
  for (const w of words) out = out.replace(new RegExp(`(?<![\\p{L}])${escapeRe(w)}(?![\\p{L}])`, 'giu'), '＿＿＿')
  return out
}

function clipText(s, n = 220) {
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s
}

// "¿Qué es?": se muestra la definición y se elige el título correcto.
export function buildGuessQuestions(nodes, count = 10, rnd = Math.random) {
  const pool = playableNodes(nodes)
  if (pool.length < 4) return []
  return shuffle(pool, rnd).slice(0, count).map((n) => {
    const others = shuffle(pool.filter((o) => o.id !== n.id), rnd).slice(0, 3)
    const opts = shuffle([n, ...others], rnd)
    return {
      prompt: clipText(maskTitle(plainText(n.note), n.title)),
      options: opts.map((o) => o.title),
      answer: opts.indexOf(n),
      nodeId: n.id,
    }
  })
}

// "Parejas": unir títulos con su definición corta.
export function buildPairs(nodes, count = 4, rnd = Math.random) {
  const pool = playableNodes(nodes).filter((n) => n.id !== ROOT_ID || plainText(n.note))
  if (pool.length < 3) return null
  const chosen = shuffle(pool, rnd).slice(0, count)
  return {
    left: shuffle(chosen.map((n) => ({ id: n.id, text: n.title })), rnd),
    right: shuffle(chosen.map((n) => ({ id: n.id, text: clipText(maskTitle(plainText(n.note), n.title), 90) })), rnd),
  }
}

// "Tarjetas": frente y reverso para repasar (nodos y textos diarios).
export function buildCards(nodes, entries) {
  const cards = playableNodes(nodes).map((n) => ({ id: n.id, front: n.title, back: plainText(n.note) }))
  for (const e of entries) {
    if (e.kind === 'diario' && (e.fields.resumen || e.fields.texto) && (e.fields.principio || e.fields.aplicacion)) {
      cards.push({
        id: e.id,
        front: e.fields.resumen || e.fields.texto,
        back: [e.fields.texto, e.fields.principio, e.fields.aplicacion].filter(Boolean).join('\n\n'),
      })
    }
  }
  return cards
}

// ---------- Memorizar textos ----------

export function makeVerse({ cita = '', texto = '' } = {}) {
  const now = Date.now()
  return { id: newId(), kind: 'memoria', fields: { cita: cita.trim(), texto: texto.trim(), nivel: 0 }, createdAt: now, updatedAt: now }
}

// Textos para memorizar: los guardados en el juego + los del Texto diario.
export function verseSources(entries) {
  const own = entries.filter((e) => e.kind === 'memoria')
  const ownKeys = new Set(own.map((e) => normKey(e.fields.texto)))
  const daily = entries
    .filter((e) => e.kind === 'diario' && e.fields.texto?.trim() && !ownKeys.has(normKey(e.fields.texto)))
    .map((e) => ({ id: e.id, kind: 'diario', fields: { cita: refOf(e.fields.texto), texto: stripRef(e.fields.texto), nivel: 0 }, fromDaily: true }))
  return [...own, ...daily]
}

// Todos tus textos bíblicos: los de Memorizar, el Texto diario y los versículos guardados en Mi Biblia
// (sin publicaciones). Para "Completa el texto" y "¿Dónde está?".
export function bibleSources(entries) {
  const base = verseSources(entries)
  const keys = new Set(base.map((v) => normKey(v.fields.texto)))
  const saved = entries.filter((e) => e.kind === 'biblia' && e.fields.texto?.trim() && parseRef(e.fields.cita ?? '') && !keys.has(normKey(e.fields.texto)))
  return [...base, ...saved]
}

// Palabras del texto; en cada nivel se oculta una parte mayor (25%, 50%, 75%, 100%).
export function clozeWords(texto, nivel, seed = 1) {
  const words = texto.split(/\s+/).filter(Boolean)
  const ratio = [0.25, 0.5, 0.75, 1][Math.min(Math.max(nivel, 0), 3)]
  const candidates = words.map((w, i) => i).filter((i) => /[\p{L}\d]{3,}/u.test(words[i]))
  const rnd = mulberry(seed)
  const hide = new Set(shuffle(candidates, rnd).slice(0, Math.round(candidates.length * ratio)))
  return words.map((w, i) => {
    const m = w.match(/^([«“"(¿¡]*)(.*?)([»”".,;:!?)]*)$/u)
    return { word: m[2], pre: m[1], post: m[3], hidden: hide.has(i) }
  })
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

const REF_RE = /\(?\b((?:[1-3]\s?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+\.?\s\d{1,3}:\d{1,3}(?:\s?[-–,]\s?\d{1,3})*)\)?\.?\s*$/
function refOf(s) {
  return String(s).trim().match(REF_RE)?.[1] ?? ''
}
function stripRef(s) {
  return String(s).trim().replace(REF_RE, '').trim()
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
// Generador pseudoaleatorio con semilla (el mismo texto oculta las mismas palabras en una partida).
export function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- Más formas de memorizar ----------

// "Iniciales": solo la primera letra de cada palabra (con su puntuación).
export function initials(texto) {
  return texto
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/^([«“"(¿¡]*)([\p{L}\d])[\p{L}\d'’-]*/u, '$1$2'))
    .join(' ')
}

// "Ordenar": el texto en trozos de unas pocas palabras (máximo ~8 trozos).
export function chunkText(texto, maxPieces = 8) {
  const words = texto.split(/\s+/).filter(Boolean)
  const size = Math.max(2, Math.ceil(words.length / maxPieces))
  const out = []
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(' '))
  return out
}

// ---------- "¿Dónde está?" (adivinar la cita) ----------

export function buildCiteQuestions(verses, count = 10, rnd = Math.random) {
  const seen = new Set()
  const pool = verses.filter((v) => {
    const k = normKey(v.fields.cita ?? '')
    if (!k || !parseRef(v.fields.cita) || seen.has(k)) return false
    seen.add(k)
    return true
  })
  if (pool.length < 4) return []
  return shuffle(pool, rnd).slice(0, count).map((v) => {
    const opts = shuffle([v, ...shuffle(pool.filter((o) => o !== v), rnd).slice(0, 3)], rnd)
    return { prompt: clipText(v.fields.texto, 260), options: opts.map((o) => o.fields.cita), answer: opts.indexOf(v), key: 'cita:' + v.id }
  })
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
export const sectionOf = (n) => SECTIONS.find((s) => n >= s.from && n <= s.to).name

// Preguntas variadas: qué libro va después, cuál va antes y en qué sección está.
export function buildBookQuestions(count = 10, rnd = Math.random) {
  const out = []
  const used = new Set()
  while (out.length < count) {
    const type = Math.floor(rnd() * 3)
    const n = 2 + Math.floor(rnd() * 64) // 2..65: siempre tiene anterior y siguiente
    const key = type + ':' + n
    if (used.has(key)) continue
    used.add(key)
    const book = BOOKS[n - 1]
    if (type === 2) {
      const right = sectionOf(n)
      const opts = shuffle([right, ...shuffle(SECTIONS.map((s) => s.name).filter((s) => s !== right), rnd).slice(0, 3)], rnd)
      out.push({ prompt: `¿En qué sección está ${book}?`, options: opts, answer: opts.indexOf(right), explain: `${book} es el libro ${n} de 66.` })
    } else {
      const target = type === 0 ? n + 1 : n - 1
      // Distractores cercanos (lo difícil es lo que está alrededor).
      const near = [n - 3, n - 2, n + 2, n + 3, type === 0 ? n - 1 : n + 1].filter((x) => x >= 1 && x <= 66 && x !== target && x !== n)
      const opts = shuffle([target, ...shuffle(near, rnd).slice(0, 3)], rnd)
      out.push({
        prompt: type === 0 ? `¿Qué libro va después de ${book}?` : `¿Qué libro va antes de ${book}?`,
        options: opts.map((x) => BOOKS[x - 1]),
        answer: opts.indexOf(target),
        explain: type === 0 ? `${book} (${n}) → ${BOOKS[target - 1]} (${target})` : `${BOOKS[target - 1]} (${target}) → ${book} (${n})`,
      })
    }
  }
  return out
}

// Ordenar: unos libros seguidos (desordenados en pantalla).
export function bookRun(size = 6, rnd = Math.random) {
  const start = 1 + Math.floor(rnd() * (66 - size + 1))
  return BOOKS.slice(start - 1, start - 1 + size)
}

// ---------- Contra reloj ----------

// Puntos por respuesta correcta: 100 base + hasta 100 por rapidez.
export function timedPoints(msLeft, msTotal) {
  return 100 + Math.round(100 * Math.max(0, Math.min(1, msLeft / msTotal)))
}

// ---------- Repasar hoy ----------

// Mezcla lo que toca hoy (tarjetas, textos y preguntas) en una sola sesión, alternando tipos.
export function dailyMix({ cards = [], verses = [], trivia = [] }, srs, isDueFn, limit = 20) {
  const lists = [
    cards.filter((c) => isDueFn(srs['c:' + c.id])).map((c) => ({ type: 'card', key: 'c:' + c.id, item: c })),
    verses.filter((v) => isDueFn(srs['v:' + v.id])).map((v) => ({ type: 'verse', key: 'v:' + v.id, item: v })),
    trivia.filter((t) => isDueFn(srs['q:' + t.id])).map((t) => ({ type: 'trivia', key: 'q:' + t.id, item: t })),
  ].map((l) => l.sort((a, b) => (srs[a.key]?.due ?? '').localeCompare(srs[b.key]?.due ?? '')))
  const out = []
  while (out.length < limit && lists.some((l) => l.length)) {
    for (const l of lists) if (l.length && out.length < limit) out.push(l.shift())
  }
  return out
}

// Una sola pregunta de libros (para el reto contra reloj).
export const bookSprintQuestion = (rnd = Math.random) => buildBookQuestions(1, rnd)[0]

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

// ---------- "Completa el texto" ----------

// Un texto con una palabra importante quitada; hay que elegirla entre 4.
// Las opciones salen del mismo texto o de tus otros textos (palabras de 4 letras o más).
const COMMON = new Set(['para', 'como', 'pero', 'porque', 'cuando', 'donde', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'todo', 'toda', 'todos', 'todas', 'sobre', 'entre', 'hasta', 'desde', 'también', 'aunque', 'según', 'ellos', 'ellas', 'nosotros', 'ustedes', 'aquel', 'aquella', 'cual', 'quien', 'mismo', 'misma'])
const fillWord = (w) => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
const fold = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const goodWord = (w) => w.length >= 4 && !COMMON.has(fold(w))

export function buildFillQuestions(verses, count = 10, rnd = Math.random) {
  const seen = new Set()
  const pool = verses.filter((v) => {
    const t = (v.fields.texto ?? '').trim()
    const k = fold(t).slice(0, 60)
    if (t.split(/\s+/).length < 6 || seen.has(k)) return false
    seen.add(k)
    return true
  })
  const allWords = [...new Set(pool.flatMap((v) => v.fields.texto.split(/\s+/).map(fillWord).filter(goodWord)))]
  const out = []
  for (const v of shuffle(pool, rnd)) {
    if (out.length >= count) break
    const raw = v.fields.texto.split(/\s+/)
    const idx = shuffle(raw.map((_, i) => i).filter((i) => i > 0 && goodWord(fillWord(raw[i]))), rnd)[0]
    if (idx == null) continue
    const word = fillWord(raw[idx])
    const others = shuffle(allWords.filter((w) => fold(w) !== fold(word)), rnd)
    const opts = []
    for (const w of others) {
      if (opts.length >= 3) break
      if (!opts.some((o) => fold(o) === fold(w))) opts.push(w)
    }
    if (opts.length < 3) continue
    const options = shuffle([word, ...opts], rnd)
    const prompt = raw.map((w, i) => (i === idx ? w.replace(word, '_____') : w)).join(' ')
    out.push({ prompt: clipText(prompt, 320), options, answer: options.indexOf(word), ref: v.fields.cita || undefined, key: 'llenar:' + v.id })
  }
  return out
}
