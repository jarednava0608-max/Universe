import { describe, it, expect } from 'vitest'
import { entryForClaude, makeEntry, fieldsFromJson, proposeNode, refsIn, claudeFormat, KIND_ORDER, dailyVerse, dailyTextUrl, dailyTextAppUrl } from './kinds.js'

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
