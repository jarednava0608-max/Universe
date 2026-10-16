import { normKey } from '../lib/model.js'
import { shuffle } from './logic.js'

const clip = (s, n = 70) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

// Parejas de trivia: pregunta (izquierda) y su respuesta correcta (derecha), sin respuestas repetidas.
export function triviaPairs(entries, rnd = Math.random, count = 4) {
  const seen = new Set()
  const picked = []
  for (const e of shuffle(entries, rnd)) {
    const f = e.fields ?? {}
    const answer = f.opciones?.[f.respuesta]
    if (!f.pregunta || !answer) continue
    const key = normKey(answer)
    if (seen.has(key)) continue
    seen.add(key)
    picked.push({ id: e.id, q: clip(String(f.pregunta)), a: String(answer) })
    if (picked.length === count) break
  }
  if (picked.length < 3) return null
  return {
    left: picked.map((p) => ({ id: p.id, text: p.q })),
    right: shuffle(picked, rnd).map((p) => ({ id: p.id, text: p.a })),
  }
}
