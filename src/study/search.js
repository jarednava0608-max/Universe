// Buscar en todo (lupa arriba en Estudio): nodos del mapa, entradas de Estudio (también tus respuestas
// de La Atalaya y de entre semana) y los textos de Mi Biblia. Local, sin servicios.
import { KINDS } from './kinds.js'
import { definitionText } from '../lib/markdown.js'

// Minúsculas y sin acentos, letra por letra (así las posiciones sirven para el fragmento).
const fold = (s) => Array.from(String(s ?? ''), (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] ?? c).join('')

// Campos que no son texto tuyo (marcas, pasos, enlaces, el HTML de las notas).
const SKIP = new Set(['html', 'marcas', 'comentar', 'paso', 'bloque', 'parte', 'leidos', 'enlace', 'fechaManual', 'ensayos', 'fecha', 'tipo'])

function textOf(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => textOf(v, out))
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (!SKIP.has(k) && k !== 'num') textOf(v, out)
  return out
}

// Un pedazo del texto alrededor de la primera palabra encontrada: { before, match, after }.
export function snippet(text, words, size = 110) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  const f = fold(t)
  let at = -1
  let len = 0
  for (const w of words) {
    const i = f.indexOf(w)
    if (i >= 0 && (at < 0 || i < at)) { at = i; len = w.length }
  }
  if (at < 0) return { before: t.slice(0, size), match: '', after: '' }
  const start = Math.max(0, at - Math.floor(size / 3))
  const from = start ? t.indexOf(' ', start) + 1 || start : 0
  const end = Math.min(t.length, at + len + size)
  return {
    before: (from ? '…' : '') + t.slice(from, at),
    match: t.slice(at, at + len),
    after: t.slice(at + len, end) + (end < t.length ? '…' : ''),
  }
}

// Resultados: [{ type: 'node'|'entry'|'verse', id, title, sub, snip, item }], los mejores primero.
// Todas las palabras tienen que estar; pesa más si están en el título.
export function searchAll(query, { nodes = [], entries = [] } = {}, limit = 40) {
  const words = fold(query).split(/\s+/).filter((w) => w.length > 0)
  if (!words.length || fold(query).trim().length < 2) return []
  const q = words.join(' ')
  const out = []
  const consider = (r, title, body) => {
    const ft = fold(title)
    const fb = fold(body)
    if (!words.every((w) => ft.includes(w) || fb.includes(w))) return
    const score = ft === q ? 0 : ft.startsWith(q) ? 1 : words.every((w) => ft.includes(w)) ? 2 : 3
    out.push({ ...r, title, score, snip: score < 3 && !words.some((w) => fb.includes(w)) ? null : snippet(body, words) })
  }
  for (const n of nodes) consider({ type: 'node', id: n.id, sub: 'Mapa', item: n }, n.title, definitionText(n.note ?? ''))
  for (const e of entries) {
    if (e.kind === 'biblia') {
      const cita = e.fields?.cita ?? ''
      if (cita.startsWith('pub:')) continue
      consider({ type: 'verse', id: e.id, sub: 'Mi Biblia', item: e }, cita, e.fields?.texto ?? '')
      continue
    }
    const def = KINDS[e.kind]
    if (!def) continue
    consider({ type: 'entry', id: e.id, sub: def.short, item: e }, def.title(e), textOf(e.fields).join('\n'))
  }
  const order = { node: 0, entry: 1, verse: 2 }
  return out.sort((a, b) => a.score - b.score || order[a.type] - order[b.type] || (b.item.updatedAt ?? 0) - (a.item.updatedAt ?? 0)).slice(0, limit)
}
