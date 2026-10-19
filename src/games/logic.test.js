import { describe, it, expect } from 'vitest'
import { verseSources, parseVerses } from './logic.js'

describe('Juegos', () => {
  it('toma textos del Texto diario separando la cita', () => {
    const entries = [{ id: 'd1', kind: 'diario', fields: { texto: '“Dios es amor” (1 Juan 4:8).' } }]
    const [v] = verseSources(entries)
    expect(v.fields).toMatchObject({ cita: '1 Juan 4:8', texto: '“Dios es amor”' })
    expect(parseVerses({ textos: [{ cita: 'Juan 17:3', texto: 'Vida eterna' }] })).toEqual([{ cita: 'Juan 17:3', texto: 'Vida eterna' }])
  })
})
