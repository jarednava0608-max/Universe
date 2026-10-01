import { describe, it, expect } from 'vitest'
import { streak, withDay, review, isDue, byPriority, dueCount, lastWeek, addDays } from './progress.js'

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
    expect(s).toEqual({ box: 1, due: '2026-10-11' })
    s = review(s, true, T)
    expect(s).toEqual({ box: 2, due: '2026-10-12' })
    expect(review(s, false, T)).toEqual({ box: 0, due: T })
    expect(isDue(undefined, T)).toBe(true)
    expect(isDue({ due: '2026-10-11' }, T)).toBe(false)
  })

  it('primero lo vencido, luego lo demás', () => {
    const srs = { a: { due: '2026-10-20' }, b: { due: '2026-10-01' }, c: undefined }
    const order = byPriority(['a', 'b', 'c'], srs, T, () => 0.5)
    expect(order.at(-1)).toBe('a')
    expect(dueCount(['a', 'b', 'c'], srs, T)).toBe(2)
  })
})
