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

describe('luna real', () => {
  it('reconoce lunas nuevas y llenas conocidas', async () => {
    const { moonPhase, moonPath } = await import('./Sky.jsx')
    const full = moonPhase(new Date(Date.UTC(2024, 0, 25, 17, 54)))
    expect(Math.abs(full - 0.5)).toBeLessThan(0.03)
    const nw = moonPhase(new Date(Date.UTC(2024, 0, 11, 11, 57)))
    expect(Math.min(nw, 1 - nw)).toBeLessThan(0.03)
    expect(moonPath(0.25)).toMatch(/^M0,-1 A1,1 0 0,1 0,1 A/)
  })
  it('el lucero sale al anochecer y las estrellas después', async () => {
    const { skyAt } = await import('./Sky.jsx')
    expect(skyAt(19 * 60 + 30).venus).toBe(1)
    expect(skyAt(12 * 60).venus).toBe(0)
  })
})
