import { describe, expect, it } from 'vitest'
import { isRevisita, mapsQuery, mapsUrl, revisitaInfo } from './revisitas.js'

const md = `## La persona
- **Nombre:**
- **Dirección:** calle Marie Curie, a 7 casas de la esquina con Sendero
- **Cómo es:** señor

## Visitas
### 18 oct 2026 · con Juan
- **Qué dijo:** estaba ocupado`

const note = (titulo, texto, extra = {}) => ({ id: 'a', kind: 'reflexion', fields: { titulo, texto, ...extra } })

describe('revisitas', () => {
  it('reconoce las notas de revisita', () => {
    expect(isRevisita(note('Revisita: Irma', ''))).toBe(true)
    expect(isRevisita(note('Revisitas', ''))).toBe(false) // una lista de varias, no una persona
    expect(isRevisita(note('Mi nota', ''))).toBe(false)
    expect(isRevisita({ kind: 'diario', fields: { titulo: 'Revisita: x' } })).toBe(false)
  })

  it('saca nombre y dirección del Markdown o del texto plano', () => {
    expect(revisitaInfo(note('Revisita: Marie Curie (7 casas)', md))).toEqual({ name: 'Marie Curie (7 casas)', address: 'calle Marie Curie, a 7 casas de la esquina con Sendero', lugar: null })
    const plain = 'La persona\nNombre: Irma\nDirección: Helen Keller 113'
    expect(revisitaInfo(note('Revisita: Irma', plain))).toMatchObject({ name: 'Irma', address: 'Helen Keller 113' })
  })

  it('arma la búsqueda para Maps', () => {
    expect(mapsQuery('calle Marie Curie, a 7 casas de la esquina con Sendero')).toBe('Marie Curie y Sendero')
    expect(mapsQuery('Helen Keller 113')).toBe('Helen Keller 113')
    expect(mapsQuery('calle Armando 124')).toBe('Armando 124')
    expect(mapsQuery('')).toBe('')
  })

  it('con lugar guardado abre ese punto exacto', () => {
    const e = note('Revisita: Irma', 'Dirección: Helen Keller 113', { lugar: { lat: 25.767, lng: -100.2597 } })
    expect(mapsUrl(e)).toBe('maps://?ll=25.767,-100.2597&q=Irma')
  })

  it('sin lugar busca la dirección cerca de las demás revisitas', () => {
    const others = [note('Revisita: A', '', { lugar: { lat: 25.77, lng: -100.26 } }), note('Revisita: B', '', { lugar: { lat: 25.78, lng: -100.25 } }), note('Revisita: C', '')]
    const u = new URL(mapsUrl(note('Revisita: Marie Curie', md), others).replace('maps://', 'https://x/'))
    expect(u.searchParams.get('q')).toBe('Marie Curie y Sendero')
    expect(u.searchParams.get('sll')).toBe('25.77500,-100.25500')
    expect(mapsUrl(note('Revisita: X', 'Nombre: X'))).toBe(null)
  })
})
