import { describe, it, expect } from 'vitest'
import { SEEDS, planSeed } from './seeds.js'
import { planImport } from './importer.js'
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
  it('queda Jeremías como biografía y un nodo por capítulo, sin "Jeremías 38 y 39"', () => {
    const out = run([makeRoot()])
    const titles = out.map((n) => n.title).sort()
    expect(titles).toContain('Jeremías 38')
    expect(titles).toContain('Jeremías 39')
    expect(titles).not.toContain('Jeremías 38 y 39')
    const jer = out.find((n) => n.title === 'Jeremías')
    expect(jer.note).toMatch(/^Profeta de Jehová/)
    expect(jer.note).not.toContain('---')
    expect(out.filter((n) => n.title === 'Jeremías')).toHaveLength(1)
  })

  it('si el usuario editó sus nodos, no borra nada: agrega abajo y deja el nodo de los dos capítulos', () => {
    let nodes = run([makeRoot()], [SEEDS[0]])
    nodes = nodes.map((n) => (n.title === 'Jeremías' || n.title === 'Jeremías 38 y 39' ? { ...n, note: n.note + '\n\nMi nota propia.' } : n))
    const out = run(nodes, [SEEDS[1]])
    const jer = out.find((n) => n.title === 'Jeremías')
    expect(jer.note).toContain('Mi nota propia.')
    expect(jer.note).toContain('Profeta de Jehová')
    expect(out.map((n) => n.title)).toContain('Jeremías 38 y 39')
  })

  it('aplicar otra vez no repite nada', () => {
    const once = run([makeRoot()])
    const twice = run(once, [SEEDS[1]])
    expect(twice.find((n) => n.title === 'Jeremías').note).toBe(once.find((n) => n.title === 'Jeremías').note)
    expect(planImport(SEEDS[1].data, { nodes: twice, edges: [] }).updatedNodes).toHaveLength(0)
  })
})
