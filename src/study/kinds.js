// Pestaña Estudio: definición de cada apartado (campos, formato para Claude y
// cómo se resume en un nodo del mapa). Para agregar un apartado nuevo basta con
// añadir una entrada a KINDS.
import { newId } from '../lib/model.js'
import { findRefs } from '../lib/bible.js'
import { highlightArticle } from './atalaya.js'
import { midweekForClaude, midweekNode } from './midweek.js'

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Tipos de campo: 'date', 'line' (una línea), 'text' (varias líneas),
// 'choice' (opciones), 'paragraphs' (lista de párrafos con nota).
export const KINDS = {
  diario: {
    label: 'Texto diario',
    short: 'Diario',
    desc: 'Texto, principio y aplicación de cada día',
    icon: 'M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', default: today },
      { key: 'texto', label: 'Texto', type: 'text', hint: 'El versículo del día y su cita' },
      { key: 'contexto', label: 'Contexto', type: 'text' },
      { key: 'principio', label: 'Principio bíblico', type: 'text' },
      { key: 'relato', label: 'Relato de apoyo', type: 'text' },
      { key: 'aplicacion', label: 'Aplicación', type: 'text' },
      { key: 'resumen', label: 'Resumen en 3-4 palabras', type: 'line' },
      { key: 'notas', label: 'Mis notas', type: 'text' },
    ],
    title: (e) => e.fields.resumen || firstLine(e.fields.texto) || 'Texto diario',
    subtitle: (e) => formatDate(e.fields.fecha),
    toNode: (f) => ({
      title: f.resumen || firstRef(f.texto) || 'Texto diario',
      idea: f.aplicacion,
      principio: f.principio,
      textos: refsIn(f.texto, f.contexto, f.relato, f.aplicacion),
    }),
  },

  reunion: {
    label: 'Reuniones',
    short: 'Reunión',
    desc: 'Atalaya y reunión de entre semana',
    icon: 'M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 20v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75',
    fields: [
      { key: 'tipo', label: 'Reunión', type: 'choice', options: [['atalaya', 'La Atalaya'], ['entresemana', 'Entre semana']], default: () => 'atalaya' },
      { key: 'fecha', label: 'Fecha', type: 'date', default: today },
      { key: 'titulo', label: 'Título', type: 'line' },
      { key: 'articulo', label: '1. Pega la Atalaya', type: 'text', hint: 'El artículo completo, tal cual; luego "Proponer al mapa" lo guarda como nodo', noClaude: true },
      { key: 'parrafos', label: '2. Preguntas: mis respuestas por párrafo', type: 'paragraphs' },
      { key: 'idea', label: 'Idea principal', type: 'text' },
      { key: 'aplicacion', label: 'Cómo lo aplico', type: 'text' },
      { key: 'notas', label: 'Notas generales', type: 'text' },
    ],
    title: (e) => e.fields.titulo || (e.fields.tipo === 'entresemana' ? 'Reunión de entre semana' : 'La Atalaya'),
    subtitle: (e) => [e.fields.tipo === 'entresemana' ? 'Entre semana' : 'La Atalaya', formatDate(e.fields.fecha)].filter(Boolean).join(' · '),
    toNode: (f) => ({
      title: f.titulo || 'Reunión',
      idea: f.idea,
      textos: refsIn(f.idea, f.aplicacion, f.notas, ...(f.parrafos ?? []).map((p) => p.nota), ...(f.repaso ?? []).map((r) => r.nota)),
    }),
  },

  estudio: {
    label: 'Preparar estudios',
    short: 'Estudio',
    desc: 'Método Aha: gancho, extracción y golpe lógico',
    icon: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z',
    fields: [
      { key: 'titulo', label: 'Título', type: 'line' },
      { key: 'idea', label: 'Idea central', type: 'text' },
      { key: 'gancho', label: 'Gancho', type: 'text', hint: 'La pregunta o situación que despierta interés' },
      { key: 'extraccion', label: 'Extracción', type: 'text', hint: 'Lo que se saca del texto o la publicación' },
      { key: 'golpe', label: 'Golpe lógico', type: 'text', hint: 'El razonamiento que lleva a la conclusión' },
      { key: 'aha', label: 'Aha extra (opcional)', type: 'text' },
      { key: 'resumen', label: 'Resumen', type: 'text' },
    ],
    title: (e) => e.fields.titulo || 'Estudio sin título',
    subtitle: (e) => firstLine(e.fields.idea),
    toNode: (f) => ({
      title: f.titulo || 'Estudio',
      idea: f.idea || f.resumen,
      principio: f.golpe,
      textos: refsIn(f.idea, f.gancho, f.extraccion, f.golpe, f.aha, f.resumen),
    }),
  },

  // Notas: funcionan como la app Notas del iPhone (se guardan solas, título + texto).
  // El id sigue siendo 'reflexion' para no perder las notas ya guardadas.
  reflexion: {
    label: 'Notas',
    short: 'Nota',
    desc: 'Escribe lo que quieras; se guarda solo',
    icon: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
    notes: true,
    fields: [
      { key: 'titulo', label: 'Título', type: 'line' },
      { key: 'texto', label: 'Nota', type: 'text', hint: 'Puedes usar Markdown: ## subtítulos, **negritas**, listas, - [ ] tareas y tablas' },
    ],
    title: (e) => e.fields.titulo || firstLine(e.fields.texto) || 'Nota nueva',
    subtitle: (e) => [noteDate(e.updatedAt), firstLine(e.fields.titulo ? e.fields.texto : lines(e.fields.texto).slice(1).join(' ')) || ''].filter(Boolean).join(' · '),
    toNode: (f) => ({
      title: f.titulo || firstLine(f.texto) || 'Nota',
      idea: f.texto,
      preguntas: lines(f.preguntas),
      textos: refsIn(f.texto, f.preguntas),
    }),
  },

  // Ideas que me ayudan: la imagen que traigo en la cabeza cuando algo me sale mejor
  // ("cantar como Omar Camacho", "jugar como uno de Tigres"). Son personales: no van al mapa.
  idea: {
    label: 'Ideas que me ayudan',
    short: 'Idea',
    desc: 'La imagen que traes en la cabeza cuando algo te sale mejor',
    icon: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
    noMap: true,
    claudeNote: 'Ayúdame a describir la idea con claridad para que me sea fácil traerla a la mente.',
    fields: [
      { key: 'titulo', label: 'La idea', type: 'line', hint: 'Ej.: Cantar como Omar Camacho' },
      { key: 'para', label: 'Para qué me sirve', type: 'line', hint: 'Ej.: Cantar, jugar fútbol, predicar' },
      { key: 'como', label: 'Cómo me la imagino', type: 'text', hint: 'Ej.: Su timbre alto, su voz se escucha por encima de las demás' },
      { key: 'cambia', label: 'Qué cambia cuando la traigo', type: 'text', hint: 'Ej.: Canto con más fuerza y afinado' },
      { key: 'notas', label: 'Notas', type: 'text' },
    ],
    title: (e) => e.fields.titulo || 'Idea nueva',
    subtitle: (e) => e.fields.para || firstLine(e.fields.como),
    toNode: (f) => ({ title: f.titulo || 'Idea', idea: f.como }),
  },
}

