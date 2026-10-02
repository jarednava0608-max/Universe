import { describe, it, expect } from 'vitest'
import { CHARACTERS, WORLDS } from './characters.js'
import { unlockedWorlds, whoRound, whatRound, whereRound, timelineRound, dailyDue, inWorld, KEY } from './logic.js'
import { parseRef } from '../../lib/bible.js'
import { mulberry } from '../logic.js'

describe('Memoria Bíblica', () => {
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
    for (const w of WORLDS) expect(inWorld(w.id).length).toBeGreaterThanOrEqual(8)
  })

  it('abre los mundos en orden con 70 % o más', () => {
    expect(unlockedWorlds({})).toEqual([1])
    expect(unlockedWorlds({ 'mb-w1': 80, 'mb-w2': 60 })).toEqual([1, 2])
    expect(unlockedWorlds({ 'mb-w1': 70, 'mb-w2': 90, 'mb-w4': 100 })).toEqual([1, 2, 3])
  })

  it('arma rondas con 4 opciones distintas y la respuesta correcta', () => {
    const chars = inWorld(2)
    const rnd = mulberry(5)
    for (const q of whoRound(chars, {}, rnd)) {
      expect(new Set(q.options).size).toBe(4)
      expect(q.options[q.answer]).toBe(q.ch.n)
      expect(q.clues).toHaveLength(3)
    }
    for (const q of whatRound(chars, {}, rnd)) expect(new Set(q.options).size).toBe(4)
    for (const q of whereRound(chars, {}, rnd)) expect(q.ref).toBe(q.options[q.answer])
  })

  it('pone primero lo que toca repasar', () => {
    const chars = inWorld(8)
    const target = chars[20]
    const srs = Object.fromEntries(chars.map((c) => [KEY(c), { box: 3, due: '2999-01-01' }]))
    srs[KEY(target)] = { box: 0, due: '2000-01-01' }
    expect(whoRound(chars, srs, mulberry(2)).map((q) => q.ch.id)).toContain(target.id)
    expect(dailyDue(srs, '2026-10-01').map((c) => c.id)).toEqual([target.id])
  })

  it('la línea del tiempo usa mundos distintos y viene en orden', () => {
    const run = timelineRound([1, 2, 3, 4, 5, 6], mulberry(9))
    expect(run).toHaveLength(5)
    expect(new Set(run.map((c) => c.w)).size).toBe(5)
    expect(run.map((c) => c.order)).toEqual([...run.map((c) => c.order)].sort((a, b) => a - b))
  })
})
