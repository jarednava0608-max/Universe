import { describe, it, expect } from 'vitest'
import { CHARACTERS, WORLDS } from './characters.js'
import { parseRef } from '../../lib/bible.js'

describe('Personajes (para los personajes del texto diario)', () => {
  it('cada personaje tiene todo y su cita se reconoce', () => {
    expect(CHARACTERS.length).toBeGreaterThanOrEqual(120)
    for (const c of CHARACTERS) {
      expect(parseRef(c.c), c.n + ': ' + c.c).toBeTruthy()
      expect(c.p).toHaveLength(2)
      expect(c.t && c.d).toBeTruthy()
      // Las pistas no dicen el nombre
      const first = c.n.split(/[ ,]/)[0]
      for (const clue of [...c.p, c.d]) expect(clue.includes(first), `${c.n} se delata: ${clue}`).toBe(false)
    }
    expect(WORLDS).toHaveLength(8)
  })
})
