import { describe, expect, it } from 'vitest'
import { versePairs } from './verse-pairs.js'

const v = (id, cita, texto) => ({ id, fields: { cita, texto } })
const list = [
  v('a', 'Juan 17:3', 'Esto significa vida eterna: que lleguen a conocerte a ti, el único Dios verdadero, y a Jesucristo'),
  v('b', 'Salmo 83:18', 'Para que la gente sepa que tú, cuyo nombre es Jehová, tú solo eres el Altísimo'),
  v('c', 'Mateo 6:33', 'Sigan, pues, buscando primero el Reino'),
  v('d', 'juan 17:3', 'repetida'),
  v('e', 'Proverbios 3:5', 'Confía en Jehová con todo tu corazón'),
  v('f', 'Sin texto', '  '),
]

describe('versePairs', () => {
  it('une cita con inicio del texto, sin repetidas', () => {
    const p = versePairs(list, () => 0.3, 4)
    expect(p.left).toHaveLength(4)
    expect(new Set(p.left.map((x) => x.text)).size).toBe(4)
    expect(p.right.map((x) => x.id).sort()).toEqual(p.left.map((x) => x.id).sort())
    const a = p.right.find((x) => x.id === 'a')
    expect(a.text).toBe('Esto significa vida eterna: que lleguen a conocerte a ti,…')
    expect(a.text).not.toContain('Juan')
  })
  it('null con menos de 3', () => {
    expect(versePairs(list.slice(0, 2))).toBeNull()
    expect(versePairs([list[0], list[3], list[5]])).toBeNull()
  })
})
