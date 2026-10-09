// La Atalaya por pasos: lee el artículo pegado (sin servicios externos) y lo separa en
// texto temático, subtítulos, preguntas con sus párrafos y preguntas de repaso.
// Funciona con lo que se copia de JW Library ("1. ¿Pregunta?" + "2 Párrafo…") y con "## Subtítulos".

// Pasos del estudio, según "¿Cuál es la mejor forma de prepararse para las reuniones?" (jw.org):
// idea general primero, luego cada párrafo buscando la respuesta y al final el repaso.
export const STEPS = [
  { key: 'articulo', label: 'Artículo' },
  { key: 'vistazo', label: 'Vistazo' },
  { key: 'parrafos', label: 'Párrafos' },
  { key: 'repaso', label: 'Repaso' },
  { key: 'conceptos', label: 'Conceptos' },
  { key: 'listo', label: 'Listo' },
]

// "4, 5. ¿Pregunta?" o "6. Explica…": número(s) con punto. Los párrafos llevan el número sin punto ("2 La…").
const QUESTION = /^(\d+(?:\s*(?:,|y|-|–)\s*\d+)*)\.\s+(\S.*)$/
const HEADING = /^#{1,4}\s+(.+)$/
const SONG = /^canci[oó]n\s+\d+/i
const REVIEW = /qu[eé] responder[ií]as|preguntas de repaso|repaso|qu[eé] aprendimos/i
const FOOTNOTES = /^notas?$/i
const THEME_TEXT = /\(([^()]*\d+:\d+[^()]*)\)\.?$/

// Números de una pregunta: "4, 5" → [4, 5]; "6-8" → [6, 7, 8].
export function questionNums(s) {
  const out = []
  for (const part of String(s).split(/\s*(?:,|\by\b)\s*/)) {
    const m = part.match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/)
    if (!m) continue
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    for (let n = a; n <= b && n - a < 30; n++) out.push(n)
  }
  return out
}

