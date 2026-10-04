import { describe, it, expect } from 'vitest'
import { bookNumber, parseRef, refUrl, findRefs, linkRefsMarkdown } from './bible.js'

describe('citas bíblicas', () => {
  it('reconoce nombres y abreviaturas en español', () => {
    expect(bookNumber('Génesis')).toBe(1)
    expect(bookNumber('Sal.')).toBe(19)
    expect(bookNumber('Salmo')).toBe(19)
    expect(bookNumber('Juan')).toBe(43)
    expect(bookNumber('1 Juan')).toBe(62)
    expect(bookNumber('3 Juan')).toBe(64)
    expect(bookNumber('2 Cor.')).toBe(47)
    expect(bookNumber('1 Tim')).toBe(54)
    expect(bookNumber('Apoc.')).toBe(66)
    expect(bookNumber('Mateo')).toBe(40)
    expect(bookNumber('Fil.')).toBe(50)
    expect(bookNumber('Filemón')).toBe(57)
    expect(bookNumber('Cantar')).toBe(22)
    expect(bookNumber('Hechos')).toBe(44)
    expect(bookNumber('Hola')).toBe(null)
    expect(bookNumber('Samuel')).toBe(null)
  })

  it('arma el enlace a wol.jw.org', () => {
    expect(parseRef('Juan 17:3')).toEqual({ book: 43, chapter: 17, verse: 3 })
    expect(refUrl('Juan 17:3')).toBe('https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/43/17#study=discover&v=43:17:3')
    expect(refUrl('Sal. 83:18')).toContain('/nwtsty/19/83')
  })

  it('encuentra citas y no confunde palabras comunes', () => {
    expect(findRefs('Lee Juan 17:3 y Sal. 83:18. A las 10:30 llegamos. Hola 3:2')).toEqual(['Juan 17:3', 'Sal. 83:18'])
  })

  it('convierte las citas en enlaces markdown', () => {
    expect(linkRefsMarkdown('Ver Juan 17:3.')).toBe(`Ver [Juan 17:3](${refUrl('Juan 17:3')}).`)
  })
})

describe('Notas con formato', async () => {
  const { markdownToHtml } = await import('./markdown.js')
  it('convierte listas de tareas y tablas de Markdown', () => {
    const html = markdownToHtml('## Plan\n- [ ] Leer\n- [x] Orar\n\n| Libro | Cap |\n|---|---|\n| Juan | 17 |')
    expect(html).toContain('<h2>Plan</h2>')
    expect(html).toContain('<ul data-type="taskList">')
    expect(html).toContain('<li data-type="taskItem" data-checked="false">Leer')
    expect(html).toContain('<li data-type="taskItem" data-checked="true">Orar')
    expect(html).toContain('<table>')
    expect(markdownToHtml('')).toBe('')
  })
})

describe('Citas solo con capítulo', async () => {
  const { findRefs, refUrl, linkRefsMarkdown } = await import('./bible.js')
  it('reconoce "Jeremías 38" y arma el enlace al capítulo', () => {
    expect(findRefs('Lee Jeremías 38 y Juan 17:3 hoy')).toEqual(['Jeremías 38', 'Juan 17:3'])
    expect(refUrl('Jeremías 38')).toBe('https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/24/38')
    expect(refUrl('Sal. 23')).toBe('https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/19/23')
    expect(findRefs('El 2 de Octubre 2026 en Marzo 5 Hay 3 cosas')).toEqual([])
    expect(linkRefsMarkdown('ver Jeremías 38.')).toBe('ver [Jeremías 38](https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/24/38).')
  })
})

describe('Éxodo (empieza con letra acentuada)', () => {
  it('se reconoce al inicio, en medio del texto y como enlace', async () => {
    const { findRefs, linkRefsMarkdown } = await import('./bible.js')
    expect(findRefs('Éxodo 2:3')).toEqual(['Éxodo 2:3'])
    expect(findRefs('Lee Éxodo 3:14 y Génesis 1:1.')).toEqual(['Éxodo 3:14', 'Génesis 1:1'])
    expect(linkRefsMarkdown('ver Éxodo 12')).toContain('](https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/2/12)')
    expect(findRefs('aÉxodo 2:3')).toEqual([])
  })
  it('libros de un solo capítulo: "3 Juan 3" es el versículo 3', () => {
    expect(parseRef('3 Juan 3')).toEqual({ book: 64, chapter: 1, verse: 3 })
    expect(parseRef('Judas 9')).toEqual({ book: 65, chapter: 1, verse: 9 })
    expect(refUrl('3 Juan 3')).toBe('https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/64/1#study=discover&v=64:1:3')
    expect(findRefs('(3 Juan 3, 4)')).toEqual(['3 Juan 3, 4'])
  })
  it('no pierde la cita después de una palabra con número', () => {
    expect(findRefs('(Lea 1 Corintios 3:5-9.)')).toEqual(['1 Corintios 3:5-9'])
    expect(findRefs('Salmo 23, 1 Juan 4:8')).toEqual(['Salmo 23', '1 Juan 4:8'])
    expect(linkRefsMarkdown('Lea 1 Corintios 3:5')).toBe('Lea [1 Corintios 3:5](https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/46/3#study=discover&v=46:3:5)')
  })
})

import { isRefTitle } from './bible.js'
describe('isRefTitle: el título es solo una cita', () => {
  it('reconoce citas completas y no ideas con números', () => {
    for (const t of ['Juan 17:3', 'Jeremías 38', '1 Timoteo 2:3, 4', 'Sal. 83:18', 'Éxodo 34:6, 7.']) expect(isRefTitle(t)).toBe(true)
    for (const t of ['Jeremías 38 y 39', 'Sedequías', 'Exilio y los 70 años', 'Juan 17:3 y la vida eterna', '']) expect(isRefTitle(t)).toBe(false)
  })
})
