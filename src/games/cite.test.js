import { describe, it, expect } from 'vitest'
import { citeSteps, mulberry } from './logic.js'

describe('Memorizar: armar la cita', () => {
  it('tres pasos con 4 opciones distintas y la buena incluida', () => {
    for (const [cita, book, chap, verse] of [['Juan 17:3', 'Juan', '17', '3'], ['Sal. 83:18', 'Salmos', '83', '18'], ['Génesis 1:1', 'Génesis', '1', '1'], ['Apocalipsis 22:20', 'Apocalipsis', '22', '20'], ['Juan 3:16-17', 'Juan', '3', '16-17']]) {
      for (let s = 1; s < 20; s++) {
        const steps = citeSteps(cita, mulberry(s))
        expect(steps.map((x) => x.label)).toEqual(['Libro', 'Capítulo', 'Versículo'])
        expect(steps.map((x) => x.options[x.answer])).toEqual([book, chap, verse])
        for (const x of steps) {
          expect(new Set(x.options).size).toBe(4)
          if (x.label !== 'Libro') expect(x.options.every((o) => o.split('-').every((n) => Number(n) >= 1))).toBe(true)
        }
      }
    }
  })

  it('un tramo mueve los dos números', () => {
    const v = citeSteps('Juan 3:16-17', mulberry(2))[2]
    for (const o of v.options) {
      const [a, b] = o.split('-').map(Number)
      expect(b - a).toBe(1)
    }
  })

  it('sin versículo o sin libro conocido no hay pasos', () => {
    expect(citeSteps('Jeremías 38')).toBeNull()
    expect(citeSteps('Libro raro 1:1')).toBeNull()
    expect(citeSteps('')).toBeNull()
  })
})
