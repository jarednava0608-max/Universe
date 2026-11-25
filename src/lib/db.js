// Persistencia local: IndexedDB en el navegador. Es la fuente de verdad de la app
// (funciona sin conexión). Cada cambio local queda anotado en el "outbox" para
// subirlo a Supabase cuando haya sesión (ver sync.js).
import { openDB } from 'idb'

const DB_NAME = 'universe'
const DB_VERSION = 2

// La conexión en uso ({ promise }): se abre una vez y se reutiliza. Si el navegador la cierra por su cuenta
// (Safari en iPhone lo hace, p. ej. al volver la app del fondo), se olvida y la siguiente operación abre otra.
let current = null
let memoryOnly = false
let opened = false // ya hubo conexión: si luego no se puede reabrir, se avisa (nunca se pasa en silencio a memoria)

function connection() {
  if (!current) {
    const c = {}
    c.promise = open(c)
    c.promise.catch(() => forget(c)) // no se pudo reabrir: la próxima operación lo intenta de nuevo
    current = c
  }
  return current
}
const db = () => connection().promise

// Olvida esa conexión si sigue siendo la que se usa.
function forget(c) {
  if (current === c) current = null
}

async function open(c) {
  try {
    const conn = await openDB(DB_NAME, DB_VERSION, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore('nodes', { keyPath: 'id' })
          d.createObjectStore('edges', { keyPath: 'id' })
          d.createObjectStore('meta')
        }
        // v2: entradas de la pestaña Estudio (texto diario, reuniones, estudios, reflexiones).
        if (oldVersion < 2) d.createObjectStore('entries', { keyPath: 'id' })
      },
      // El navegador la cerró por su cuenta (aviso «close»).
      terminated() {
        forget(c)
      },
      // Otra pestaña o una versión nueva de la app pide actualizar la base: se suelta para no bloquearla.
      blocking(_version, _nueva, e) {
        forget(c)
        e.target.close()
      },
    })
    opened = true
    return conn
  } catch (e) {
    if (opened) throw e
    // Navegadores dentro de otras apps (Muse…) o ventanas privadas pueden no dejar usar IndexedDB.
    // Se sigue en memoria: con sesión, todo se baja de la nube y lo que cambies se sube.
    memoryOnly = true
    return memoryDB()
  }
}

// Señales de que el navegador cerró la conexión: no deja crear la transacción ("The database connection is
// closing", InvalidStateError) o la cancela ("Connection to Indexed Database server lost", UnknownError, en Safari;
// AbortError en el cierre forzado de la especificación).
const CLOSED = new Set(['InvalidStateError', 'UnknownError', 'AbortError'])

// Toda operación pasa por aquí. Si la conexión resultó cerrada (sin aviso, o el aviso aún no llega), se olvida,
// se abre otra y se intenta una vez más. Cada operación es una sola transacción (o se guardó todo o nada), así
// que repetirla no duplica nada.
async function run(fn) {
  const c = connection()
  const d = await c.promise
  try {
    return await fn(d)
  } catch (e) {
    if (memoryOnly || !CLOSED.has(e?.name)) throw e
    forget(c)
    d.close()
    return fn(await db())
  }
}

// true si este navegador no guarda nada (se usa la memoria mientras la app esté abierta).
export async function isMemoryOnly() {
  await db()
  return memoryOnly
}

// Lo mínimo de la interfaz de `idb` que usa este archivo, en memoria.
export function memoryDB() {
  const keyPath = { nodes: 'id', edges: 'id', entries: 'id', meta: null }
  const data = Object.fromEntries(Object.keys(keyPath).map((k) => [k, new Map()]))
  const clone = (v) => (v === undefined ? v : structuredClone(v))
  const store = (name) => {
    const m = data[name]
    return {
      async get(key) { return clone(m.get(key)) },
      async getAll() { return [...m.values()].map(clone) },
      async getAllKeys() { return [...m.keys()] },
      async put(value, key) { m.set(keyPath[name] ? value[keyPath[name]] : key, clone(value)) },
      async delete(key) { m.delete(key) },
      async clear() { m.clear() },
    }
  }
  return {
    get: (name, key) => store(name).get(key),
    getAll: (name) => store(name).getAll(),
    put: (name, value, key) => store(name).put(value, key),
    delete: (name, key) => store(name).delete(key),
    transaction(names) {
      const list = [names].flat()
      return { objectStore: store, store: store(list[0]), done: Promise.resolve() }
    },
  }
}

