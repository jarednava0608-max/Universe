import { describe, it, expect } from 'vitest'
import { mergeProgress } from './progress.js'

import { typeWords, foldLetter } from './logic.js'
describe('Escribir (primera letra)', () => {
  it('separa puntuación y deja la letra sin acento', () => {
    const w = typeWords('«Él es Jehová», dijo — Ésta: ¿ves?')
    expect(w.map((x) => x.letter)).toEqual(['e', 'e', 'j', 'd', '', 'e', 'v'])
    expect(w[0]).toEqual({ pre: '«', word: 'Él', post: '', letter: 'e' })
    expect(w[2]).toEqual({ pre: '', word: 'Jehová', post: '»,', letter: 'j' })
    expect(w[4].word).toBe('')
    expect(w[6]).toEqual({ pre: '¿', word: 'ves', post: '?', letter: 'v' })
    expect(typeWords('dijo —y')[1]).toEqual({ pre: '—', word: 'y', post: '', letter: 'y' })
  })
  it('compara sin acentos ni mayúsculas', () => {
    expect(foldLetter('Á')).toBe('a')
    expect(foldLetter('ñ')).toBe('n')
  })
})

describe('récords de tiempo', () => {
  it('al unir dispositivos: el mayor, y en los de tiempo el más rápido', () => {
    expect(mergeProgress({ best: { 'parejas-tiempo': 31, libros: 50 } }, { best: { 'parejas-tiempo': 25, libros: 80 } }).best).toEqual({ 'parejas-tiempo': 25, libros: 80 })
    expect(mergeProgress({ best: { 'parejas-tiempo': 31 } }, { best: {} }).best).toEqual({ 'parejas-tiempo': 31 })
  })
})

describe('Texto diario con cita de Éxodo', () => {
  it('separa la cita aunque empiece con É', async () => {
    const { verseSources } = await import('./logic.js')
    const [v] = verseSources([{ id: 'd1', kind: 'diario', fields: { texto: 'Yo seré lo que yo decida ser (Éxodo 3:14).' } }])
    expect(v.fields.cita).toBe('Éxodo 3:14')
    expect(v.fields.texto).toBe('Yo seré lo que yo decida ser')
    const [w] = verseSources([{ id: 'd2', kind: 'diario', fields: { texto: 'Jehová es mi pastor. Salmo 23:1' } }])
    expect(w.fields.cita).toBe('Salmo 23:1')
  })
})
