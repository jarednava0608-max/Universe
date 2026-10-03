// Reto del día: 5 preguntas que son las mismas todo el día (se arman con la fecha como semilla)
// y mezclan personajes, libros de la Biblia, tus preguntas de Trivia, tus textos y tu mapa. Sin servicios externos.
import { bibleSources, bookSprintQuestion, buildFillQuestions, buildGuessQuestions, mulberry, shuffle, triviaToQuestion } from './logic.js'
import { sprintQuestion, unlockedWorlds } from './memoria/logic.js'
import { todayISO } from './progress.js'

export const DAILY_SIZE = 5

const seedOf = (day) => Number(day.replaceAll('-', ''))

export function dailyQuestions({ nodes = [], entries = [], best = {} }, day = todayISO()) {
  const rnd = mulberry(seedOf(day))
  const worlds = unlockedWorlds(best)
  const fill = buildFillQuestions(bibleSources(entries), 1, rnd)
  const guess = buildGuessQuestions(nodes, 1, rnd)
  // Una de tus preguntas de Trivia al azar: así lo que estudiaste vuelve de sorpresa semanas después.
  const trivia = entries.filter((e) => e.kind === 'trivia' && e.fields.opciones?.length >= 2)
  const quiz = trivia.length ? [triviaToQuestion(trivia[Math.floor(rnd() * trivia.length)].fields, rnd)] : []
  const out = [sprintQuestion(worlds, rnd), bookSprintQuestion(rnd), ...quiz, ...fill, ...guess]
  // Si faltan textos o nodos, se completa con personajes y libros.
  while (out.length < DAILY_SIZE) out.push(out.length % 2 ? bookSprintQuestion(rnd) : sprintQuestion(worlds, rnd))
  return shuffle(out.slice(0, DAILY_SIZE), rnd)
}

// Resultado de hoy guardado en el progreso: { day, score } o null si aún no lo hace.
export const dailyDone = (progress, day = todayISO()) => (progress.daily?.day === day ? progress.daily : null)
