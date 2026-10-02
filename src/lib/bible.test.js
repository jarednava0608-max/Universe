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
