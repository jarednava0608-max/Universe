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

describe('Ordenar: completar con lo que ya tienes', async () => {
  const { enrichDoc, relatedIds, SECTION_TEXTS, SECTION_MAP } = await import('./noteText.js')
  const { findRefs } = await import('../lib/bible.js')
  const { refKey } = await import('../lib/verses.js')
  const p = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
  const opts = {
    nodes: [{ title: 'Reino de Dios', note: 'Gobierno celestial de Jehová. Lo dirige Jesús.' }, { title: 'Fe', note: '' }],
    findRefs, refKey,
    verseText: (r) => (refKey(r) === refKey('Daniel 2:44') ? 'El Dios del cielo establecerá un reino…' : null),
  }
  it('enlaza nodos, agrega los textos y lo que dice el mapa', () => {
    const doc = { type: 'doc', content: [p('El reino de Dios aplastará todo (Daniel 2:44) y Dan. 2:44, ver Mateo 6:10.')] }
    const out = enrichDoc(doc, opts).content
    expect(out[0].content.find((c) => c.type === 'nodeLink').attrs.title).toBe('Reino de Dios')
    const heads = out.filter((b) => b.type === 'heading').map((b) => b.content[0].text)
    expect(heads).toEqual([SECTION_TEXTS, SECTION_MAP])
    expect(out.filter((b) => b.type === 'blockquote')).toHaveLength(1)
    expect(out.filter((b) => b.type === 'paragraph' && b.content?.[0]?.marks).map((b) => b.content[0].text)).toEqual(['Daniel 2:44', 'Mateo 6:10'])
    expect(out.at(-1).content[0].content[0].content[1].text).toBe(': Gobierno celestial de Jehová.')
  })
  it('no enlaza un nodo dentro de una cita ni pega subtítulos en "De tu mapa"', () => {
    const o = { ...opts, plain: (t) => t.replace(/^#+\s.*$/gm, '').trim(), nodes: [{ title: 'Jeremías 38', note: '## Lo que pasa\nLos príncipes oyen a Jeremías.' }, { title: 'Jeremías', note: 'Profeta.' }] }
    const doc = { type: 'doc', content: [p('Hablamos de Jeremías 38:6 y de Jeremías 38.')] }
    const out = enrichDoc(doc, o).content
    const first = out[0].content
    expect(first.filter((c) => c.type === 'nodeLink').map((c) => c.attrs.title)).toEqual(['Jeremías 38'])
    expect(first[0].text).toBe('Hablamos de Jeremías 38:6 y de ')
    expect(out.at(-1).content[0].content[0].content[1].text).toBe(': Los príncipes oyen a Jeremías.')
  })
  it('al ordenar otra vez no repite las secciones', () => {
    const doc = { type: 'doc', content: [p('Leer Juan 17:3')] }
    const once = enrichDoc(doc, opts)
    const twice = enrichDoc(once, opts)
    expect(twice).toEqual(once)
  })
  it('encuentra entradas relacionadas por citas o ideas', () => {
    const items = [{ id: 'a', text: 'Sobre Sal. 83:18 y [[Fe]]' }, { id: 'b', text: 'Nada que ver' }, { id: 'c', text: 'Salmo 83:18' }]
    expect(relatedIds('Hablar de [[Fe]] con Salmo 83:18', items, { findRefs, refKey })).toEqual(['a', 'c'])
  })
})
