import { describe, it, expect } from 'vitest'
import { initials, chunkText, dailyMix, mulberry, cardCheck } from './logic.js'
import { mergeProgress, withBest, withBestTime, isDue } from './progress.js'

describe('Más juegos', () => {
  it('iniciales y trozos para ordenar', () => {
    expect(initials('«Esto significa vida eterna: que lleguen')).toBe('«E s v e: q l')
    const parts = chunkText('uno dos tres cuatro cinco seis siete ocho nueve diez', 4)
    expect(parts.join(' ')).toBe('uno dos tres cuatro cinco seis siete ocho nueve diez')
    expect(parts.length).toBeLessThanOrEqual(4)
  })

  it('repasar hoy alterna tipos y solo toma lo que toca', () => {
    const srs = { 'c:a': { box: 3, due: '2999-01-01' } }
    const mix = dailyMix({ cards: [{ id: 'a' }, { id: 'b' }], verses: [{ id: 'v' }], trivia: [{ id: 'q1' }, { id: 'q2' }] }, srs, (s) => isDue(s, '2026-10-01'))
    expect(mix.slice(0, 2).map((x) => x.key)).toEqual(['c:b', 'v:v'])
    expect(mix.slice(2).map((x) => x.key).sort()).toEqual(['q:q1', 'q:q2'])
  })

  it('récords', () => {
    let f = withBest({}, 'libros', 80)
    f = withBest(f, 'libros', 60)
    expect(f.best.libros).toBe(80)
    expect(mergeProgress({ best: { libros: 80 } }, { best: { libros: 90, 'trivia-reloj': 500 } }).best).toEqual({ libros: 90, 'trivia-reloj': 500 })
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
})

describe('Repasar hoy con personajes', () => {
  it('incluye solo personajes ya vistos que tocan hoy', () => {
    const srs = { 'mb:1': { box: 0, due: '2026-10-01' }, 'mb:2': { box: 3, due: '2026-12-01' } }
    const mix = dailyMix({ people: [{ id: 1 }, { id: 2 }, { id: 3 }] }, srs, (s) => isDue(s, '2026-10-01'))
    expect(mix.map((m) => m.key)).toEqual(['mb:1'])
    expect(mix[0].type).toBe('person')
  })
})

import { defText } from './logic.js'
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

describe('Texto diario con cita de Éxodo', () => {
  it('separa la cita aunque empiece con É', async () => {
    const { verseSources } = await import('./logic.js')
    const [v] = verseSources([{ id: 'd1', kind: 'diario', fields: { texto: 'Yo seré lo que yo decida ser (Éxodo 3:14).' } }])
    expect(v.fields.cita).toBe('Éxodo 3:14')
    expect(v.fields.texto).toBe('Yo seré lo que yo decida ser')
    const [w] = verseSources([{ id: 'd2', kind: 'diario', fields: { texto: 'Jehová es mi pastor. Salmo 23:1' } }])
    expect(w.fields.cita).toBe('Salmo 23:1')
  })
})

describe('Memorizar: lo que vas estudiando', () => {
  it('entra el versículo del texto diario estudiado; no las copias viejas del texto completo', async () => {
    const { memorizeSources } = await import('./logic.js')
    const entries = [
      { id: 'd', kind: 'diario', fields: { fecha: '2026-10-02', texto: 'Viernes 2 de octubre Dios revela los secretos (Daniel 2:28).' } },
      { id: 'c', kind: 'memoria', fields: { cita: 'Daniel 2:28', texto: 'Viernes 2 de octubre Dios revela los secretos' } },
      { id: 'm', kind: 'memoria', fields: { cita: 'Juan 17:3', texto: 'Esto significa vida eterna.' } },
      { id: 'l', kind: 'diario', fields: { fecha: '2026-10-19', estudiado: true, texto: 'Lunes 19 de octubre\nCuando des un banquete, invita a los pobres (Luc. 14:13, 14).\n\nEl hombre hospitalario (1 Ped. 4:9).' } },
    ]
    const list = memorizeSources(entries)
    expect(list.map((e) => e.id)).toEqual(['l', 'm'])
    expect(list[0].fields).toMatchObject({ cita: 'Luc. 14:13, 14', texto: 'Cuando des un banquete, invita a los pobres' })
    // Ya practicado (copiado a "mis textos"), no se repite.
    const copy = { id: 'x', kind: 'memoria', fields: { ...list[0].fields, nivel: 1 } }
    expect(memorizeSources([...entries, copy]).map((e) => e.id)).toEqual(['m', 'x'])
  })
})

describe('cardCheck (Repasar hoy sin trampa)', () => {
  const cards = [
    { id: 'v', front: 'Gén. 39:7-9', back: 'Y después de esto la esposa de su amo...' },
    { id: 'a', front: 'Calumnia', back: 'Decir algo falso que daña la reputación de otro.' },
    { id: 'b', front: 'Valor', back: 'Hacer lo correcto aunque dé miedo.' },
    { id: 'c', front: 'Fe', back: 'Confianza basada en pruebas.' },
    { id: 'd', front: 'Salmo 15:3', back: 'No calumnia con su lengua.' },
  ]
  it('una cita con versículo se repasa armando la cita', () => {
    const r = cardCheck(cards[0], cards)
    expect(r.type).toBe('cite')
    expect(r.verse.fields).toEqual({ cita: 'Gén. 39:7-9', texto: cards[0].back })
  })
  it('una idea se elige entre opciones que no son citas, sin decir el título', () => {
    const r = cardCheck(cards[1], cards)
    expect(r.type).toBe('choice')
    expect(r.options[r.answer]).toBe('Calumnia')
    expect(r.options).toHaveLength(3)
    expect(r.options).not.toContain('Salmo 15:3')
    expect(r.prompt).not.toMatch(/calumnia/i)
  })
  it('sin otras tarjetas queda como tarjeta normal', () => {
    expect(cardCheck(cards[1], [cards[1]])).toBeNull()
  })
})
