import { describe, it, expect } from 'vitest'
import { CHARACTERS, WORLDS } from './characters.js'
import { unlockedWorlds, whoRound, whatRound, whereRound, timelineRound, dailyDue, inWorld, KEY, sprintQuestion, stars, trueFalseRound } from './logic.js'
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

describe('reto contra reloj y estrellas', () => {
  it('las preguntas del reto solo usan mundos abiertos y tienen la respuesta entre las opciones', () => {
    const rnd = mulberry(7)
    for (let i = 0; i < 200; i++) {
      const q = sprintQuestion([1, 2], rnd)
      const ch = CHARACTERS.find((c) => KEY(c) === q.key)
      expect([1, 2]).toContain(ch.w)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect([ch.n, ch.t]).toContain(q.options[q.answer])
    }
  })
  it('estrellas por porcentaje', () => {
    expect([0, 69, 70, 84, 85, 99, 100].map(stars)).toEqual([0, 0, 1, 1, 2, 2, 3])
  })
})

describe('¿Cierto o falso?', () => {
  it('lo cierto usa lo que hizo el personaje y lo falso lo de otro', () => {
    const rnd = mulberry(11)
    for (const w of WORLDS) {
      const chars = inWorld(w.id)
      for (const q of trueFalseRound(chars, {}, rnd)) {
        const ch = CHARACTERS.find((c) => KEY(c) === q.key)
        expect(q.prompt.endsWith(`¿Fue ${ch.n}?`)).toBe(true)
        expect(q.prompt === `«${ch.d}» ¿Fue ${ch.n}?`).toBe(q.answer === 0)
      }
    }
  })
})

describe('opciones sin dos respuestas correctas', () => {
  it('Eva no sale como opción de Adán ni Timoteo de Silas', () => {
    const rnd = mulberry(21)
    const adan = CHARACTERS.find((c) => c.n === 'Adán')
    const silas = CHARACTERS.find((c) => c.n === 'Silas')
    for (let i = 0; i < 300; i++) {
      for (const q of whoRound([adan], {}, rnd, inWorld(1))) expect(q.options).not.toContain('Eva')
      for (const q of whoRound([silas], {}, rnd, inWorld(8))) expect(q.options).not.toContain('Timoteo')
    }
  })
})
