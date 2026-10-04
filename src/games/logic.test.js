import { describe, it, expect } from 'vitest'
import { parseTrivia, triviaToQuestion, buildGuessQuestions, buildPairs, clozeWords, verseSources, parseVerses, mulberry, maskTitle, guessPrompt } from './logic.js'
import { makeNode } from '../lib/model.js'

const nodes = ['Amor', 'Fe', 'Esperanza', 'Paciencia', 'Humildad'].map((t) =>
  makeNode({ title: t, note: `Definición de ${t.toLowerCase()} con suficiente texto para jugar.` }),
)

describe('Juegos', () => {
  it('lee trivia con respuesta por texto o letra y avisa de las malas', () => {
    const { questions, warnings } = parseTrivia({
      preguntas: [
        { pregunta: '¿Quién?', opciones: ['A', 'B', 'C'], respuesta: 'B' },
        { pregunta: '¿Cuál?', opciones: ['X', 'Y'], respuesta: 'a' },
        { pregunta: 'Sin opciones', respuesta: 0 },
      ],
    })
    expect(questions.map((q) => q.respuesta)).toEqual([1, 0])
    expect(warnings).toHaveLength(1)
    const q = triviaToQuestion(questions[0])
    expect(q.options[q.answer]).toBe('B')
  })

  it('"¿Qué es?" necesita al menos 4 nodos y oculta el título', () => {
    expect(buildGuessQuestions(nodes.slice(0, 3))).toEqual([])
    const qs = buildGuessQuestions(nodes, 3, mulberry(7))
    expect(qs).toHaveLength(3)
    for (const q of qs) {
      expect(q.options).toHaveLength(4)
      expect(q.prompt.toLowerCase()).not.toContain(q.options[q.answer].toLowerCase())
    }
    expect(maskTitle('El amor de Dios', 'Amor')).toBe('El ＿＿＿ de Dios')
  })

  it('parejas usa los mismos nodos en ambos lados', () => {
    const p = buildPairs(nodes, 4, mulberry(3))
    expect(p.left.map((x) => x.id).sort()).toEqual(p.right.map((x) => x.id).sort())
  })

  it('oculta más palabras en cada nivel', () => {
    const t = 'Esto significa vida eterna: que lleguen a conocerte a ti, el único Dios verdadero.'
    const hidden = [0, 1, 2, 3].map((n) => clozeWords(t, n, 5).filter((w) => w.hidden).length)
    expect(hidden[0]).toBeLessThan(hidden[1])
    expect(hidden[1]).toBeLessThan(hidden[2])
    expect(hidden[2]).toBeLessThan(hidden[3])
    expect(clozeWords(t, 0, 5).map((w) => w.pre + w.word + w.post).join(' ')).toBe(t)
  })

  it('toma textos del Texto diario separando la cita', () => {
    const entries = [{ id: 'd1', kind: 'diario', fields: { texto: '“Dios es amor” (1 Juan 4:8).' } }]
    const [v] = verseSources(entries)
    expect(v.fields).toMatchObject({ cita: '1 Juan 4:8', texto: '“Dios es amor”' })
    expect(parseVerses({ textos: [{ cita: 'Juan 17:3', texto: 'Vida eterna' }] })).toEqual([{ cita: 'Juan 17:3', texto: 'Vida eterna' }])
  })
})

describe('guessPrompt', () => {
  const def = (t, f) => `${t}\n\n${f}\n\nConclusión del artículo, basada en la Biblia. De Ayudemos a otros a conocer bien a Jehová.`
  const texts = [
    def('Cualquier decisión que hace feliz a Jehová es una buena decisión. Jesús: "Siempre hago lo que a él le agrada".', 'Juan 8:29 (párr. 15).'),
    def('Si ponemos a Jehová en primer lugar, él cuida de nosotros.', 'Mateo 6:33 (párr. 16).'),
    def('Si alguien ama a Dios, Jehová lo conoce.', '1 Corintios 8:3 (párr. 18).'),
  ]
  it('quita lo que solo repite el título y lo que se repite en todos', () => {
    const p = guessPrompt(texts[0], 'Lo que hace feliz a Jehová es una buena decisión', { others: ['Integridad', 'Sin conocer a Jehová no se le puede amar'], texts })
    expect(p).toBe('Jesús: "Siempre hago lo que a él le agrada". Juan 8:29 (párr. 15).')
  })
  it('con un título de una palabra lo oculta como antes', () => {
    expect(guessPrompt('El amor de Dios es grande.', 'Amor')).toBe('El ＿＿＿ de Dios es grande.')
  })
  it('no oculta palabras que también están en otras opciones', () => {
    expect(maskTitle('Conocer bien a Jehová', 'Conocer a Jehová', ['Jehová'])).toBe('＿＿＿ bien a Jehová')
  })
})