export function parseArticle(text) {
  // Cada bloque: { key, nums, pregunta, parrafos, subtitulo, extras } (extras = imágenes y recuadros).
  const out = { tema: '', resumen: '', subtitulos: [], bloques: [], repaso: [], canciones: [] }
  const lines = String(text ?? '').replace(/\r/g, '').split('\n').map((l) => l.trim())
  let section = 'intro' // intro | resumen | cuerpo | repaso | notas
  let block = null
  let pendingSub = ''
  let para = []

  const flushPara = () => {
    if (!para.length) return
    const t = para.map((l) => (/^[-•]\s/.test(l) ? '\n' + l : l)).join(' ').replace(/ \n/g, '\n').replace(/^\n/, '').trim()
    para = []
    if (!t) return
    if (section === 'resumen') out.resumen = [out.resumen, t].filter(Boolean).join(' ')
    else if (block) {
      const m = t.match(/^(\d+)\s+(.+)$/s)
      const numbered = m && block.nums.includes(Number(m[1]))
      if (pendingSub) {
        // Un subtítulo con texto antes de la siguiente pregunta es un recuadro, no un subtítulo.
        block.extras.push(`${pendingSub}: ${t}`)
        out.subtitulos.pop()
        pendingSub = ''
      } else if (numbered) block.parrafos.push(m[2]) // quita el número del párrafo ("2 La voluntad…")
      else if (!block.parrafos.length) block.parrafos.push(t) // el primer párrafo no lleva número
      else block.extras.push(t) // descripción de una imagen o texto de un recuadro
    }
  }

  for (const line of lines) {
    if (!line) { flushPara(); continue }
    const h = line.match(HEADING)
    const q = line.match(QUESTION)
    if (SONG.test(line)) { flushPara(); out.canciones.push(line); continue }
    if (h) {
      flushPara()
      const title = h[1].replace(/[*_]/g, '').trim()
      if (REVIEW.test(title)) section = 'repaso'
      else if (FOOTNOTES.test(title)) section = 'notas'
      else if (/^(tema|avance)$/i.test(title)) section = 'resumen'
      else if (section !== 'notas') {
        section = 'cuerpo'
        pendingSub = title
        out.subtitulos.push(title)
      }
      continue
    }
    if (section === 'notas') continue
    // JW Library copia "Respuesta" (su cuadro para contestar) antes de cada párrafo.
    if (/^respuesta:?$/i.test(line)) { flushPara(); continue }
    if (section === 'repaso') {
      const t = line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()
      if (t) out.repaso.push(t)
      continue
    }
    if (q) {
      flushPara()
      section = 'cuerpo'
      const nums = questionNums(q[1])
      block = { key: nums.join(', ') || q[1], nums, pregunta: q[2].trim(), parrafos: [], subtitulo: pendingSub, extras: [] }
      pendingSub = ''
      out.bloques.push(block)
      continue
    }
    if (section === 'intro') {
      if (!out.tema && /[“"«]/.test(line) && THEME_TEXT.test(line)) out.tema = line
      continue
    }
    para.push(line)
  }
  flushPara()

  // Sin preguntas reconocidas: cada párrafo con número es un bloque (sin pregunta).
  if (!out.bloques.length) {
    const chunks = String(text ?? '').split(/\n\s*\n/).map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean)
    for (const c of chunks) {
      const m = c.match(/^(\d+)\s+(.+)$/)
      if (m) out.bloques.push({ key: m[1], nums: [Number(m[1])], pregunta: '', parrafos: [m[2]], subtitulo: '', extras: [] })
    }
  }
  return out
}

// Respuesta guardada de un bloque (fields.parrafos usa { num, nota }).
export function answerOf(fields, key) {
  return (fields.parrafos ?? []).find((p) => String(p.num) === String(key))?.nota ?? ''
}

export function withAnswer(fields, key, nota) {
  const list = [...(fields.parrafos ?? [])]
  const i = list.findIndex((p) => String(p.num) === String(key))
  if (i >= 0) list[i] = { ...list[i], nota }
  else list.push({ num: String(key), nota })
  return { ...fields, parrafos: list }
}

// Respuestas del repaso final (fields.repaso = [{ pregunta, nota }]).
export function reviewAnswer(fields, pregunta) {
  return (fields.repaso ?? []).find((r) => r.pregunta === pregunta)?.nota ?? ''
}

export function withReview(fields, pregunta, nota) {
  const list = [...(fields.repaso ?? [])]
  const i = list.findIndex((r) => r.pregunta === pregunta)
  if (i >= 0) list[i] = { ...list[i], nota }
  else list.push({ pregunta, nota })
  return { ...fields, repaso: list }
}

// Palabras de un párrafo para marcarlas como clave (se guardan por posición).
export function words(text) {
  return String(text ?? '').split(/\s+/).filter(Boolean)
}

// Las palabras marcadas de un bloque, en orden, juntando las seguidas ("conocimiento exacto").
export function keyPhrases(bloque, marks = []) {
  const all = bloque.parrafos.flatMap(words)
  const set = [...new Set(marks)].filter((i) => i < all.length).sort((a, b) => a - b)
  const out = []
  let cur = []
  let prev = -2
  for (const i of set) {
    if (i !== prev + 1 && cur.length) { out.push(cur.join(' ')); cur = [] }
    cur.push(all[i].replace(/^[“"«(¡¿]+|[”"»).,;:!?]+$/g, ''))
    prev = i
  }
  if (cur.length) out.push(cur.join(' '))
  return out.filter(Boolean)
}

// Cuántas preguntas del artículo ya respondiste (lo mismo que cuenta el paso "Listo").
export function answeredCount(fields) {
  const bloques = parseArticle(fields?.articulo).bloques
  return { done: bloques.filter((b) => answerOf(fields, b.key).trim()).length, total: bloques.length }
}

