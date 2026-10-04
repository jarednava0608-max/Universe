// Lógica de los juegos (sin interfaz), para poder probarla.
import { newId, normKey, ROOT_ID } from '../lib/model.js'
import { definitionText } from '../lib/markdown.js'

// Texto de una definición para los juegos (sin subtítulos).
export const defText = definitionText
import { BOOKS, findRefs, parseRef } from '../lib/bible.js'
import { cleanVerseText, refKey } from '../lib/verses.js'
import { answerOf, parseArticle, reviewAnswer } from '../study/atalaya.js'

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

export function triviaToQuestion(f, rnd = Math.random) {
  const order = shuffle(f.opciones.map((_, i) => i), rnd)
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
  return nodes.filter((n) => defText(n.note).length >= 12 && n.title.trim())
}

// Oculta el título dentro de la definición para no regalar la respuesta.
// `keep`: palabras que no se ocultan (las que también están en las otras opciones no delatan nada).
export function maskTitle(text, title, keep = []) {
  const all = title.split(/\s+/).filter(Boolean)
  const kept = new Set(keep.map(foldWord))
  const words = (all.length === 1 ? all : all.filter((w) => w.length > 3)).filter((w) => !kept.has(foldWord(w)))
  let out = text
  for (const w of words) out = out.replace(new RegExp(`(?<![\\p{L}])${escapeRe(w)}(?![\\p{L}])`, 'giu'), '＿＿＿')
  return out
}

const foldWord = (w) => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\d]/gu, '')
const sigWords = (t) => t.split(/\s+/).map(foldWord).filter((w) => w.length > 3)
// Frases; una cita sin punto también corta ("Juan 17:3 Lo dice…" → "Juan 17:3" + "Lo dice…").
const sentences = (t) => t.split(/\n+|(?<=[.!?…])\s+|(?<=\d)\s+(?=\p{Lu})/u).map((x) => x.trim()).filter(Boolean)

// La pista de "¿De qué nodo es?": la definición sin lo que solo repite el título
// ("Cualquier decisión que hace feliz a Jehová…" para el nodo "Lo que hace feliz a Jehová…")
// ni las frases que se repiten igual en muchos nodos ("Conclusión del artículo…", "De <artículo>.").
// Si sin esas frases queda muy poco, se deja también la que repite el título (oculto).
export function guessPrompt(text, title, { others = [], texts = [] } = {}) {
  const keep = others.flatMap((o) => o.split(/\s+/))
  const masked = (t) => maskTitle(t, title, keep)
  const tw = sigWords(title)
  const count = new Map()
  for (const t of texts) for (const x of new Set(sentences(t))) count.set(x, (count.get(x) ?? 0) + 1)
  const own = sentences(text).filter((x) => x.length < 20 || (count.get(x) ?? 0) < 3)
  const repeats = (x) => {
    if (tw.length < 2) return false
    const sw = new Set(sigWords(x))
    return tw.filter((w) => sw.has(w)).length / tw.length >= 0.6
  }
  // Lo que da pista de verdad debe tener letras, no solo "Párrafo 4." o una cita.
  const useful = own.filter((x) => !repeats(x))
  const best = useful.join(' ').replace(/[^\p{L}]/gu, '').length >= 25 ? useful : own.length ? own : [text]
  return clipText(masked(best.join(' ')))
}

// Quita las comillas sueltas al inicio y al final de un trozo de versículo («“‘Pero yo…’.» → «Pero yo….»).
export function trimQuotes(s) {
  let t = s.trim().replace(/^[\u201c\u201d"\u2018\u2019'\u00ab\u00bb\s]+/, '').replace(/[\u201c\u201d"\u2018\u2019'\u00ab\u00bb]+(?=[.,;:!?\s]*$)/, '')
  // Un cierre que quedó sin su apertura (el versículo empezaba a media cita) también sobra.
  for (const [open, close] of [['\u201c', '\u201d'], ['\u2018', '\u2019'], ['\u00ab', '\u00bb']]) if (!t.includes(open)) t = t.split(close).join('')
  return t
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
      prompt: guessPrompt(defText(n.note), n.title, { others: others.map((o) => o.title), texts: pool.map((o) => defText(o.note)) }),
      options: opts.map((o) => o.title),
      answer: opts.indexOf(n),
      nodeId: n.id,
    }
  })
}

// "Parejas": unir títulos con su definición corta.
export function buildPairs(nodes, count = 4, rnd = Math.random) {
  const pool = playableNodes(nodes).filter((n) => n.id !== ROOT_ID || defText(n.note))
  if (pool.length < 3) return null
  const chosen = shuffle(pool, rnd).slice(0, count)
  return {
    left: shuffle(chosen.map((n) => ({ id: n.id, text: n.title })), rnd),
    right: shuffle(chosen.map((n) => ({ id: n.id, text: clipText(maskTitle(defText(n.note), n.title), 90) })), rnd),
  }
}

