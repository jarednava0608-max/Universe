import { describe, it, expect } from 'vitest'
import { entryForClaude, makeEntry, fieldsFromJson, proposeNode, refsIn, claudeFormat, KIND_ORDER, dailyVerse, dailyTextUrl, dailyTextAppUrl, partMinutes, clock } from './kinds.js'

describe('Estudio', () => {
  it('detecta citas bíblicas sin repetir', () => {
    expect(refsIn('Lee Juan 17:3 y 1 Juan 4:8; también Sal. 83:18 y Mateo 6:9, 10. Otra vez Juan 17:3')).toEqual([
      'Juan 17:3', '1 Juan 4:8', 'Sal. 83:18', 'Mateo 6:9, 10',
    ])
  })

  it('crea entradas vacías con fecha de hoy en el texto diario', () => {
    const e = makeEntry('diario')
    expect(e.fields.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(e.fields.texto).toBe('')
    expect(makeEntry('reunion').fields.parrafos).toEqual([])
  })

  it('"Pegar de Claude" llena solo los campos que vienen, con alias', () => {
    const e = makeEntry('diario')
    e.fields.notas = 'mías'
    const f = fieldsFromJson('diario', { texto: 'Juan 17:3', principle: 'Conocer a Dios', 'Relato de apoyo': 'Jesús en Juan 17', resumen: 'Conocer da vida', desconocido: 'x' }, e.fields)
    expect(f).toMatchObject({ texto: 'Juan 17:3', principio: 'Conocer a Dios', relato: 'Jesús en Juan 17', resumen: 'Conocer da vida', notas: 'mías' })
  })

  it('acepta párrafos de reunión como lista', () => {
    const e = makeEntry('reunion')
    const f = fieldsFromJson('reunion', { tipo: 'Vida y Ministerio', parrafos: ['Uno', { num: 3, nota: 'Tres' }, { num: 4, nota: '' }] }, e.fields)
    expect(f.tipo).toBe('entresemana')
    expect(f.parrafos).toEqual([{ num: '1', nota: 'Uno' }, { num: '3', nota: 'Tres' }])
  })

  it('rechaza un JSON sin campos conocidos', () => {
    expect(() => fieldsFromJson('estudio', { foo: 1 }, makeEntry('estudio').fields)).toThrow(/ningún campo/)
  })

  it('propone un nodo solo con lo clave', () => {
    const e = makeEntry('diario')
    Object.assign(e.fields, {
      texto: '“Esto significa vida eterna: que lleguen a conocerte” (Juan 17:3).',
      contexto: 'Oración de Jesús la última noche.',
      principio: 'Conocer a Jehová es una necesidad, no un lujo.',
      relato: 'Como Pablo en Hechos 17:27.',
      aplicacion: 'Separar tiempo cada día para estudiar.',
      resumen: 'Conocer da vida',
      notas: 'Nota personal larga que no debe ir al mapa.',
    })
    const n = proposeNode(e)
    expect(n.title).toBe('Conocer da vida')
    expect(n.note).toContain('Separar tiempo cada día')
    expect(n.note).toContain('Principio: Conocer a Jehová')
    expect(n.note).toContain('Textos: Juan 17:3 · Hechos 17:27')
    expect(n.note).not.toContain('Nota personal')
    expect(n.note).not.toContain('Oración de Jesús')
  })

  it('cada apartado tiene formato para Claude', () => {
    for (const k of KIND_ORDER) expect(claudeFormat(k)).toContain('"')
  })
})

describe('Notas', async () => {
  const { noteBody, noteDate, KINDS, entrySortKey } = await import('./kinds.js')
  it('junta las preguntas abiertas de las reflexiones viejas en el texto', () => {
    expect(noteBody({ texto: 'Idea', preguntas: '¿Por qué?\n- ¿Cómo?' })).toBe('Idea\n\nPreguntas abiertas:\n- ¿Por qué?\n- ¿Cómo?')
    expect(noteBody({ texto: 'Solo texto' })).toBe('Solo texto')
  })
  it('fecha corta como en Notas y orden por última edición', () => {
    const now = new Date(2026, 9, 2, 18, 0)
    expect(noteDate(new Date(2026, 9, 1, 9, 0).getTime(), now)).toMatch(/^Ayer, 9:00/)
    expect(noteDate(new Date(2026, 9, 2, 9, 5).getTime(), now)).toMatch(/^Hoy, 9:05/)
    expect(noteDate(new Date(2026, 8, 28, 9, 5).getTime(), now)).toMatch(/lunes 28/)
    expect(noteDate(new Date(2026, 5, 3, 9, 5).getTime(), now)).toMatch(/^3 jun/)
    expect(noteDate(new Date(2025, 5, 3, 9, 5).getTime(), now)).toMatch(/2025/)
    expect(KINDS.reflexion.label).toBe('Notas')
    const a = { kind: 'reflexion', fields: {}, createdAt: 1, updatedAt: 500 }
    const b = { kind: 'reflexion', fields: {}, createdAt: 9, updatedAt: 100 }
    expect(entrySortKey(a) > entrySortKey(b)).toBe(true)
    expect(KINDS.reflexion.title({ fields: { titulo: '', texto: 'Primera línea\nResto' } })).toBe('Primera línea')
  })

  it('la Atalaya con el artículo pegado pasa completa al mapa', () => {
    const articulo = 'Primer párrafo largo. '.repeat(60) + '\n\nSegundo párrafo.'
    const e = { ...makeEntry('reunion'), fields: { ...makeEntry('reunion').fields, titulo: 'Ayudemos', articulo } }
    const p = proposeNode(e)
    expect(p.title).toBe('Ayudemos')
    expect(p.note).toBe(articulo.trim())
    expect(claudeFormat('reunion')).not.toContain('articulo')
  })

  it('"Copiar para Claude" junta solo los campos con contenido', () => {
    const e = makeEntry('diario')
    e.fields.fecha = '2026-10-03'
    e.fields.texto = 'No calumnia con su lengua (Sal. 15:3).'
    e.fields.aplicacion = 'Pensar en lo positivo de un hermano'
    const t = entryForClaude(e)
    expect(t).toContain('Texto:\nNo calumnia con su lengua (Sal. 15:3).')
    expect(t).toContain('Aplicación:\nPensar en lo positivo de un hermano')
    expect(t).not.toContain('Contexto')
    const r = makeEntry('reunion')
    r.fields.parrafos = [{ num: '2', nota: 'Conocimiento exacto' }, { num: '3', nota: '' }]
    expect(entryForClaude(r)).toContain('Párrafo 2: Conocimiento exacto')
    expect(entryForClaude(r)).not.toContain('Párrafo 3')
  })
})

describe('Texto diario', () => {
  it('toma solo el versículo con su cita', () => {
    expect(dailyVerse('\nNo calumnia con su lengua (Sal. 15:3).\n\nEl salmista (Sal. 15:1).')).toBe('No calumnia con su lengua (Sal. 15:3).')
  })
  it('arma el enlace al texto diario de esa fecha', () => {
    expect(dailyTextUrl('2026-10-04')).toBe('https://wol.jw.org/es/wol/dt/r4/lp-s/2026/10/4')
    expect(dailyTextAppUrl('2026-10-04')).toContain('alias=daily-text&date=20261004')
  })
})

import { dailyAnalyzed } from './kinds.js'
describe('Texto diario: ¿ya lo analizaste?', () => {
  it('solo pegar el texto no cuenta', () => {
    expect(dailyAnalyzed({ fecha: '2026-10-04', texto: 'Siempre tengo a Jehová delante de mí (Sal. 16:8).' })).toBe(false)
    expect(dailyAnalyzed({ texto: 'x', principio: 'Confiar en Jehová.' })).toBe(true)
    expect(dailyAnalyzed({ texto: 'x', resumen: '  ' })).toBe(false)
  })
})

describe('Mis asignaciones', () => {
  it('Pegar de Claude reconoce la parte por su nombre', () => {
    const f = fieldsFromJson('asignacion', { parte: 'Haga revisitas', tema: 'De casa en casa', minutos: 4 }, makeEntry('asignacion').fields)
    expect(f).toMatchObject({ parte: 'revisita', titulo: 'De casa en casa', minutos: '4' })
    expect(fieldsFromJson('asignacion', { parte: 'lectura de la biblia' }, {}).parte).toBe('lectura')
  })

  it('los minutos: los que escribiste o los de costumbre', () => {
    expect(partMinutes({ parte: 'conversacion' })).toBe(3)
    expect(partMinutes({ parte: 'lectura', minutos: '4,5' })).toBe(4.5)
    expect(clock(236)).toBe('3:56')
  })

  it('la reunión sigue reconociendo La Atalaya y entre semana', () => {
    expect(fieldsFromJson('reunion', { tipo: 'Vida y Ministerio' }, {}).tipo).toBe('entresemana')
  })
})

describe('dailyChapter', () => {
  it('da el capítulo del texto del día', async () => {
    const { dailyChapter } = await import('./kinds.js')
    expect(dailyChapter('No calumnia con su lengua (Sal. 15:3).\nComentario…')).toMatch(/^Salmo?s? 15$/)
    expect(dailyChapter('')).toBe('')
  })
})

describe('Conceptos para el mapa', async () => {
  const { titleTip, conceptReady, conceptNote, conceptIdeas, conceptRefs, entrySource } = await import('./concepts.js')
  it('pide títulos cortos y definición propia', () => {
    expect(titleTip('Valor')).toBe('')
    expect(titleTip('Jehová protege a las viudas de muchas maneras')).toMatch(/Muy largo/)
    expect(conceptReady({ titulo: 'Valor', def: '' })).toBe(false)
    expect(conceptReady({ titulo: 'Valor', def: 'Hacerlo aunque tengas miedo' })).toBe(true)
  })
  it('arma la nota con el texto y de dónde salió', () => {
    const e = { kind: 'reunion', fields: { tipo: 'entresemana', titulo: 'Jeremías 40, 41' } }
    expect(entrySource(e)).toBe('Vida y Ministerio, Jeremías 40, 41')
    expect(conceptNote({ def: 'Hacerlo aunque tengas miedo', cita: 'Éxodo 4:10.' }, entrySource(e))).toBe('Hacerlo aunque tengas miedo\n\nSe apoya en Éxodo 4:10.\n\nLo vi en: Vida y Ministerio, Jeremías 40, 41.')
  })
  it('sugiere conceptos y textos de lo que escribiste', () => {
    const e = { kind: 'diario', fields: { texto: 'No calumnia con su lengua (Sal. 15:3).', principio: 'El orgullo y la envidia dañan; el orgullo destruye.', aplicacion: 'Tener valor' } }
    expect(conceptIdeas(e)).toEqual(['Orgullo', 'Valor', 'Envidia'])
    expect(conceptIdeas(e, ['orgullo'])).toEqual(['Valor', 'Envidia'])
    expect(conceptRefs(e)).toEqual(['Sal. 15:3'])
  })
})

import { dailyMinimum, dailyPeople, dailySteps } from './kinds.js'

describe('Texto diario más fácil', () => {
  it('lo mínimo es Principio y Aplicación', () => {
    expect(dailyMinimum({ principio: 'Jehová me pide…' })).toBe(false)
    expect(dailyMinimum({ principio: 'x', aplicacion: 'Hoy voy a…' })).toBe(true)
  })
  it('si el texto ya es un relato, se salta el paso Relato', () => {
    expect(dailySteps({}).map((s) => s.key)).toContain('relato')
    expect(dailySteps({ tipo: 'relato' }).map((s) => s.key)).not.toContain('relato')
    expect(dailySteps({ tipo: 'relato', relato: 'Abrahán' }).map((s) => s.key)).toContain('relato')
  })
  it('sugiere los personajes del texto y el comentario, sin contar las citas', () => {
    expect(dailyPeople('María Magdalena fue a ver a los discípulos: "¡He visto al Señor!" (Juan 20:18).\n\nEl 16 de nisán…')).toEqual(['María Magdalena'])
    expect(dailyPeople('Toda una generación no logró distinguir que Josué y Caleb decían la verdad (Núm. 14:10).')).toEqual(expect.arrayContaining(['Josué', 'Caleb']))
    expect(dailyPeople('Lea Juan 3:16 con calma.')).toEqual([])
  })
})

import { guessDailyType } from './kinds.js'

describe('Tipo del texto diario', () => {
  it('lo adivina con los textos de octubre', () => {
    expect(guessDailyType('Acuérdense de los que los dirigen, quienes les han hablado acerca de la palabra de Dios (Heb. 13:7).')).toBe('pide')
    expect(guessDailyType('No calumnia con su lengua (Sal. 15:3).')).toBe('pide')
    expect(guessDailyType('Siempre tengo a Jehová delante de mí. Como él está a mi derecha, nada me sacudirá jamás (Sal. 16:8).')).toBe('promete')
    expect(guessDailyType('María Magdalena fue a ver a los discípulos y les dio la noticia: “¡He visto al Señor!” (Juan 20:18).')).toBe('relato')
    expect(guessDailyType('Es Jehová quien examina los corazones (Prov. 17:3).')).toBe('jehova')
    expect(guessDailyType('La Ley tiene una sombra de las cosas buenas por venir (Heb. 10:1).')).toBe(null)
  })
  it('reconoce nombres que no están en Memoria Bíblica', () => {
    expect(dailyPeople('Gómer, la esposa de Oseas, dejó al profeta por otros hombres.')).toEqual(['Gómer', 'Oseas'])
  })
})
