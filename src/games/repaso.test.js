import { describe, it, expect } from 'vitest'
import { learnSources, verseMode, sayOptions, proofCards, proofOptions, repasoRound, firstWords } from './repaso.js'
import { mulberry } from './logic.js'

const learn = (id, cita, texto, createdAt = 1) => ({ id, kind: 'memoria', createdAt, fields: { cita, texto, aprender: true } })
const LUCAS = learn('l', 'Lucas 14:13, 14', 'Cuando des un banquete, invita a los pobres, a los lisiados, a los cojos, a los ciegos', 3)
const SALMO = learn('s', 'Salmo 127:1', 'Si Jehová no edifica la casa, de nada sirve que los constructores trabajen duro', 2)
const JUAN = learn('j', 'Juan 17:3', 'Esto significa vida eterna: que lleguen a conocerte a ti, el único Dios verdadero', 1)
const MATEO = learn('m', 'Mateo 6:33', 'Así que sigan buscando primero el Reino y la justicia de Dios, y todas estas otras cosas', 0)

const article = [
  '¿Cómo podemos ser hospitalarios?',
  '',
  '1. ¿Qué nos enseña Jesús?',
  '',
  '1 Jesús enseñó que hay que invitar a quienes no pueden pagarnos el favor. (Lea Lucas 14:13, 14.) Así imitamos a Jehová.',
].join('\n')
const atalaya = { id: 'a', kind: 'reunion', fields: { tipo: 'atalaya', fecha: '2026-10-18', titulo: 'Seamos hospitalarios', articulo: article } }

describe('Repasar', () => {
  it('solo entran los textos que elegiste aprender', () => {
    const old = { id: 'o', kind: 'memoria', fields: { cita: 'Juan 3:16', texto: 'Porque Dios amó tanto al mundo' } }
    expect(learnSources([old, JUAN, LUCAS]).map((v) => v.id)).toEqual(['l', 'j'])
  })

  it('la pregunta sube con lo que sabes: dónde está, qué dice, escríbelo', () => {
    expect(verseMode(undefined)).toBe('donde')
    expect(verseMode({ box: 2 })).toBe('dice')
    expect(verseMode({ box: 5 })).toBe('escribir')
  })

  it('¿Qué dice? da 4 textos distintos con el bueno entre ellos', () => {
    const q = sayOptions(LUCAS, [LUCAS, SALMO, JUAN, MATEO], mulberry(1))
    expect(q.options).toHaveLength(4)
    expect(q.options[q.answer]).toBe(firstWords(LUCAS.fields.texto))
    expect(sayOptions(LUCAS, [LUCAS, SALMO])).toBe(null)
  })

  it('¿Qué texto lo prueba? toma la idea de antes del "Lea" y su cita', () => {
    const [card] = proofCards([atalaya])
    expect(card.cita).toBe('Lucas 14:13, 14')
    expect(card.front).toBe('Jesús enseñó que hay que invitar a quienes no pueden pagarnos el favor.')
    const q = proofOptions(card, [card], [SALMO, JUAN, MATEO], mulberry(2))
    expect(q.options[q.answer]).toBe('Lucas 14:13, 14')
    expect(new Set(q.options).size).toBe(4)
    expect(proofOptions(card, [card], [SALMO])).toBe(null)
  })

  it('una ronda: lo que toca, hasta 2 nuevos y nada repetido en la sesión', () => {
    const entries = [LUCAS, SALMO, JUAN, MATEO]
    const srs = { 'v:j': { box: 3, due: '2026-10-19' }, 'v:m': { box: 3, due: '2026-12-01' } }
    const round = repasoRound(entries, srs, { today: '2026-10-19', rnd: () => 0.9 })
    expect(round.map((x) => x.key)).toEqual(['v:j', 'v:l', 'v:s'])
    expect(repasoRound(entries, srs, { today: '2026-10-19', rnd: () => 0.9, skip: new Set(['v:j', 'v:l', 'v:s']) })).toEqual([])
  })

  it('de vez en cuando entra una de La Atalaya', () => {
    const round = repasoRound([LUCAS, atalaya], {}, { today: '2026-10-19', rnd: () => 0.1 })
    expect(round.map((x) => x.type).sort()).toEqual(['proof', 'verse'])
  })
})
