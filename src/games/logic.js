// Lógica de los juegos (sin interfaz), para poder probarla.
import { newId, normKey, ROOT_ID } from '../lib/model.js'
import { plainText } from '../lib/markdown.js'

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
