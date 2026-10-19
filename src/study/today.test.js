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

  it('sin reuniones elegidas: solo el texto diario', () => {
    const items = todayPlan({ now: MON })
    expect(keys(items)).toEqual(['diario'])
    expect(items[0]).toMatchObject({ sub: 'Léelo y estúdialo con Claude · unos 15 min', done: false, create: { kind: 'diario', fields: { fecha: '2026-10-05' } } })
  })

  it('el texto diario se marca hecho cuando ya lo analizaste', () => {
    const diario = { id: 'd', kind: 'diario', fields: { fecha: '2026-10-05', texto: 'Texto (Sal. 16:8).' } }
    expect(todayPlan({ now: MON, entries: [diario] })[0]).toMatchObject({ sub: 'Léelo y estúdialo con Claude · unos 15 min', done: false, verse: 'Texto (Sal. 16:8).' })
    expect(todayPlan({ now: MON, entries: [{ ...diario, fields: { ...diario.fields, estudiado: true } }] })[0]).toMatchObject({ sub: 'Lo de hoy, cumplido', done: true })
    const medio = { ...diario, fields: { ...diario.fields, principio: 'Jehová me cuida.' } }
    expect(todayPlan({ now: MON, entries: [medio] })[0]).toMatchObject({ done: false })
    const hecho = { ...diario, fields: { ...medio.fields, aplicacion: 'Hoy voy a orar antes de decidir.', resumen: 'Jehová delante' } }
    expect(todayPlan({ now: MON, entries: [hecho] })[0]).toMatchObject({ sub: 'Jehová delante', done: true })
  })

  it('la de entre semana con el programa pegado dice cuántas llevas', () => {
    const programa = 'TESOROS DE LA BIBLIA\n1. Perlas\n(10 mins.)\n¿Pregunta uno?\nRespuesta\n¿Pregunta dos?\nRespuesta'
    const e = { id: 'm', kind: 'reunion', fields: { tipo: 'entresemana', fecha: '2026-10-07', programa, respuestas: { '1-0': 'Algo' } }, updatedAt: 1 }
    expect(todayPlan({ now: MON, meetings, entries: [e] }).find((x) => x.key === 'entresemana')).toMatchObject({ sub: 'El miércoles · 1 de 2 respondidas', done: false })
    const lista = { ...e, fields: { ...e.fields, respuestas: { '1-0': 'Algo', '1-1': 'Otra' } } }
    expect(todayPlan({ now: MON, meetings, entries: [lista] }).find((x) => x.key === 'entresemana')).toMatchObject({ sub: 'El miércoles · Lista para la reunión', done: true })
  })

  it('la reunión de entre semana sale 2 días antes; La Atalaya 3 días antes', () => {
    expect(keys(todayPlan({ now: MON, meetings }))).toEqual(['diario', 'entresemana'])
    const mon = todayPlan({ now: MON, meetings }).find((x) => x.key === 'entresemana')
    expect(mon).toMatchObject({ title: 'Reunión de entre semana', sub: 'El miércoles · Prepárala', create: { kind: 'reunion', fields: { tipo: 'entresemana', fecha: '2026-10-07' } } })
    expect(keys(todayPlan({ now: THU, meetings }))).toEqual(['diario', 'atalaya'])
    expect(todayPlan({ now: THU, meetings })[1]).toMatchObject({ sub: 'El domingo · Prepárala por pasos', create: { kind: 'reunion', fields: { tipo: 'atalaya', fecha: '2026-10-11' } } })
  })

  it('La Atalaya dice cuántas llevas y se marca lista; si ya empezaste, sale aunque falten días', () => {
    const at = { id: 'a', kind: 'reunion', updatedAt: 1, fields: { tipo: 'atalaya', fecha: '2026-10-11', articulo: ARTICULO, parrafos: [{ num: '1', nota: 'Sí.' }] } }
    // El día de la reunión, con algo contestado: ya no pide prepararla y ofrece tus respuestas (Modo reunión).
    expect(todayPlan({ now: SUN, meetings, entries: [at] }).find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'Hoy · 1 de 2 respondidas', done: true, meetingToday: true, entry: at })
    const vacia = { ...at, fields: { ...at.fields, parrafos: [] } }
    expect(todayPlan({ now: SUN, meetings, entries: [vacia] }).find((x) => x.key === 'atalaya')).toMatchObject({ done: false, meetingToday: false })
    // El lunes 5 (faltan 6 días) ya empezaste esa Atalaya: sigue saliendo.
    const early = { ...at, fields: { ...at.fields, fecha: '2026-10-06' } }
    expect(todayPlan({ now: MON, meetings, entries: [early] }).find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'El domingo · 1 de 2 respondidas' })
    // Solo pegada, sin contestar nada: no le gana a la de entre semana que sigue.
    const pegada = { ...early, fields: { ...early.fields, parrafos: [] } }
    expect(keys(todayPlan({ now: MON, meetings, entries: [pegada] }))).toEqual(['diario', 'entresemana'])
    const lista = { ...at, fields: { ...at.fields, parrafos: [{ num: '1', nota: 'Sí.' }, { num: '2', nota: 'No.' }] } }
    expect(todayPlan({ now: SUN, meetings, entries: [lista] }).find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'Hoy · Lista para la reunión', done: true })
  })

  it('Repasar hoy y el Reto del día ya no son pasos de Hoy (siguen en Juegos)', () => {
    const items = todayPlan({ now: MON, meetings })
    expect(items.some((x) => x.key === 'repaso' || x.key === 'reto')).toBe(false)
  })

  it('reconoce el texto diario copiado de JW Library', () => {
    expect(looksLikeDailyText('Martes 6 de octubre\nLa Ley tiene una sombra de las cosas buenas por venir (Heb. 10:1).\n\nComentario.')).toBe(true)
    expect(looksLikeDailyText('hola')).toBe(false)
    expect(looksLikeDailyText('Una lista del súper con pan, leche y huevos para la semana')).toBe(false)
  })
})

