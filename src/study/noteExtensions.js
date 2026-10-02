// Piezas extra del editor de Notas: enlaces a nodos del mapa ([[Título]])
// y citas bíblicas tocables dentro del texto.
import { Node, Extension, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { REF_SOURCE, parseRef } from '../lib/bible.js'

// Enlace a un nodo del mapa: se ve como el título y en el texto simple queda como [[Título]].
export const NodeLink = Node.create({
  name: 'nodeLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { title: { default: '', parseHTML: (el) => el.getAttribute('data-node') ?? el.textContent } }
  },
  parseHTML() {
    return [{ tag: 'a[data-node]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes, { 'data-node': node.attrs.title, class: 'wl' }), node.attrs.title]
  },
  renderText({ node }) {
    return `[[${node.attrs.title}]]`
  },
})

// Marca las citas ("Juan 17:3", "Jeremías 38") para que se puedan tocar. No cambia el texto guardado.
function findRefDecorations(doc) {
  const decos = []
  const re = new RegExp(`\\b${REF_SOURCE}`, 'g')
  doc.descendants((node, pos) => {
    if (!node.isText) return
    for (const m of node.text.matchAll(re)) {
      if (!parseRef(m[0])) continue
      decos.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, { class: 'ref-deco', 'data-ref': m[0] }))
    }
  })
  return DecorationSet.create(doc, decos)
}

export const BibleRefs = Extension.create({
  name: 'bibleRefs',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bibleRefs'),
        state: {
          init: (_, { doc }) => findRefDecorations(doc),
          apply: (tr, old) => (tr.docChanged ? findRefDecorations(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
