import { describe, it, expect } from 'vitest'
import { TOTAL_CHAPTERS, BOOK_ABBR, withRead, isRead, readCount, bookRead, mergeLeidos, makePlan, readingToday, chaptersLabel } from './reading.js'
import { BOOKS } from './bible.js'
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

describe('plan de lectura con meta', () => {
  const MON = new Date(2026, 9, 5, 9, 0)
  const at = (h) => new Date(2026, 9, 5, h).getTime()

  it('la meta de un año reparte los capítulos y empieza en Génesis 1', () => {
    const plan = makePlan(365, MON, 1)
    expect(plan).toMatchObject({ start: '2026-10-05', end: '2027-10-04' })
    const r = readingToday({}, plan, MON)
    expect(r.perDay).toBe(4)
    expect(r.next).toEqual([[1, 1], [1, 2], [1, 3], [1, 4]])
    expect(r.ok).toBe(false)
    expect(chaptersLabel(r.next, BOOKS)).toBe('Génesis 1, 2, 3, 4')
  })

  it('lo leído hoy cuenta y se salta lo que ya leíste antes', () => {
    const plan = makePlan(365, MON, 1)
    let f = withRead({}, 1, 1, true, at(1) - 864e5) // ayer
    f = withRead(f, 1, 2, true, at(8))
    const r = readingToday(f.leidos, plan, MON)
    expect(r.done).toEqual([[1, 2]])
    expect(r.next).toEqual([[1, 3], [1, 4], [1, 5]])
    f = withRead(f, 1, 3, true, at(8))
    f = withRead(f, 1, 4, true, at(8))
    f = withRead(f, 1, 5, true, at(8))
    expect(readingToday(f.leidos, plan, MON)).toMatchObject({ ok: true, next: [] })
  })

  it('al cambiar de libro se separa con un punto', () => {
    expect(chaptersLabel([[1, 50], [2, 1]], BOOKS)).toBe('Génesis 50 · Éxodo 1')
  })

  it('sin meta o vencida', () => {
    expect(readingToday({}, null, MON)).toBeNull()
    expect(readingToday({}, { off: true, t: 1 }, MON)).toBeNull()
    expect(readingToday({}, { start: '2025-01-01', end: '2025-12-31', t: 1 }, MON)).toMatchObject({ expired: true, ok: false, next: [] })
  })

  it('al combinar gana la meta más reciente', () => {
    const a = { plan: { start: '2026-10-05', end: '2027-10-04', t: 5 } }
    const b = { plan: { off: true, t: 9 } }
    expect(mergeProgress(a, b).plan).toEqual(b.plan)
    expect(mergeProgress(b, a).plan).toEqual(b.plan)
  })
})
