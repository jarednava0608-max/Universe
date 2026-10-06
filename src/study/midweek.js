import { parseArticle } from './atalaya.js'

// Lee el programa de la reunión de entre semana (Vida y Ministerio Cristianos) tal como se copia
// de la Guía de actividades en JW Library: la semana, la lectura, las tres secciones y cada parte
// numerada ("1. Título" y abajo "(10 mins.)"). Cada renglón seguido de "Respuesta" es una pregunta
// para contestar, igual que "PARA MEDITAR:". Las canciones y las palabras de conclusión se ignoran.

export const STEPS = [
  { key: 'programa', label: 'Programa' },
  { key: 'partes', label: 'Partes' },
  { key: 'listo', label: 'Listo' },
]

// [cómo viene, nombre, clave para su color]
const SECTIONS = [
  [/^tesoros de la biblia$/, 'Tesoros de la Biblia', 'tesoros'],
  [/^seamos mejores maestros$/, 'Seamos mejores maestros', 'maestros'],
  [/^nuestra vida cristiana$/, 'Nuestra vida cristiana', 'vida'],
]

const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

// "JEREMÍAS 40, 41" → "Jeremías 40, 41"
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s(])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())

export function parseProgram(text) {
  const out = { semana: '', lectura: '', partes: [] }
  let seccion = ''
  let sec = ''
  let part = null
  let ended = false
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line || ended) continue
    const p = plain(line)
    const found = SECTIONS.find(([re]) => re.test(p))
    if (found) {
      seccion = found[1]
      sec = found[2]
      part = null
      continue
    }
    if (/^palabras de conclusion/.test(p)) {
      ended = true
      continue
    }
    if (/^cancion \d+/.test(p)) continue
    if (!seccion) {
      // Antes de la primera sección: la semana y la lectura de la Biblia.
      if (/^\d+$/.test(line)) continue
      if (!out.semana && /^\d{1,2}\b.*\bde [a-z]+$/.test(p)) out.semana = line.toLowerCase()
      else if (out.semana && !out.lectura && line === line.toUpperCase() && /\p{L}/u.test(line)) out.lectura = titleCase(line)
      continue
    }
    const start = line.match(/^(\d{1,2})\.\s+(.+)$/)
    if (start && Number(start[1]) === (out.partes.at(-1)?.num ?? 0) + 1) {
      part = { num: Number(start[1]), titulo: start[2], seccion, sec, minutos: 0, lineas: [] }
      out.partes.push(part)
      continue
    }
    if (!part) continue
    const mins = line.match(/^\((\d+)\s*min[^)]*\)\s*(.*)$/i)
    if (mins && !part.minutos) {
      part.minutos = Number(mins[1])
      if (mins[2]) part.lineas.push({ text: mins[2] })
      continue
    }
    if (p === 'respuesta') {
      const last = part.lineas.at(-1)
      if (last) last.q = true
      continue
    }
    if (/^para meditar:/.test(p)) part.lineas.push({ text: line.replace(/^para meditar:\s*/i, ''), q: true, meditar: true })
    // Lo que describe imágenes y videos va aparte, más tenue.
    else if (/^(imagenes del video|serie de imagenes|ponga el video)/.test(p)) part.lineas.push({ text: line, media: true })
    else part.lineas.push({ text: line })
  }
  // Cada pregunta con su clave ("1-0", "8-2"…); una parte sin preguntas tiene sus notas ("3").
  for (const pt of out.partes) {
    let i = 0
    for (const l of pt.lineas) if (l.q) l.key = `${pt.num}-${i++}`
    pt.keys = i ? pt.lineas.filter((l) => l.q).map((l) => l.key) : [String(pt.num)]
  }
  return out
}

// Título para la lista de Reuniones: la lectura de la semana ("Jeremías 40, 41").
export const programTitle = (prog) => prog.lectura || (prog.semana ? `Semana del ${prog.semana}` : '')

const qText = (l) => (l.meditar ? 'Para meditar: ' : '') + l.text

export const answerOf = (fields, key) => String(fields?.respuestas?.[key] ?? '')
export const withAnswer = (fields, key, v) => ({ ...fields, respuestas: { ...(fields.respuestas ?? {}), [key]: v } })

// El estudio bíblico de la congregación: se puede pegar el capítulo del libro y contestarlo
// pregunta por pregunta, como La Atalaya (mismo lector, `parseArticle`). Sus respuestas van en
// `respuestas` con la clave "e:<párrafo>".
export const isStudyPart = (pt) => /estudio b[ií]blico de la congregaci[oó]n/i.test(pt.titulo)
export const studyBlocks = (fields) => parseArticle(fields?.estudio).bloques.filter((b) => b.pregunta)
const studyKey = (b) => 'e:' + b.key

