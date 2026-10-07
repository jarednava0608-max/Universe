import { describe, expect, it } from 'vitest'
import { galaxyOf, makeNode, makeRoot, sameGalaxy } from './model.js'
import { planImport } from './importer.js'

describe('galaxias', () => {
  it('los nodos sin galaxia son de Escuela', () => {
    expect(galaxyOf({ id: 'x', title: 'Viejo' })).toBe('escuela')
    expect(galaxyOf({ galaxy: 'otra' })).toBe('escuela')
    expect(makeRoot().galaxy).toBe('escuela')
  })

  it('un nodo nuevo guarda su galaxia', () => {
    expect(makeNode({ title: 'Word', galaxy: 'english' }).galaxy).toBe('english')
    expect(makeNode({ title: 'Sin preferencia' }).galaxy).toBe('escuela')
  })

  it('no conecta nodos de galaxias distintas al pegar conocimiento', () => {
    const a = makeNode({ title: 'Apple', galaxy: 'english' })
    const b = makeNode({ title: 'Fe', galaxy: 'espiritual' })
    const c = makeNode({ title: 'Banana', galaxy: 'english' })
    expect(sameGalaxy(a, b)).toBe(false)
    const plan = planImport({ edges: [{ from: 'Apple', to: 'Fe', rel: 'X' }, { from: 'Apple', to: 'Banana', rel: 'Y' }] }, { nodes: [a, b, c], edges: [] })
    expect(plan.newEdges).toHaveLength(1)
    expect(plan.newEdges[0].target).toBe(c.id)
    expect(plan.warnings.some((w) => w.includes('galaxias distintas'))).toBe(true)
  })
})
