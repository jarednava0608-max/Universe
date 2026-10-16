import { describe, it, expect } from 'vitest'
import { triviaPairs } from './trivia-pairs.js'
import { mulberry } from './logic.js'

const mk = (i, ans = 'R' + i, q = '¿Pregunta ' + i + '?') => ({ id: 'e' + i, kind: 'trivia', fields: { pregunta: q, opciones: ['X', ans, 'Z'], respuesta: 1 } })

describe('triviaPairs', () => {
  it('da null con menos de 3', () => {
    expect(triviaPairs([mk(1), mk(2)])).toBeNull()
  })
  it('une pregunta y respuesta correcta con los mismos id', () => {
    const b = triviaPairs([1, 2, 3, 4, 5].map((i) => mk(i)), mulberry(3))
    expect(b.left).toHaveLength(4)
    expect(b.right).toHaveLength(4)
    for (const l of b.left) expect(b.right.find((r) => r.id === l.id).text).toBe('R' + l.id.slice(1))
  })
  it('no repite respuestas y recorta preguntas largas', () => {
    expect(triviaPairs([mk(1, 'Noé'), mk(2, 'noe'), mk(3, 'Ana')])).toBeNull()
    const b = triviaPairs([mk(1, 'A', 'x'.repeat(200)), mk(2), mk(3)])
    expect(b.left.every((l) => l.text.length <= 70)).toBe(true)
  })
})
