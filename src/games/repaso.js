// Repasar: lo único de Juegos (pedido del usuario: "tengo mil juegos, quiero tener uno"). Rondas de 5:
// - Los textos que el usuario eligió aprender ("Aprenderlo", `fields.aprender`): nada entra solo.
//   La pregunta sube con lo que ya sabes (caja del repaso): ¿Dónde está? → ¿Qué dice? → Escríbelo.
// - De vez en cuando, una de La Atalaya que estudió, todo de jw.org (nada de sus respuestas):
//   ¿Qué texto lo prueba? (solo textos "Lea", los que de verdad se leen) o, a veces, ¿De qué Atalaya es?
// Si aciertas, vuelve más adelante (repaso espaciado de progress.js); si fallas, pronto.
import { parseArticle } from '../study/atalaya.js'
import { findRefs } from '../lib/bible.js'
import { refKey } from '../lib/verses.js'
import { atalayaSourceCards, shuffle, verseSources } from './logic.js'
import { isDue, todayISO } from './progress.js'

export const SIZE = 5
export const NEW_PER_ROUND = 2

// Los textos que el usuario eligió aprender, del más nuevo al más viejo.
export function learnSources(entries) {
  return entries
    .filter((e) => e.kind === 'memoria' && e.fields.aprender && String(e.fields.texto ?? '').trim())
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

// Primero ubicarlo, luego reconocerlo y al final escribirlo de memoria.
export function verseMode(srsItem) {
  const box = srsItem?.box ?? 0
  return box < 2 ? 'donde' : box < 4 ? 'dice' : 'escribir'
}

// Las primeras palabras de un texto (las opciones largas cansan de leer en el teléfono).
export function firstWords(texto, n = 14) {
  const words = String(texto ?? '').trim().split(/\s+/)
  return words.length > n ? words.slice(0, n).join(' ') + '…' : words.join(' ')
}

// ¿Qué dice? La cita y 4 textos: el suyo y 3 de otras citas (de tus textos y de Mi Biblia).
// null si no hay 3 distintos con qué armarla.
export function sayOptions(verse, entries, rnd = Math.random) {
  const key = refKey(verse.fields.cita ?? '')
  const seen = new Set([key])
  const pool = []
  for (const v of shuffle([...learnSources(entries), ...verseSources(entries), ...entries.filter((e) => e.kind === 'biblia')], rnd)) {
    const k = refKey(v.fields?.cita ?? '')
    const t = String(v.fields?.texto ?? '').trim()
    if (!k || seen.has(k) || t.split(/\s+/).length < 6) continue
    seen.add(k)
    pool.push(firstWords(t))
    if (pool.length === 3) break
  }
  if (pool.length < 3) return null
  const right = firstWords(verse.fields.texto)
  const options = shuffle([right, ...pool], rnd)
  return { options, answer: options.indexOf(right) }
}

// Las Atalayas que estudió (las que preparó en la app), de la más reciente a la más vieja.
function studiedArticles(entries) {
  return entries
    .filter((e) => e.kind === 'reunion' && e.fields.tipo !== 'entresemana' && String(e.fields.articulo ?? '').trim())
    .sort((a, b) => String(b.fields.fecha ?? '').localeCompare(String(a.fields.fecha ?? '')))
}

const LEA = /\(\s*Lea\s+([^)]+?)\.?\s*\)/g
const sentencesOf = (t) => t.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean)
const noRefs = (t) => t.replace(/\s*\([^)]*\d[^)]*\)/g, '').replace(/\s+([.,;:])/g, '$1').trim()

// ¿Qué texto lo prueba? Por cada "(Lea Juan 17:3)" de un párrafo: la idea que va justo antes y su texto.
export function proofCards(entries) {
  const out = []
  for (const e of studiedArticles(entries)) {
    const title = e.fields.titulo || 'La Atalaya'
    for (const b of parseArticle(e.fields.articulo).bloques) {
      const text = b.parrafos.join(' ')
      for (const m of text.matchAll(LEA)) {
        const cita = findRefs(m[1])[0]
        if (!cita) continue
        const idea = sentencesOf(noRefs(text.slice(0, m.index))).filter((s) => s.split(/\s+/).length >= 6).at(-1)
        if (!idea) continue
        out.push({ id: `p:${e.id}:${b.key}:${refKey(cita)}`, group: e.id, title, cita, front: idea.length > 220 ? idea.slice(0, 220).replace(/\s+\S*$/, '') + '…' : idea })
      }
    }
  }
  return out
}

// Opciones: el texto que se leyó y 3 de otros "Lea" (o de tus textos). null si no alcanzan.
export function proofOptions(card, cards, entries, rnd = Math.random) {
  const seen = new Set([refKey(card.cita)])
  const others = []
  for (const cita of [...shuffle(cards.map((c) => c.cita), rnd), ...shuffle(learnSources(entries).map((v) => v.fields.cita), rnd)]) {
    const k = refKey(cita ?? '')
    if (!k || seen.has(k)) continue
    seen.add(k)
    others.push(cita)
    if (others.length === 3) break
  }
  if (others.length < 3) return null
  const options = shuffle([card.cita, ...others], rnd)
  return { options, answer: options.indexOf(card.cita) }
}

// Una ronda: primero los textos que toca repasar, luego hasta 2 nuevos; y de vez en cuando (o si toca)
// una de La Atalaya. `skip`: lo que ya salió en esta sesión ("Otras 5" no repite).
export function repasoRound(entries, srs = {}, { rnd = Math.random, today = todayISO(), size = SIZE, skip = new Set() } = {}) {
  const fresh = (x) => !srs[x.key] && !skip.has(x.key)
  const due = (list) => list.filter((x) => srs[x.key] && !skip.has(x.key) && isDue(srs[x.key], today)).sort((a, b) => srs[a.key].due.localeCompare(srs[b.key].due))
  const verses = learnSources(entries).map((v) => ({ key: 'v:' + v.id, type: 'verse', verse: v }))
  const proofs = proofCards(entries).map((c) => ({ key: c.id, type: 'proof', card: c }))
  const sources = atalayaSourceCards(entries).map((c) => ({ key: 's:' + c.id, type: 'source', card: c }))

  const out = due(verses).slice(0, size)
  for (const v of verses.filter(fresh).slice(0, NEW_PER_ROUND)) if (out.length < size) out.push(v)

  const atalaya = due([...proofs, ...sources])[0] ?? (rnd() < 0.5 ? shuffle([...proofs.filter(fresh), ...(rnd() < 0.3 ? sources.filter(fresh) : [])], rnd)[0] : null)
  if (atalaya) {
    if (out.length >= size) out.pop()
    out.splice(Math.floor(rnd() * (out.length + 1)), 0, atalaya)
  }
  return out
}
