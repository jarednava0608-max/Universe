import { describe, expect, it } from 'vitest'
import {
  categoriesIn, cleanTitle, dueCount, dueLabel, fireAt, groupTasks, habitsToday, habitStreak, isFinished, isPlannerEntry,
  joinLocal, makeHabit, makeSettings, makeTask, matches, nextOccurrence, reminderLabel, slotOn, splitLocal, toggleHabitDay,
} from './tasks.js'

const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi)

describe('pendientes', () => {
  it('quita emojis del título', () => {
    expect(cleanTitle('🔔 Ética (AF2) — vence hoy')).toBe('Ética (AF2) — vence hoy')
    expect(cleanTitle('  🔦 Devolver  linterna ')).toBe('Devolver linterna')
    expect(cleanTitle('🙏 Oración al levantarme')).toBe('Oración al levantarme')
  })

  it('calcula cuándo suena el aviso', () => {
    const due = at(2026, 10, 20, 18).toISOString()
    expect(fireAt({ dueAt: due, reminderMinutes: 60 }).getTime()).toBe(at(2026, 10, 20, 17).getTime())
    expect(fireAt({ dueAt: due, reminderMinutes: null })).toBeNull()
    expect(fireAt({ dueAt: due, reminderMinutes: 0, done: true })).toBeNull()
    expect(fireAt({ dueAt: null, reminderMinutes: 0 })).toBeNull()
  })

  it('agrupa por día', () => {
    const now = at(2026, 10, 10, 10)
    const t = (d, h, extra = {}) => makeTask({ title: 'x', dueAt: at(2026, 10, d, h).toISOString(), ...extra })
    const g = groupTasks([t(9, 9), t(10, 23), t(11, 8), t(14, 8), t(30, 8), makeTask({ title: 'sin' }), t(10, 9, { done: true }), makeHabit()], now)
    expect([g.atrasados, g.hoy, g.manana, g.semana, g.despues, g.sinFecha, g.hechos].map((x) => x.length)).toEqual([1, 1, 1, 1, 1, 1, 1])
  })

  it('un recordatorio que ya pasó cuenta como hecho', () => {
    const now = at(2026, 10, 10, 10)
    const pasado = makeTask({ title: 'Faltan 3 días', type: 'Recordatorio', dueAt: at(2026, 10, 9).toISOString() })
    const futuro = makeTask({ title: 'Mañana vence', type: 'Recordatorio', dueAt: at(2026, 10, 11).toISOString() })
    const tarea = makeTask({ title: 'Entregar', type: 'Tarea', dueAt: at(2026, 10, 9).toISOString() })
    expect(isFinished(pasado.fields, now)).toBe(true)
    expect(isFinished(futuro.fields, now)).toBe(false)
    const g = groupTasks([pasado, futuro, tarea], now)
    expect(g.hechos.map((e) => e.fields.title)).toEqual(['Faltan 3 días'])
    expect(g.atrasados.map((e) => e.fields.title)).toEqual(['Entregar'])
    expect(dueCount([pasado, futuro, tarea], now)).toBe(1)
  })

  it('filtra por categoría y busca sin acentos', () => {
    const a = makeTask({ title: 'Ensayo de Ética', category: 'Universidad' })
    const b = makeTask({ title: 'Pagar tarjeta', category: 'Personal', notes: 'fecha de corte' })
    expect(matches(a, { query: 'etica' })).toBe(true)
    expect(matches(b, { query: 'corte' })).toBe(true)
    expect(matches(a, { category: 'Personal' })).toBe(false)
    expect(groupTasks([a, b], new Date(), { category: 'Universidad' }).sinFecha.map((e) => e.fields.title)).toEqual(['Ensayo de Ética'])
    expect(categoriesIn([b, a, makeTask({ category: 'Inbox' })])).toEqual(['Universidad', 'Personal', 'Inbox'])
  })

  it('el que se repite crea el siguiente después de hoy', () => {
    const now = at(2026, 10, 10, 10)
    const weekly = makeTask({ title: 'Pagar', repeat: 'weekly', dueAt: at(2026, 9, 26, 9).toISOString(), done: true, doneAt: 1 })
    const next = nextOccurrence(weekly, now)
    expect(new Date(next.fields.dueAt).getTime()).toBe(at(2026, 10, 17, 9).getTime())
    expect(next.fields.done).toBe(false)
    expect(next.fields.doneAt).toBeUndefined()
    expect(next.id).not.toBe(weekly.id)
    const monthly = nextOccurrence(makeTask({ repeat: 'monthly', dueAt: at(2026, 10, 18, 9).toISOString() }), now)
    expect(new Date(monthly.fields.dueAt).getTime()).toBe(at(2026, 11, 18, 9).getTime())
    expect(nextOccurrence(makeTask({ repeat: 'none', dueAt: at(2026, 10, 18).toISOString() }), now)).toBeNull()
  })

  it('etiquetas de fecha y aviso', () => {
    const now = at(2026, 10, 10, 10)
    expect(dueLabel(at(2026, 10, 10, 15).toISOString(), now)).toBe('Hoy 3:00 pm')
    expect(dueLabel(at(2026, 10, 11, 9).toISOString(), now)).toBe('Mañana 9:00 am')
    expect(dueLabel(at(2026, 10, 17, 19, 15).toISOString(), now)).toBe('sáb 17 oct, 7:15 pm')
    expect(dueLabel(at(2027, 1, 5, 0, 0).toISOString(), now)).toBe('mar 5 ene 2027, 12:00 am')
    expect(reminderLabel(810)).toBe('13 h 30 min antes')
    expect(reminderLabel(1440)).toBe('1 día antes')
    expect(reminderLabel(2880)).toBe('2 días antes')
  })

  it('fecha y hora de los campos ida y vuelta', () => {
    const iso = joinLocal('2026-10-17', '19:15')
    expect(splitLocal(iso)).toEqual({ date: '2026-10-17', time: '19:15' })
    expect(joinLocal('', '10:00')).toBeNull()
  })

  it('pendientes, hábitos y ajustes no son estudio', () => {
    expect(isPlannerEntry(makeTask())).toBe(true)
    expect(isPlannerEntry(makeHabit())).toBe(true)
    expect(isPlannerEntry(makeSettings())).toBe(true)
    expect(isPlannerEntry({ kind: 'diario' })).toBe(false)
    expect(isPlannerEntry(undefined)).toBe(false)
  })
})

