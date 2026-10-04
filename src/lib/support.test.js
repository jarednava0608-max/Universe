import { describe, it, expect } from 'vitest'
import { buildSupport, connectionCount, isTextNode, supportLines } from './support.js'
import { ROOT_ID } from './model.js'

const n = (id, title, note = '') => ({ id, title, note })
const nodes = [
  n(ROOT_ID, 'Jehová', 'Dios.'),
  n('t1', 'Juan 17:3', 'Esto significa vida eterna…'),
  n('a', 'Conocer a Jehová da vida eterna', 'Conocer a [[Jehová]] da vida eterna. [[Juan 17:3]]'),
  n('b', 'Sin conocer no se puede amar', 'No se ama lo que no se conoce (Marcos 12:30).'),
  n('c', 'Bautizarse por amor', 'Porque ama a [[Jehová]]. Ver [[Sin conocer no se puede amar]].'),
  n('d', 'Conclusión suelta', 'Lo dice el artículo, párrafo 4. Habla de [[Jehová]].'),
  n('e', 'Lección', 'Sale de [[Bautizarse por amor]].'),
  n('f', 'Jeremías 38 y 39', 'La caída de Jerusalén.'),
]

describe('En qué se apoya cada idea', () => {
  const sup = buildSupport(nodes)

  it('textos bíblicos: solo los nodos cuyo título es una cita', () => {
    expect(isTextNode(nodes[1])).toBe(true)
    expect(isTextNode(n('x', 'Jeremías 38'))).toBe(true)
    expect(isTextNode(n('x', '1 Timoteo 2:3, 4'))).toBe(true)
    expect(isTextNode(nodes[7])).toBe(false) // "Jeremías 38 y 39" es una idea
    expect(isTextNode(nodes[0])).toBe(false)
  })

  it('niveles: Jehová, textos, ideas que citan, ideas que se apoyan en esas', () => {
    expect(['jehova', 't1', 'a', 'b', 'c', 'e'].map(sup.level)).toEqual([0, 1, 2, 2, 3, 4])
    // Mencionar a Jehová no cuenta como apoyo.
    expect(sup.level('d')).toBe(null)
    expect(sup.unfounded().map((x) => x.id)).toEqual(['d', 'f']) // "Conclusión suelta", "Jeremías 38 y 39"
  })

  it('textos directos, camino hasta un texto y quién la usa', () => {
    expect(sup.texts('a')).toEqual(['Juan 17:3'])
    expect(sup.texts('b')).toEqual(['Marcos 12:30'])
    expect(sup.path('e')).toEqual(['c', 'b', 'Marcos 12:30'])
    expect(sup.path('a')).toBe(null) // ya cita un texto
    expect(sup.usedBy('b')).toEqual(['c'])
    expect(sup.usedBy(ROOT_ID)).toEqual([]) // mencionar a Jehová no es apoyarse en él
  })

  it('lo que se ve al final de la nota', () => {
    const e = supportLines(nodes[6], nodes, sup)
    expect(e[0]).toMatchObject({ label: 'Se apoya en', md: '[[c|Bautizarse por amor]] → [[b|Sin conocer no se puede amar]] → Marcos 12:30' })
    const d = supportLines(nodes[5], nodes, sup)
    expect(d).toEqual([{ key: 'base', label: 'Se apoya en', md: 'Todavía no llega a ningún texto bíblico.', missing: true }])
    const b = supportLines(nodes[3], nodes, sup)
    expect(b.map((x) => x.md)).toEqual(['Marcos 12:30', '[[c|Bautizarse por amor]]'])
    // Un texto bíblico no dice en qué se apoya; solo quién lo usa.
    expect(supportLines(nodes[1], nodes, sup).map((x) => x.label)).toEqual(['La usan'])
  })
})

describe('Conexiones del mapa', () => {
  it('cuenta los [[enlaces]] y las conexiones guardadas, cada par una vez', () => {
    // a→Jehová, a→t1, c→Jehová, c→b, d→Jehová, e→c y la conexión guardada t1–a (ya contada).
    expect(connectionCount(nodes, [{ source: 't1', target: 'a' }])).toBe(6)
  })
})
