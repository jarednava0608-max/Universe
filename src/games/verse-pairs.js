import { shuffle } from './logic.js'

// Parejas de textos: une cada cita con el principio de su texto.
export function versePairs(verses, rnd = Math.random, count = 4) {
  const seen = new Set()
  const usable = []
  for (const v of verses ?? []) {
    const cita = (v.fields?.cita ?? '').trim()
    const words = (v.fields?.texto ?? '').trim().split(/\s+/).filter(Boolean)
    const key = cita.toLowerCase()
    if (!cita || !words.length || seen.has(key)) continue
    seen.add(key)
    usable.push({ id: String(v.id), cita, start: words.slice(0, 10).join(' ') + (words.length > 10 ? '…' : '') })
  }
  if (usable.length < 3) return null
  const picked = shuffle(usable, rnd).slice(0, count)
  return {
    left: shuffle(picked, rnd).map((p) => ({ id: p.id, text: p.cita })),
    right: shuffle(picked, rnd).map((p) => ({ id: p.id, text: p.start })),
  }
}
