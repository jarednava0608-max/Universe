// "Pegar conocimiento": convierte un JSON en un plan de cambios que se muestra
// como vista previa y solo se guarda cuando el usuario confirma.
import { makeNode, makeEdge, normKey, normRel, cleanSources, NODE_TYPES, ORIGINS, ROOT_ID, makeRoot, SCHEMA_VERSION } from './model.js'

export function parseJsonLoose(text) {
  let t = String(text ?? '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  if (!t) throw new Error('No hay nada pegado.')
  try {
    return JSON.parse(t)
  } catch (e) {
    throw new Error('El texto no es un JSON válido: ' + e.message)
  }
}

const TYPE_ALIASES = {
  concepto: 'concepto', concept: 'concepto',
  texto: 'texto', 'texto biblico': 'texto', 'texto bíblico': 'texto', versiculo: 'texto', 'versículo': 'texto', verse: 'texto', scripture: 'texto',
  pregunta: 'pregunta', question: 'pregunta',
  ejemplo: 'ejemplo', example: 'ejemplo',
  publicacion: 'publicacion', 'publicación': 'publicacion', publication: 'publicacion',
}
const ORIGIN_ALIASES = {
  jw: 'jw', publicaciones: 'jw', 'publicaciones jw': 'jw', jworg: 'jw',
  propio: 'propio', yo: 'propio', mio: 'propio', 'mío': 'propio', personal: 'propio', razonamiento: 'propio', 'mi razonamiento': 'propio',
  mixto: 'mixto', mixed: 'mixto', ambos: 'mixto',
}

function pickType(v) {
  const k = String(v ?? '').toLowerCase().trim()
  return TYPE_ALIASES[k] ?? TYPE_ALIASES[normKey(k)] ?? (NODE_TYPES[k] ? k : 'concepto')
}
function pickOrigin(v) {
  const k = String(v ?? '').toLowerCase().trim()
  return ORIGIN_ALIASES[k] ?? ORIGIN_ALIASES[normKey(k)] ?? (ORIGINS[k] ? k : null)
}

/**
 * @param data JSON ya parseado
 * @param state { nodes: Node[], edges: Edge[] }
 * @param opts { replace: boolean } reemplazar todo (solo para respaldos)
 */
export function planImport(data, state, opts = {}) {
  const rawNodes = Array.isArray(data) ? data : data?.nodes ?? data?.nodos ?? []
  const rawEdges = Array.isArray(data) ? [] : data?.edges ?? data?.conexiones ?? data?.links ?? []
  if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) throw new Error('Se esperaba { "nodes": [...], "edges": [...] }.')
  if (!rawNodes.length && !rawEdges.length) throw new Error('El JSON no trae nodos ni conexiones.')

  const isBackup = !Array.isArray(data) && data?.app === 'universe'
  const replace = Boolean(opts.replace && isBackup)
  const warnings = []

  const base = replace ? { nodes: [], edges: [] } : state
  const existingById = new Map(base.nodes.map((n) => [n.id, n]))
  const existingByKey = new Map(base.nodes.map((n) => [normKey(n.title), n]))

  // Resultado final por id (nuevos y actualizados).
  const created = new Map()
  const updated = new Map()
  // Referencias que usarán las conexiones: id o título -> id final.
  const refs = new Map()
  const addRef = (k, id) => k && refs.set(normKey(k), id)
  for (const n of base.nodes) {
    addRef(n.title, n.id)
    refs.set('id:' + n.id, n.id)
  }

  rawNodes.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return warnings.push(`Nodo #${i + 1} ignorado: no es un objeto.`)
    const title = String(raw.title ?? raw.titulo ?? raw.título ?? '').trim()
    if (!title) return warnings.push(`Nodo #${i + 1} ignorado: no tiene título.`)
    const incoming = {
      id: raw.id ? String(raw.id) : undefined,
      title,
      type: pickType(raw.type ?? raw.tipo),
      origin: pickOrigin(raw.origin ?? raw.origen),
      note: String(raw.note ?? raw.nota ?? raw.content ?? ''),
      sources: cleanSources(raw.sources ?? raw.fuentes),
    }

    const match =
      (incoming.id && (existingById.get(incoming.id) || updated.get(incoming.id) || created.get(incoming.id))) ||
      existingByKey.get(normKey(title)) ||
      [...created.values()].find((c) => normKey(c.title) === normKey(title))

    if (match && created.has(match.id)) {
      warnings.push(`"${title}" aparece dos veces en el JSON; se unieron.`)
      created.set(match.id, mergeNode(match, incoming))
    } else if (match) {
      const prev = updated.get(match.id) ?? match
      const next = mergeNode(prev, incoming)
      if (next !== prev) updated.set(match.id, next)
    } else {
      const node = makeNode({ ...incoming, origin: incoming.origin ?? 'mixto', createdAt: raw.createdAt, updatedAt: raw.updatedAt })
      created.set(node.id, node)
    }
    const finalId = match?.id ?? [...created.values()].at(-1).id
    addRef(title, finalId)
    if (incoming.id) refs.set('id:' + incoming.id, finalId)
  })

  // Un respaldo que reemplaza todo debe conservar la raíz.
  if (replace && ![...created.values()].some((n) => n.id === ROOT_ID)) {
    const root = makeRoot()
    created.set(root.id, root)
    addRef(root.title, root.id)
  }

  const resolveRef = (r) => {
    if (r == null) return null
    const s = String(r)
    return refs.get('id:' + s) ?? refs.get(normKey(s)) ?? null
  }

  const edgeKey = (e) => `${e.source}|${e.target}|${e.rel}`
  const existingEdgeKeys = new Set(base.edges.map(edgeKey))
  const newEdges = []
  rawEdges.forEach((raw, i) => {
    const from = raw?.from ?? raw?.source ?? raw?.desde ?? raw?.de
    const to = raw?.to ?? raw?.target ?? raw?.hacia ?? raw?.a
    const s = resolveRef(from)
    const t = resolveRef(to)
    if (!s || !t) {
      const missing = !s ? from : to
      return warnings.push(`Conexión #${i + 1} ignorada: no existe el nodo "${missing ?? '?'}".`)
    }
    if (s === t) return warnings.push(`Conexión #${i + 1} ignorada: un nodo no se conecta consigo mismo.`)
    const edge = makeEdge({ id: replace ? raw.id : undefined, source: s, target: t, rel: normRel(raw.rel ?? raw.relacion ?? raw.relación ?? raw.type ?? raw.tipo) })
    const k = edgeKey(edge)
    if (existingEdgeKeys.has(k)) return
    existingEdgeKeys.add(k)
    newEdges.push(edge)
  })

  return {
    isBackup,
    replace,
    newNodes: [...created.values()],
    updatedNodes: [...updated.values()].map((after) => ({ before: existingById.get(after.id), after })),
    newEdges,
    warnings,
  }
}

