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

// ---------- Completar con lo que ya tienes (local, sin IA) ----------

export const SECTION_TEXTS = 'Textos de esta nota'
export const SECTION_MAP = 'De tu mapa'
const GENERATED = [SECTION_TEXTS, SECTION_MAP]
const isGeneratedHeading = (b) => b.type === 'heading' && GENERATED.includes(textOf(b).trim())

// Quita las secciones que agregó "Ordenar" la vez anterior (para no repetirlas).
function withoutGenerated(blocks) {
  const i = blocks.findIndex(isGeneratedHeading)
  return i < 0 ? blocks : blocks.slice(0, i)
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Convierte en enlace la primera mención de cada nodo del mapa que aparezca en el texto.
function linkNodes(blocks, nodes) {
  const already = new Set()
  const walkFind = (n) => {
    if (n.type === 'nodeLink') already.add(n.attrs.title.toLowerCase())
    ;(n.content ?? []).forEach(walkFind)
  }
  blocks.forEach(walkFind)
  const titles = nodes
    .map((n) => n.title.trim())
    .filter((t) => t.length >= 3 && !already.has(t.toLowerCase()))
    .sort((a, b) => b.length - a.length)
  const linked = new Set()
  const visit = (n) => {
    if (!n.content || n.type === 'nodeLink') return n
    if (n.type === 'heading') return n // los subtítulos se dejan como están
    const content = []
    for (const c of n.content) {
      if (c.type !== 'text' || c.marks?.some((m) => m.type === 'link')) {
        content.push(c.content ? visit(c) : c)
        continue
      }
      let parts = [c]
      for (const title of titles) {
        if (linked.has(title)) continue
        const re = new RegExp(`(?<![\\p{L}\\d])${escapeRe(title)}(?![\\p{L}\\d])`, 'iu')
        const k = parts.findIndex((p) => p.type === 'text' && re.test(p.text))
        if (k < 0) continue
        const p = parts[k]
        const m = p.text.match(re)
        const before = p.text.slice(0, m.index)
        const after = p.text.slice(m.index + m[0].length)
        const pieces = [
          ...(before ? [{ ...p, text: before }] : []),
          { type: 'nodeLink', attrs: { title } },
          ...(after ? [{ ...p, text: after }] : []),
        ]
        parts = [...parts.slice(0, k), ...pieces, ...parts.slice(k + 1)]
        linked.add(title)
      }
      content.push(...parts)
    }
    return { ...n, content }
  }
  return blocks.map(visit)
}

const allText = (blocks) => {
  const out = []
  const walk = (n) => {
    if (n.type === 'text') out.push(n.text)
    else if (n.type === 'nodeLink') out.push(n.attrs.title)
    ;(n.content ?? []).forEach(walk)
    if (n.type === 'paragraph' || n.type === 'heading') out.push('\n')
  }
  blocks.forEach(walk)
  return out.join('')
}
const linkedTitles = (blocks) => {
  const out = []
  const walk = (n) => {
    if (n.type === 'nodeLink' && !out.includes(n.attrs.title)) out.push(n.attrs.title)
    ;(n.content ?? []).forEach(walk)
  }
  blocks.forEach(walk)
  return out
}

function firstSentence(text, max = 180) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  const m = t.match(/^.{20,}?[.!?](?=\s|$)/)
  const s = m && m[0].length <= max ? m[0] : t
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, '') + '…' : s
}

// Completa la nota: enlaza tus nodos, y al final agrega los textos bíblicos de la nota
// (con su texto si ya lo guardaste) y lo que dice tu mapa de las ideas enlazadas.
// opts: { nodes: [{ title, note }], findRefs(text) → citas, refKey(cita), verseText(cita) → texto | null, plain(note) → texto }
export function enrichDoc(json, { nodes = [], findRefs, refKey, verseText, plain = (s) => s }) {
  let blocks = withoutGenerated(json?.content ?? [])
  while (blocks.length && blocks.at(-1).type === 'paragraph' && !textOf(blocks.at(-1)).trim()) blocks = blocks.slice(0, -1)
  blocks = linkNodes(blocks, nodes)
  const extra = []

  // 1 y 4: los textos bíblicos de la nota, sin repetir, con su texto si está guardado.
  const seen = new Set()
  const refs = findRefs(allText(blocks)).filter((r) => {
    const k = refKey(r) ?? r
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  if (refs.length) {
    extra.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: SECTION_TEXTS }] })
    for (const r of refs) {
      const texto = verseText(r)
      extra.push(para([{ type: 'text', text: r, marks: [{ type: 'bold' }] }]))
      if (texto) extra.push({ type: 'blockquote', content: [para([{ type: 'text', text: texto }])] })
    }
  }

  // 2: lo que dice tu mapa de cada idea enlazada.
  const byTitle = new Map(nodes.map((n) => [n.title.toLowerCase(), n]))
  const defs = linkedTitles(blocks)
    .map((t) => byTitle.get(t.toLowerCase()))
    .filter((n) => n && plain(n.note).trim())
  if (defs.length) {
    extra.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: SECTION_MAP }] })
    extra.push({
      type: 'bulletList',
      content: defs.map((n) => ({ type: 'listItem', content: [para([{ type: 'nodeLink', attrs: { title: n.title } }, { type: 'text', text: ': ' + firstSentence(plain(n.note)) }])] })),
    })
  }

  const content = [...blocks, ...extra]
  return { type: 'doc', content: content.length ? content : [para()] }
}

// 3: entradas relacionadas (comparten citas o ideas del mapa con este texto).
// items: [{ id, text }]; devuelve los ids ordenados por cuántas cosas comparten.
export function relatedIds(text, items, { findRefs, refKey, max = 5 }) {
  const keysOf = (t) => {
    const k = new Set(findRefs(t).map((r) => 'r:' + (refKey(r) ?? r)))
    for (const m of String(t).matchAll(/\[\[([^\]|\n]+)/g)) k.add('n:' + m[1].trim().toLowerCase())
    return k
  }
  const mine = keysOf(text)
  if (!mine.size) return []
  return items
    .map((it) => ({ id: it.id, score: [...keysOf(it.text)].filter((k) => mine.has(k)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.id)
}
