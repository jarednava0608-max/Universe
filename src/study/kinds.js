// Pestaña Estudio: definición de cada apartado (campos, formato para Claude y
// cómo se resume en un nodo del mapa). Para agregar un apartado nuevo basta con
// añadir una entrada a KINDS.
import { newId } from '../lib/model.js'
import { findRefs } from '../lib/bible.js'

const today = () => {
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
      { key: 'idea', label: 'Idea principal', type: 'text' },
      { key: 'parrafos', label: 'Notas por párrafo', type: 'paragraphs' },
      { key: 'notas', label: 'Notas generales', type: 'text' },
    ],
    title: (e) => e.fields.titulo || (e.fields.tipo === 'entresemana' ? 'Reunión de entre semana' : 'La Atalaya'),
    subtitle: (e) => [e.fields.tipo === 'entresemana' ? 'Entre semana' : 'La Atalaya', formatDate(e.fields.fecha)].filter(Boolean).join(' · '),
    toNode: (f) => ({
      title: f.titulo || 'Reunión',
      idea: f.idea,
      textos: refsIn(f.idea, f.notas, ...(f.parrafos ?? []).map((p) => p.nota)),
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

  reflexion: {
    label: 'Mis reflexiones',
    short: 'Reflexión',
    desc: 'Notas libres, ideas y preguntas abiertas',
    icon: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
    fields: [
      { key: 'titulo', label: 'Título', type: 'line' },
      { key: 'texto', label: 'Nota', type: 'text' },
      { key: 'preguntas', label: 'Preguntas abiertas', type: 'text', hint: 'Una por línea' },
    ],
    title: (e) => e.fields.titulo || firstLine(e.fields.texto) || 'Reflexión',
    subtitle: (e) => {
      const n = lines(e.fields.preguntas).length
      return n ? `${n} ${n === 1 ? 'pregunta abierta' : 'preguntas abiertas'}` : formatDate(new Date(e.createdAt).toISOString().slice(0, 10))
    },
    toNode: (f) => ({
      title: f.titulo || firstLine(f.texto) || 'Reflexión',
      idea: f.texto,
      preguntas: lines(f.preguntas),
      textos: refsIn(f.texto, f.preguntas),
    }),
  },
}

export const KIND_ORDER = ['diario', 'reunion', 'estudio', 'reflexion']

export function makeEntry(kind) {
  const def = KINDS[kind]
  const fields = {}
  for (const f of def.fields) fields[f.key] = f.default ? f.default() : f.type === 'paragraphs' ? [] : ''
  const now = Date.now()
  return { id: newId(), kind, fields, createdAt: now, updatedAt: now }
}

// Orden en las listas: por fecha (si tiene) y luego por la última edición.
export function entrySortKey(e) {
  return (e.fields?.fecha || new Date(e.createdAt).toISOString().slice(0, 10)) + '|' + String(e.updatedAt).padStart(15, '0')
}

// ---------- "Pegar de Claude" ----------

const ALIASES = {
  diario: { date: 'fecha', text: 'texto', versiculo: 'texto', context: 'contexto', principle: 'principio', story: 'relato', relato_de_apoyo: 'relato', application: 'aplicacion', aplicación: 'aplicacion', summary: 'resumen', notes: 'notas', mis_notas: 'notas' },
  reunion: { type: 'tipo', date: 'fecha', title: 'titulo', título: 'titulo', idea_principal: 'idea', paragraphs: 'parrafos', párrafos: 'parrafos', notes: 'notas' },
  estudio: { title: 'titulo', título: 'titulo', idea_central: 'idea', hook: 'gancho', extracción: 'extraccion', golpe_logico: 'golpe', golpe_lógico: 'golpe', aha_extra: 'aha', summary: 'resumen' },
  reflexion: { title: 'titulo', título: 'titulo', nota: 'texto', note: 'texto', questions: 'preguntas', preguntas_abiertas: 'preguntas' },
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
    } else if (field.type === 'choice') {
      const v = String(value).toLowerCase()
      next[key] = /semana|vida|ministerio|tesoros/.test(v) ? 'entresemana' : 'atalaya'
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
    if (f.type === 'paragraphs') example[f.key] = [{ num: '1', nota: '…' }, { num: '2', nota: '…' }]
    else if (f.type === 'choice') example[f.key] = f.options.map((o) => o[0]).join(' | ')
    else if (f.type === 'date') example[f.key] = 'AAAA-MM-DD'
    else example[f.key] = f.label + (f.hint ? ` (${f.hint})` : '')
  }
  return `Con base en lo que acabamos de estudiar, responde SOLO con un JSON para el apartado "${def.label}" de mi app de estudio, con estos campos:

${JSON.stringify(example, null, 2)}

Usa solo información de jw.org y wol.jw.org. Deja vacío ("") lo que no aplique.`
}

// ---------- "Proponer al mapa" ----------

// Arma un nodo ordenado solo con lo clave: título, idea principal, principio y textos.
export function proposeNode(entry) {
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
