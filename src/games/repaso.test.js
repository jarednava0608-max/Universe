import { describe, it, expect } from 'vitest'
import { learnSources, verseMode, compareWords, sameCite, sayOptions, whereOptions, fullCite, proofCards, proofOptions, repasoRound, firstWords } from './repaso.js'
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

  it('la pregunta sube con lo que sabes: aprenderlo, dónde está, qué dice, escríbelo', () => {
    expect(verseMode(undefined)).toBe('aprender')
    expect(verseMode({ box: 0 })).toBe('donde')
    expect(verseMode({ box: 2 })).toBe('dice')
    expect(verseMode({ box: 5 })).toBe('escribir')
  })

  it('escribirlo completo: sin importar acentos ni signos; marca lo que falta', () => {
    const t = 'Cuando des un banquete, invita a los pobres'
    expect(compareWords(t, 'cuando des un banquete invita a los pobres').pct).toBe(100)
    const r = compareWords(t, 'Cuando des banquete invita a los pobres')
    expect(r.words.filter((x) => !x.ok).map((x) => x.w)).toEqual(['un'])
    expect(r.pct).toBe(88)
    expect(sameCite('Lucas 14 13 14', 'Luc. 14:13, 14')).toBe(true)
    expect(sameCite('lucas 14:13-14', 'Lucas 14:13, 14')).toBe(true)
    expect(sameCite('Lucas 14:12', 'Lucas 14:13, 14')).toBe(false)
    expect(sameCite('2 Corintios 9:7', '2 Cor. 9:7')).toBe(true)
    expect(sameCite('1 Corintios 9:7', '2 Cor. 9:7')).toBe(false)
  })

  it('¿Dónde está? da 4 citas completas de libros distintos, que existen', () => {
    expect(fullCite('Luc. 14:13,14')).toBe('Lucas 14:13, 14')
    const q = whereOptions(LUCAS, [LUCAS, SALMO], mulberry(3))
    expect(q.options).toHaveLength(4)
    expect(q.options[q.answer]).toBe('Lucas 14:13, 14')
    expect(q.options).toContain('Salmos 127:1')
    expect(new Set(q.options.map((o) => o.split(' ').slice(0, -1).join(' '))).size).toBe(4)
    for (const o of q.options) expect(o).toMatch(/^\S.* \d+:\d+, \d+$|^Salmos 127:1$/)
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

describe('repasoRound practicar', () => {
  it('ofrece todos los textos aunque no toquen, primero los que menos sabe', () => {
    const srs = { 'v:j': { box: 5, due: '2099-01-01' }, 'v:s': { box: 1, due: '2099-01-01' } }
    const r = repasoRound([JUAN, SALMO], srs, { practice: true })
    expect(r.map((x) => x.key)).toEqual(['v:s', 'v:j'])
  })
})
