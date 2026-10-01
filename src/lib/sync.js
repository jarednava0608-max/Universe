// Sincronización con Supabase (Etapa 2).
// IndexedDB sigue siendo la fuente local; aquí solo se sube lo pendiente (outbox)
// y se baja lo que cambió en la nube. Conflictos: gana el cambio más reciente.
import * as db from './db.js'

const TABLE = { nodes: 'universe_nodes', edges: 'universe_edges' }
const PAGE = 1000
const OVERLAP_MS = 10_000 // vuelve a pedir unos segundos atrás por si un cambio llegó tarde

const toRow = {
  nodes: (n, userId) => ({
    user_id: userId,
    id: n.id,
    title: n.title,
    type: n.type,
    origin: n.origin,
    note: n.note,
    sources: n.sources ?? [],
    created_at: n.createdAt ?? 0,
    updated_at: n.updatedAt ?? 0,
    deleted: false,
  }),
  edges: (e, userId) => ({
    user_id: userId,
    id: e.id,
    source: e.source,
    target: e.target,
    rel: e.rel,
    created_at: e.createdAt ?? 0,
    updated_at: e.updatedAt ?? e.createdAt ?? 0,
    deleted: false,
  }),
}

const tombstone = {
  nodes: (id, t, userId) => ({ user_id: userId, id, title: '', note: '', sources: [], created_at: t, updated_at: t, deleted: true }),
  edges: (id, t, userId) => ({ user_id: userId, id, source: '', target: '', rel: '', created_at: t, updated_at: t, deleted: true }),
}

const fromRow = {
  nodes: (r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    origin: r.origin,
    note: r.note ?? '',
    sources: Array.isArray(r.sources) ? r.sources : [],
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  }),
  edges: (r) => ({
    id: r.id,
    source: r.source,
    target: r.target,
    rel: r.rel,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  }),
}

async function push(client, userId) {
  const ob = await db.getOutbox()
  let count = 0
  for (const kind of ['nodes', 'edges']) {
    const entries = Object.entries(ob[kind])
    for (let i = 0; i < entries.length; i += 500) {
      const chunk = entries.slice(i, i + 500)
      const rows = []
      for (const [id, ent] of chunk) {
        const local = ent.del ? null : await db.get(kind, id)
        rows.push(local ? toRow[kind](local, userId) : tombstone[kind](id, ent.t ?? Date.now(), userId))
      }
      const { error } = await client.from(TABLE[kind]).upsert(rows, { onConflict: 'user_id,id' })
      if (error) throw error
      await db.ackOutbox(kind, chunk)
      count += rows.length
    }
  }
  return count
}

async function pull(client, userId) {
  const ob = await db.getOutbox()
  const change = { putNodes: [], putEdges: [], delNodes: [], delEdges: [] }
  const resolved = { nodes: [], edges: [] }
  const marks = {}

  for (const kind of ['nodes', 'edges']) {
    const key = `lastPull:${userId}:${kind}`
    const last = await db.getMeta(key)
    let since = last ? new Date(new Date(last).getTime() - OVERLAP_MS).toISOString() : null
    let newest = last ?? null

    for (;;) {
      let q = client.from(TABLE[kind]).select('*').eq('user_id', userId).order('server_updated_at', { ascending: true }).limit(PAGE)
      if (since) q = q.gt('server_updated_at', since)
      const { data, error } = await q
      if (error) throw error
      for (const row of data) {
        const pending = ob[kind][row.id]
        const remoteT = Number(row.updated_at)
        // Si aquí hay un cambio pendiente más nuevo, se queda el local (y se subirá).
        if (pending && pending.t > remoteT) continue
        if (pending) resolved[kind].push(row.id)
        const local = await db.get(kind, row.id)
        if (row.deleted) {
          if (local) (kind === 'nodes' ? change.delNodes : change.delEdges).push(row.id)
        } else if (!local || local.updatedAt !== remoteT) {
          ;(kind === 'nodes' ? change.putNodes : change.putEdges).push(fromRow[kind](row))
        }
      }
      if (data.length) newest = data.at(-1).server_updated_at
      if (data.length < PAGE) break
      since = newest
    }
    marks[key] = newest
  }

  const total = change.putNodes.length + change.putEdges.length + change.delNodes.length + change.delEdges.length
  if (total) await db.commit(change, { track: false })
  await db.dropOutbox('nodes', resolved.nodes)
  await db.dropOutbox('edges', resolved.edges)
  for (const [k, v] of Object.entries(marks)) if (v) await db.setMeta(k, v)
  return { change, total }
}

// Un ciclo completo: (primera vez: marcar todo lo local) → bajar → subir.
export async function syncOnce(client, userId) {
  const linked = await db.getMeta(`linked:${userId}`)
  if (!linked) await db.markAllDirty()
  const { change, total } = await pull(client, userId)
  const pushed = await push(client, userId)
  if (!linked) await db.setMeta(`linked:${userId}`, Date.now())
  return { change, pulled: total, pushed }
}

export async function pendingCount() {
  const ob = await db.getOutbox()
  return Object.keys(ob.nodes).length + Object.keys(ob.edges).length
}

// Al cerrar sesión: la próxima vez que entre se vuelve a combinar todo.
export async function forgetUser(userId) {
  for (const k of [`lastPull:${userId}:nodes`, `lastPull:${userId}:edges`, `linked:${userId}`]) await db.delMeta(k)
}
