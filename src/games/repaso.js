// Repasar: lo único de Juegos (pedido del usuario: "tengo mil juegos, quiero tener uno"). Rondas de 5:
// - Los textos que el usuario eligió aprender ("Aprenderlo", `fields.aprender`): nada entra solo.
//   La pregunta sube con lo que ya sabes (caja del repaso): ¿Dónde está? → ¿Qué dice? → Escríbelo.
// - De vez en cuando, una de La Atalaya que estudió, todo de jw.org (nada de sus respuestas):
//   ¿Qué texto lo prueba? (solo textos "Lea", los que de verdad se leen) o, a veces, ¿De qué Atalaya es?
// Si aciertas, vuelve más adelante (repaso espaciado de progress.js); si fallas, pronto.
import { parseArticle } from '../study/atalaya.js'
import { BOOKS, findRefs, parseRef } from '../lib/bible.js'
import { VERSE_COUNTS } from '../lib/verseCounts.js'
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

// Nuevo: aprenderlo (leer la cita y el texto, y escribirlos completos). Luego ubicarlo, reconocerlo y al
// final escribirlo de memoria, con todo y cita (pedido del usuario: así se aprendió Salmo 127:1, 2).
export function verseMode(srsItem) {
  if (!srsItem) return 'aprender'
  const box = srsItem.box ?? 0
  return box < 2 ? 'donde' : box < 4 ? 'dice' : 'escribir'
}

// Escribirlo completo: qué palabras del texto escribiste (en orden, sin importar acentos, mayúsculas ni
// signos) y el porcentaje. Las que faltan o están mal se marcan.
const plainWord = (w) => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\d]/gu, '')
export function compareWords(target, typed) {
  const t = String(target ?? '').split(/\s+/).filter(Boolean)
  const a = t.map(plainWord)
  const b = String(typed ?? '').split(/\s+/).map(plainWord).filter(Boolean)
  // Lo más largo en común, en orden (LCS): así una palabra de más o de menos no tumba el resto.
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] && a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const ok = new Array(a.length).fill(false)
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] && a[i] === b[j]) { ok[i] = true; i++; j++ } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  const counted = a.filter(Boolean).length
  const pct = counted ? Math.round((ok.filter((x, i) => x && a[i]).length / counted) * 100) : 0
  return { words: t.map((w, i) => ({ w, ok: ok[i] || !a[i] })), pct }
}

// ¿Escribió bien la cita? Acepta "Lucas 14 13 14", "Luc. 14:13, 14" o "lucas 14:13-14".
export function sameCite(typed, cita) {
  const nums = (x) => (String(x ?? '').match(/\d+/g) ?? []).map(Number)
  const book = (x) => {
    const m = String(x ?? '').trim().match(/^((?:[1-3]\s*)?[^\d]+?)\s*\d/)
    return m ? parseRef(`${m[1].trim()} 1:1`)?.book : null
  }
  const r = parseRef(cita ?? '')
  if (!r) return false
  const want = nums(String(cita).replace(/^\s*[1-3]\s*(?=\D)/, '')).join(' ')
  const got = nums(String(typed).replace(/^\s*[1-3]\s*(?=\D)/, '')).join(' ')
  return book(typed) === r.book && got === want
}

// La cita con el nombre completo del libro ("Luc. 14:13, 14" → "Lucas 14:13, 14"), para que las opciones se
// vean iguales y ninguna se delate. null si no se reconoce o no tiene versículo.
export function fullCite(cita) {
  const r = parseRef(cita ?? '')
  const vs = String(cita ?? '').match(/:\s*(\d{1,3}(?:\s?[-–,]\s?\d{1,3})*)/)
  if (!r?.verse || !vs) return null
  return `${BOOKS[r.book - 1]} ${r.chapter}:${vs[1].replace(/\s*,\s*/g, ', ').replace(/\s*[-–]\s*/g, '-')}`
}

// ¿Dónde está? El texto completo y 4 citas: la suya y 3 de otros libros (primero de tus otros textos,
// luego al azar pero que existan; si la suya es un tramo, las otras también).
export function whereOptions(verse, entries, rnd = Math.random) {
  const right = fullCite(verse.fields.cita)
  if (!right) return null
  const book = parseRef(right).book
  const span = (right.split(':')[1].match(/\d+/g) ?? []).map(Number)
  const seen = new Set([book])
  const others = []
  for (const v of shuffle([...learnSources(entries), ...entries.filter((e) => e.kind === 'biblia')], rnd)) {
    const c = fullCite(v.fields?.cita)
    const b = c && parseRef(c).book
    if (!c || seen.has(b)) continue
    seen.add(b)
    others.push(c)
    if (others.length === 3) break
  }
  for (let tries = 0; others.length < 3 && tries < 200; tries++) {
    const b = 1 + Math.floor(rnd() * BOOKS.length)
    if (seen.has(b)) continue
    const chapters = VERSE_COUNTS[b - 1] ?? []
    const ch = 1 + Math.floor(rnd() * chapters.length)
    const last = chapters[ch - 1] ?? 0
    const extra = span.length > 1 ? span.at(-1) - span[0] : 0
    if (last <= extra) continue
    const v = 1 + Math.floor(rnd() * (last - extra))
    const sep = right.includes('-') ? '-' : ', '
    seen.add(b)
    others.push(`${BOOKS[b - 1]} ${ch}:${extra ? v + sep + (v + extra) : v}`)
  }
  const options = shuffle([right, ...others], rnd)
  return { options, answer: options.indexOf(right) }
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
