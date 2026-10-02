// Nota → texto simple para compartir (sin cargar el editor).

// Texto para compartir: conserva títulos, viñetas, tareas y tablas de forma legible.
export function docToText(json, title = '') {
  const out = []
  const inline = (n) =>
    (n.content ?? [])
      .map((c) => (c.type === 'text' ? c.text : c.type === 'nodeLink' ? c.attrs.title : c.type === 'hardBreak' ? '\n' : inline(c)))
      .join('')
  const block = (n, prefix = '') => {
    switch (n.type) {
      case 'heading':
        out.push('', inline(n).toUpperCase())
        break
      case 'paragraph':
        out.push(prefix + inline(n))
        break
      case 'bulletList':
      case 'orderedList':
      case 'taskList':
        ;(n.content ?? []).forEach((item, i) => {
          const mark = n.type === 'bulletList' ? '• ' : n.type === 'orderedList' ? `${(n.attrs?.start ?? 1) + i}. ` : item.attrs?.checked ? '☑ ' : '☐ '
          ;(item.content ?? []).forEach((c, k) => block(c, prefix + (k === 0 ? mark : '   ')))
        })
        break
      case 'blockquote':
        ;(n.content ?? []).forEach((c) => block(c, prefix + '│ '))
        break
      case 'horizontalRule':
        out.push('———')
        break
      case 'table':
        ;(n.content ?? []).forEach((row) => out.push(prefix + (row.content ?? []).map((cell) => (cell.content ?? []).map(inline).join(' ')).join(' | ')))
        break
      default:
        ;(n.content ?? []).forEach((c) => block(c, prefix))
    }
  }
  ;(json?.content ?? []).forEach((n) => block(n))
  const body = out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return [title.trim(), body].filter(Boolean).join('\n\n')
}