// "Tarjetas": frente y reverso para repasar (nodos y textos diarios).
export function buildCards(nodes, entries) {
  const cards = playableNodes(nodes).map((n) => ({ id: n.id, front: n.title, back: defText(n.note) }))
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

// Repasar hoy: una tarjeta se pregunta de forma que no se pueda hacer trampa.
// Si su título es una cita con versículo → armar la cita con el texto a la vista.
// Si no → leer lo de atrás y elegir el título entre 4 (otras tarjetas que no son citas).
// Devuelve null si no hay con qué armar la pregunta (se queda como tarjeta normal).
export function cardCheck(card, cards, rnd = Math.random) {
  if (citeSteps(card.front, rnd) && card.back?.trim()) return { type: 'cite', verse: { fields: { cita: card.front, texto: card.back } } }
  if (!card.back?.trim()) return null
  const seen = new Set([normKey(card.front)])
  const others = shuffle(cards, rnd).filter((c) => {
    const k = normKey(c.front)
    if (seen.has(k) || citeSteps(c.front, rnd)) return false
    seen.add(k)
    return true
  }).slice(0, 3)
  if (!others.length) return null
  const options = shuffle([card.front, ...others.map((c) => c.front)], rnd)
  const prompt = guessPrompt(card.back, card.front, { others: others.map((c) => c.front), texts: cards.map((c) => c.back ?? '') })
  return { type: 'choice', prompt, options, answer: options.indexOf(card.front) }
}

// ---------- Tu Atalaya en el repaso ----------

// Tus respuestas de La Atalaya como tarjetas: cada pregunta de párrafo y cada "¿Qué responderías?"
// con lo que tú contestaste (solo las que tienen respuesta). Lo más reciente primero, en el orden del artículo.
export function atalayaCards(entries) {
  const out = []
  const list = entries
    .filter((e) => e.kind === 'reunion' && String(e.fields.articulo ?? '').trim())
    .sort((a, b) => String(b.fields.fecha ?? '').localeCompare(String(a.fields.fecha ?? '')) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  for (const e of list) {
    const art = parseArticle(e.fields.articulo)
    const title = e.fields.titulo || (e.fields.tipo === 'entresemana' ? 'Reunión de entre semana' : 'La Atalaya')
    const add = (id, label, front, back) => {
      if (!front.trim() || back.replace(/[^\p{L}]/gu, '').length < 8) return
      out.push({ id: e.id + ':' + id, group: e.id, title, label, front: front.trim(), back: back.trim() })
    }
    for (const b of art.bloques) add(b.key, `Párr. ${b.key}`, b.pregunta, answerOf(e.fields, b.key))
    art.repaso.forEach((q, i) => add('r' + i, '¿Qué responderías?', q, reviewAnswer(e.fields, q)))
  }
  return out
}

// Sin trampa: la pregunta y elegir tu respuesta entre 4 (las otras son tus respuestas a otras
// preguntas, primero del mismo artículo). null si no hay con qué armar las opciones.
export function atalayaCheck(card, cards, rnd = Math.random) {
  const answer = clipText(card.back, 160)
  const seen = new Set([fold(answer)])
  const pool = [...shuffle(cards.filter((c) => c.group === card.group), rnd), ...shuffle(cards.filter((c) => c.group !== card.group), rnd)]
  const others = []
  for (const c of pool) {
    if (others.length >= 3) break
    const o = clipText(c.back, 160)
    if (seen.has(fold(o))) continue
    seen.add(fold(o))
    others.push(o)
  }
  if (others.length < 3) return null
  const options = shuffle([answer, ...others], rnd)
  return { options, answer: options.indexOf(answer) }
}

// ---------- "¿Con qué texto lo pruebas?" ----------

// Una idea de tu mapa y elegir el texto bíblico que la apoya: los que enlaza ([[Juan 17:3]]) o
// menciona en su definición. Las opciones falsas son textos de tus otras ideas. Los nodos que ya son
// un texto ("Salmo 15:3") no son preguntas, ni los que citan tantos textos que cualquiera serviría.
export function buildProofQuestions(nodes, count = 10, rnd = Math.random) {
  const ideas = []
  const all = new Map() // clave de la cita → la cita como la escribiste
  for (const n of nodes) {
    if (!n.title.trim() || parseRef(n.title)) continue
    const refs = new Map()
    for (const r of findRefs(defText(n.note))) {
      const k = refKey(r)
      if (k && parseRef(r)?.verse && !refs.has(k)) refs.set(k, r)
    }
    if (!refs.size || refs.size > 4) continue
    ideas.push({ n, refs })
    for (const [k, r] of refs) if (!all.has(k)) all.set(k, r)
  }
  const out = []
  for (const { n, refs } of shuffle(ideas, rnd)) {
    if (out.length >= count) break
    const others = shuffle([...all].filter(([k]) => !refs.has(k)), rnd).slice(0, 3).map(([, r]) => r)
    if (others.length < 3) continue
    const mine = [...refs.values()]
    const right = mine[Math.floor(rnd() * mine.length)]
    const options = shuffle([right, ...others], rnd)
    out.push({ prompt: n.title, options, answer: options.indexOf(right), ref: right, also: mine.filter((r) => r !== right), nodeId: n.id })
  }
  return out
}

// ---------- Memorizar textos ----------

export function makeVerse({ cita = '', texto = '' } = {}) {
  const now = Date.now()
  return { id: newId(), kind: 'memoria', fields: { cita: cita.trim(), texto: cleanVerseText(texto), nivel: 0 }, createdAt: now, updatedAt: now }
}

// Memorizar textos: solo los textos de la Biblia que el usuario agregó. El Texto diario no entra
// (tampoco las copias que se hicieron de él cuando sí entraba).
export function memorizeSources(entries) {
  const daily = new Set(entries.filter((e) => e.kind === 'diario' && e.fields.texto?.trim()).flatMap((e) => [normKey(e.fields.texto), normKey(stripRef(e.fields.texto))]))
  return entries.filter((e) => e.kind === 'memoria' && !daily.has(normKey(e.fields.texto ?? '')))
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

// (?<!…) en vez de \b: en JavaScript la É de Éxodo no cuenta como letra para \b.
const REF_RE = /\(?(?<![\p{L}\d])((?:[1-3]\s?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+\.?\s\d{1,3}:\d{1,3}(?:\s?[-–,]\s?\d{1,3})*)\)?\.?\s*$/u
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
    return { prompt: clipText(trimQuotes(v.fields.texto), 260), options: opts.map((o) => o.fields.cita), answer: opts.indexOf(v), key: 'cita:' + v.id }
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

// Una sesión de repaso: primero lo que ya viste y hoy toca (lo más atrasado primero, alternando tipos);
// después, si queda lugar, hasta `fresh` cosas nuevas (`fresh: true`). Lo nuevo de tu Atalaya va primero
// y en orden; lo demás, alternado. Los personajes solo entran si ya los viste en Memoria Bíblica.
export function dailyMix({ atalaya = [], cards = [], verses = [], trivia = [], people = [] }, srs, isDueFn, limit = 20, rnd = Math.random, fresh = Infinity) {
  const tag = (type, prefix, list) => list.map((item) => ({ type, key: prefix + item.id, item }))
  const lists = [tag('atalaya', 'a:', atalaya), tag('card', 'c:', cards), tag('verse', 'v:', verses), tag('trivia', 'q:', trivia), tag('person', 'mb:', people)]
  const due = lists.map((l) => shuffle(l.filter((x) => srs[x.key] && isDueFn(srs[x.key])), rnd).sort((a, b) => (srs[a.key].due ?? '').localeCompare(srs[b.key].due ?? '')))
  const out = alternate(due, limit)
  const [mine, ...rest] = lists.slice(0, 4).map((l) => l.filter((x) => !srs[x.key]).map((x) => ({ ...x, fresh: true })))
  const news = [...mine, ...alternate(rest.map((l) => shuffle(l, rnd)), Infinity)]
  return [...out, ...news.slice(0, Math.max(0, Math.min(fresh, limit - out.length)))]
}

// Toma uno de cada lista por turno hasta llegar a `limit`.
function alternate(lists, limit) {
  const ls = lists.map((l) => [...l])
  const out = []
  while (out.length < limit && ls.some((l) => l.length)) {
    for (const l of ls) if (l.length && out.length < limit) out.push(l.shift())
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
    out.push({ prompt: clipText(trimQuotes(prompt), 320), options, answer: options.indexOf(word), ref: v.fields.cita || undefined, key: 'llenar:' + v.id })
  }
  return out
}

// Ordenar una sección completa (Pentateuco, Históricos…; menos Apocalipsis, que es uno solo).
export function sectionRun(rnd = Math.random) {
  const list = SECTIONS.filter((s) => s.to > s.from)
  const s = list[Math.floor(rnd() * list.length)]
  return { name: s.name, books: BOOKS.slice(s.from - 1, s.to) }
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
