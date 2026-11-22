// Textos diarios en la cuenta: un dispositivo los sube y otro, sin EPUB, los recibe.
import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

function fakeMeta() {
  const rows = new Map()
  const calls = []
  return {
    rows,
    calls,
    from() {
      const f = {}
      const q = {
        select(cols) { f.cols = cols; return q },
        eq(c, v) { f[c] = v; return q },
        async maybeSingle() {
          calls.push(f.cols)
          const r = rows.get(f.user_id + '|' + f.key)
          if (!r) return { data: null, error: null }
          return { data: f.cols.startsWith('years') ? { years: r.value.years } : { value: structuredClone(r.value) }, error: null }
        },
        async upsert(row) { rows.set(row.user_id + '|' + row.key, structuredClone(row)); return { error: null } },
      }
      return q
    },
  }
}

async function device() {
  vi.resetModules()
  globalThis.indexedDB = new IDBFactory()
  const db = await import('./db.js')
  const dt = await import('./dailytexts.js')
  return { db, dt }
}

describe('textos diarios en la nube', () => {
  it('sube lo del EPUB y otro dispositivo lo recibe', async () => {
    const cloud = fakeMeta()
    const a = await device()
    await a.db.setMeta('dailytexts', { importedAt: 1, years: [2026], days: { '2026-11-22': 'Domingo 22 de noviembre' } })
    await a.dt.loadDailyTexts()
    await a.dt.syncDailyTexts(cloud, 'u1')
    expect(cloud.rows.get('u1|dailytexts').value.years).toEqual([2026])

    const b = await device()
    await b.dt.loadDailyTexts()
    expect(b.dt.hasDailyTexts()).toBe(false)
    await b.dt.syncDailyTexts(cloud, 'u1')
    expect(b.dt.dailyTextFor('2026-11-22')).toBe('Domingo 22 de noviembre')
    expect((await b.db.getMeta('dailytexts')).years).toEqual([2026])

    // Ya igual: solo se piden los años, sin bajar todo otra vez.
    cloud.calls.length = 0
    await b.dt.loadDailyTexts()
    await b.dt.syncDailyTexts(cloud, 'u1')
    expect(cloud.calls).toEqual(['years:value->years'])
  })

  it('junta años distintos de dos dispositivos', async () => {
    const cloud = fakeMeta()
    cloud.rows.set('u1|dailytexts', { value: { importedAt: 1, years: [2026], days: { '2026-01-01': 'a' } } })
    const a = await device()
    await a.db.setMeta('dailytexts', { importedAt: 2, years: [2027], days: { '2027-01-01': 'b' } })
    await a.dt.loadDailyTexts()
    await a.dt.syncDailyTexts(cloud, 'u1')
    expect(a.dt.dailyTextFor('2026-01-01')).toBe('a')
    expect(cloud.rows.get('u1|dailytexts').value.years).toEqual([2026, 2027])
  })
})