describe('Hoy: lectura de la Biblia con meta', () => {
  const MON = new Date(2026, 9, 5, 9, 0)
  const plan = { start: '2026-10-05', end: '2027-10-04', t: 1 }

  it('sin meta no sale', () => {
    expect(todayPlan({ now: MON }).some((x) => x.key === 'lectura')).toBe(false)
  })

  it('con meta dice qué capítulos tocan y se marca al leerlos', () => {
    const it0 = todayPlan({ now: MON, plan }).find((x) => x.key === 'lectura')
    expect(it0).toMatchObject({ sub: 'Génesis 1, 2, 3, 4', done: false, ref: 'Génesis 1' })
    const t = new Date(2026, 9, 5, 8).getTime()
    const leidos = Object.fromEntries([1, 2, 3, 4].map((c) => [`1:${c}`, { on: true, t }]))
    expect(todayPlan({ now: MON, plan, leidos }).find((x) => x.key === 'lectura')).toMatchObject({ sub: 'Hecho: Génesis 1, 2, 3, 4', done: true })
  })
})

describe('Hoy: tu asignación', () => {
  const MON = new Date(2026, 9, 5, 9, 0)
  const e = { id: 'x', kind: 'asignacion', fields: { fecha: '2026-10-08', parte: 'lectura', titulo: '' } }

  it('sale desde 7 días antes y se marca al practicarla hoy', () => {
    expect(todayPlan({ now: MON, entries: [e] }).find((x) => x.key === 'asignacion')).toMatchObject({ sub: 'El jueves · Practica: Lectura de la Biblia', done: false })
    const t = new Date(2026, 9, 5, 8).getTime()
    const hecha = { ...e, fields: { ...e.fields, ensayos: [{ t, secs: 236 }] } }
    expect(todayPlan({ now: MON, entries: [hecha] }).find((x) => x.key === 'asignacion')).toMatchObject({ sub: 'El jueves · Practicada hoy (3:56)', done: true })
  })

  it('no sale si falta más de una semana o ya pasó', () => {
    const lejos = { ...e, fields: { ...e.fields, fecha: '2026-10-20' } }
    const paso = { ...e, fields: { ...e.fields, fecha: '2026-10-01' } }
    expect(todayPlan({ now: MON, entries: [lejos, paso] }).some((x) => x.key === 'asignacion')).toBe(false)
  })
})

describe('nextStep', () => {
  it('es el primer paso sin hacer; null si ya terminaste', async () => {
    const { nextStep } = await import('./today.js')
    expect(nextStep([{ key: 'diario', done: true }, { key: 'atalaya', done: false }, { key: 'lectura', done: false }])?.key).toBe('atalaya')
    expect(nextStep([{ key: 'diario', done: true }, { key: 'lectura', done: true }])).toBeNull()
    expect(nextStep([])).toBeNull()
  })
})

