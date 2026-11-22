// Lo importado de los EPUB en la cuenta: un dispositivo lo sube y otro, sin el archivo, lo recibe.
import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

// Como la tabla universe_meta: filas por (user_id, key).
function fakeCloud() {
  const rows = new Map()
  const reads = []
  return {
    rows,
    reads,
    from() {
      const f = {}
      const run = () => {
        reads.push(f.cols + (f.in ? ` in ${f.in.length}` : ''))
        let list = [...rows.values()].filter((r) => r.user_id === f.user_id)
        if (f.like) list = list.filter((r) => r.key.startsWith(f.like.slice(0, -1)))
        if (f.key) list = list.filter((r) => r.key === f.key)
        if (f.in) list = list.filter((r) => f.in.includes(r.key))
        list.sort((a, b) => a.key.localeCompare(b.key))
        if (f.range) list = list.slice(f.range[0], f.range[1] + 1)
        return list.map((r) => Object.fromEntries(f.cols.split(',').map((c) => [c, structuredClone(r[c])])))
      }
      const q = {
        select(cols) { f.cols = cols; return q },
        eq(c, v) { f[c] = v; return q },
        like(_c, v) { f.like = v; return q },
        in(_c, v) { f.in = v; return q },
        order() { return q },
        range(a, b) { f.range = [a, b]; return q },
        then(res, rej) { return Promise.resolve({ data: run(), error: null }).then(res, rej) },
        async maybeSingle() { return { data: run()[0] ?? null, error: null } },
        async upsert(r) { for (const row of [r].flat()) rows.set(row.user_id + '|' + row.key, structuredClone(row)); return { error: null } },
      }
      return q
    },
  }
}

async function device() {
  vi.resetModules()
  globalThis.indexedDB = new IDBFactory()
  const db = await import('./db.js')
  const jw = await import('./jwCloud.js')
  const dt = await import('./dailytexts.js')
  const nwt = await import('./nwt.js')
  const wt = await import('./watchtower.js')
  return { db, jw, dt, nwt, wt }
}

describe('EPUB en la cuenta', () => {
  it('sube la Biblia, los textos diarios y La Atalaya, y otro dispositivo los recibe', async () => {
    const cloud = fakeCloud()
    const a = await device()
    await a.db.setMeta('dailytexts', { importedAt: 1, years: [2026], days: { '2026-11-22': 'Domingo 22 de noviembre' } })
    const chapters = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`1:${i + 1}`, [{ v: 1, texto: 'En el principio' }]]))
    await a.db.setMeta('bible', { source: 'nwt-S', importedAt: 1, chapters })
    await a.db.setMeta('revistas', { importedAt: 1, issues: { 202608: { titulo: 'agosto de 2026', articulos: [] } } })
    await a.jw.syncJwFiles(cloud, 'u1', 1)
    expect(cloud.rows.has('u1|bible/1:250')).toBe(true)
    expect(cloud.rows.get('u1|dailytexts').value).toEqual({ importedAt: 1, years: [2026] })

    const b = await device()
    expect(b.dt.hasDailyTexts()).toBe(false)
    await b.jw.syncJwFiles(cloud, 'u1', 0)
    expect(b.dt.dailyTextFor('2026-11-22')).toBe('Domingo 22 de noviembre')
    expect(b.nwt.bibleVerse(1, 250, 1)).toBe('En el principio')
    expect(b.wt.watchtowerIssues()).toEqual(['agosto de 2026'])
    expect(Object.keys((await b.db.getMeta('bible')).chapters)).toHaveLength(250)

    // Ya igual: solo se piden los nombres de las partes, sin bajar nada.
    cloud.reads.length = 0
    await b.jw.syncJwFiles(cloud, 'u1', 5)
    expect(cloud.reads.every((r) => r === 'key')).toBe(true)
  })

  it('junta años distintos de dos dispositivos', async () => {
    const cloud = fakeCloud()
    const a = await device()
    await a.db.setMeta('dailytexts', { importedAt: 1, years: [2026], days: { '2026-01-01': 'a' } })
    await a.jw.syncJwFiles(cloud, 'u1', 1)
    const b = await device()
    await b.db.setMeta('dailytexts', { importedAt: 2, years: [2027], days: { '2027-01-01': 'b' } })
    await b.jw.syncJwFiles(cloud, 'u1', 1)
    expect(b.dt.dailyTextFor('2026-01-01')).toBe('a')
    expect(cloud.rows.get('u1|dailytexts').value.years).toEqual([2026, 2027])
    expect(cloud.rows.has('u1|dailytexts/2027-01-01')).toBe(true)
  })
})