// Partes de la reunión que te pueden asignar, con sus minutos de costumbre (se pueden cambiar).
export const PARTS = [
  ['lectura', 'Lectura de la Biblia', 4],
  ['conversacion', 'Empiece conversaciones', 3],
  ['revisita', 'Haga revisitas', 4],
  ['discipulos', 'Haga discípulos', 5],
  ['creencias', 'Explique sus creencias', 5],
  ['discurso', 'Discurso', 5],
  ['otra', 'Otra', 5],
]
export const partLabel = (k) => PARTS.find((p) => p[0] === k)?.[1] ?? ''
// Los minutos de la asignación: los que escribiste o los de costumbre de esa parte.
export const partMinutes = (f = {}) => {
  const n = parseFloat(String(f.minutos ?? '').replace(',', '.'))
  return n > 0 ? n : PARTS.find((p) => p[0] === f.parte)?.[2] ?? 5
}

KINDS.asignacion = {
  label: 'Mis asignaciones',
  short: 'Asignación',
  desc: 'Prepara tu parte y practícala con cronómetro',
  icon: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  noMap: true,
  claudeNote: 'Ayúdame a prepararla con información de jw.org y wol.jw.org, y que quepa en el tiempo de la parte.',
  fields: [
    { key: 'fecha', label: 'Fecha', type: 'date', default: today },
    { key: 'parte', label: 'Parte', type: 'choice', options: PARTS.map(([k, l]) => [k, l]), default: () => 'lectura' },
    { key: 'minutos', label: 'Minutos', type: 'line', hint: 'Si lo dejas vacío, los de costumbre' },
    { key: 'titulo', label: 'Tema o escenario', type: 'line', hint: 'Ej.: De casa en casa, hablar de la esperanza' },
    { key: 'texto', label: 'Texto o lectura', type: 'line', hint: 'Ej.: Jeremías 40:1-10' },
    { key: 'leccion', label: 'Lección para mejorar', type: 'line', hint: 'La lección del folleto que te toca' },
    { key: 'ayudante', label: 'Ayudante', type: 'line' },
    { key: 'bosquejo', label: 'Lo que voy a decir', type: 'text', hint: 'Tu introducción, las preguntas y la conclusión' },
    { key: 'notas', label: 'Notas', type: 'text' },
  ],
  title: (e) => e.fields.titulo || partLabel(e.fields.parte) || 'Asignación',
  subtitle: (e) => [partLabel(e.fields.parte), formatDate(e.fields.fecha)].filter(Boolean).join(' · '),
  toNode: (f) => ({ title: f.titulo || partLabel(f.parte), idea: f.bosquejo }),
}

