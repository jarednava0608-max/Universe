import { describe, it, expect } from 'vitest'
import { atalayaSourceCards, atalayaSourceCheck, mulberry } from './logic.js'

describe('¿De qué Atalaya es?', () => {
  const art = (n) => Array.from({ length: n }, (_, i) => `${i + 1}. ¿Pregunta ${i + 1}?\n\n${i + 1} Corto. Esta es la oración más larga del párrafo número ${i + 1} del artículo.`).join('\n\n')
  const ent = (id, fecha, n) => ({ id, kind: 'reunion', fields: { tipo: 'atalaya', fecha, titulo: 'Artículo ' + id, articulo: art(n) }, updatedAt: 1 })

  it('hasta 4 trozos por artículo, repartidos, sin necesitar respuestas', () => {
    const cards = atalayaSourceCards([ent('a', '2026-09-26', 12), ent('b', '2026-10-03', 2), ent('c', '2026-09-19', 1)])
    expect(cards.map((c) => c.id)).toEqual(['b:de:1', 'b:de:2', 'a:de:2', 'a:de:5', 'a:de:8', 'a:de:11', 'c:de:1'])
    expect(cards[0].front).toBe('Esta es la oración más larga del párrafo número 1 del artículo.')
    expect(cards[0].back).toBe('Artículo b · 3 de octubre')
  })

  it('se elige el artículo entre tus otras Atalayas; con menos de 3 artículos no hay trozos', () => {
    const cards = atalayaSourceCards([ent('a', '2026-09-26', 4), ent('b', '2026-10-03', 4), ent('c', '2026-09-19', 4)])
    const q = atalayaSourceCheck(cards[0], cards, mulberry(2))
    expect(q.ask).toBe('¿De qué Atalaya es?')
    expect(q.options).toHaveLength(3)
    expect(q.options[q.answer]).toBe('Artículo b · 3 de octubre')
    expect(atalayaSourceCards([ent('a', '2026-09-26', 4), ent('b', '2026-10-03', 4)])).toEqual([])
    expect(atalayaSourceCheck(cards[0], cards.filter((c) => c.group === 'b'), mulberry(2))).toBe(null)
  })
})
