// Render de notas: markdown + enlaces [[Título]].
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { normKey } from './model.js'
import { linkRefsMarkdown } from './bible.js'
import { linkPubsMarkdown } from './pubs.js'

const WIKI_RE = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g
// ==texto== = subrayado de marcatexto (las palabras clave que marcaste en La Atalaya).
const MARK_RE = /==([^=\n]+?)==/g
const withMarks = (html) => html.replace(MARK_RE, '<mark>$1</mark>')

// Índice para resolver [[...]] por título normalizado o por id.
export function buildResolver(nodes) {
  const byKey = new Map()
  for (const n of nodes) {
    byKey.set(normKey(n.title), n.id)
    byKey.set('id:' + n.id, n.id)
  }
  return (target) => byKey.get(normKey(target)) ?? byKey.get('id:' + String(target).trim()) ?? null
}

// Lista de destinos [[...]] mencionados en un texto.
export function extractLinks(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(WIKI_RE)) out.push(m[1].trim())
  return out
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Los bloques antiguos "> [!jw]" / "> [!yo]" se muestran como texto normal (sin etiqueta).
export function unwrapCallouts(text) {
  const out = []
  let inBlock = false
  for (const line of String(text ?? '').split('\n')) {
    if (/^\s*>\s*\[!(jw|yo)\]\s*$/i.test(line)) {
      inBlock = true
      continue
    }
    if (inBlock && /^\s*>/.test(line)) {
      out.push(line.replace(/^\s*>\s?/, '').replace(/^\[!(jw|yo)\]\s*/i, ''))
      continue
    }
    const inline = line.match(/^\s*>\s*\[!(jw|yo)\]\s*(.*)$/i)
    inBlock = Boolean(inline)
    out.push(inline ? inline[2] : line)
  }
  return out.join('\n')
}

export function renderNote(text, resolve) {
  // Los [[enlaces]] se apartan para que las citas bíblicas dentro de ellos no se conviertan dos veces.
  const wikis = []
  const masked = unwrapCallouts(text).replace(WIKI_RE, (m) => `\u0000${wikis.push(m) - 1}\u0000`)
  const withRefs = linkRefsMarkdown(linkPubsMarkdown(masked)).replace(/\u0000(\d+)\u0000/g, (_, i) => wikis[i])
  const withLinks = withRefs.replace(WIKI_RE, (_, target, label) => {
    const t = target.trim()
    const id = resolve(t)
    const shown = escapeHtml((label ?? t).trim())
    return id
      ? `<a class="wl" data-node="${escapeHtml(id)}">${shown}</a>`
      : `<a class="wl missing" data-missing="${escapeHtml(t)}">${shown}</a>`
  })
  const html = withMarks(marked.parse(withLinks, { breaks: true, gfm: true }))
  return DOMPurify.sanitize(html, { ADD_ATTR: ['data-node', 'data-missing', 'target'] })
}

// Texto plano para búsqueda y fragmentos.
export function plainText(text) {
  return String(text ?? '')
    .replace(WIKI_RE, (_, t, l) => (l ?? t))
    .replace(/\[!(jw|yo)\]/gi, '')
    .replace(MARK_RE, '$1')
    .replace(/^\s*[-+]\s+/gm, ' ') // viñetas de lista (los guiones dentro de palabras y citas se quedan: 38:1-6, Ébed-Mélec)
    .replace(/^\s*-{3,}\s*$/gm, ' ') // líneas separadoras
    .replace(/[#>*_`~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Texto de una definición sin sus subtítulos (## Lo que pasa…), que si no quedan pegados
// al texto ("Lo que pasa En el noveno año…"). Para juegos y resúmenes.
export function definitionText(text) {
  return plainText(String(text ?? '').replace(/^\s*#{1,6}\s.*$/gm, ''))
}

// Al renombrar un nodo, actualiza los [[Viejo]] en una nota.
export function renameLinks(text, oldTitle, newTitle) {
  const oldKey = normKey(oldTitle)
  return String(text ?? '').replace(WIKI_RE, (whole, target, label) => {
    if (normKey(target) !== oldKey) return whole
    return label ? `[[${newTitle}|${label}]]` : `[[${newTitle}]]`
  })
}

// Markdown (o texto simple) → HTML para el editor de Notas. Las listas "- [ ]" se vuelven
// listas de tareas. El editor descarta lo que no reconoce, así que no hace falta limpiar más.
export function markdownToHtml(text) {
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  // [[Título]] → enlace a un nodo del mapa.
  const src = String(text ?? '').trim().replace(WIKI_RE, (_, t) => `<a data-node="${esc(t.trim())}">${esc(t.trim())}</a>`)
  if (!src) return ''
  return withMarks(marked.parse(src, { breaks: true, gfm: true }))
    .replace(/<li><input (checked="" )?disabled="" type="checkbox">\s?/g, (_, c) => `<li data-type="taskItem" data-checked="${c ? 'true' : 'false'}">`)
    .replace(/<ul>\s*(?=<li data-type="taskItem")/g, '<ul data-type="taskList">')
}
