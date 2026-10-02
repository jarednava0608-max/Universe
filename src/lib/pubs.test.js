import { describe, it, expect } from 'vitest'
import { findPubs, pubTitle, pubUrl, isPubRef, linkPubsMarkdown } from './pubs.js'

describe('Referencias a publicaciones', () => {
  it('reconoce libros conocidos, títulos entre comillas y La Atalaya por símbolo', () => {
    const t = 'Leímos Seamos valientes, cap. 3, párr. 5 y luego «Ejemplos de fe» lección 2. Ver w23.05 pág. 10 y lff lección 12.'
    expect(findPubs(t)).toEqual(['Seamos valientes, cap. 3, párr. 5', '«Ejemplos de fe» lección 2', 'w23.05 pág. 10', 'lff lección 12'])
  })
  it('toma la página aunque haya punto al final', () => {
    expect(findPubs('Ver w23.05 pág. 10. Y g23.1.')).toEqual(['w23.05 pág. 10', 'g23.1'])
  })
  it('no confunde texto normal ni citas bíblicas', () => {
    expect(findPubs('Juan 3:16, el capítulo 3 es bonito. Hay 5 libros. La cap 3')).toEqual([])
    expect(findPubs('tengo perspicacia para entender, y leí La Atalaya ayer')).toEqual([])
  })
  it('reconoce el título solo, el nombre corto y los volúmenes', () => {
    expect(findPubs('Imitemos su fe es un buen libro')).toEqual(['Imitemos su fe'])
    expect(findPubs('Ver Perspicacia para comprender las Escrituras.')).toEqual(['Perspicacia para comprender las Escrituras'])
    expect(findPubs('Perspicacia, vol. 1, pág. 345 y it-2 pág. 10; también Perspicacia')).toEqual(['Perspicacia, vol. 1, pág. 345', 'it-2 pág. 10', 'Perspicacia'])
    expect(pubTitle('Perspicacia, vol. 1, pág. 345')).toBe('Perspicacia para comprender las Escrituras')
    expect(pubTitle('it-2 pág. 10')).toBe('Perspicacia para comprender las Escrituras')
    expect(pubTitle('Perspicacia')).toBe('Perspicacia para comprender las Escrituras')
    expect(isPubRef('Perspicacia')).toBe(true)
    expect(isPubRef('perspicacia')).toBe(false)
  })
  it('busca la publicación en wol.jw.org', () => {
    expect(pubTitle('Seamos valientes, cap. 3')).toBe('Seamos valientes')
    expect(pubTitle('ia cap. 10')).toBe('Imitemos su fe')
    expect(pubTitle('«Ejemplos de fe» lección 2')).toBe('Ejemplos de fe')
    expect(pubTitle('w23.05 pág. 10')).toBe('La Atalaya w23.05')
    expect(pubUrl('Imitemos su fe cap. 10')).toBe('https://wol.jw.org/es/wol/s/r4/lp-s?q=Imitemos%20su%20fe')
    expect(isPubRef('Seamos valientes, cap. 3')).toBe(true)
    expect(isPubRef('Juan 3:16')).toBe(false)
    expect(linkPubsMarkdown('ver ia cap. 2.')).toBe('ver [ia cap. 2](https://wol.jw.org/es/wol/s/r4/lp-s?q=Imitemos%20su%20fe).')
  })
})