// Une información nueva sin borrar lo que ya había.
function mergeNode(prev, incoming) {
  let changed = false
  const next = { ...prev }
  const note = incoming.note.trim()
  if (note && !prev.note.includes(note)) {
    next.note = prev.note.trim() ? `${prev.note.trim()}\n\n---\n\n${note}` : note
    changed = true
  }
  const sources = cleanSources([...prev.sources, ...incoming.sources])
  if (sources.length !== prev.sources.length) {
    next.sources = sources
    changed = true
  }
  if (incoming.origin && incoming.origin !== prev.origin) {
    next.origin = 'mixto'
    changed = changed || prev.origin !== 'mixto'
  }
  if (!changed) return prev
  next.updatedAt = Date.now()
  return next
}

export function buildExport(nodes, edges) {
  return {
    app: 'universe',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    nodes,
    edges,
  }
}

// Instrucciones para que Claude genere JSON compatible.
export const CLAUDE_FORMAT = `Genera un JSON para importar a mi mapa de conocimiento bíblico (Universe). Responde SOLO con el JSON, con esta forma:

{
  "nodes": [
    {
      "title": "Título corto y único",
      "note": "La definición, en texto claro. Puedes enlazar otros nodos escribiendo [[Título]]."
    }
  ],
  "edges": [
    { "from": "Título origen", "to": "Título destino", "rel": "ENSEÑA" }
  ]
}

Reglas:
- Basado en las publicaciones de jw.org y wol.jw.org.
- Las conexiones usan los títulos exactos. El nodo principal se llama "Jehová".
- Relaciones en MAYÚSCULAS, por ejemplo: ENSEÑA, REQUIERE, DEMOSTRÓ, EXPLICA, RESPONDE, PARTE DE, LLEVA A.
- Si un nodo ya existe con ese título, se le añade la información nueva sin borrar la anterior.`