// Las claves que hay que llenar en una parte: sus preguntas; el capítulo del estudio si lo pegaste;
// si no tiene preguntas, sus notas.
export function keysOf(fields, pt) {
  if (isStudyPart(pt)) {
    const bs = studyBlocks(fields)
    if (bs.length) return bs.map(studyKey)
  }
  return pt.keys
}

// Una parte está lista si contestaste todas sus preguntas (o escribiste algo en sus notas).
export const partDone = (fields, pt) => keysOf(fields, pt).every((k) => answerOf(fields, k).trim())

// Cuántas preguntas contestaste (las del programa y las del estudio bíblico; no las notas).
export function midweekCount(fields) {
  const keys = [
    ...parseProgram(fields?.programa).partes.flatMap((pt) => pt.lineas.filter((l) => l.q).map((l) => l.key)),
    ...studyBlocks(fields).map(studyKey),
  ]
  return { done: keys.filter((k) => answerOf(fields, k).trim()).length, total: keys.length }
}

// Cada pregunta con tu respuesta, por parte: [{ pt, rows: [{ key, pregunta, respuesta }] , nota }].
// Lo usan "Copiar para Claude", "Proponer al mapa" y Repasar hoy.
export function midweekAnswers(fields) {
  const out = []
  for (const pt of parseProgram(fields?.programa).partes) {
    const rows = pt.lineas.filter((l) => l.q).map((l) => ({ key: l.key, pregunta: qText(l), respuesta: answerOf(fields, l.key).trim() }))
    if (isStudyPart(pt)) for (const b of studyBlocks(fields)) rows.push({ key: studyKey(b), pregunta: b.pregunta, respuesta: answerOf(fields, studyKey(b)).trim() })
    const nota = !pt.lineas.some((l) => l.q) ? answerOf(fields, String(pt.num)).trim() : ''
    out.push({ pt, rows: rows.filter((r) => r.respuesta), nota })
  }
  return out
}

// La lectura de la semana, capítulo por capítulo: "Jeremías 40, 41" → ["Jeremías 40", "Jeremías 41"];
// también "Jeremías 40-42".
export function readingChapters(lectura) {
  const m = String(lectura ?? '').trim().match(/^((?:\d\s*)?\p{L}[\p{L}\s.]*?)\s+(\d[\d\s,–-]*)$/u)
  if (!m) return []
  const out = []
  for (const part of m[2].split(',')) {
    const [a, b] = part.split(/[–-]/).map((x) => Number(x.trim()))
    if (!a) continue
    for (let c = a; c <= (b && b >= a && b - a < 30 ? b : a); c++) out.push(`${m[1].trim()} ${c}`)
  }
  return out
}

// Para "Copiar para Claude": cada parte con sus preguntas y lo que contesté.
export function midweekForClaude(fields) {
  return midweekAnswers(fields)
    .map(({ pt, rows, nota }) => {
      const lines = [...rows.map((r) => `${r.pregunta}\n${r.respuesta}`), ...(nota ? [nota] : [])]
      return lines.length ? `${pt.num}. ${pt.titulo}\n${lines.join('\n')}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

// Para "Proponer al mapa": solo lo que tú escribiste (cada pregunta con tu respuesta y tus notas
// de cada parte), cómo lo aplicas y los textos de la semana. El texto del programa no se copia.
export function midweekNode(fields) {
  const prog = parseProgram(fields?.programa)
  const year = String(fields?.fecha ?? '').slice(0, 4)
  const title = prog.semana ? `Vida y Ministerio, ${prog.semana}${year ? ` de ${year}` : ''}` : String(fields?.titulo ?? '').trim() || 'Reunión de entre semana'
  const parts = []
  if (prog.lectura) parts.push(`Lectura de la semana: ${prog.lectura}`)
  for (const { pt, rows, nota } of midweekAnswers(fields)) {
    const lines = [...rows.map((r) => `${r.pregunta}\n${r.respuesta}`), ...(nota ? [nota] : [])]
    if (lines.length) parts.push(`## ${pt.titulo}\n${lines.join('\n\n')}`)
  }
  if (String(fields?.aplicacion ?? '').trim()) parts.push(`## Cómo lo aplico\n${fields.aplicacion.trim()}`)
  if (String(fields?.notas ?? '').trim()) parts.push(`## Notas\n${fields.notas.trim()}`)
  return { title, note: parts.join('\n\n') }
}

// Las reuniones de esa semana en wol.jw.org ("2026-10-07" → .../meetings/r4/lp-s/2026/41):
// wol las ordena por año y número de semana (ISO, la semana empieza en lunes).
export function meetingsUrl(fecha) {
  const [y, m, d] = String(fecha ?? '').split('-').map(Number)
  if (!y || !m || !d) return 'https://wol.jw.org/es/wol/h/r4/lp-s'
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)) // el jueves de esa semana
  const week = Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7)
  return `https://wol.jw.org/es/wol/meetings/r4/lp-s/${t.getUTCFullYear()}/${week}`
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const isoOf = (d) => d.toISOString().slice(0, 10)