describe('hábitos', () => {
  it('días de la semana y cada 2 semanas', () => {
    const lunes = { days: [1], time: '21:00', biweekly: '2026-10-05' }
    expect(slotOn(lunes, at(2026, 10, 5))).toBe(true)
    expect(slotOn(lunes, at(2026, 10, 12))).toBe(false)
    expect(slotOn(lunes, at(2026, 10, 19))).toBe(true)
    expect(slotOn(lunes, at(2026, 9, 28))).toBe(false)
    expect(slotOn({ days: [0, 6], time: '06:00' }, at(2026, 10, 10))).toBe(true)
  })

  it('los de hoy, palomear y racha', () => {
    const now = at(2026, 10, 10, 8) // sábado
    let h = makeHabit({ title: 'Ejercicio', slots: [{ days: [0, 6], time: '06:00' }, { days: [1, 3, 5], time: '15:00' }] })
    const other = makeHabit({ title: 'Solo martes', slots: [{ days: [2], time: '09:00' }] })
    const off = makeHabit({ title: 'Pausado', active: false, slots: [{ days: [6], time: '09:00' }] })
    const list = habitsToday([h, other, off], now)
    expect(list.map((x) => [x.entry.fields.title, x.slot.time, x.done])).toEqual([['Ejercicio', '06:00', false]])
    h = toggleHabitDay(h, now)
    expect(habitsToday([h], now)[0].done).toBe(true)
    h = toggleHabitDay(h, at(2026, 10, 9)) // viernes
    expect(habitStreak(h, now)).toBe(2)
    h = toggleHabitDay(h, now)
    expect(habitStreak(h, now)).toBe(1)
    expect(habitStreak(makeHabit({ slots: [] }), now)).toBe(0)
  })
})
