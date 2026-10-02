import { describe, it, expect } from 'vitest'
import { initials, chunkText, buildCiteQuestions, buildBookQuestions, bookRun, sectionOf, timedPoints, dailyMix, mulberry } from './logic.js'
import { achievements, mergeProgress, withBest, isDue } from './progress.js'
import { BOOKS } from '../lib/bible.js'

const verse = (id, cita, texto = 'Texto de prueba suficientemente largo') => ({ id, kind: 'memoria', fields: { cita, texto } })

describe('Más juegos', () => {
  it('iniciales y trozos para ordenar', () => {
    expect(initials('«Esto significa vida eterna: que lleguen')).toBe('«E s v e: q l')
    const parts = chunkText('uno dos tres cuatro cinco seis siete ocho nueve diez', 4)
    expect(parts.join(' ')).toBe('uno dos tres cuatro cinco seis siete ocho nueve diez')
    expect(parts.length).toBeLessThanOrEqual(4)
  })

  it('¿Dónde está? usa solo citas reconocidas y distintas', () => {
    const vs = [verse('1', 'Juan 17:3'), verse('2', 'Sal. 83:18'), verse('3', '1 Juan 4:8'), verse('4', 'Mateo 6:9'), verse('5', 'Juan 17:3'), verse('6', 'Libro raro 1:1')]
    const qs = buildCiteQuestions(vs, 10, mulberry(3))
    expect(qs).toHaveLength(4)
    for (const q of qs) {
      expect(new Set(q.options).size).toBe(4)
      expect(q.answer).toBeGreaterThanOrEqual(0)
    }
    expect(buildCiteQuestions(vs.slice(0, 3))).toEqual([])
  })

  it('libros de la Biblia: preguntas correctas y tramos seguidos', () => {
    expect(BOOKS).toHaveLength(66)
    expect(sectionOf(1)).toBe('Pentateuco')
    expect(sectionOf(19)).toBe('Poéticos')
    expect(sectionOf(44)).toBe('Evangelios y Hechos')
    expect(sectionOf(66)).toBe('Apocalipsis')
    const qs = buildBookQuestions(30, mulberry(7))
    expect(qs).toHaveLength(30)
    for (const q of qs) {
      expect(new Set(q.options).size).toBe(q.options.length)
      const m = q.prompt.match(/después de (.+)\?$/)
      if (m) expect(q.options[q.answer]).toBe(BOOKS[BOOKS.indexOf(m[1]) + 1])
      const a = q.prompt.match(/antes de (.+)\?$/)
      if (a) expect(q.options[q.answer]).toBe(BOOKS[BOOKS.indexOf(a[1]) - 1])
    }
    const run = bookRun(6, mulberry(1))
    const i = BOOKS.indexOf(run[0])
    expect(run).toEqual(BOOKS.slice(i, i + 6))
  })

  it('puntos contra reloj', () => {
    expect(timedPoints(15000, 15000)).toBe(200)
    expect(timedPoints(0, 15000)).toBe(100)
  })

  it('repasar hoy alterna tipos y solo toma lo que toca', () => {
    const srs = { 'c:a': { box: 3, due: '2999-01-01' } }
    const mix = dailyMix({ cards: [{ id: 'a' }, { id: 'b' }], verses: [{ id: 'v' }], trivia: [{ id: 'q1' }, { id: 'q2' }] }, srs, (s) => isDue(s, '2026-10-01'))
    expect(mix.map((x) => x.key)).toEqual(['c:b', 'v:v', 'q:q1', 'q:q2'])
  })

  it('récords y logros', () => {
    let f = withBest({}, 'libros', 80)
    f = withBest(f, 'libros', 60)
    expect(f.best.libros).toBe(80)
    expect(mergeProgress({ best: { libros: 80 } }, { best: { libros: 90, 'trivia-reloj': 500 } }).best).toEqual({ libros: 90, 'trivia-reloj': 500 })
    const list = achievements({ days: ['2026-10-01', '2026-10-02', '2026-10-03'], best: { libros: 100 } }, { nodes: 12, memorized: 1 })
    const done = list.filter((a) => a.done).map((a) => a.id)
    expect(done).toEqual(['racha-3', 'texto-1', 'nodos-10', 'libros-100'])
  })
})

import { typeWords, foldLetter } from './logic.js'
describe('Escribir (primera letra)', () => {
  it('separa puntuación y deja la letra sin acento', () => {
    const w = typeWords('«Él es Jehová», dijo — Ésta: ¿ves?')
    expect(w.map((x) => x.letter)).toEqual(['e', 'e', 'j', 'd', '', 'e', 'v'])
    expect(w[0]).toEqual({ pre: '«', word: 'Él', post: '', letter: 'e' })
    expect(w[2]).toEqual({ pre: '', word: 'Jehová', post: '»,', letter: 'j' })
    expect(w[4].word).toBe('')
    expect(w[6]).toEqual({ pre: '¿', word: 'ves', post: '?', letter: 'v' })
    expect(typeWords('dijo —y')[1]).toEqual({ pre: '—', word: 'y', post: '', letter: 'y' })
  })
  it('compara sin acentos ni mayúsculas', () => {
    expect(foldLetter('Á')).toBe('a')
    expect(foldLetter('ñ')).toBe('n')
  })
})
