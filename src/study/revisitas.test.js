import { describe, expect, it } from 'vitest'
import { geocodeUrl, isRevisita, revisitaInfo, searchText } from './revisitas.js'

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

  it('limpia la dirección para buscarla', () => {
    expect(searchText('calle Marie Curie, a 7 casas de la esquina con Sendero')).toBe('calle Marie Curie')
    expect(searchText('número 108, entre Marie Curie y Edison')).toBe('108')
    expect(searchText('Helen Keller 113')).toBe('Helen Keller 113')
  })

  it('busca cerca de las revisitas ya puestas', () => {
    const u = new URL(geocodeUrl('Helen Keller 113', [{ lat: 20, lng: -100 }]))
    expect(u.searchParams.get('q')).toBe('Helen Keller 113')
    expect(u.searchParams.get('viewbox')).toBe('-100.1,20.1,-99.9,19.9')
  })
})
