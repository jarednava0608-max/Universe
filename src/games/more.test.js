import { describe, it, expect } from 'vitest'
import { initials, chunkText, buildCiteQuestions, buildBookQuestions, bookRun, sectionOf, timedPoints, dailyMix, mulberry } from './logic.js'
import { achievements, mergeProgress, withBest, withBestTime, isDue } from './progress.js'
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

describe('récords de tiempo', () => {
  it('se queda con el más rápido, también al unir dispositivos', () => {
    let f = withBestTime({}, 'parejas-tiempo', 40)
    f = withBestTime(f, 'parejas-tiempo', 55)
    expect(f.best['parejas-tiempo']).toBe(40)
    f = withBestTime(f, 'parejas-tiempo', 31)
    expect(f.best['parejas-tiempo']).toBe(31)
    expect(mergeProgress({ best: { 'parejas-tiempo': 31, libros: 50 } }, { best: { 'parejas-tiempo': 25, libros: 80 } }).best).toEqual({ 'parejas-tiempo': 25, libros: 80 })
    expect(mergeProgress({ best: { 'parejas-tiempo': 31 } }, { best: {} }).best).toEqual({ 'parejas-tiempo': 31 })
  })
  it('logros nuevos de Memoria Bíblica y retos', () => {
    const srs = Object.fromEntries(Array.from({ length: 64 }, (_, i) => ['mb:' + i, { box: 1, due: '2099-01-01' }]))
    const done = achievements({ srs, best: { 'mb-w2': 100, 'mb-reto': 15, 'trivia-racha': 10, 'mb-linea': 5 } }).filter((a) => a.done).map((a) => a.id)
    expect(done).toEqual(['mb-estrellas', 'mb-personajes', 'reto-15', 'sin-fallar-10', 'linea-5'])
  })
})

import { buildFillQuestions } from './logic.js'
describe('Completa el texto', () => {
  const verses = [
    { id: 'a', fields: { cita: 'Juan 17:3', texto: 'Esto significa vida eterna: que lleguen a conocerte a ti, el único Dios verdadero.' } },
    { id: 'b', fields: { cita: 'Salmo 83:18', texto: 'Que la gente sepa que tú, cuyo nombre es Jehová, solo tú eres el Altísimo sobre toda la tierra.' } },
    { id: 'c', fields: { cita: '', texto: 'Muy corto aquí' } },
  ]
  it('quita una palabra que está entre las 4 opciones distintas', () => {
    const qs = buildFillQuestions(verses, 10, mulberry(3))
    expect(qs).toHaveLength(2)
    for (const q of qs) {
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(4)
      expect(q.prompt).toContain('_____')
      const v = verses.find((x) => 'llenar:' + x.id === q.key)
      expect(q.prompt.replace('_____', q.options[q.answer])).toBe(v.fields.texto)
    }
  })
})

import { bibleSources } from './logic.js'
describe('bibleSources', () => {
  it('suma los versículos de Mi Biblia sin publicaciones ni repetidos', () => {
    const entries = [
      { id: '1', kind: 'memoria', fields: { cita: 'Juan 17:3', texto: 'Esto significa vida eterna' } },
      { id: '2', kind: 'biblia', fields: { cita: 'Juan 17:3', texto: 'Esto significa vida eterna' } },
      { id: '3', kind: 'biblia', fields: { cita: 'Jeremías 38:6', texto: 'Así que agarraron a Jeremías' } },
      { id: '4', kind: 'biblia', fields: { cita: 'Seamos valientes, cap. 3', texto: 'Un párrafo' } },
    ]
    expect(bibleSources(entries).map((e) => e.id)).toEqual(['1', '3'])
  })
})

import { sectionRun } from './logic.js'
describe('Ordenar una sección', () => {
  it('da los libros de una sección completa, en orden', () => {
    const rnd = mulberry(5)
    for (let i = 0; i < 20; i++) {
      const r = sectionRun(rnd)
      expect(r.books.length).toBeGreaterThanOrEqual(5)
      expect(r.name).not.toBe('Apocalipsis')
      const idx = r.books.map((b) => BOOKS.indexOf(b))
      expect(idx).toEqual([...idx].sort((a, b) => a - b))
      expect(sectionOf(idx[0] + 1)).toBe(r.name)
    }
  })
})

describe('Repasar hoy con personajes', () => {
  it('incluye solo personajes ya vistos que tocan hoy', () => {
    const srs = { 'mb:1': { box: 0, due: '2026-10-01' }, 'mb:2': { box: 3, due: '2026-12-01' } }
    const mix = dailyMix({ people: [{ id: 1 }, { id: 2 }, { id: 3 }] }, srs, (s) => isDue(s, '2026-10-01'))
    expect(mix.map((m) => m.key)).toEqual(['mb:1'])
    expect(mix[0].type).toBe('person')
  })
})

import { defText, buildPairs } from './logic.js'
describe('definiciones sin subtítulos', () => {
  it('quita los ## y deja el texto', () => {
    expect(defText('## Lo que pasa\nEn el noveno año.\n\n## Lo que estudiamos\nValor.')).toBe('En el noveno año. Valor.')
  })
})

describe('trimQuotes', () => {
  it('quita comillas sueltas al inicio y al final', async () => {
    const { trimQuotes } = await import('./logic.js')
    expect(trimQuotes('“‘Pero yo te rescataré ese día —afirma Jehová—’.')).toBe('Pero yo te rescataré ese día —afirma Jehová—.')
    expect(trimQuotes('Jehová es mi pastor.')).toBe('Jehová es mi pastor.')
    expect(trimQuotes('\u201c\u2018Porque confiaste en mí\u2019, afirma Jehová\u201d.')).toBe('Porque confiaste en mí, afirma Jehová.')
    expect(trimQuotes('Le dijo: “Ven” y fue')).toBe('Le dijo: “Ven” y fue')
  })
})
