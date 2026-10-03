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

// Dónde seguir: el primer bloque sin respuesta.
export function firstUnanswered(bloques, fields) {
  const i = bloques.findIndex((b) => !answerOf(fields, b.key).trim())
  return i < 0 ? Math.max(0, bloques.length - 1) : i
}
