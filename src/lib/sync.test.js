// Simula dos teléfonos con IndexedDB propio y una "nube" en memoria con la misma
// semántica que las tablas de Supabase (upsert por user_id+id, server_updated_at).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

function fakeCloud() {
  const tables = { universe_nodes: new Map(), universe_edges: new Map(), universe_entries: new Map() }
  let clock = Date.parse('2026-01-01T00:00:00Z')
  const tick = () => new Date((clock += 1000)).toISOString()

  return {
    tables,
    from(name) {
      const t = tables[name]
      return {
        async upsert(rows) {
          for (const r of rows) t.set(r.user_id + '|' + r.id, { ...t.get(r.user_id + '|' + r.id), ...r, server_updated_at: tick() })
          return { error: null }
        },
        select() {
          const f = { uid: null, since: null, limit: 1e9 }
          const q = {
            eq(_c, v) { f.uid = v; return q },
            gt(_c, v) { f.since = v; return q },
            order() { return q },
            limit(n) { f.limit = n; return q },
            then(res, rej) {
              const data = [...t.values()]
                .filter((r) => r.user_id === f.uid && (!f.since || r.server_updated_at > f.since))
                .sort((a, b) => a.server_updated_at.localeCompare(b.server_updated_at))
                .slice(0, f.limit)
              return Promise.resolve({ data, error: null }).then(res, rej)
            },
          }
          return q
        },
      }
    },
  }
}

// Carga los módulos con un IndexedDB nuevo = otro teléfono.
async function device() {
  vi.resetModules()
  globalThis.indexedDB = new IDBFactory()
  const db = await import('./db.js')
  const sync = await import('./sync.js')
  const model = await import('./model.js')
  return { db, sync, model }
}

const U = 'user-1'

