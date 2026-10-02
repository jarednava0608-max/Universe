// Sugerencias mientras escribes (como las del teclado del iPhone): libros de la Biblia y publicaciones.
// "jere" → Jeremías, "1 co" → 1 Corintios / 1 Crónicas, "Seamos v" → Seamos valientes.
import { BOOKS } from './bible.js'
import { PUBLICATIONS } from './pubs.js'

const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const NAMES = [
  ...BOOKS.map((b) => b.replace(/^El (Cantar)/, '$1')),
  ...PUBLICATIONS.map(([title]) => title).filter((t) => !/^(La Atalaya|¡Despertemos!)$/.test(t)),
]
// Palabras comunes que empiezan como un libro ("este" → Ester): no se sugieren.
const COMMON = new Set(['este', 'esta', 'esto', 'estos', 'estas', 'mar', 'sal', 'ser', 'los', 'las', 'del', 'can', 'dan', 'amo', 'job', 'rut', 'mat', 'hab', 'luc', 'jue', 'col', 'fil', 'rom', 'heb', 'san', 'tit', 'esd', 'eze', 'nah'])

// text: lo escrito antes del cursor en el renglón actual.
// Devuelve { length, items }: cuántos caracteres reemplazar y hasta 3 sugerencias.
export function suggest(text, max = 3) {
  const words = String(text).match(/(?:^|[\s(«"“¿¡])((?:[1-3]\s)?[\p{L}][\p{L}:,]*(?:\s[\p{L}][\p{L}:,]*){0,4})$/u)
  if (!words) return null
  const tail = words[1]
  const parts = tail.split(/\s/)
  // Probar desde la frase más larga (para títulos de varias palabras) hasta la última palabra sola.
  for (let n = parts.length; n >= 1; n--) {
    const piece = parts.slice(-n).join(' ')
    const typed = plain(piece)
    // Al menos 3 letras (2 si va con número: "1 co").
    if (typed.replace(/^[1-3]\s/, '').length < (/^[1-3]\s/.test(typed) ? 2 : 3)) continue
    if (n === 1 && COMMON.has(typed)) continue
    const items = NAMES.filter((name) => {
      const p = plain(name)
      return p.startsWith(typed) && p !== typed && (n > 1 || /^[1-3]\s/.test(typed) || !/^[1-3]\s/.test(p))
    })
    if (items.length) return { length: piece.length, items: items.slice(0, max) }
  }
  return null
}