// Dónde seguir: el primer bloque sin respuesta.
export function firstUnanswered(bloques, fields) {
  const i = bloques.findIndex((b) => !answerOf(fields, b.key).trim())
  return i < 0 ? Math.max(0, bloques.length - 1) : i
}

// Enlace al párrafo en jw.org. Con el enlace del artículo (wol.jw.org o jw.org) abre el
// artículo y salta al párrafo marcándolo (#:~:text=, lo entiende Safari); sin él, busca
// las primeras palabras del párrafo en wol.jw.org.
export function paragraphUrl(enlace, parrafo) {
  // Hasta 6 palabras, sin cruzar comillas: el marcador #:~:text= tiene que coincidir letra por letra.
  const first = []
  for (const w of words(String(parrafo ?? ''))) {
    if (first.length >= 6 || (first.length && /^[“"«(]/.test(w))) break
    first.push(w.replace(/^[“"«(]+/, ''))
    if (/[“”"«»)]$/.test(w)) break
  }
  const start = first.join(' ').replace(/[.,;:“”"«»)]+$/, '')
  const url = String(enlace ?? '').trim().split('#')[0]
  if (/^https:\/\/(wol\.jw\.org|www\.jw\.org)\//.test(url)) return start ? `${url}#:~:text=${encodeURIComponent(start)}` : url
  return `https://wol.jw.org/es/wol/s/r4/lp-s?q=${encodeURIComponent(`"${start}"`)}&p=par&r=occ`
}

// El artículo con tus palabras clave subrayadas (==así==) para guardarlo en el mapa. Se buscan en el
// texto original a partir del párrafo de cada pregunta; lo que no se encuentra se deja igual.
export function highlightArticle(articulo, marcas = {}) {
  const text = String(articulo ?? '')
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const spots = []
  for (const b of parseArticle(text).bloques) {
    const set = new Set(marcas?.[b.key] ?? [])
    if (!set.size) continue
    // Grupos de palabras marcadas seguidas, sin cruzar de un párrafo a otro.
    const runs = []
    let w = 0
    for (const p of b.parrafos) {
      let cur = []
      for (const word of words(p)) {
        if (set.has(w++)) cur.push(word)
        else if (cur.length) { runs.push(cur); cur = [] }
      }
      if (cur.length) runs.push(cur)
    }
    const head = words(b.parrafos[0]).slice(0, 6)
    const start = head.length ? new RegExp(head.map(esc).join('\\s+')).exec(text) : null
    let from = start ? start.index : 0
    for (const run of runs) {
      const re = new RegExp(run.map(esc).join('\\s+'), 'g')
      re.lastIndex = from
      const m = re.exec(text)
      if (!m) continue
      // Sin la puntuación de las orillas: "==conocimiento exacto==," y no "==conocimiento exacto,==".
      const lead = m[0].match(/^[“"«(¡¿]*/)[0].length
      const tail = m[0].match(/[”"»).,;:!?]*$/)[0].length
      if (m[0].length - lead - tail > 0) spots.push([m.index + lead, m.index + m[0].length - tail])
      from = m.index + m[0].length
    }
  }
  let out = text
  for (const [a, z] of spots.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + '==' + out.slice(a, z) + '==' + out.slice(z)
  return out
}

// Para el modo reunión: cada pregunta en orden (con su subtítulo como sección) y tu respuesta,
// y al final los "¿Qué responderías?".
export function meetingItems(fields) {
  const art = parseArticle(fields?.articulo)
  let section = ''
  const out = art.bloques.map((b) => {
    if (b.subtitulo) section = b.subtitulo
    return { key: b.key, section, label: `${b.nums.length > 1 ? 'Párrafos' : 'Párrafo'} ${b.key}`, question: b.pregunta, answer: answerOf(fields, b.key) }
  })
  art.repaso.forEach((q, i) => out.push({ key: 'r' + i, section: '¿Qué responderías?', label: 'Repaso', question: q, answer: reviewAnswer(fields, q) }))
  return out
}
