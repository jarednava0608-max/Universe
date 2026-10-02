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