describe('sincronización', () => {
  let cloud
  beforeEach(() => {
    cloud = fakeCloud()
  })

  it('sube los datos existentes la primera vez y otro teléfono los recibe', async () => {
    const a = await device()
    const root = a.model.makeRoot()
    await a.db.commit({ putNodes: [root] }, { track: false }) // como al abrir la app
    const fe = a.model.makeNode({ title: 'Fe', origin: 'jw', note: 'Hebreos 11' })
    await a.db.commit({ putNodes: [{ ...root, note: 'Dios único', updatedAt: 5 }, fe], putEdges: [a.model.makeEdge({ source: root.id, target: fe.id, rel: 'ENSEÑA' })] }, { track: false }) // datos de la etapa 1, sin outbox
    const r1 = await a.sync.syncOnce(cloud, U)
    expect(r1.pushed).toBe(3)
    expect(await a.sync.pendingCount()).toBe(0)

    const b = await device()
    await b.db.commit({ putNodes: [b.model.makeRoot()] }, { track: false }) // raíz vacía nueva
    const r2 = await b.sync.syncOnce(cloud, U)
    const { nodes, edges } = await b.db.loadAll()
    expect(nodes.find((n) => n.id === 'jehova').note).toBe('Dios único') // la raíz vacía no pisa la de la nube
    expect(nodes.map((n) => n.title).sort()).toEqual(['Fe', 'Jehová'])
    expect(edges).toHaveLength(1)
    expect(r2.change.putNodes.length).toBe(2)
  })

  it('propaga ediciones y borrados, y gana el cambio más reciente', async () => {
    const a = await device()
    const n = a.model.makeNode({ title: 'Amor', updatedAt: 100 })
    await a.db.commit({ putNodes: [n] })
    await a.sync.syncOnce(cloud, U)

    const b = await device()
    await b.sync.syncOnce(cloud, U)
    expect((await b.db.get('nodes', n.id)).title).toBe('Amor')

    // B edita y sincroniza; un tercer teléfono recibe la versión de B.
    await b.db.commit({ putNodes: [{ ...n, note: 'versión B', updatedAt: 300 }] })
    await b.sync.syncOnce(cloud, U)
    const c = await device()
    await c.sync.syncOnce(cloud, U)
    expect((await c.db.get('nodes', n.id)).note).toBe('versión B')
  })

  it('un cambio local más nuevo no se pisa con uno viejo de la nube', async () => {
    const a = await device()
    const n = a.model.makeNode({ title: 'Paz', note: 'viejo', updatedAt: 100 })
    await a.db.commit({ putNodes: [n] })
    await a.sync.syncOnce(cloud, U)
    // Otro teléfono subió una versión más vieja (reloj atrasado)
    await cloud.from('universe_nodes').upsert([{ user_id: U, id: n.id, title: 'Paz', type: 'concepto', origin: 'propio', note: 'desde otro', sources: [], created_at: 1, updated_at: 150, deleted: false }])
    // y aquí se editó después
    await a.db.commit({ putNodes: [{ ...n, note: 'nuevo local', updatedAt: 500 }] })
    await a.sync.syncOnce(cloud, U)
    expect((await a.db.get('nodes', n.id)).note).toBe('nuevo local')
    expect(cloud.tables.universe_nodes.get(U + '|' + n.id).note).toBe('nuevo local')
  })

  it('los borrados viajan como lápidas', async () => {
    const a = await device()
    const n = a.model.makeNode({ title: 'Temporal' })
    await a.db.commit({ putNodes: [n] })
    await a.sync.syncOnce(cloud, U)
    const b = await device()
    await b.sync.syncOnce(cloud, U)
    expect(await b.db.get('nodes', n.id)).toBeTruthy()
    await new Promise((r) => setTimeout(r, 5))
    await b.db.commit({ delNodes: [n.id] })
    await b.sync.syncOnce(cloud, U)
    expect(cloud.tables.universe_nodes.get(U + '|' + n.id).deleted).toBe(true)
  })

  it('sincroniza las entradas de Estudio y de juegos', async () => {
    const a = await device()
    const entry = { id: 'e1', kind: 'diario', fields: { fecha: '2026-10-01', texto: 'Juan 17:3', resumen: 'Conocer da vida' }, mapNodeId: 'n1', createdAt: 1, updatedAt: 100 }
    await a.db.commit({ putEntries: [entry, { id: 't1', kind: 'trivia', fields: { pregunta: '¿?', opciones: ['a', 'b'], respuesta: 0 }, createdAt: 1, updatedAt: 1 }] })
    expect(await a.sync.pendingCount()).toBe(2)
    await a.sync.syncOnce(cloud, U)
    expect(await a.sync.pendingCount()).toBe(0)

    const b = await device()
    await b.sync.syncOnce(cloud, U)
    expect(await b.db.get('entries', 'e1')).toEqual(entry)
    await b.db.commit({ delEntries: ['t1'] })
    await b.sync.syncOnce(cloud, U)
    await a.sync.syncOnce(cloud, U)
    expect(await a.db.get('entries', 't1')).toBeUndefined()
  })

  it('combina la racha y los repasos de dos teléfonos', async () => {
    const a = await device()
    await a.db.commit({ putEntries: [{ id: 'progreso', kind: 'progreso', fields: { days: ['2026-10-01', '2026-10-02'], srs: { 'c:1': { box: 2, due: '2026-10-05' } }, triviaBest: 60 }, createdAt: 1, updatedAt: 10 }] })
    await a.sync.syncOnce(cloud, U)
    const b = await device()
    await b.db.commit({ putEntries: [{ id: 'progreso', kind: 'progreso', fields: { days: ['2026-10-03'], srs: { 'c:2': { box: 1, due: '2026-10-04' } }, triviaBest: 80 }, createdAt: 1, updatedAt: 20 }] })
    await b.sync.syncOnce(cloud, U)
    await a.sync.syncOnce(cloud, U)
    for (const d of [a, b]) {
      const p = (await d.db.get('entries', 'progreso')).fields
      expect(p.days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
      expect(Object.keys(p.srs).sort()).toEqual(['c:1', 'c:2'])
      expect(p.triviaBest).toBe(80)
    }
  })
})
