import { describe, it, expect } from 'vitest'
import { streak, withDay, review, isDue, byPriority, dueCount, lastWeek, addDays, newToday, isKnown } from './progress.js'

const T = '2026-10-10'

describe('racha', () => {
  it('cuenta días seguidos hasta hoy o hasta ayer', () => {
    expect(streak(['2026-10-08', '2026-10-09', '2026-10-10'], T)).toEqual({ current: 3, best: 3 })
    expect(streak(['2026-10-08', '2026-10-09'], T).current).toBe(2) // hoy aún no estudia
    expect(streak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-09'], T)).toEqual({ current: 1, best: 4 })
    expect(streak([], T)).toEqual({ current: 0, best: 0 })
  })

  it('agrega el día una sola vez y arma la semana', () => {
    const f = withDay(withDay({ days: [] }, T), T)
    expect(f.days).toEqual([T])
    expect(lastWeek([T], T).map((d) => d.done)).toEqual([false, false, false, false, false, false, true])
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('repaso inteligente', () => {
  it('lo que sabes se espacia y lo que fallas vuelve hoy', () => {
    let s = review(undefined, true, T)
    expect(s).toEqual({ box: 1, due: '2026-10-11', first: T })
    s = review(s, true, '2026-10-11')
    expect(s).toEqual({ box: 2, due: '2026-10-13', first: T })
    expect(review({ box: 2, due: T }, false, T)).toEqual({ box: 0, due: T })
    expect(isDue(undefined, T)).toBe(true)
    expect(isDue({ due: '2026-10-11' }, T)).toBe(false)
  })

  it('no sube dos veces el mismo día ni cuando aún no tocaba', () => {
    const s = review(undefined, true, T)
    expect(review(s, true, T)).toBe(s)
    expect(review({ box: 4, due: '2026-10-20' }, true, T)).toEqual({ box: 4, due: '2026-10-20' })
  })

  it('un error baja 2 cajas, no borra todo', () => {
    expect(review({ box: 6, due: T }, false, T)).toEqual({ box: 4, due: T })
    expect(review({ box: 1, due: T }, false, T)).toEqual({ box: 0, due: T })
    // Aunque aún no tocara, si fallas vuelve hoy.
    expect(review({ box: 5, due: '2026-11-01' }, false, T)).toEqual({ box: 3, due: T })
  })

  it('con todas las pistas no sube: vuelve mañana', () => {
    expect(review({ box: 3, due: T }, 'help', T)).toEqual({ box: 3, due: '2026-10-11' })
    expect(review(undefined, 'help', T)).toEqual({ box: 0, due: '2026-10-11', first: T })
  })

  it('conocido = acertado en dos días distintos; cuenta las nuevas de hoy', () => {
    const day1 = review(undefined, true, T)
    expect(isKnown(day1)).toBe(false)
    expect(isKnown(review(day1, true, '2026-10-11'))).toBe(true)
    const srs = { 'q:1': day1, 'c:2': review(undefined, false, T), 'mb:3': day1, 'v:4': { box: 1, due: T }, 'q:5': { box: 0, due: T, first: '2026-10-09' } }
    expect(newToday(srs, T)).toBe(2) // los personajes y lo de otros días no cuentan
  })

  it('primero lo vencido, luego lo demás', () => {
    const srs = { a: { due: '2026-10-20' }, b: { due: '2026-10-01' }, c: undefined }
    const order = byPriority(['a', 'b', 'c'], srs, T, () => 0.5)
    expect(order.at(-1)).toBe('a')
    expect(dueCount(['a', 'b', 'c'], srs, T)).toBe(1) // lo nunca visto es nuevo, no "para repasar"
  })
})
