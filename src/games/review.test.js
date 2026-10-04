import { describe, it, expect } from 'vitest'
import { atalayaCards, atalayaCheck, buildProofQuestions, dailyMix, mulberry } from './logic.js'
import { isDue } from './progress.js'

const ARTICULO = `1. ¿Cómo nos sentimos al ver el progreso de un estudiante?

¿CÓMO nos sentimos? Muy felices (1 Cor. 3:5-9).

2. ¿Cuál es la voluntad de Jehová?

2 La voluntad de Jehová es que todos lleguen a conocerlo.

3, 4. ¿Qué preguntas responderemos?

3 Primera parte.

4 Segunda parte.

## ¿Qué responderías?
- ¿Por qué necesitan conocer bien a Jehová?
- ¿Cómo podemos enseñarles?`

const reunion = (id, fecha, parrafos, repaso = []) => ({ id, kind: 'reunion', fields: { tipo: 'atalaya', fecha, titulo: 'Conocer a Jehová ' + id, articulo: ARTICULO, parrafos, repaso }, updatedAt: 1 })

describe('Tu Atalaya en el repaso', () => {
  const entries = [
    reunion('a', '2026-09-26', [{ num: '1', nota: 'Muy felices, pero el mérito es de Jehová.' }]),
    reunion('b', '2026-10-03', [
      { num: '1', nota: 'Felices, porque Jehová lo hace crecer.' },
      { num: '2', nota: 'Que todos se salven y lo conozcan bien.' },
      { num: '3, 4', nota: 'Sí' }, // muy corta: no es tarjeta
    ], [{ pregunta: '¿Cómo podemos enseñarles?', nota: 'Con el ejemplo y con la Biblia.' }]),
  ]

  it('cada pregunta con tu respuesta; lo más reciente primero y en orden', () => {
    const cards = atalayaCards(entries)
    expect(cards.map((c) => c.id)).toEqual(['b:1', 'b:2', 'b:r1', 'a:1'])
    expect(cards[0]).toMatchObject({ front: '¿Cómo nos sentimos al ver el progreso de un estudiante?', back: 'Felices, porque Jehová lo hace crecer.', label: 'Párr. 1', title: 'Conocer a Jehová b' })
    expect(cards[2]).toMatchObject({ front: '¿Cómo podemos enseñarles?', label: '¿Qué responderías?' })
  })

  it('se repasa eligiendo tu respuesta entre 4 (primero del mismo artículo)', () => {
    const cards = atalayaCards(entries)
    const q = atalayaCheck(cards[0], cards, mulberry(3))
    expect(q.options).toHaveLength(4)
    expect(q.options[q.answer]).toBe(cards[0].back)
    expect(new Set(q.options).size).toBe(4)
    // Sin suficientes respuestas no hay pregunta (queda la tarjeta).
    expect(atalayaCheck(cards[0], cards.slice(0, 2))).toBe(null)
  })
})

describe('Repasar hoy: lo que toca y unas pocas nuevas', () => {
  const T = '2026-10-10'
  const due = (s) => isDue(s, T)
  const ids = (n, p) => Array.from({ length: n }, (_, i) => ({ id: p + i }))

  it('primero lo que ya viste; las nuevas solo hasta el límite del día', () => {
    const srs = { 'c:c0': { box: 1, due: '2026-10-09' }, 'q:q0': { box: 2, due: T }, 'c:c1': { box: 3, due: '2026-12-01' } }
    const mix = dailyMix({ cards: ids(5, 'c'), trivia: ids(30, 'q') }, srs, due, 20, mulberry(1), 4)
    expect(mix.slice(0, 2).map((x) => x.key).sort()).toEqual(['c:c0', 'q:q0'])
    expect(mix.slice(0, 2).every((x) => !x.fresh)).toBe(true)
    expect(mix.slice(2)).toHaveLength(4)
    expect(mix.slice(2).every((x) => x.fresh)).toBe(true)
    expect(mix.some((x) => x.key === 'c:c1')).toBe(false) // aún no toca
    // Sin lugar para nuevas: nada nuevo.
    expect(dailyMix({ cards: ids(5, 'c') }, srs, due, 20, mulberry(1), 0).map((x) => x.key)).toEqual(['c:c0'])
  })

  it('lo nuevo de tu Atalaya va primero y en orden', () => {
    const mix = dailyMix({ atalaya: ids(3, 'a'), trivia: ids(5, 'q') }, {}, due, 20, mulberry(2), 4)
    expect(mix.map((x) => x.key)).toEqual(['a:a0', 'a:a1', 'a:a2', mix[3].key])
    expect(mix[3].type).toBe('trivia')
  })
})

describe('¿Con qué texto lo pruebas?', () => {
  const node = (id, title, note) => ({ id, title, note })
  const nodes = [
    node('1', 'Conocer a Jehová da vida eterna', 'Conocer a [[Jehová]] da vida eterna.\n\n[[Juan 17:3]]'),
    node('2', 'Jehová quiere que todos se salven', 'Quiere que se salven. [[1 Timoteo 2:3, 4]]'),
    node('3', 'El amor impulsa a obedecer', 'El amor y la obediencia. [[1 Juan 5:3]]; [[Juan 14:31]]'),
    node('4', 'Jehová es el Gran Instructor', 'Quien enseña es Jehová. [[Is. 30:20, 21]]'),
    node('5', 'Juan 17:3', 'Esto significa vida eterna…'), // ya es un texto: no es pregunta
    node('6', 'Sin textos', 'Una idea sin citas bíblicas.'),
  ]

  it('la idea y el texto que enlaza; las otras opciones son textos de otras ideas', () => {
    const qs = buildProofQuestions(nodes, 10, mulberry(5))
    expect(qs.map((q) => q.nodeId).sort()).toEqual(['1', '2', '3', '4'])
    for (const q of qs) {
      expect(q.options).toHaveLength(4)
      expect(q.options[q.answer]).toBe(q.ref)
    }
    const amor = qs.find((q) => q.nodeId === '3')
    expect(['1 Juan 5:3', 'Juan 14:31']).toContain(amor.ref)
    expect(amor.also).toHaveLength(1)
    // La otra cita de la misma idea nunca sale como opción falsa.
    expect(amor.options.filter((o) => o === '1 Juan 5:3' || o === 'Juan 14:31')).toHaveLength(1)
  })

  it('sin 4 textos distintos no hay juego', () => {
    expect(buildProofQuestions(nodes.slice(0, 2))).toEqual([])
  })
})
