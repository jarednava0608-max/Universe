// Nota → texto para compartir, Markdown para Claude y "Ordenar nota" (sin cargar el editor).
import { bookNumber } from '../lib/bible.js'

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

// ---------- Ordenar nota (local, sin IA) ----------

const textOf = (n) => (n.content ?? []).map((c) => (c.type === 'text' ? c.text : c.type === 'nodeLink' ? '[[x]]' : '')).join('')
const para = (content) => ({ type: 'paragraph', ...(content?.length ? { content } : {}) })

// Limpia los espacios y la puntuación del texto de un bloque, sin tocar formato ni enlaces.
function cleanInline(content, { capitalize }) {
  if (!content?.length) return content
  const out = content.map((c) => (c.type === 'text' ? { ...c } : c))
  const texts = out.filter((c) => c.type === 'text')
  for (const t of texts) {
    t.text = t.text
      .replace(/[ \t ]{2,}/g, ' ')
      .replace(/ +([,.;:!?)»])/g, '$1')
      .replace(/([,;])(?=\p{L})/gu, '$1 ')
    t.text = capRefs(t.text)
  }
  if (texts.length) {
    texts[0].text = texts[0].text.replace(/^\s+/, '')
    const last = texts.at(-1)
    last.text = last.text.replace(/\s+$/, '')
    if (capitalize && out[0].type === 'text') out[0].text = out[0].text.replace(/^([¿¡«"“(]*)(\p{Ll})/u, (_, p, l) => p + l.toUpperCase())
  }
  return out.filter((c) => c.type !== 'text' || c.text)
}

// "juan 3:16" → "Juan 3:16", "daniel 7" → "Daniel 7" (así la cita se puede tocar).
// Sin versículo solo con el nombre completo del libro, para no confundir palabras comunes.
export function capRefs(text) {
  return text.replace(/(^|[^\p{L}])((?:[1-3]\s?)?)(\p{Ll}\p{L}+)(\.?\s\d{1,3}(:\d{1,3})?)(?![\d\p{L}])/gu, (m, pre, num, word, rest, verse) => {
    if (!bookNumber(num + word) || (!verse && word.length < 4)) return m
    return pre + num + word[0].toUpperCase() + word.slice(1) + rest
  })
}

// Viñetas, números y tareas escritos a mano ("- ", "1. ", "[ ] ") → listas de verdad.
const LIST_RE = { task: /^\s*(?:[-*•]\s*)?\[( |x|X)\]\s+/, bullet: /^\s*[-*•–]\s+/, ordered: /^\s*\d{1,3}[.)]\s+/ }
function listKind(block) {
  if (block.type !== 'paragraph' || !block.content?.length || block.content[0].type !== 'text') return null
  const t = block.content[0].text
  if (LIST_RE.task.test(t)) return 'task'
  if (LIST_RE.bullet.test(t)) return 'bullet'
  if (LIST_RE.ordered.test(t)) return 'ordered'
  return null
}
function stripMarker(block, kind) {
  const [first, ...rest] = block.content
  let checked = false
  const text = first.text.replace(LIST_RE[kind], (m, x) => {
    checked = x === 'x' || x === 'X'
    return ''
  })
  return { block: para([...(text ? [{ ...first, text }] : []), ...rest]), checked }
}

// Dentro de una lista ya hecha, quita la viñeta o casilla escrita a mano ("- - texto", "☐ [ ] texto").
const INNER = { bulletList: LIST_RE.bullet, orderedList: LIST_RE.ordered, taskList: LIST_RE.task }
function stripInnerMarker(item, listType) {
  const first = item.content?.[0]
  const t = first?.type === 'paragraph' && first.content?.[0]?.type === 'text' ? first.content[0] : null
  if (!t || !INNER[listType].test(t.text)) return {}
  let checked = item.attrs?.checked
  const text = t.text.replace(INNER[listType], (m, x) => {
    if (listType === 'taskList') checked = checked || x === 'x' || x === 'X'
    return ''
  })
  const content = [{ ...first, content: [...(text ? [{ ...t, text }] : []), ...first.content.slice(1)] }, ...item.content.slice(1)]
  return listType === 'taskList' ? { attrs: { ...item.attrs, checked }, content } : { content }
}

function tidyBlocks(blocks, depth = 0) {
  const out = []
  for (let i = 0; i < blocks.length; i++) {
    let b = blocks[i]
    const kind = depth === 0 ? listKind(b) : null
    if (kind) {
      // Junta los renglones seguidos del mismo tipo en una sola lista.
      const items = []
      while (i < blocks.length && listKind(blocks[i]) === kind) {
        const { block, checked } = stripMarker(blocks[i], kind)
        const cleaned = { ...block, content: cleanInline(block.content, { capitalize: true }) }
        if (textOf(cleaned).trim()) items.push(kind === 'task' ? { type: 'taskItem', attrs: { checked }, content: [cleaned] } : { type: 'listItem', content: [cleaned] })
        i++
      }
      i--
      if (items.length) out.push({ type: kind === 'task' ? 'taskList' : kind === 'bullet' ? 'bulletList' : 'orderedList', content: items })
      continue
    }
    if (b.type === 'paragraph' || b.type === 'heading') {
      b = { ...b, content: cleanInline(b.content, { capitalize: true }) }
      const text = textOf(b).trim()
      if (!text) {
        // Máximo un renglón vacío seguido, y nunca al inicio ni al final.
        if (out.length && out.at(-1).type !== 'paragraph-empty' && i < blocks.length - 1) out.push({ type: 'paragraph-empty' })
        continue
      }
      // Un renglón corto que termina en ":" y presenta lo que sigue → subtítulo.
      const next = blocks.slice(i + 1).find((x) => !(x.type === 'paragraph' && !textOf(x).trim()))
      if (depth === 0 && b.type === 'paragraph' && b.content.length === 1 && b.content[0].type === 'text' && !b.content[0].marks && /^[^.!?]{2,48}:$/.test(text) && next) {
        b = { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: text.slice(0, -1).trim() }] }
      }
      out.push(b)
      continue
    }
    if (['bulletList', 'orderedList', 'taskList'].includes(b.type)) {
      const items = (b.content ?? []).map((it) => ({ ...it, ...stripInnerMarker(it, b.type) })).map((it) => ({ ...it, content: tidyBlocks(it.content ?? [], depth + 1) })).filter((it) => it.content.some((c) => textOf(c).trim() || c.type !== 'paragraph'))
      if (items.length) out.push({ ...b, content: items })
      continue
    }
    if (b.type === 'blockquote') {
      const content = tidyBlocks(b.content ?? [], depth + 1)
      if (content.length) out.push({ ...b, content })
      continue
    }
    out.push(b)
  }
  // Quita los vacíos sobrantes al final y los que quedaron antes de un subtítulo o lista.
  while (out.at(-1)?.type === 'paragraph-empty') out.pop()
  return out.filter((b, k) => !(b.type === 'paragraph-empty' && ['heading', 'paragraph-empty'].includes(out[k + 1]?.type))).map((b) => (b.type === 'paragraph-empty' ? para() : b))
}

