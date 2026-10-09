// Sincronización con Supabase (Etapa 2).
// IndexedDB sigue siendo la fuente local; aquí solo se sube lo pendiente (outbox)
// y se baja lo que cambió en la nube. Conflictos: gana el cambio más reciente.
import * as db from './db.js'
import { galaxyOf } from './model.js'
import { PROGRESS_ID, mergeProgress } from '../games/progress.js'

const TABLE = { nodes: 'universe_nodes', edges: 'universe_edges', entries: 'universe_entries' }
const KINDS = ['nodes', 'edges', 'entries']
const PUT = { nodes: 'putNodes', edges: 'putEdges', entries: 'putEntries' }
const DEL = { nodes: 'delNodes', edges: 'delEdges', entries: 'delEntries' }
const PAGE = 1000
const OVERLAP_MS = 10_000 // vuelve a pedir unos segundos atrás por si un cambio llegó tarde

const toRow = {
  nodes: (n, userId) => ({
    user_id: userId,
    id: n.id,
    title: n.title ?? '',
    type: n.type || 'concepto',
    origin: n.origin || 'propio',
    note: n.note ?? '',
    sources: n.sources ?? [],
    galaxy: galaxyOf(n),
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
  entries: (e, userId) => ({
    user_id: userId,
    id: e.id,
    kind: e.kind,
    fields: e.fields ?? {},
    map_node_id: e.mapNodeId ?? null,
    created_at: e.createdAt ?? 0,
    updated_at: e.updatedAt ?? 0,
    deleted: false,
  }),
}

const tombstone = {
  nodes: (id, t, userId) => ({ user_id: userId, id, title: '', type: 'concepto', origin: 'propio', galaxy: galaxyOf(null), note: '', sources: [], created_at: t, updated_at: t, deleted: true }),
  edges: (id, t, userId) => ({ user_id: userId, id, source: '', target: '', rel: '', created_at: t, updated_at: t, deleted: true }),
  entries: (id, t, userId) => ({ user_id: userId, id, kind: '', fields: {}, created_at: t, updated_at: t, deleted: true }),
}

const fromRow = {
  nodes: (r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    origin: r.origin,
    note: r.note ?? '',
    sources: Array.isArray(r.sources) ? r.sources : [],
    galaxy: galaxyOf(r),
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
  entries: (r) => ({
    id: r.id,
    kind: r.kind,
    fields: r.fields && typeof r.fields === 'object' ? r.fields : {},
    ...(r.map_node_id ? { mapNodeId: r.map_node_id } : {}),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  }),
}

async function push(client, userId) {
  const ob = await db.getOutbox()
  let count = 0
  for (const kind of KINDS) {
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
  const change = { putNodes: [], putEdges: [], delNodes: [], delEdges: [], putEntries: [], delEntries: [] }
  const resolved = { nodes: [], edges: [], entries: [] }
  const marks = {}
  let progressToPush = null

  for (const kind of KINDS) {
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
        // El progreso (racha y repasos) se combina en vez de pisarse entre dispositivos.
        if (kind === 'entries' && row.id === PROGRESS_ID && !row.deleted) {
          const local = await db.get('entries', row.id)
          const remote = fromRow.entries(row)
          if (!local) {
            change.putEntries.push(remote)
          } else {
            const fields = mergeProgress(local.fields, remote.fields)
            const merged = { ...local, fields, updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt) }
            change.putEntries.push(merged)
            if (JSON.stringify(fields) !== JSON.stringify(remote.fields)) progressToPush = merged
            else if (ob.entries[row.id]) resolved.entries.push(row.id)
          }
          continue
        }
        const pending = ob[kind][row.id]
        const remoteT = Number(row.updated_at)
        // Si aquí hay un cambio pendiente más nuevo, se queda el local (y se subirá).
        if (pending && pending.t > remoteT) continue
        if (pending) resolved[kind].push(row.id)
        const local = await db.get(kind, row.id)
        if (row.deleted) {
          if (local) change[DEL[kind]].push(row.id)
        } else if (!local || local.updatedAt !== remoteT) {
          change[PUT[kind]].push(fromRow[kind](row))
        }
      }
      if (data.length) newest = data.at(-1).server_updated_at
      if (data.length < PAGE) break
      since = newest
    }
    marks[key] = newest
  }

  const total = Object.values(change).reduce((n, list) => n + list.length, 0)
  if (total) await db.commit(change, { track: false })
  // Si al combinar el progreso quedó algo que la nube no tiene, se sube en este mismo ciclo.
  if (progressToPush) await db.commit({ putEntries: [{ ...progressToPush, updatedAt: Date.now() }] })
  for (const kind of KINDS) await db.dropOutbox(kind, resolved[kind])
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
  return KINDS.reduce((n, kind) => n + Object.keys(ob[kind]).length, 0)
}

// Al cerrar sesión: la próxima vez que entre se vuelve a combinar todo.
export async function forgetUser(userId) {
  for (const k of [...KINDS.map((kind) => `lastPull:${userId}:${kind}`), `linked:${userId}`]) await db.delMeta(k)
}
