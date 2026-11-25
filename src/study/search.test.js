import { describe, it, expect } from 'vitest'
import { searchAll, snippet } from './search.js'
import { makeRutina, emptyRutina } from './rutina.js'

const nodes = [
  { id: 'v', title: 'Valor', note: 'Ebed-melec mostró **valor** al hablar con el rey. [[Jeremías 38:7-9]]', updatedAt: 1 },
  { id: 'j', title: 'Jehová', note: 'El Dios verdadero.', updatedAt: 1 },
]
const entries = [
  { id: 'a', kind: 'reunion', fields: { tipo: 'atalaya', titulo: 'Ayudemos a otros', articulo: 'Texto largo', parrafos: [{ num: '3', nota: 'Jehová quiere que tengamos valor para predicar' }], marcas: { x: 'valor' } }, updatedAt: 5 },
  { id: 'n', kind: 'reflexion', fields: { titulo: 'Mi nota', texto: 'Algo sin relación', html: '<p>valor</p>' }, updatedAt: 3 },
  { id: 'b', kind: 'biblia', fields: { cita: 'Josué 1:9', texto: 'Sé valiente y fuerte.' }, updatedAt: 2 },
  { id: 'p', kind: 'progreso', fields: { best: {} } },
]

describe('buscar en todo', () => {
  it('encuentra nodos, respuestas de reuniones y Mi Biblia, sin acentos', () => {
    const r = searchAll('VALOR', { nodes, entries })
    expect(r.map((x) => x.id)).toEqual(['v', 'a'])
    expect(r[1].snip.match).toBe('valor')
    expect(searchAll('josue', { nodes, entries })[0]).toMatchObject({ type: 'verse', id: 'b', title: 'Josué 1:9' })
    expect(searchAll('valiente', { nodes, entries }).map((x) => x.id)).toEqual(['b'])
  })

  it('todas las palabras tienen que estar', () => {
    expect(searchAll('valor rey', { nodes, entries }).map((x) => x.id)).toEqual(['v'])
    expect(searchAll('valor ballena', { nodes, entries })).toEqual([])
  })

  it('no busca con una sola letra ni en el HTML o las marcas', () => {
    expect(searchAll('v', { nodes, entries })).toEqual([])
    expect(searchAll('relacion', { nodes, entries }).map((x) => x.id)).toEqual(['n'])
  })

  it('el fragmento recorta alrededor de lo encontrado', () => {
    const s = snippet('a '.repeat(100) + 'Ebed-melec mostró valor ' + 'b '.repeat(100), ['valor'], 40)
    expect(s.match).toBe('valor')
    expect(s.before.startsWith('…')).toBe(true)
    expect(s.after.endsWith('…')).toBe(true)
  })
})

describe('Buscar en todo: la rutina bíblica', () => {
  it('encuentra una rutina por lo que dice uno de sus ganchos y la marca como Rutina', () => {
    const f = { ...emptyRutina('2026-11-25', 'Pedirle a Jehová fuerzas.'), cita: 'Salmo 83:18', tema: 'Elegidos como testigos de Jehová', recuerdo: 'Me escogió como su testigo.' }
    f.puntos[2] = { titulo: 'Defender su nombre con orgullo', ganchos: { A: 'Defender a tu mamá en la cena cuando sueltan un chisme falso sobre ella.', B: '', C: '' }, elegido: 'A' }
    const [r] = searchAll('chisme falso', { entries: [makeRutina(f)] })
    expect(r).toMatchObject({ type: 'entry', id: 'rutina-2026-11-25', sub: 'Rutina', title: 'Elegidos como testigos de Jehová' })
  })
})
