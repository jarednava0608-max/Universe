import { SECTIONS, shuffle } from './logic.js'
import { BOOKS } from '../lib/bible.js'

// Parejas libro ↔ sección: cada libro viene de una sección distinta, así cada sección tiene una sola respuesta.
export function bookPairs(rnd = Math.random, count = 5) {
  const secs = shuffle(SECTIONS, rnd).slice(0, Math.min(count, SECTIONS.length))
  const picks = secs.map((s) => {
    const n = s.from + Math.floor(rnd() * (s.to - s.from + 1))
    return { id: BOOKS[n - 1], book: BOOKS[n - 1], section: s.name }
  })
  return {
    left: shuffle(picks, rnd).map((p) => ({ id: p.id, text: p.book })),
    right: shuffle(picks, rnd).map((p) => ({ id: p.id, text: p.section })),
  }
}