// Ordena una nota (JSON del editor). Devuelve el JSON nuevo; no cambia el original.
export function tidyDoc(json) {
  const content = tidyBlocks(json?.content ?? [])
  return { type: 'doc', content: content.length ? content : [para()] }
}

// ---------- Ordenar con Claude ----------

function marked(n) {
  if (n.type === 'nodeLink') return `[[${n.attrs.title}]]`
  if (n.type === 'hardBreak') return '\n'
  if (n.type !== 'text') return ''
  let t = n.text
  for (const m of n.marks ?? []) {
    if (m.type === 'bold') t = `**${t}**`
    else if (m.type === 'italic') t = `_${t}_`
    else if (m.type === 'strike') t = `~~${t}~~`
  }
  return t
}
const inlineMd = (n) => (n.content ?? []).map(marked).join('')

// Nota → Markdown (para mandarla a Claude y que la regrese ordenada).
export function docToMarkdown(json) {
  const out = []
  const block = (n, indent = '') => {
    switch (n.type) {
      case 'heading':
        out.push('', '#'.repeat(n.attrs?.level ?? 2) + ' ' + inlineMd(n))
        break
      case 'paragraph':
        out.push(indent + inlineMd(n))
        break
      case 'bulletList':
      case 'orderedList':
      case 'taskList':
        ;(n.content ?? []).forEach((item, i) => {
          const mark = n.type === 'bulletList' ? '- ' : n.type === 'orderedList' ? `${i + 1}. ` : item.attrs?.checked ? '- [x] ' : '- [ ] '
          ;(item.content ?? []).forEach((c, k) => (k === 0 && c.type === 'paragraph' ? out.push(indent + mark + inlineMd(c)) : block(c, indent + '   ')))
        })
        break
      case 'blockquote':
        ;(n.content ?? []).forEach((c) => out.push(indent + '> ' + inlineMd(c)))
        break
      case 'horizontalRule':
        out.push('---')
        break
      case 'table': {
        const rows = (n.content ?? []).map((r) => '| ' + (r.content ?? []).map((c) => (c.content ?? []).map(inlineMd).join(' ')).join(' | ') + ' |')
        if (rows.length) rows.splice(1, 0, '|' + ' --- |'.repeat((n.content[0].content ?? []).length))
        out.push('', ...rows, '')
        break
      }
      default:
        ;(n.content ?? []).forEach((c) => block(c, indent))
    }
  }
  ;(json?.content ?? []).forEach((n) => block(n))
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function claudeTidyPrompt(titulo, markdown) {
  return `Ordena y limpia esta nota de mi estudio bíblico. No cambies su sentido ni agregues información nueva:
- corrige ortografía y puntuación;
- agrupa las ideas en secciones con subtítulos (##);
- usa viñetas, listas numeradas, tareas (- [ ]) o tablas donde ayuden;
- conserva tal cual las citas bíblicas y los enlaces [[así]].

Responde SOLO con un JSON así: { "titulo": "…", "texto": "la nota en Markdown" }

Título: ${titulo || '(sin título)'}

${markdown || '(vacía)'}`
}
