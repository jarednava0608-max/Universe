// Persistencia local (Etapa 1): IndexedDB en el navegador.
// En la Etapa 2 este módulo es el punto donde se agrega la sincronización con Supabase.
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

// Aplica cambios en una sola transacción: o se guarda todo o nada.
export async function commit({ putNodes = [], putEdges = [], delNodes = [], delEdges = [], clear = false }) {
  const d = await db()
  const tx = d.transaction(['nodes', 'edges'], 'readwrite')
  const ns = tx.objectStore('nodes')
  const es = tx.objectStore('edges')
  if (clear) {
    ns.clear()
    es.clear()
  }
  for (const n of putNodes) ns.put(n)
  for (const e of putEdges) es.put(e)
  for (const id of delNodes) ns.delete(id)
  for (const id of delEdges) es.delete(id)
  await tx.done
}

export async function getMeta(key) {
  return (await db()).get('meta', key)
}

export async function setMeta(key, value) {
  return (await db()).put('meta', value, key)
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
