import { describe, it, expect } from 'vitest'
import { refKey, findSavedVerse, jwLibraryUrl, makeBibleEntry } from './verses.js'

describe('Mi Biblia', () => {
  it('compara citas escritas de formas distintas', () => {
    expect(refKey('Sal. 83:18')).toBe(refKey('Salmo 83:18'))
    expect(refKey('Mateo 6:9, 10')).toBe('40:6:9,10')
    expect(refKey('Jeremías 38')).toBe('24:38')
    expect(refKey('Libro raro 1:1')).toBe(null)
  })
  it('busca primero en Mi Biblia y luego en Memorizar y el diario', () => {
    const entries = [
      { id: 'm', kind: 'memoria', fields: { cita: 'Juan 17:3', texto: 'Desde memorizar' } },
      { id: 'd', kind: 'diario', fields: { texto: 'Dios es amor. (1 Juan 4:8)' } },
    ]
    expect(findSavedVerse(entries, 'Juan 17:3')).toMatchObject({ texto: 'Desde memorizar', source: 'memoria' })
    expect(findSavedVerse(entries, '1 Jn 4:8')).toMatchObject({ texto: 'Dios es amor.', source: 'diario' })
    entries.push(makeBibleEntry('Jn 17:3', 'Desde mi Biblia'))
    expect(findSavedVerse(entries, 'Juan 17:3')).toMatchObject({ texto: 'Desde mi Biblia', source: 'biblia' })
    expect(findSavedVerse(entries, 'Juan 3:16')).toBe(null)
  })
  it('arma el enlace para JW Library', () => {
    expect(jwLibraryUrl('Juan 17:3')).toContain('bible=43017003&pub=nwtsty')
    expect(jwLibraryUrl('Mateo 6:9, 10')).toContain('bible=40006009-40006010')
    expect(jwLibraryUrl('Génesis 1:1')).toContain('bible=01001001')
  })
})
