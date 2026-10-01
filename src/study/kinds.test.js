import { describe, it, expect } from 'vitest'
import { makeEntry, fieldsFromJson, proposeNode, refsIn, claudeFormat, KIND_ORDER } from './kinds.js'

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