export async function loadAll() {
  return run(async (d) => {
    const [nodes, edges, entries] = await Promise.all([d.getAll('nodes'), d.getAll('edges'), d.getAll('entries')])
    return { nodes, edges, entries }
  })
}

export async function get(kind, id) {
  return run((d) => d.get(kind, id))
}

// Outbox: { nodes: { [id]: { t, del, v } }, edges: {...}, entries: {...} }
// t = momento del cambio, del = borrado, v = versión (para no perder cambios hechos durante una subida).
function readOutbox(raw) {
  return { nodes: { ...(raw?.nodes ?? {}) }, edges: { ...(raw?.edges ?? {}) }, entries: { ...(raw?.entries ?? {}) } }
}
const ver = () => Date.now() + Math.random()

// Aplica cambios en una sola transacción: o se guarda todo o nada.
// track=false se usa para cambios que vienen de la nube (no hay que volver a subirlos).
export async function commit(change, opts) {
  return run((d) => write(d, change, opts))
}

async function write(d, change, { track = true } = {}) {
  const { putNodes = [], putEdges = [], delNodes = [], delEdges = [], putEntries = [], delEntries = [], clear = false } = change
  const tx = d.transaction(['nodes', 'edges', 'entries', 'meta'], 'readwrite')
  const ns = tx.objectStore('nodes')
  const es = tx.objectStore('edges')
  const ens = tx.objectStore('entries')
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
  for (const e of putEntries) {
    ens.put(e)
    if (track) ob.entries[e.id] = { t: e.updatedAt ?? now, del: false, v: ver() }
  }
  for (const id of delEntries) {
    ens.delete(id)
    if (track) ob.entries[id] = { t: now, del: true, v: ver() }
  }
  if (track) ms.put(ob, 'outbox')
  await tx.done
}

export async function getOutbox() {
  return readOutbox(await getMeta('outbox'))
}

// Quita del outbox lo que ya se subió (solo si no cambió mientras tanto).
export async function ackOutbox(kind, entries) {
  return run(async (d) => {
    const tx = d.transaction('meta', 'readwrite')
    const ob = readOutbox(await tx.store.get('outbox'))
    for (const [id, ent] of entries) if (ob[kind][id]?.v === ent.v) delete ob[kind][id]
    tx.store.put(ob, 'outbox')
    await tx.done
  })
}

// entries: [id, ent] tal como se leyeron; si mientras tanto cambió (otra versión), se queda para subirse.
export async function dropOutbox(kind, entries) {
  if (!entries.length) return
  return run(async (d) => {
    const tx = d.transaction('meta', 'readwrite')
    const ob = readOutbox(await tx.store.get('outbox'))
    for (const [id, ent] of entries) if (ob[kind][id]?.v === ent.v) delete ob[kind][id]
    tx.store.put(ob, 'outbox')
    await tx.done
  })
}

// Marca todo lo local como pendiente de subir (primera vez que se vincula una cuenta).
export async function markAllDirty() {
  return run(async (d) => {
    const tx = d.transaction(['nodes', 'edges', 'entries', 'meta'], 'readwrite')
    const ob = readOutbox(await tx.objectStore('meta').get('outbox'))
    for (const n of await tx.objectStore('nodes').getAll()) ob.nodes[n.id] ??= { t: n.updatedAt ?? 0, del: false, v: ver() }
    for (const e of await tx.objectStore('edges').getAll()) ob.edges[e.id] ??= { t: e.updatedAt ?? e.createdAt ?? 0, del: false, v: ver() }
    for (const e of await tx.objectStore('entries').getAll()) ob.entries[e.id] ??= { t: e.updatedAt ?? 0, del: false, v: ver() }
    tx.objectStore('meta').put(ob, 'outbox')
    await tx.done
  })
}

export async function getMeta(key) {
  return run((d) => d.get('meta', key))
}

export async function setMeta(key, value) {
  return run((d) => d.put('meta', value, key))
}

export async function delMeta(key) {
  return run((d) => d.delete('meta', key))
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
