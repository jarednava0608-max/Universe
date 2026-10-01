import { describe, it, expect } from 'vitest'
import { parseJsonLoose, planImport, buildExport } from './importer.js'
import { makeRoot, makeNode, ROOT_ID } from './model.js'
import { extractLinks, renameLinks } from './markdown.js'

const base = () => ({ nodes: [makeRoot()], edges: [] })

describe('parseJsonLoose', () => {
  it('acepta JSON dentro de bloque ```json', () => {
    expect(parseJsonLoose('Aquí está:\n```json\n{"nodes":[]}\n```')).toEqual({ nodes: [] })
  })
  it('da un error claro si no es JSON', () => {
    expect(() => parseJsonLoose('hola')).toThrow(/JSON válido/)
  })
})

describe('planImport', () => {
  it('crea nodos y conecta por título, incluida la raíz', () => {
    const plan = planImport(
      {
        nodes: [{ title: 'Amor', type: 'concepto', origin: 'jw', note: 'Ver [[Jehová]]', sources: [{ label: '1 Juan 4:8', url: 'https://wol.jw.org/x' }] }],
        edges: [{ from: 'Jehová', to: 'amor', rel: 'demostró' }],
      },
      base(),
    )
    expect(plan.newNodes).toHaveLength(1)
    expect(plan.newNodes[0].sources[0].url).toBe('https://wol.jw.org/x')
    expect(plan.newEdges).toHaveLength(1)
    expect(plan.newEdges[0]).toMatchObject({ source: ROOT_ID, target: plan.newNodes[0].id, rel: 'DEMOSTRÓ' })
    expect(plan.warnings).toEqual([])
  })

  it('añade información a un nodo existente sin borrar la anterior', () => {
    const state = base()
    const fe = makeNode({ title: 'Fe', origin: 'jw', note: 'Texto viejo', sources: [{ label: 'Hebreos 11:1' }] })
    state.nodes.push(fe)
    const plan = planImport({ nodes: [{ title: 'fe', origin: 'propio', note: 'Idea mía', sources: ['Hebreos 11:1', 'Hebreos 11:6'] }] }, state)
    expect(plan.newNodes).toHaveLength(0)
    const after = plan.updatedNodes[0].after
    expect(after.id).toBe(fe.id)
    expect(after.note).toContain('Texto viejo')
    expect(after.note).toContain('Idea mía')
    expect(after.sources.map((s) => s.label)).toEqual(['Hebreos 11:1', 'Hebreos 11:6'])
    expect(after.origin).toBe('mixto')
  })

  it('no duplica conexiones existentes y avisa de nodos que no existen', () => {
    const state = base()
    const a = makeNode({ title: 'A' })
    state.nodes.push(a)
    state.edges.push({ id: 'e1', source: ROOT_ID, target: a.id, rel: 'ENSEÑA' })
    const plan = planImport({ edges: [{ from: 'Jehová', to: 'A', rel: 'ENSEÑA' }, { from: 'A', to: 'Nada', rel: 'X' }] }, state)
    expect(plan.newEdges).toHaveLength(0)
    expect(plan.warnings[0]).toMatch(/Nada/)
  })

  it('acepta nodos sin tipo ni origen (formato simple)', () => {
    const plan = planImport({ nodes: [{ title: 'Sin origen', note: 'Definición' }] }, base())
    expect(plan.newNodes[0]).toMatchObject({ title: 'Sin origen', note: 'Definición', type: 'concepto' })
    expect(plan.warnings).toEqual([])
  })

  it('restaura un respaldo completo en modo reemplazo', () => {
    const state = base()
    const a = makeNode({ title: 'A' })
    const backup = buildExport([makeRoot(), a], [{ id: 'e1', source: ROOT_ID, target: a.id, rel: 'ENSEÑA' }])
    const json = JSON.parse(JSON.stringify(backup))
    const plan = planImport(json, { nodes: [...state.nodes, makeNode({ title: 'Otro' })], edges: [] }, { replace: true })
    expect(plan.replace).toBe(true)
    expect(plan.newNodes.map((n) => n.id).sort()).toEqual([a.id, ROOT_ID].sort())
    expect(plan.newEdges[0]).toMatchObject({ id: 'e1', source: ROOT_ID, target: a.id })
  })
})

describe('enlaces [[ ]]', () => {
  it('extrae y renombra enlaces', () => {
    const text = 'Ver [[Fe]] y [[fe|la fe]] y [[Amor]]'
    expect(extractLinks(text)).toEqual(['Fe', 'fe', 'Amor'])
    expect(renameLinks(text, 'Fe', 'Fe verdadera')).toBe('Ver [[Fe verdadera]] y [[Fe verdadera|la fe]] y [[Amor]]')
  })
})

import { unwrapCallouts } from './markdown.js'
describe('bloques antiguos [!jw] / [!yo]', () => {
  it('se muestran como texto normal', () => {
    const t = 'Intro\n\n> [!jw]\n> Dice JW\n> sigue\n\n> [!yo] Pienso yo\n\nFin'
    expect(unwrapCallouts(t)).toBe('Intro\n\nDice JW\nsigue\n\nPienso yo\n\nFin')
  })
})
