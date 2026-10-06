import { describe, it, expect } from 'vitest'
import { voiceScore } from './speech.js'

describe('elegir la voz', () => {
  it('prefiere las voces Premium y Mejoradas en español de México y descarta las de juguete', () => {
    const voices = [
      { name: 'Grandma (Spanish (Mexico))', lang: 'es-MX' },
      { name: 'Mónica', lang: 'es-ES' },
      { name: 'Paulina', lang: 'es-MX' },
      { name: 'Paulina (Mejorada)', lang: 'es-MX' },
      { name: 'Marisol (Premium)', lang: 'es-ES' },
    ]
    const order = [...voices].sort((a, b) => voiceScore(b) - voiceScore(a)).map((v) => v.name)
    expect(order).toEqual(['Marisol (Premium)', 'Paulina (Mejorada)', 'Paulina', 'Mónica', 'Grandma (Spanish (Mexico))'])
  })
})
