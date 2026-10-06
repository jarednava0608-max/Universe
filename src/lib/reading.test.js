import { describe, it, expect } from 'vitest'
import { TOTAL_CHAPTERS, BOOK_ABBR, withRead, isRead, readCount, bookRead, mergeLeidos } from './reading.js'
import { mergeProgress } from '../games/progress.js'

describe('leer toda la Biblia', () => {
  it('la Biblia tiene 1189 capítulos y 66 abreviaturas', () => {
    expect(TOTAL_CHAPTERS).toBe(1189)
    expect(BOOK_ABBR).toHaveLength(66)
  })

  it('marca y desmarca capítulos y cuenta por libro', () => {
    let f = withRead({}, 24, 40, true, 1)
    f = withRead(f, 24, 41, true, 2)
    expect(isRead(f.leidos, 24, 40)).toBe(true)
    expect(readCount(f.leidos)).toBe(2)
    expect(bookRead(f.leidos, 24)).toEqual({ read: 2, total: 52 })
    f = withRead(f, 24, 40, false, 3)
    expect(isRead(f.leidos, 24, 40)).toBe(false)
    expect(readCount(f.leidos)).toBe(1)
  })

  it('al sincronizar gana el cambio más reciente de cada capítulo', () => {
    const phone = withRead(withRead({}, 24, 40, false, 10), 24, 41, true, 5).leidos
    const cloud = withRead(withRead({}, 24, 40, true, 3), 1, 1, true, 4).leidos
    const m = mergeLeidos(phone, cloud)
    expect([isRead(m, 24, 40), isRead(m, 24, 41), isRead(m, 1, 1)]).toEqual([false, true, true])
    expect(readCount(mergeProgress({ leidos: phone }, { leidos: cloud }).leidos)).toBe(2)
  })
})
