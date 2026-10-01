// Modelo de datos del mapa. Todo lo que define "qué es un nodo" vive aquí.

export const ROOT_ID = 'jehova'
export const ROOT_COLOR = '#f5d27a' // Solo el nodo raíz usa dorado.

export const NODE_TYPES = {
  concepto: { label: 'Concepto', color: '#7aa2f7' },
  texto: { label: 'Texto bíblico', color: '#9ece6a' },
  pregunta: { label: 'Pregunta', color: '#f7768e' },
  ejemplo: { label: 'Ejemplo', color: '#bb9af7' },
  publicacion: { label: 'Publicación', color: '#2ac3de' },
}

export const ORIGINS = {
  jw: { label: 'Publicaciones JW', short: 'JW' },
  propio: { label: 'Mi razonamiento', short: 'Yo' },
  mixto: { label: 'JW + mi razonamiento', short: 'Mixto' },
}

export const SUGGESTED_RELATIONS = [
  'ENSEÑA',
  'REQUIERE',
  'DEMOSTRÓ',
  'EXPLICA',
  'RESPONDE',
  'CITA',
  'EJEMPLO DE',
  'PARTE DE',
  'CONTRASTA CON',
  'LLEVA A',
  'PREGUNTA SOBRE',
]

export const SCHEMA_VERSION = 1

// Por ahora la interfaz no muestra tipos: todos los nodos son neutros y solo Jehová es dorado.
// Los tipos y colores se conservan en los datos para poder volver a usarlos.
export const NODE_COLOR = '#c2b8a8'

export function nodeColor(node) {
  if (!node) return NODE_COLOR
  return node.id === ROOT_ID ? ROOT_COLOR : NODE_COLOR
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// Clave para comparar títulos: sin mayúsculas, acentos ni espacios extra.
export function normKey(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function normRel(s) {
  return String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
}

export function cleanSources(list) {
  if (!Array.isArray(list)) return []
  const out = []
  const seen = new Set()
  for (const s of list) {
    const src = typeof s === 'string' ? { label: s } : s || {}
    const label = String(src.label ?? src.texto ?? src.title ?? '').trim()
    let url = String(src.url ?? '').trim()
    if (url && !/^https?:\/\//i.test(url)) url = ''
    if (!label && !url) continue
    const key = normKey(label || url)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url ? { label: label || url, url } : { label })
  }
  return out
}

export function makeNode(partial = {}) {
  const now = Date.now()
  return {
    id: partial.id || newId(),
    title: String(partial.title ?? '').trim() || 'Sin título',
    type: NODE_TYPES[partial.type] ? partial.type : 'concepto',
    origin: ORIGINS[partial.origin] ? partial.origin : 'propio',
    note: String(partial.note ?? ''),
    sources: cleanSources(partial.sources),
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
  }
}

// La raíz nueva nace con fecha 0: si ya existe en la nube, gana la de la nube.
export function makeRoot() {
  return { ...makeNode({ id: ROOT_ID, title: 'Jehová', type: 'concepto', origin: 'jw', note: '' }), createdAt: 0, updatedAt: 0 }
}

export function makeEdge(partial) {
  return {
    id: partial.id || newId(),
    source: partial.source,
    target: partial.target,
    rel: normRel(partial.rel) || 'RELACIONADO',
    createdAt: partial.createdAt || Date.now(),
    updatedAt: partial.updatedAt || partial.createdAt || Date.now(),
  }
}

export function isJwUrl(url) {
  try {
    const h = new URL(url).hostname
    return h === 'jw.org' || h.endsWith('.jw.org')
  } catch {
    return false
  }
}