// El lunes de la semana del programa ("5-11 de octubre", "28 de septiembre a 4 de octubre").
// El programa no trae el año: se toma el más cercano a `ref` (la fecha de la entrada o la de hoy).
export function programMonday(semana, ref = isoOf(new Date())) {
  const m = plain(String(semana ?? '').replace(/setiembre/i, 'septiembre')).match(/^(\d{1,2})(?:\s+de\s+([a-z]+))?\b.*?\bde\s+([a-z]+)$/)
  const month = m ? MONTHS.indexOf(m[2] || m[3]) : -1
  if (month < 0) return null
  const r = Date.parse(ref) || Date.now()
  const y = new Date(r).getUTCFullYear()
  const start = [y - 1, y, y + 1].map((yy) => Date.UTC(yy, month, Number(m[1]))).sort((a, b) => Math.abs(a - r) - Math.abs(b - r))[0]
  const d = new Date(start)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return isoOf(d)
}

// La fecha de la reunión: el día de tu reunión entre semana (0 = domingo) en la semana del programa.
export function programDate(semana, weekday, ref) {
  const monday = programMonday(semana, ref)
  if (!monday || weekday == null) return null
  const d = new Date(monday + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + ((Number(weekday) + 6) % 7))
  return isoOf(d)
}

// Parte un texto en trozos normales y los que van entre paréntesis (citas y publicaciones),
// que se muestran más tenues: "Jehová protegió a Jeremías (Jer 40:2-4)." →
// [{ text: 'Jehová protegió a Jeremías ' }, { text: '(Jer 40:2-4)', aside: true }, { text: '.' }]
export function splitAsides(text) {
  const out = []
  let last = 0
  for (const m of String(text ?? '').matchAll(/\([^()]*\)/g)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ text: m[0], aside: true })
    last = m.index + m[0].length
  }
  if (last < String(text ?? '').length) out.push({ text: text.slice(last) })
  return out
}

// Parte un texto en trozos y citas tocables (en el orden en que aparecen).
export function splitRefs(text, refs) {
  const out = []
  let rest = String(text ?? '')
  for (const r of refs) {
    const i = rest.indexOf(r)
    if (i < 0) continue
    if (i) out.push({ text: rest.slice(0, i) })
    out.push({ text: r, ref: true })
    rest = rest.slice(i + r.length)
  }
  if (rest) out.push({ text: rest })
  return out
}

// Para el modo reunión: cada pregunta en orden con su sección y tu respuesta; las del estudio
// bíblico si pegaste el capítulo; y las notas de las partes sin preguntas, solo si escribiste algo.
export function meetingItems(fields) {
  const out = []
  for (const pt of parseProgram(fields?.programa).partes) {
    const base = { section: pt.seccion, sec: pt.sec }
    for (const l of pt.lineas) if (l.q) out.push({ ...base, key: l.key, label: `Parte ${pt.num}`, question: qText(l), answer: answerOf(fields, l.key) })
    const study = isStudyPart(pt) ? studyBlocks(fields) : []
    for (const b of study) out.push({ ...base, key: studyKey(b), label: `Estudio bíblico · ${b.nums.length > 1 ? 'Párrafos' : 'Párrafo'} ${b.key}`, question: b.pregunta, answer: answerOf(fields, studyKey(b)) })
    const nota = !pt.lineas.some((l) => l.q) && !study.length ? answerOf(fields, String(pt.num)).trim() : ''
    if (nota) out.push({ ...base, key: String(pt.num), label: `Parte ${pt.num}`, question: pt.titulo, answer: nota })
  }
  return out
}

// Las respuestas que marcaste con estrellita para comentarlas (La Atalaya y entre semana).
export const isStarred = (fields, key) => (fields?.comentar ?? []).includes(key)
export const withStar = (fields, key) => ({ ...fields, comentar: isStarred(fields, key) ? fields.comentar.filter((k) => k !== key) : [...(fields.comentar ?? []), key] })
