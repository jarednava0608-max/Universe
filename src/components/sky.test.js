import { describe, it, expect } from 'vitest'

describe('cielo según la hora', () => {
  it('noche con estrellas, día con nubes, tarde con rayos y cambio poco a poco', async () => {
    const { skyAt } = await import('./Sky.jsx')
    expect(skyAt(22 * 60).stars).toBe(1)
    expect(skyAt(12 * 60).day).toBe(1)
    expect(skyAt(12 * 60).stars).toBe(0)
    expect(skyAt(16 * 60).rays).toBe(1)
    const a = skyAt(18 * 60).a, b = skyAt(18 * 60 + 30).a
    expect(a).not.toEqual(b) // a las 6 y a las 6:30 se ve distinto
    expect(skyAt(6 * 60 + 30, 'light').rise).toBe(1)
  })
})
