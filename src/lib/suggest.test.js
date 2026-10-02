import { describe, it, expect } from 'vitest'
import { suggest as raw } from './suggest.js'

// Las pruebas viejas comparan solo los nombres.
const suggest = (t, max, nodes) => {
  const r = raw(t, max, nodes)
  return r && { length: r.length, items: r.items.map((i) => i.label) }
}

describe('Sugerencias al escribir', () => {
  it('libros de la Biblia', () => {
    expect(suggest('Leer jere')).toEqual({ length: 4, items: ['Jeremías'] })
    expect(suggest('ver 1 co')).toEqual({ length: 4, items: ['1 Corintios'] })
    expect(suggest('ver 1 cor')).toEqual({ length: 5, items: ['1 Corintios'] })
    expect(suggest('ver 1 cr').items).toEqual(['1 Crónicas'])
    expect(suggest('ver 2 jua').items).toEqual(['2 Juan'])
    expect(suggest('Gén').items).toEqual(['Génesis'])
    expect(suggest('el cant').items).toEqual(['Cantar de los Cantares'])
  })
  it('publicaciones de varias palabras', () => {
    expect(suggest('Repasar Seamos v')).toEqual({ length: 8, items: ['Seamos valientes'] })
    expect(suggest('imitemos').items).toEqual(['Imitemos su fe'])
  })
  it('no molesta con palabras comunes ni con lo ya escrito completo', () => {
    expect(suggest('este')).toBe(null)
    expect(suggest('Jeremías')).toBe(null)
    expect(suggest('hola')).toBe(null)
    expect(suggest('')).toBe(null)
  })
})

describe('Sugerencias de nodos del mapa', () => {
  const nodes = ['Valor', 'Reino de Dios', 'Jeremías', 'Jehová']
  it('sugiere tus nodos desde 2 letras y primero que los libros', () => {
    expect(raw('Jesús necesitó va', 3, nodes)).toEqual({ length: 2, items: [{ label: 'Valor', node: true }] })
    expect(raw('el reino de', 3, nodes).items[0]).toEqual({ label: 'Reino de Dios', node: true })
    expect(raw('jere', 3, nodes).items).toEqual([{ label: 'Jeremías', node: true }, { label: 'Jeremías', node: false }])
    expect(raw('tener valor', 3, nodes).items).toEqual([{ label: 'Valor', node: true }])
    expect(raw('v', 3, nodes)).toBe(null)
  })
})
