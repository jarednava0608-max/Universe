// Render de notas: markdown + enlaces [[Título]] + bloques > [!jw] / > [!yo].
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { normKey } from './model.js'

const WIKI_RE = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g

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

export function renderNote(text, resolve) {
  const withLinks = String(text ?? '').replace(WIKI_RE, (_, target, label) => {
    const t = target.trim()
    const id = resolve(t)
    const shown = escapeHtml((label ?? t).trim())
    return id
      ? `<a class="wl" data-node="${escapeHtml(id)}">${shown}</a>`
      : `<a class="wl missing" data-missing="${escapeHtml(t)}">${shown}</a>`
  })
  let html = marked.parse(withLinks, { breaks: true, gfm: true })
  // Bloques para separar lo que dice JW de lo que pienso yo.
  html = html.replace(
    /<blockquote>\s*<p>\s*\[!(jw|yo)\]\s*(?:<br>)?/gi,
    (_, kind) => {
      const k = kind.toLowerCase()
      const label = k === 'jw' ? 'Publicaciones JW' : 'Mi razonamiento'
      return `<blockquote class="callout ${k}"><p><span class="callout-label">${label}</span>`
    },
  )
  return DOMPurify.sanitize(html, { ADD_ATTR: ['data-node', 'data-missing', 'target'] })
}

// Texto plano para búsqueda y fragmentos.
export function plainText(text) {
  return String(text ?? '')
    .replace(WIKI_RE, (_, t, l) => (l ?? t))
    .replace(/\[!(jw|yo)\]/gi, '')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Al renombrar un nodo, actualiza los [[Viejo]] en una nota.
export function renameLinks(text, oldTitle, newTitle) {
  const oldKey = normKey(oldTitle)
  return String(text ?? '').replace(WIKI_RE, (whole, target, label) => {
    if (normKey(target) !== oldKey) return whole
    return label ? `[[${newTitle}|${label}]]` : `[[${newTitle}]]`
  })
}