// Prácticas guardadas con el cronómetro: fields.ensayos = [{ t, secs }].
export const practicedOn = (f = {}, day) => (f.ensayos ?? []).filter((x) => x?.t && isoOf(new Date(x.t)) === day)
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const clock = (secs) => `${Math.floor(Math.abs(secs) / 60)}:${String(Math.floor(Math.abs(secs) % 60)).padStart(2, '0')}`

export const KIND_ORDER = ['diario', 'reunion', 'estudio', 'reflexion', 'idea', 'asignacion']

export function makeEntry(kind) {
  const def = KINDS[kind]
  const fields = {}
  for (const f of def.fields) fields[f.key] = f.default ? f.default() : f.type === 'paragraphs' ? [] : ''
  const now = Date.now()
  return { id: newId(), kind, fields, createdAt: now, updatedAt: now }
}

// Notas viejas (de "Mis reflexiones") con preguntas abiertas aparte: se juntan en el texto al abrirlas.
export function noteBody(fields) {
  const q = lines(fields.preguntas)
  if (!q.length) return fields.texto ?? ''
  return [fields.texto, 'Preguntas abiertas:\n' + q.map((x) => `- ${x}`).join('\n')].filter((x) => x && x.trim()).join('\n\n')
}

// Fecha corta como en Notas: hora si es de hoy, "Ayer", o la fecha.
export function noteDate(ms, now = new Date()) {
  if (!ms) return ''
  const d = new Date(ms)
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 864e5)
  const time = d.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })
  // Fecha clara: "Hoy, 9:05", "Ayer, 18:30", "lunes 28 sep", "2 oct" o "2 oct 2025" si es de otro año.
  if (diff === 0) return `Hoy, ${time}`
  if (diff === 1) return `Ayer, ${time}`
  if (diff > 1 && diff < 7) return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' }).replace(',', '')
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })
}

// Orden en las listas: por fecha (si tiene) y luego por la última edición. Las notas, por la última edición.
export function entrySortKey(e) {
  if (KINDS[e.kind]?.notes) return String(e.updatedAt).padStart(15, '0')
  return (e.fields?.fecha || new Date(e.createdAt).toISOString().slice(0, 10)) + '|' + String(e.updatedAt).padStart(15, '0')
}

// ---------- "Pegar de Claude" ----------

const ALIASES = {
  diario: { date: 'fecha', text: 'texto', versiculo: 'texto', context: 'contexto', principle: 'principio', story: 'relato', relato_de_apoyo: 'relato', application: 'aplicacion', aplicación: 'aplicacion', summary: 'resumen', notes: 'notas', mis_notas: 'notas' },
  reunion: { type: 'tipo', date: 'fecha', title: 'titulo', título: 'titulo', idea_principal: 'idea', paragraphs: 'parrafos', párrafos: 'parrafos', notes: 'notas', aplicación: 'aplicacion', application: 'aplicacion' },
  estudio: { title: 'titulo', título: 'titulo', idea_central: 'idea', hook: 'gancho', extracción: 'extraccion', golpe_logico: 'golpe', golpe_lógico: 'golpe', aha_extra: 'aha', summary: 'resumen' },
  reflexion: { title: 'titulo', título: 'titulo', nota: 'texto', note: 'texto', notas: 'texto', contenido: 'texto' },
  asignacion: { date: 'fecha', part: 'parte', tipo: 'parte', minutes: 'minutos', title: 'titulo', título: 'titulo', tema: 'titulo', escenario: 'titulo', lectura: 'texto', cita: 'texto', lección: 'leccion', helper: 'ayudante', outline: 'bosquejo', lo_que_voy_a_decir: 'bosquejo', notes: 'notas' },
  idea: { title: 'titulo', título: 'titulo', idea: 'titulo', para_qué: 'para', para_que: 'para', como_me_la_imagino: 'como', cómo: 'como', imagen: 'como', que_cambia: 'cambia', qué_cambia: 'cambia', resultado: 'cambia', notes: 'notas' },
}

