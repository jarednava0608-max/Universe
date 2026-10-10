import { describe, expect, it } from 'vitest'
import { dueAlerts, localParts, payloadFor, slotOnDay, whenLabel, WINDOW_MIN } from './logic.js'

const TZ = 'America/Monterrey' // UTC-6 todo el año
const utc = (s) => new Date(s)

describe('avisos de pendientes (función de Supabase)', () => {
  it('hora local en la zona del teléfono', () => {
    expect(localParts(utc('2026-10-10T05:30:00Z'), TZ)).toMatchObject({ day: '2026-10-09', dow: 5, min: 23 * 60 + 30 })
    expect(localParts(utc('2026-10-10T12:05:00Z'), TZ)).toMatchObject({ day: '2026-10-10', dow: 6, min: 6 * 60 + 5 })
  })

  it('un pendiente suena a su hora, una sola llave, y no si ya pasó mucho', () => {
    const e = { id: 'p1', kind: 'pendiente', fields: { title: 'Entregar', dueAt: '2026-10-20T18:00:00.000Z', reminderMinutes: 60, done: false } }
    expect(dueAlerts([e], utc('2026-10-20T16:59:00Z'), TZ)).toEqual([])
    const [a] = dueAlerts([e], utc('2026-10-20T17:00:30Z'), TZ)
    expect(a.key).toBe('p:p1:2026-10-20T17:00:00.000Z')
    expect(dueAlerts([e], utc(new Date(Date.parse('2026-10-20T17:00:00Z') + WINDOW_MIN * 60000).toISOString()), TZ)).toEqual([])
    expect(dueAlerts([{ ...e, fields: { ...e.fields, done: true } }], utc('2026-10-20T17:00:30Z'), TZ)).toEqual([])
    expect(dueAlerts([{ ...e, fields: { ...e.fields, reminderMinutes: null } }], utc('2026-10-20T17:00:30Z'), TZ)).toEqual([])
  })

  it('un hábito suena en su día y hora locales (cada 2 semanas también)', () => {
    const h = { id: 'h1', kind: 'habito', fields: { title: 'Lectura', slots: [{ days: [1], time: '21:00', biweekly: '2026-10-05' }, { days: [6], time: '06:00' }] } }
    // Lunes 5 oct 21:01 local = 6 oct 03:01 UTC
    expect(dueAlerts([h], utc('2026-10-06T03:01:00Z'), TZ).map((x) => x.key)).toEqual(['h:h1:2026-10-05:21:00'])
    // Lunes 12 oct no le toca (cada 2 semanas)
    expect(dueAlerts([h], utc('2026-10-13T03:01:00Z'), TZ)).toEqual([])
    // Sábado 10 oct 6:00 local
    expect(dueAlerts([h], utc('2026-10-10T12:00:00Z'), TZ).map((x) => x.key)).toEqual(['h:h1:2026-10-10:06:00'])
    // En pausa no suena
    expect(dueAlerts([{ ...h, fields: { ...h.fields, active: false } }], utc('2026-10-10T12:00:00Z'), TZ)).toEqual([])
    expect(slotOnDay({ days: [1], biweekly: '2026-09-28' }, '2026-10-05', 1)).toBe(false)
  })

  it('texto de la notificación', () => {
    const now = utc('2026-10-20T17:00:00Z') // 11:00 am local
    const tarea = { kind: 'pendiente', entry: { id: 'p1', fields: { title: '🔔 Entregar ensayo', dueAt: '2026-10-20T18:00:00.000Z', reminderMinutes: 60, notes: 'Por Nexus\notra línea' } } }
    expect(payloadFor(tarea, now, TZ)).toEqual({ title: 'Entregar ensayo', body: 'Vence hoy 12:00 pm · Por Nexus', tag: 'p-p1', tab: 'pendientes' })
    const rec = { kind: 'pendiente', entry: { id: 'p2', fields: { title: 'Ética — faltan 3 días', type: 'Recordatorio', dueAt: '2026-10-20T17:00:00.000Z', reminderMinutes: 0, notes: 'AF2. Vence el 23.' } } }
    expect(payloadFor(rec, now, TZ).body).toBe('AF2. Vence el 23.')
    const evento = { kind: 'pendiente', entry: { id: 'p3', fields: { title: 'Exposición', type: 'Evento', dueAt: '2026-10-21T18:00:00.000Z', reminderMinutes: 1440 } } }
    expect(payloadFor(evento, now, TZ).body).toBe('Es mañana 12:00 pm')
    const hab = { kind: 'habito', entry: { id: 'h1', fields: { title: 'Ejercicio', goal: '5 días por semana' } }, slot: { time: '15:00', label: '' } }
    expect(payloadFor(hab, now, TZ)).toEqual({ title: 'Ejercicio', body: 'Hábito de las 3:00 pm · 5 días por semana', tag: 'h-h1', tab: 'pendientes' })
    expect(whenLabel('2026-10-24T05:55:00.000Z', now, TZ)).toBe('vie 23 oct, 11:55 pm')
  })
})
