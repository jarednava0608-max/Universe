import { describe, it, expect } from 'vitest'
import { docToText } from './noteText.js'
import { markdownToHtml } from '../lib/markdown.js'

describe('Notas: compartir y enlaces', () => {
  it('convierte [[Título]] en enlace a nodo', () => {
    expect(markdownToHtml('Ver [[Jehová]] y [[Fe|la fe]]')).toContain('<a data-node="Jehová">Jehová</a> y <a data-node="Fe">Fe</a>')
  })
  it('arma texto legible para compartir', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Plan' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hablar de ' }, { type: 'nodeLink', attrs: { title: 'Fe' } }] },
        { type: 'taskList', content: [
          { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Leer' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Orar' }] }] },
        ] },
        { type: 'table', content: [
          { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Metal' }] }] }, { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Imperio' }] }] }] },
          { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Oro' }] }] }, { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Babilonia' }] }] }] },
        ] },
      ],
    }
    expect(docToText(doc, 'Daniel')).toBe('Daniel\n\nPLAN\nHablar de Fe\n☑ Leer\n☐ Orar\nMetal | Imperio\nOro | Babilonia')
  })
})

describe('Ordenar nota', async () => {
  const { tidyDoc, docToMarkdown } = await import('./noteText.js')
  const p = (text, marks) => ({ type: 'paragraph', content: text ? [{ type: 'text', text, ...(marks ? { marks } : {}) }] : undefined })
  it('limpia espacios, mayúsculas, renglones vacíos y arma listas y subtítulos', () => {
    const doc = { type: 'doc', content: [
      p(''), p('  puntos  clave:'), p('- el reino  de Dios'), p('* durará para siempre'), p(''), p(''), p(''),
      p('1. leer juan 17:3'), p('2) orar'), p('[ ] preparar comentario'), p('[x] repasar'), p(''),
      p('una idea , con  espacios'), p(''), p(''),
    ] }
    const out = tidyDoc(doc).content
    expect(out.map((b) => b.type)).toEqual(['heading', 'bulletList', 'paragraph', 'orderedList', 'taskList', 'paragraph', 'paragraph'])
    expect(out[0].content[0].text).toBe('Puntos clave')
    expect(out[1].content.map((i) => i.content[0].content[0].text)).toEqual(['El reino de Dios', 'Durará para siempre'])
    expect(out[3].content[0].content[0].content[0].text).toBe('Leer Juan 17:3')
    expect(out[4].content.map((i) => i.attrs.checked)).toEqual([false, true])
    expect(out[6].content[0].text).toBe('Una idea, con espacios')
  })
  it('no toca el formato ni deja la nota vacía', () => {
    const doc = { type: 'doc', content: [p('importante', [{ type: 'bold' }])] }
    expect(tidyDoc(doc).content[0].content[0]).toEqual({ type: 'text', text: 'Importante', marks: [{ type: 'bold' }] })
    expect(tidyDoc({ type: 'doc', content: [p(''), p('')] }).content).toEqual([{ type: 'paragraph' }])
  })
  it('pasa la nota a Markdown para Claude', () => {
    const doc = { type: 'doc', content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Plan' }] },
      p('Leer', [{ type: 'bold' }]),
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [p('Orar')] }] },
    ] }
    expect(docToMarkdown(doc)).toBe('## Plan\n**Leer**\n- [x] Orar')
  })
})

describe('Ordenar nota: casos del editor', async () => {
  const { tidyDoc, capRefs } = await import('./noteText.js')
  const p = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
  it('quita viñetas y casillas escritas dentro de listas ya hechas', () => {
    const doc = { type: 'doc', content: [
      { type: 'bulletList', content: [{ type: 'listItem', content: [p('cabeza de oro')] }, { type: 'listItem', content: [p('- pecho de plata')] }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [p('[x] leer')] }] },
    ] }
    const out = tidyDoc(doc).content
    expect(out[0].content[1].content[0].content[0].text).toBe('Pecho de plata')
    expect(out[1].content[0].attrs.checked).toBe(true)
    expect(out[1].content[0].content[0].content[0].text).toBe('Leer')
  })
  it('pone mayúscula a los libros en las citas, sin tocar palabras comunes', () => {
    expect(capRefs('leer daniel 7 y juan 3:16, sal 23:1')).toBe('leer Daniel 7 y Juan 3:16, Sal 23:1')
    expect(capRefs('el mar 5 veces, hay 3 cosas, est 2')).toBe('el mar 5 veces, hay 3 cosas, est 2')
  })
})