// Devuelve los campos del JSON pegado mezclados sobre los actuales (solo los que vienen con contenido).
export function fieldsFromJson(kind, data, current) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Se esperaba un objeto JSON con los campos.')
  const def = KINDS[kind]
  const keys = new Set(def.fields.map((f) => f.key))
  const alias = ALIASES[kind] ?? {}
  const next = { ...current }
  let count = 0
  for (const [rawKey, value] of Object.entries(data)) {
    const k0 = rawKey.trim().toLowerCase().replace(/\s+/g, '_')
    const key = keys.has(k0) ? k0 : alias[k0]
    if (!key || value == null || value === '') continue
    const field = def.fields.find((f) => f.key === key)
    if (field.type === 'paragraphs') {
      const list = Array.isArray(value) ? value : []
      next[key] = list
        .map((p, i) => (typeof p === 'string' ? { num: String(i + 1), nota: p } : { num: String(p.num ?? p.parrafo ?? p.párrafo ?? p.n ?? i + 1), nota: String(p.nota ?? p.notas ?? p.texto ?? p.note ?? '') }))
        .filter((p) => p.nota.trim())
    } else if (field.type === 'choice' && field.options.some((o) => o[0] === 'atalaya')) {
      const v = String(value).toLowerCase()
      next[key] = /semana|vida|ministerio|tesoros/.test(v) ? 'entresemana' : 'atalaya'
    } else if (field.type === 'choice') {
      const v = foldText(value)
      const opt = field.options.find(([k, l]) => foldText(k) === v || foldText(l) === v) ?? field.options.find(([k, l]) => v.includes(foldText(k)) || foldText(l).includes(v) || v.includes(foldText(l)))
      if (!opt) continue
      next[key] = opt[0]
    } else if (field.type === 'date') {
      const m = String(value).match(/\d{4}-\d{2}-\d{2}/)
      if (!m) continue
      next[key] = m[0]
    } else {
      next[key] = Array.isArray(value) ? value.join('\n') : String(value)
    }
    count++
  }
  if (!count) throw new Error('El JSON no trae ningún campo que reconozca.')
  return next
}

export function claudeFormat(kind) {
  const def = KINDS[kind]
  const example = {}
  for (const f of def.fields) {
    if (f.noClaude) continue
    if (f.type === 'paragraphs') example[f.key] = [{ num: '1', nota: '…' }, { num: '2', nota: '…' }]
    else if (f.type === 'choice') example[f.key] = f.options.map((o) => o[0]).join(' | ')
    else if (f.type === 'date') example[f.key] = 'AAAA-MM-DD'
    else example[f.key] = f.label + (f.hint ? ` (${f.hint})` : '')
  }
  return `Con base en lo que acabamos de estudiar, responde SOLO con un JSON para el apartado "${def.label}" de mi app de estudio, con estos campos:

${JSON.stringify(example, null, 2)}

${def.claudeNote ?? 'Usa solo información de jw.org y wol.jw.org.'} Deja vacío ("") lo que no aplique.`
}

// ---------- "Copiar para Claude" ----------

// Junta todo lo que lleva la entrada (solo los campos con contenido) en un texto para pegarlo en el chat.
export function entryForClaude(entry) {
  const def = KINDS[entry.kind]
  const f = entry.fields
  const parts = []
  for (const field of def.fields) {
    const v = f[field.key]
    if (field.type === 'paragraphs') {
      const rows = (v ?? []).filter((p) => String(p.nota ?? '').trim()).map((p) => `Párrafo ${p.num}: ${String(p.nota).trim()}`)
      if (rows.length) parts.push(`${field.label}:\n${rows.join('\n')}`)
    } else if (field.type === 'choice') {
      const label = field.options.find((o) => o[0] === v)?.[1]
      if (label) parts.push(`${field.label}: ${label}`)
    } else if (field.type === 'date') {
      if (v) parts.push(`${field.label}: ${formatDate(v)}`)
    } else if (String(v ?? '').trim()) {
      parts.push(`${field.label}:\n${String(v).trim()}`)
    }
  }
  // Repaso de La Atalaya por pasos: cada pregunta con mi respuesta.
  const repaso = (f.repaso ?? []).filter((r) => String(r.nota ?? '').trim())
  if (repaso.length) parts.push(`Repaso:\n${repaso.map((r) => `${r.pregunta}\n${String(r.nota).trim()}`).join('\n')}`)
  // Reunión de entre semana: cada parte con sus preguntas y lo que contesté.
  const semana = f.programa ? midweekForClaude(f) : ''
  if (semana) parts.push(`Mis respuestas:\n${semana}`)
  return `Esto es lo que llevo en mi apartado "${def.label}" de la app. Revísalo conmigo:\n\n${parts.join('\n\n')}`
}

