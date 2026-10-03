import { describe, it, expect } from 'vitest'
import { dailyQuestions, dailyDone, DAILY_SIZE } from './daily.js'
import { mergeProgress } from './progress.js'

const nodes = ['Valor', 'Gratitud', 'Integridad', 'Carácter', 'Fe'].map((t, i) => ({ id: 'n' + i, title: t, note: `Definición larga de la idea número ${i} para jugar.` }))
const entries = [
  { id: 'a', kind: 'biblia', fields: { cita: 'Juan 17:3', texto: 'Esto significa vida eterna: que lleguen a conocerte a ti, el único Dios verdadero.' } },
  { id: 'b', kind: 'biblia', fields: { cita: 'Salmo 83:18', texto: 'Que la gente sepa que tú, cuyo nombre es Jehová, solo tú eres el Altísimo sobre toda la tierra.' } },
]

describe('Reto del día', () => {
  it('son las mismas preguntas todo el día y cambian al otro día', () => {
    const a = dailyQuestions({ nodes, entries }, '2026-10-02')
    const b = dailyQuestions({ nodes, entries }, '2026-10-02')
    const c = dailyQuestions({ nodes, entries }, '2026-10-03')
    expect(a).toHaveLength(DAILY_SIZE)
    expect(a.map((q) => q.prompt)).toEqual(b.map((q) => q.prompt))
    expect(a.map((q) => q.prompt)).not.toEqual(c.map((q) => q.prompt))
    for (const q of a) expect(q.options[q.answer]).toBeTruthy()
  })
  it('incluye una de tus preguntas de Trivia', () => {
    const q = { id: 't', kind: 'trivia', fields: { pregunta: '¿Cuál es el objetivo número uno del maestro?', opciones: ['Que llegue a conocer bien a Jehová', 'Otra', 'Otra más', 'Una más'], respuesta: 0 } }
    const a = dailyQuestions({ nodes, entries: [...entries, q] }, '2026-10-02')
    const t = a.find((x) => x.prompt === q.fields.pregunta)
    expect(t.options[t.answer]).toBe('Que llegue a conocer bien a Jehová')
  })
  it('sin textos ni nodos se completa con personajes y libros', () => {
    expect(dailyQuestions({}, '2026-10-02')).toHaveLength(DAILY_SIZE)
  })
  it('sabe si ya se hizo hoy', () => {
    expect(dailyDone({ daily: { day: '2026-10-02', score: 4 } }, '2026-10-02')).toEqual({ day: '2026-10-02', score: 4 })
    expect(dailyDone({ daily: { day: '2026-10-01', score: 4 } }, '2026-10-02')).toBeNull()
    expect(dailyDone({}, '2026-10-02')).toBeNull()
  })
})

describe('Reto del día al sincronizar', () => {
  it('se queda con el día más reciente o el mejor del mismo día', () => {
    expect(mergeProgress({ daily: { day: '2026-10-02', score: 3 } }, { daily: { day: '2026-10-01', score: 5 } }).daily).toEqual({ day: '2026-10-02', score: 3 })
    expect(mergeProgress({ daily: { day: '2026-10-02', score: 3 } }, { daily: { day: '2026-10-02', score: 5 } }).daily).toEqual({ day: '2026-10-02', score: 5 })
    expect(mergeProgress({}, {}).daily).toBeUndefined()
  })
})
