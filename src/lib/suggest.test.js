import { describe, it, expect } from 'vitest'
import { suggest } from './suggest.js'

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
