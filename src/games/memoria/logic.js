// Lógica de Memoria Bíblica (sin interfaz, con pruebas).
import { CHARACTERS, WORLDS } from './characters.js'
import { shuffle } from '../logic.js'
import { isDue } from '../progress.js'

export const KEY = (ch) => 'mb:' + ch.id
export const ROUND = 10
export const PASS = 70 // % para abrir el siguiente mundo

export const inWorld = (w) => CHARACTERS.filter((c) => c.w === w)

// Un mundo se abre al sacar 70 % o más en cualquier modo del mundo anterior.
export function unlockedWorlds(best = {}) {
  const open = [1]
  for (const w of WORLDS.slice(1)) {
    if ((best['mb-w' + (w.id - 1)] ?? 0) >= PASS) open.push(w.id)
    else break
  }
  return open
}

// Cuántos personajes del mundo ya conoces (los acertaste al menos una vez seguida).
export function knownIn(w, srs = {}) {
  return inWorld(w).filter((c) => (srs[KEY(c)]?.box ?? 0) >= 1).length
}

// Personajes que no deben salir como opción falsa del otro: lo que hizo uno también lo hizo el otro
// (Eva también comió del fruto; Timoteo también acompañó a Pablo en su segundo viaje).
const CONFUSABLE = [['Adán', 'Eva'], ['Silas', 'Timoteo']]
const confusable = (a, b) => CONFUSABLE.some(([x, y]) => (a.n === x && b.n === y) || (a.n === y && b.n === x))

function options(answer, pool, get, rnd) {
  const others = shuffle([...new Set(pool.filter((x) => !confusable(answer, x)).map(get).filter((x) => x !== get(answer)))], rnd).slice(0, 3)
  const opts = shuffle([get(answer), ...others], rnd)
  return { options: opts, answer: opts.indexOf(get(answer)) }
}

// Los personajes de la ronda: primero los que fallaste o te toca repasar, luego los demás.
function pick(chars, srs, n, rnd) {
  const due = shuffle(chars.filter((c) => srs[KEY(c)] && isDue(srs[KEY(c)])), rnd)
  const fresh = shuffle(chars.filter((c) => !srs[KEY(c)]), rnd)
  const rest = shuffle(chars.filter((c) => srs[KEY(c)] && !isDue(srs[KEY(c)])), rnd)
  return shuffle([...due, ...fresh, ...rest].slice(0, n), rnd)
}

// ¿Quién soy?: pistas → elegir el nombre (las opciones son del mismo mundo).
export function whoRound(chars, srs = {}, rnd = Math.random, pool = chars) {
  return pick(chars, srs, ROUND, rnd).map((c) => ({
    ch: c,
    clues: [...c.p, c.d],
    ...options(c, pool.length >= 4 ? pool : CHARACTERS, (x) => x.n, rnd),
  }))
}

// ¿Qué hizo?: nombre → elegir quién fue.
export function whatRound(chars, srs = {}, rnd = Math.random) {
  return pick(chars, srs, ROUND, rnd).map((c) => ({
    key: KEY(c),
    prompt: `¿Quién fue ${c.n}?`,
    ...options(c, chars, (x) => x.t, rnd),
    explain: c.d,
    ref: c.c,
  }))
}

// ¿Dónde está?: lo que hizo → elegir su cita.
export function whereRound(chars, srs = {}, rnd = Math.random) {
  return pick(chars, srs, ROUND, rnd).map((c) => ({
    key: KEY(c),
    prompt: `${c.n}: ${c.d} ¿Dónde lo dice la Biblia?`,
    ...options(c, chars, (x) => x.c, rnd),
    explain: c.t,
    ref: c.c,
  }))
}

// Línea del tiempo: 5 personajes de mundos distintos (así el orden es claro) para ordenarlos.
export function timelineRound(openWorlds, rnd = Math.random) {
  const worlds = shuffle(openWorlds.length >= 3 ? openWorlds : WORLDS.map((w) => w.id), rnd).slice(0, 5)
  return worlds
    .map((w) => shuffle(inWorld(w), rnd)[0])
    .sort((a, b) => a.order - b.order)
}

// Repaso diario: los personajes que ya viste y que hoy toca repasar.
export function dailyDue(srs = {}, today) {
  return CHARACTERS.filter((c) => srs[KEY(c)] && isDue(srs[KEY(c)], today))
}

// Reto contra reloj: una pregunta rápida al azar con los personajes de los mundos abiertos
// (qué hizo → quién es, o nombre → quién fue).
export function sprintQuestion(openWorlds, rnd = Math.random) {
  const pool = CHARACTERS.filter((c) => openWorlds.includes(c.w))
  const chars = pool.length >= 4 ? pool : CHARACTERS
  const c = chars[Math.floor(rnd() * chars.length)]
  if (rnd() < 0.5) return { key: KEY(c), prompt: c.d, ...options(c, chars, (x) => x.n, rnd) }
  return { key: KEY(c), prompt: `¿Quién fue ${c.n}?`, ...options(c, chars, (x) => x.t, rnd) }
}

// Estrellas de un mundo según el mejor resultado: 70 % = 1, 85 % = 2, 100 % = 3.
export const stars = (pct = 0) => (pct >= 100 ? 3 : pct >= 85 ? 2 : pct >= PASS ? 1 : 0)

// ¿Cierto o falso?: el nombre con lo que hizo él (cierto) o lo que hizo otro del mismo mundo (falso).
export function trueFalseRound(chars, srs = {}, rnd = Math.random) {
  return pick(chars, srs, ROUND, rnd).map((c) => {
    const others = chars.filter((o) => o.id !== c.id && o.d !== c.d && !confusable(c, o))
    const isTrue = rnd() < 0.5 || !others.length
    const shown = isTrue ? c : others[Math.floor(rnd() * others.length)]
    return {
      key: KEY(c),
      prompt: `«${shown.d}» ¿Fue ${c.n}?`,
      options: ['Cierto', 'Falso'],
      answer: isTrue ? 0 : 1,
      explain: isTrue ? c.t + '.' : `Eso lo hizo ${shown.n}. ${c.n}: ${c.d}`,
      ref: c.c,
    }
  })
}