describe('Hoy: en orden, sin momentos del día', () => {
  it('la lectura va al final', async () => {
    const { nextStep } = await import('./today.js')
    const plan = { start: '2026-10-05', end: '2027-10-04', t: 1 }
    const e = { id: 'x', kind: 'asignacion', fields: { fecha: '2026-10-08', parte: 'lectura', titulo: '' } }
    const items = todayPlan({ now: MON, meetings, plan, entries: [e] })
    expect(keys(items)).toEqual(['diario', 'entresemana', 'asignacion', 'lectura'])
    expect(items.some((x) => 'moment' in x)).toBe(false)
    const done = items.map((x) => (x.key === 'diario' || x.key === 'entresemana' ? { ...x, done: true } : x))
    expect(nextStep(done)?.key).toBe('asignacion')
  })

  it('se prepara la reunión que sigue', () => {
    // Jueves y sábado, como en el calendario.
    const cal = { semana: 4, fin: 6 }
    const sun = todayPlan({ now: new Date(2026, 9, 11, 9), meetings: cal })
    expect(keys(sun)).toEqual(['diario', 'entresemana'])
    const fri = todayPlan({ now: new Date(2026, 9, 9, 7), meetings: cal })
    expect(fri.find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'El sábado · Prepárala por pasos' })
    expect(fri.some((x) => x.key === 'entresemana')).toBe(false)
  })
})

describe('Hoy: se puede terminar', () => {
  const ARTICULO3 = '1. ¿Uno?\n\n1 Uno.\n\n2. ¿Dos?\n\n2 Dos.\n\n3. ¿Tres?\n\n3 Tres.'
  const FRI = new Date(2026, 9, 9, 9, 0)
  const cal = { semana: 4, fin: 6 }

  it('la reunión cuenta como hecha por hoy si hoy ya le avanzaste', () => {
    const at = { id: 'a', kind: 'reunion', updatedAt: new Date(2026, 9, 9, 8).getTime(), fields: { tipo: 'atalaya', fecha: '2026-10-10', articulo: ARTICULO3, parrafos: [{ num: '1', nota: 'Sí.' }] } }
    expect(todayPlan({ now: FRI, meetings: cal, entries: [at] }).find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'El sábado · Hoy ya le avanzaste · 1 de 3 respondidas', done: true })
    const ayer = { ...at, updatedAt: new Date(2026, 9, 8, 20).getTime() }
    expect(todayPlan({ now: FRI, meetings: cal, entries: [ayer] }).find((x) => x.key === 'atalaya')).toMatchObject({ sub: 'El sábado · 1 de 3 respondidas', done: false })
  })

  it('una meta de lectura vencida no se queda en Hoy', () => {
    expect(todayPlan({ now: FRI, plan: { start: '2025-01-01', end: '2025-12-31', t: 1 } }).some((x) => x.key === 'lectura')).toBe(false)
  })
})

describe('Hoy: el día de la reunión de entre semana', () => {
  it('con algo contestado, cuenta como hecha y ofrece tus respuestas', () => {
    const programa = 'TESOROS DE LA BIBLIA\n1. Perlas\n(10 mins.)\n¿Pregunta uno?\nRespuesta\n¿Pregunta dos?\nRespuesta'
    const WED = new Date(2026, 9, 7, 9, 0)
    const e = { id: 'm', kind: 'reunion', fields: { tipo: 'entresemana', fecha: '2026-10-07', programa, respuestas: { '1-0': 'Algo' } }, updatedAt: 1 }
    expect(todayPlan({ now: WED, meetings: { semana: 3, fin: 0 }, entries: [e] }).find((x) => x.key === 'entresemana')).toMatchObject({ done: true, meetingToday: true })
    expect(todayPlan({ now: MON, meetings: { semana: 3, fin: 0 }, entries: [e] }).find((x) => x.key === 'entresemana')).toMatchObject({ meetingToday: false })
  })
})

describe('Hoy: lo de ayer', () => {
  it('el texto de ayer con su lección, para recordarla antes de verla', async () => {
    const { yesterdayLesson } = await import('./today.js')
    const ayer = { id: 'y', kind: 'diario', fields: { fecha: '2026-10-04', texto: 'Domingo 4 de octubre\nJehová es mi pastor (Sal. 23:1).\n\nComentario.', principio: 'Jehová me guía.' } }
    expect(yesterdayLesson([ayer], MON)).toEqual({ verse: 'Jehová es mi pastor (Sal. 23:1).', lesson: 'Jehová me guía.' })
    expect(yesterdayLesson([{ ...ayer, fields: { ...ayer.fields, principio: '' } }], MON)).toBeNull()
    expect(yesterdayLesson([], MON)).toBeNull()
  })
})
