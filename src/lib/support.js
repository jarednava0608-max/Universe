// En qué se apoya cada idea del mapa. Si la nota de A escribe [[B]], A se apoya en B; así se puede
// escarbar desde cualquier idea hasta un texto bíblico. Niveles (el anillo del mapa):
//   0 Jehová · 1 textos bíblicos (nodos cuyo título es una cita) · 2 ideas que citan un texto ·
//   3 ideas que se apoyan en esas · … · sin nivel (null): todavía no llega a ningún texto.
// Mencionar a [[Jehová]] no cuenta como apoyo (si no, todo quedaría pegado al centro).
import { ROOT_ID } from './model.js'
import { buildResolver, extractLinks, plainText } from './markdown.js'
import { findRefs, isRefTitle } from './bible.js'

// Un texto bíblico es un nodo cuyo título es solo una cita ("Juan 17:3", "Jeremías 38"); "Jeremías 38 y 39"
// o "Sedequías" son ideas.
export const isTextNode = (n) => !!n && n.id !== ROOT_ID && isRefTitle(n.title)

export function buildSupport(nodes) {
  const resolve = buildResolver(nodes)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const out = new Map() // id → ids que enlaza (sin Jehová ni ella misma)
  const inc = new Map() // id → ids que la enlazan
  const cites = new Map() // id → citas bíblicas de su texto
  for (const n of nodes) {
    const targets = [...new Set(extractLinks(n.note).map(resolve))].filter((id) => id && id !== n.id && id !== ROOT_ID)
    out.set(n.id, targets)
    for (const t of targets) {
      if (!inc.has(t)) inc.set(t, [])
      inc.get(t).push(n.id)
    }
    cites.set(n.id, findRefs(plainText(n.note)))
  }

  const level = new Map([[ROOT_ID, 0]])
  let cur = nodes.filter(isTextNode).map((n) => n.id)
  for (const id of cur) level.set(id, 1)
  for (let k = 2; ; k++) {
    const next = []
    const add = (id) => {
      if (level.has(id)) return
      level.set(id, k)
      next.push(id)
    }
    if (k === 2) for (const n of nodes) if (cites.get(n.id).length) add(n.id)
    for (const id of cur) for (const src of inc.get(id) ?? []) add(src)
    if (!next.length) break
    cur = next
  }

  const byTitle = (a, b) => byId.get(a).title.localeCompare(byId.get(b).title, 'es')
  const textsOf = (id) => {
    const linked = out.get(id).filter((t) => isTextNode(byId.get(t))).map((t) => byId.get(t).title.trim())
    const seen = new Set()
    return [...linked, ...cites.get(id)].filter((r) => {
      const k = r.toLowerCase().replace(/\s+/g, ' ')
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }

  return {
    level: (id) => level.get(id) ?? null,
    // Los textos que cita o enlaza directamente.
    texts: (id) => (byId.has(id) ? textsOf(id) : []),
    // El camino más corto hasta un texto pasando por otras ideas: [ids…, cita]. null si no llega.
    path(id) {
      if (!byId.has(id) || level.get(id) == null || level.get(id) < 3) return null
      const ids = []
      let at = id
      while (level.get(at) > 2) {
        at = out.get(at).filter((t) => level.get(t) === level.get(at) - 1).sort(byTitle)[0]
        ids.push(at)
      }
      return [...ids, textsOf(at)[0]]
    },
    // Las ideas que la enlazan.
    usedBy: (id) => [...(inc.get(id) ?? [])].sort(byTitle),
    // Ideas que todavía no llegan a ningún texto (las que más ideas usan, primero).
    unfounded: () =>
      nodes
        .filter((n) => n.id !== ROOT_ID && !level.has(n.id))
        .sort((a, b) => (inc.get(b.id)?.length ?? 0) - (inc.get(a.id)?.length ?? 0) || a.title.localeCompare(b.title, 'es')),
  }
}

// Cuántas líneas tiene el mapa: las conexiones guardadas y los [[enlaces]] (cada par cuenta una vez).
export function connectionCount(nodes, edges = []) {
  const resolve = buildResolver(nodes)
  const pairs = new Set()
  const add = (a, b) => a && b && a !== b && pairs.add(a < b ? a + '|' + b : b + '|' + a)
  for (const e of edges) add(e.source, e.target)
  for (const n of nodes) for (const t of extractLinks(n.note)) add(n.id, resolve(t))
  return pairs.size
}

// Lo que se ve al final de una nota (Markdown, para que los enlaces y las citas se puedan tocar).
// [[id|título]] se resuelve por id, así no falla aunque el título tenga mayúsculas o acentos distintos.
const link = (n) => `[[${n.id}|${n.title.replace(/[[\]|]/g, ' ').trim()}]]`
export function supportLines(node, nodes, sup) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const lines = []
  if (node.id !== ROOT_ID && !isTextNode(node)) {
    const texts = sup.texts(node.id)
    const path = sup.path(node.id)
    const base = texts.length
      ? texts.join(' · ')
      : path
        ? [...path.slice(0, -1).map((id) => link(byId.get(id))), path.at(-1)].join(' → ')
        : 'Todavía no llega a ningún texto bíblico.'
    lines.push({ key: 'base', label: 'Se apoya en', md: base, missing: !texts.length && !path })
  }
  const used = sup.usedBy(node.id)
  if (used.length) {
    const MAX = 30
    const shown = used.slice(0, MAX).map((id) => link(byId.get(id))).join(' · ')
    lines.push({ key: 'used', label: 'La usan', md: used.length > MAX ? `${shown} · y ${used.length - MAX} más` : shown })
  }
  return lines
}
