import { describe, it, expect } from 'vitest'
import { SEEDS, SEED_BIO, planSeed } from './seeds.js'
import { makeRoot } from './model.js'

// Aplica los paquetes en orden sobre una lista de nodos (como lo hace App).
function run(nodes, seeds = SEEDS) {
  let cur = nodes
  for (const seed of seeds) {
    const { put, del } = planSeed(seed, cur)
    cur = [...cur.filter((n) => !del.includes(n.id) && !put.some((p) => p.id === n.id)), ...put]
  }
  return cur
}

describe('Paquetes del mapa (Jeremías)', () => {
  const titles = (ns) => ns.map((n) => n.title).sort()

  it('en un teléfono nuevo quedan los 9 nodos de lo que estudiamos, como al principio', () => {
    const out = run([makeRoot()], SEEDS.slice(0, 2))
    expect(titles(out)).toContain('Jeremías 38 y 39')
    expect(titles(out)).not.toContain('Jeremías 38')
    expect(out.find((n) => n.title === 'Jeremías').note).toMatch(/^Profeta que eligió la cisterna/)
    expect(out).toHaveLength(10)
  })

  it('si ya tenía la biografía y los capítulos, vuelve a como estaba', () => {
    const before = run(run([makeRoot()], [SEEDS[0]]), [SEED_BIO])
    expect(titles(before)).toContain('Jeremías 38')
    const out = run(before, [SEEDS[1]])
    expect(titles(out)).toEqual(titles(run([makeRoot()], SEEDS.slice(0, 2))))
    expect(out.find((n) => n.title === 'Jeremías').note).toMatch(/^Profeta que eligió la cisterna/)
  })

  it('no toca lo que el usuario editó', () => {
    let nodes = run(run([makeRoot()], [SEEDS[0]]), [SEED_BIO])
    nodes = nodes.map((n) => (n.title === 'Jeremías' || n.title === 'Jeremías 38' ? { ...n, note: n.note + '\n\nMío.' } : n))
    const out = run(nodes, [SEEDS[1]])
    expect(out.find((n) => n.title === 'Jeremías').note).toContain('Mío.')
    expect(titles(out)).toContain('Jeremías 38')
    expect(titles(out)).not.toContain('Jeremías 39')
  })
})

describe('Paquete por capítulo con los versículos', () => {
  it('agrega Jeremías 38 y 39 y guarda los 46 versículos una sola vez', () => {
    const last = SEEDS.at(-1)
    const out = run([makeRoot()])
    expect(out.find((n) => n.title === 'Jeremías 38').note).toMatch(/^## Lo que pasa/)
    expect(out.find((n) => n.title === 'Jeremías 39').note).toContain('Guedalías')
    expect(out.find((n) => n.title === 'Jeremías 38 y 39')).toBeTruthy()
    const { verses } = planSeed(last, out, [], [])
    expect(verses).toHaveLength(46)
    expect(verses[5].fields).toMatchObject({ cita: 'Jeremías 38:6' })
    expect(verses.every((v) => !/[+*]/.test(v.fields.texto))).toBe(true)
    expect(planSeed(last, out, [], verses).verses).toHaveLength(0)
  })
})
