// Sugerencias mientras escribes (como las del teclado del iPhone): tus nodos del mapa, libros de la
// Biblia y publicaciones. "va" → Valor (nodo), "jere" → Jeremías, "1 co" → 1 Corintios, "Seamos v" → Seamos valientes.
import { BOOKS } from './bible.js'
import { PUBLICATIONS } from './pubs.js'

const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const NAMES = [
  ...BOOKS.map((b) => b.replace(/^El (Cantar)/, '$1')),
  ...PUBLICATIONS.map(([title]) => title).filter((t) => !/^(La Atalaya|¡Despertemos!)$/.test(t)),
]
// Palabras comunes que empiezan como un libro ("este" → Ester): no se sugieren.
const COMMON = new Set(['este', 'esta', 'esto', 'estos', 'estas', 'mar', 'sal', 'ser', 'los', 'las', 'del', 'can', 'dan', 'amo', 'job', 'rut', 'mat', 'hab', 'luc', 'jue', 'col', 'fil', 'rom', 'heb', 'san', 'tit', 'esd', 'eze', 'nah'])

// Libros y publicaciones que empiezan con lo escrito: al menos 3 letras (2 si va con número: "1 co")
// y no palabras comunes.
function books(piece) {
  const typed = plain(piece)
  const single = !/\s/.test(typed.replace(/^[1-3]\s/, ''))
  const letters = typed.replace(/^[1-3]\s/, '').length
  if (letters < (/^[1-3]\s/.test(typed) ? 2 : 3) || (single && COMMON.has(typed))) return []
  return NAMES.filter((name) => {
    const p = plain(name)
    return p.startsWith(typed) && p !== typed && (!single || /^[1-3]\s/.test(typed) || !/^[1-3]\s/.test(p))
  })
}

// text: lo escrito antes del cursor en el renglón actual. nodes: títulos de los nodos del mapa.
// Devuelve { length, items: [{ label, node }] }: cuántos caracteres reemplazar y hasta 3 sugerencias
// (primero tus nodos, que se insertan como enlace; luego libros y publicaciones).
export function suggest(text, max = 3, nodes = []) {
  const words = String(text).match(/(?:^|[\s(«"“¿¡])((?:[1-3]\s)?[\p{L}][\p{L}:,]*(?:\s[\p{L}][\p{L}:,]*){0,4})$/u)
  if (!words) return null
  const parts = words[1].split(/\s/)
  // Probar desde la frase más larga (para títulos de varias palabras) hasta la última palabra sola.
  // Primero se buscan tus nodos en todas las longitudes; si no hay, libros y publicaciones.
  const pieces = parts.map((_, k) => parts.slice(k).join(' '))
  const lettersOf = (typed) => typed.replace(/^[1-3]\s/, '').length
  for (const piece of pieces) {
    const typed = plain(piece)
    // Tus nodos desde 2 letras (también si ya escribiste el título completo, para volverlo enlace).
    if (lettersOf(typed) < 2) continue
    const mine = nodes.filter((t) => plain(t).startsWith(typed))
    if (mine.length) {
      const items = [...mine.map((label) => ({ label, node: true })), ...books(piece).map((label) => ({ label, node: false }))]
      return { length: piece.length, items: items.slice(0, max) }
    }
  }
  for (const piece of pieces) {
    const found = books(piece)
    if (found.length) return { length: piece.length, items: found.slice(0, max).map((label) => ({ label, node: false })) }
  }
  return null
}
