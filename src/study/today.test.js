import { describe, it, expect } from 'vitest'
import { nextDay, todayPlan, looksLikeDailyText } from './today.js'

// Lunes 5 de octubre de 2026. Reuniones: miércoles (3) y domingo (0).
const MON = new Date(2026, 9, 5, 9, 0)
const THU = new Date(2026, 9, 8, 9, 0)
const SUN = new Date(2026, 9, 11, 9, 0)
const meetings = { semana: 3, fin: 0 }
const keys = (items) => items.map((x) => x.key)

const ARTICULO = '1. ¿Pregunta uno?\n\n1 Párrafo uno.\n\n2. ¿Pregunta dos?\n\n2 Párrafo dos.'

describe('Hoy: lo que toca según tu rutina', () => {
  it('cuántos días faltan para un día de la semana', () => {
    expect(nextDay(0, MON)).toEqual({ iso: '2026-10-11', days: 6 })
    expect(nextDay(1, MON)).toEqual({ iso: '2026-10-05', days: 0 })
    expect(nextDay(3, MON)).toEqual({ iso: '2026-10-07', days: 2 })
  })

  it('sin reuniones elegidas: texto diario, repasar y reto', () => {
    const items = todayPlan({ now: MON, review: { due: 4, fresh: 5 } })
    expect(keys(items)).toEqual(['diario', 'repaso', 'reto'])
    expect(items[0]).toMatchObject({ sub: 'Pégalo y analízalo', done: false, create: { kind: 'diario', fields: { fecha: '2026-10-05' } } })
    expect(items[1]).toMatchObject({ sub: '9 cosas · unos 3 min', done: false })
    expect(items[2]).toMatchObject({ sub: '5 preguntas · 1 min', done: false })
  })

  it('el texto diario se marca hecho cuando ya lo analizaste', () => {
    const diario = { id: 'd', kind: 'diario', fields: { fecha: '2026-10-05', texto: 'Texto (Sal. 16:8).' } }
    expect(todayPlan({ now: MON, entries: [diario] })[0]).toMatchObject({ sub: 'Falta analizarlo', done: false, verse: 'Texto (Sal. 16:8).' })
    const hecho = { ...diario, fields: { ...diario.fields, resumen: 'Jehová delante' } }
    expect(todayPlan({ now: MON, entries: [hecho] })[0]).toMatchObject({ sub: 'Jehová delante', done: true })
  })

  it('la de entre semana con el programa pegado dice cuántas llevas', () => {
    const programa = 'TESOROS DE LA BIBLIA\n1. Perlas\n(10 mins.)\n¿Pregunta uno?\nRespuesta\n¿Pregunta dos?\nRespuesta'
    const e = { id: 'm', kind: 'reunion', fields: { tipo: 'entresemana', fecha: '2026-10-07', programa, respuestas: { '1-0': 'Algo' } }, updatedAt: 1 }
    expect(todayPlan({ now: MON, meetings, entries: [e] }).find((x) => x.key === 'entresemana')).toMatchObject({ sub: 'El miércoles · 1 de 2 contestadas', done: false })
    const lista = { ...e, fields: { ...e.fields, respuestas: { '1-0': 'Algo', '1-1': 'Otra' } } }
    expect(todayPlan({ now: MON, meetings, entries: [lista] }).find((x) => x.key === 'entresemana')).toMatchObject({ sub: 'El miércoles · Lista para la reunión', done: true })
  })

  it('la reunión de entre semana sale 2 días antes; La Atalaya 3 días antes', () => {
    expect(keys(todayPlan({ now: MON, meetings }))).toEqual(['diario', 'entresemana', 'repaso', 'reto'])
    const mon = todayPlan({ now: MON, meetings }).find((x) => x.key === 'entresemana')
    expect(mon).toMatchObject({ title: 'Reunión de entre semana', sub: 'El miércoles · Prepárala', create: { kind: 'reunion', fields: { tipo: 'entresemana', fecha: '2026-10-07' } } })
    expect(keys(todayPlan({ now: THU, meetings }))).toEqual(['diario', 'atalaya', 'repaso', 'reto'])
    expect(todayPlan({ now: THU, meetings })[1]).toMatchObject({ sub: 'El domingo · Prepárala por pasos', create: { kind: 'reunion', fields: { tipo: 'atalaya', fecha: '2026-10-11' } } })
  })

  it('La Atalaya dice cuántas llevas y se marca lista; si ya empezaste, sale aunque falten días', () => {
    const at = { id: 'a', kind: 'reunion', updatedAt: 1, fields: { tipo: 'atalaya', fecha: '2026-10-11', articulo: ARTICULO, parrafos: [{ num: '1', nota: 'Sí.' }] } }
    expect(todayPlan({ now: SUN, meetings, entries: [at] }).find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'Hoy · 1 de 2 respondidas', done: false, entry: at })
    // El lunes 5 (faltan 6 días) ya empezaste esa Atalaya: sigue saliendo.
    const early = { ...at, fields: { ...at.fields, fecha: '2026-10-06' } }
    expect(todayPlan({ now: MON, meetings, entries: [early] }).find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'El domingo · 1 de 2 respondidas' })
    const lista = { ...at, fields: { ...at.fields, parrafos: [{ num: '1', nota: 'Sí.' }, { num: '2', nota: 'No.' }] } }
    expect(todayPlan({ now: SUN, meetings, entries: [lista] }).find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'Hoy · Lista para la reunión', done: true })
  })

  it('repasar y reto se marcan hechos', () => {
    const items = todayPlan({ now: MON, review: { due: 0, fresh: 0 }, challenge: { day: '2026-10-05', score: 4 } })
    expect(items.slice(1).map((x) => [x.sub, x.done])).toEqual([['Al día', true], ['Hecho: 4 de 5', true]])
  })

  it('reconoce el texto diario copiado de JW Library', () => {
    expect(looksLikeDailyText('Martes 6 de octubre\nLa Ley tiene una sombra de las cosas buenas por venir (Heb. 10:1).\n\nComentario.')).toBe(true)
    expect(looksLikeDailyText('hola')).toBe(false)
    expect(looksLikeDailyText('Una lista del súper con pan, leche y huevos para la semana')).toBe(false)
  })
})
