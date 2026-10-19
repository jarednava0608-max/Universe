import { describe, it, expect } from 'vitest'
import { mergeProgress } from './progress.js'

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
