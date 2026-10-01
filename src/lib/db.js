// Persistencia local: IndexedDB en el navegador. Es la fuente de verdad de la app
// (funciona sin conexión). Cada cambio local queda anotado en el "outbox" para
// subirlo a Supabase cuando haya sesión (ver sync.js).
import { openDB } from 'idb'

const DB_NAME = 'universe'
const DB_VERSION = 1

let dbPromise
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        d.createObjectStore('nodes', { keyPath: 'id' })
        d.createObjectStore('edges', { keyPath: 'id' })
        d.createObjectStore('meta')
      },
    })
  }
  return dbPromise
}

export async function loadAll() {
  const d = await db()
  const [nodes, edges] = await Promise.all([d.getAll('nodes'), d.getAll('edges')])
  return { nodes, edges }
}

export async function get(kind, id) {
  return (await db()).get(kind, id)
}

// Outbox: { nodes: { [id]: { t, del, v } }, edges: {...} }
// t = momento del cambio, del = borrado, v = versión (para no perder cambios hechos durante una subida).
function readOutbox(raw) {
  return { nodes: { ...(raw?.nodes ?? {}) }, edges: { ...(raw?.edges ?? {}) } }
}
const ver = () => Date.now() + Math.random()

// Aplica cambios en una sola transacción: o se guarda todo o nada.
// track=false se usa para cambios que vienen de la nube (no hay que volver a subirlos).
export async function commit(change, { track = true } = {}) {
  const { putNodes = [], putEdges = [], delNodes = [], delEdges = [], clear = false } = change
  const d = await db()
  const tx = d.transaction(['nodes', 'edges', 'meta'], 'readwrite')
  const ns = tx.objectStore('nodes')
  const es = tx.objectStore('edges')
  const ms = tx.objectStore('meta')
  const now = Date.now()
  const ob = track ? readOutbox(await ms.get('outbox')) : null

  if (clear) {
    if (track) {
      for (const id of await ns.getAllKeys()) ob.nodes[id] = { t: now, del: true, v: ver() }
      for (const id of await es.getAllKeys()) ob.edges[id] = { t: now, del: true, v: ver() }
    }
    ns.clear()
    es.clear()
  }
  for (const n of putNodes) {
    ns.put(n)
    if (track) ob.nodes[n.id] = { t: n.updatedAt ?? now, del: false, v: ver() }
  }
  for (const e of putEdges) {
    es.put(e)
    if (track) ob.edges[e.id] = { t: e.updatedAt ?? e.createdAt ?? now, del: false, v: ver() }
  }
  for (const id of delNodes) {
    ns.delete(id)
    if (track) ob.nodes[id] = { t: now, del: true, v: ver() }
  }
  for (const id of delEdges) {
    es.delete(id)
    if (track) ob.edges[id] = { t: now, del: true, v: ver() }
  }
  if (track) ms.put(ob, 'outbox')
  await tx.done
}

export async function getOutbox() {
  return readOutbox(await getMeta('outbox'))
}

// Quita del outbox lo que ya se subió (solo si no cambió mientras tanto).
export async function ackOutbox(kind, entries) {
  const d = await db()
  const tx = d.transaction('meta', 'readwrite')
  const ob = readOutbox(await tx.store.get('outbox'))
  for (const [id, ent] of entries) if (ob[kind][id]?.v === ent.v) delete ob[kind][id]
  tx.store.put(ob, 'outbox')
  await tx.done
}

export async function dropOutbox(kind, ids) {
  if (!ids.length) return
  const d = await db()
  const tx = d.transaction('meta', 'readwrite')
  const ob = readOutbox(await tx.store.get('outbox'))
  for (const id of ids) delete ob[kind][id]
  tx.store.put(ob, 'outbox')
  await tx.done
}

// Marca todo lo local como pendiente de subir (primera vez que se vincula una cuenta).
export async function markAllDirty() {
  const d = await db()
  const tx = d.transaction(['nodes', 'edges', 'meta'], 'readwrite')
  const ob = readOutbox(await tx.objectStore('meta').get('outbox'))
  for (const n of await tx.objectStore('nodes').getAll()) ob.nodes[n.id] ??= { t: n.updatedAt ?? 0, del: false, v: ver() }
  for (const e of await tx.objectStore('edges').getAll()) ob.edges[e.id] ??= { t: e.updatedAt ?? e.createdAt ?? 0, del: false, v: ver() }
  tx.objectStore('meta').put(ob, 'outbox')
  await tx.done
}

export async function getMeta(key) {
  return (await db()).get('meta', key)
}

export async function setMeta(key, value) {
  return (await db()).put('meta', value, key)
}

export async function delMeta(key) {
  return (await db()).delete('meta', key)
}

// Pide al navegador que no borre los datos cuando le falte espacio.
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return null
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}
