import { describe, expect, it } from 'vitest'
import { isRevisita, mapsUrl, revisitaInfo } from './revisitas.js'

const md = `## La persona
- **Nombre:**
- **Dirección:** calle Marie Curie, a 7 casas de la esquina con Sendero
- **Cómo es:** señor
- **Mejor día y hora:**

## Visitas
### 10 oct 2026
- **Qué usé:** folleto
- **Qué dijo:**

### 18 oct 2026 · con Juan
- **Qué usé:** el folleto otra vez
- **Qué dijo:** estaba ocupado

## Próxima visita
- [ ] Volver la otra semana
- [ ] Mostrarle el video`

const note = (titulo, texto, extra = {}) => ({ id: 'a', kind: 'reflexion', fields: { titulo, texto, ...extra } })

describe('revisitas', () => {
  it('reconoce las notas de revisita', () => {
    expect(isRevisita(note('Revisita: Irma', ''))).toBe(true)
    expect(isRevisita(note('Revisitas', ''))).toBe(false) // una lista de varias, no una persona
    expect(isRevisita(note('Mi nota', ''))).toBe(false)
    expect(isRevisita({ kind: 'diario', fields: { titulo: 'Revisita: x' } })).toBe(false)
  })

  it('saca los datos del Markdown', () => {
    const i = revisitaInfo(note('Revisita: Marie Curie (7 casas)', md))
    expect(i.name).toBe('Marie Curie (7 casas)')
    expect(i.address).toBe('calle Marie Curie, a 7 casas de la esquina con Sendero')
    expect(i.lastVisit).toBe('18 oct 2026 · con Juan')
    expect(i.said).toBe('estaba ocupado')
    expect(i.next).toEqual(['Volver la otra semana', 'Mostrarle el video'])
    expect(i.lugar).toBe(null)
  })

  it('también del texto plano que deja Notas al editar', () => {
    const plain = 'La persona\nNombre: Irma\nDirección: Helen Keller 113\nVisitas\n10 oct 2026\nQué dijo: \nPróxima visita\nVolver pronto'
    const i = revisitaInfo(note('Revisita: Irma', plain, { lugar: { lat: 20.1, lng: -100.2 } }))
    expect(i).toMatchObject({ name: 'Irma', address: 'Helen Keller 113', lastVisit: '10 oct 2026', said: '', next: ['Volver pronto'], lugar: { lat: 20.1, lng: -100.2 } })
  })

  it('con lugar válido abre Apple Maps con su pin y su nombre', () => {
    const e = note('Revisita: Irma', 'Nombre: Irma López\nDirección: Helen Keller 113', { lugar: { lat: 25.767, lng: -100.2597 } })
    expect(mapsUrl(e)).toBe('https://maps.apple.com/?ll=25.767,-100.2597&q=Irma%20L%C3%B3pez')
  })

  it('sin lugar válido no da enlace', () => {
    expect(mapsUrl(note('Revisita: Irma', 'Dirección: Helen Keller 113'))).toBe(null)
    expect(mapsUrl(note('Revisita: Irma', '', { lugar: { lat: '25.7', lng: -100.2 } }))).toBe(null)
    expect(mapsUrl(note('Revisita: Irma', '', { lugar: { lat: NaN, lng: -100.2 } }))).toBe(null)
    expect(mapsUrl(note('Revisita: Irma', '', { lugar: { lat: 125.7, lng: -100.2 } }))).toBe(null)
  })
})