// ---------- "Proponer al mapa" ----------

// Arma un nodo ordenado solo con lo clave: título, idea principal, principio y textos.
export function proposeNode(entry) {
  // Una Atalaya con el artículo pegado pasa completa al mapa, sin resumir.
  if (entry.kind === 'reunion' && String(entry.fields.articulo ?? '').trim()) {
    // Sin clean(): conserva los renglones vacíos entre párrafos.
    // Las palabras clave que marcaste van subrayadas (==así==).
    return { title: clip(clean(entry.fields.titulo) || 'La Atalaya', 80), note: highlightArticle(String(entry.fields.articulo).trim(), entry.fields.marcas) }
  }
  // La reunión de entre semana: tus respuestas de cada parte, no el programa.
  if (entry.kind === 'reunion' && entry.fields.tipo === 'entresemana' && String(entry.fields.programa ?? '').trim()) return midweekNode(entry.fields)
  const p = KINDS[entry.kind].toNode(entry.fields)
  const parts = []
  if (clean(p.idea)) parts.push(clip(clean(p.idea), 420))
  if (clean(p.principio)) parts.push(`Principio: ${clip(clean(p.principio), 280)}`)
  if (p.preguntas?.length) parts.push('Preguntas abiertas:\n' + p.preguntas.slice(0, 6).map((q) => `- ${q}`).join('\n'))
  if (p.textos?.length) parts.push(`Textos: ${p.textos.slice(0, 8).join(' · ')}`)
  return { title: clip(clean(p.title), 80), note: parts.join('\n\n') }
}

// Citas bíblicas reconocidas ("Juan 17:3", "1 Juan 4:8", "Sal. 83:18"…), sin repetir.
export function refsIn(...texts) {
  return findRefs(...texts)
}

// ---------- utilidades ----------

const foldText = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

function clean(s) {
  return String(s ?? '').replace(/\s+\n/g, '\n').trim()
}
function clip(s, n) {
  if (s.length <= n) return s
  const cut = s.slice(0, n)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'))
  return (end > n * 0.5 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…').trim()
}
function lines(s) {
  return String(s ?? '').split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
}
// Solo el texto bíblico del Texto diario: el primer renglón, hasta su cita
// ("No calumnia con su lengua (Sal. 15:3)."), sin el comentario que sigue.
export function dailyVerse(texto) {
  const line = String(texto ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? ''
  const m = line.match(/^.*?\([^()]*\d[^()]*\)[.»”"]?/)
  return m ? m[0] : line
}

// ¿Ya analizaste este texto diario? (algo más que pegar el texto).
export const dailyAnalyzed = (f = {}) => ['contexto', 'principio', 'relato', 'aplicacion', 'resumen', 'notas'].some((k) => String(f[k] ?? '').trim())

// El texto diario de esa fecha en wol.jw.org ("2026-10-04" → .../dt/r4/lp-s/2026/10/4).
export function dailyTextUrl(fecha) {
  const [y, m, d] = String(fecha ?? '').split('-').map(Number)
  return y && m && d ? `https://wol.jw.org/es/wol/dt/r4/lp-s/${y}/${m}/${d}` : 'https://wol.jw.org/es/wol/h/r4/lp-s'
}

// El mismo texto diario en la app JW Library (enlace jw.org/finder: abre la app si está instalada).
export function dailyTextAppUrl(fecha) {
  const [y, m, d] = String(fecha ?? '').split('-').map(Number)
  const date = y && m && d ? `&date=${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}` : ''
  return `https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&alias=daily-text${date}`
}

function firstLine(s) {
  return lines(s)[0]?.slice(0, 80) ?? ''
}
function firstRef(s) {
  return refsIn(s)[0] ?? ''
}
export function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y) return ''
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}
