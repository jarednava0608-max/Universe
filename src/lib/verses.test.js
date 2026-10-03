import { describe, it, expect } from 'vitest'
import { refKey, findSavedVerse, jwLibraryUrl, makeBibleEntry, splitChapter } from './verses.js'
import { wrongThirdJohn } from './verseSave.js'

describe('Mi Biblia', () => {
  it('compara citas escritas de formas distintas', () => {
    expect(refKey('Sal. 83:18')).toBe(refKey('Salmo 83:18'))
    expect(refKey('Mateo 6:9, 10')).toBe('40:6:9,10')
    expect(refKey('Jeremías 38')).toBe('24:38')
    expect(refKey('Libro raro 1:1')).toBe(null)
  })
  it('busca primero en Mi Biblia y luego en Memorizar y el diario', () => {
    const entries = [
      { id: 'm', kind: 'memoria', fields: { cita: 'Juan 17:3', texto: 'Desde memorizar' } },
      { id: 'd', kind: 'diario', fields: { texto: 'Dios es amor. (1 Juan 4:8)' } },
    ]
    expect(findSavedVerse(entries, 'Juan 17:3')).toMatchObject({ texto: 'Desde memorizar', source: 'memoria' })
    expect(findSavedVerse(entries, '1 Jn 4:8')).toMatchObject({ texto: 'Dios es amor.', source: 'diario' })
    entries.push(makeBibleEntry('Jn 17:3', 'Desde mi Biblia'))
    expect(findSavedVerse(entries, 'Juan 17:3')).toMatchObject({ texto: 'Desde mi Biblia', source: 'biblia' })
    expect(findSavedVerse(entries, 'Juan 3:16')).toBe(null)
  })
  it('arma el enlace para JW Library', () => {
    expect(jwLibraryUrl('Juan 17:3')).toContain('bible=43017003&pub=nwtsty')
    expect(jwLibraryUrl('Mateo 6:9, 10')).toContain('bible=40006009-40006010')
    expect(jwLibraryUrl('Génesis 1:1')).toContain('bible=01001001')
  })
})

describe('Mi Biblia: rangos y capítulos con versículos guardados', () => {
  const e = (cita, texto) => makeBibleEntry(cita, texto)
  const entries = [e('Jeremías 38:7', 'Siete.'), e('Jeremías 38:8', 'Ocho.'), e('Jeremías 38:9', 'Nueve.'), e('Jer. 39:1', 'Uno.')]
  it('arma un rango con los versículos sueltos', () => {
    expect(findSavedVerse(entries, 'Jeremías 38:7-9').texto).toBe('7 Siete.\n8 Ocho.\n9 Nueve.')
    expect(findSavedVerse(entries, 'Jeremías 38:7, 8').texto).toBe('7 Siete.\n8 Ocho.')
    expect(findSavedVerse(entries, 'Jeremías 38:7-10')).toBe(null) // falta el 10
    expect(findSavedVerse(entries, 'Jeremías 38:8').texto).toBe('Ocho.')
  })
  it('arma el capítulo entero con lo que haya guardado', () => {
    expect(findSavedVerse(entries, 'Jeremías 38')).toMatchObject({ texto: '7 Siete.\n8 Ocho.\n9 Nueve.', source: 'capitulo' })
    expect(findSavedVerse(entries, 'Jeremías 40')).toBe(null)
  })
})

describe('cleanVerseText', () => {
  it('quita las marcas + y * de las notas al pie y los espacios que dejan', async () => {
    const { cleanVerseText } = await import('./verses.js')
    expect(cleanVerseText('  Esto es lo que dice Jehová+: “El que se quede*  en esta ciudad + morirá +.”  ')).toBe('Esto es lo que dice Jehová: “El que se quede en esta ciudad morirá.”')
    expect(cleanVerseText('Uno+\n\nDos *')).toBe('Uno\n\nDos')
  })
  it('separa un capítulo pegado de JW Library en versículos', () => {
    const text = `Daniel
2 En el segundo año de su reinado, Nabucodonosor tuvo varios sueños, y él* se inquietó tanto+ que no conseguía dormir. 2 Así que el rey mandó llamar a los caldeos.+ 3 El rey les dijo: “He tenido un sueño”.
4 Daniel dijo:
“Alabado sea el nombre de Dios,*
porque solo de él son la sabiduría y el poder.+
5 Estos son tu sueño y las visiones:
6 ”Oh, rey, cuando estabas acostado en tu cama.`
    const v = splitChapter(text, 2)
    expect(v.map((x) => x.v)).toEqual([1, 2, 3, 4, 5, 6])
    expect(v[0].texto).toBe('En el segundo año de su reinado, Nabucodonosor tuvo varios sueños, y él se inquietó tanto que no conseguía dormir.')
    expect(v[3].texto).toBe('Daniel dijo: “Alabado sea el nombre de Dios, porque solo de él son la sabiduría y el poder.')
    expect(v[5].texto).toBe('”Oh, rey, cuando estabas acostado en tu cama.')
    expect(splitChapter('Solo un versículo sin números.', 2)).toBe(null)
    const entries = v.map(({ v, texto }) => makeBibleEntry(`Daniel 2:${v}`, texto))
    expect(findSavedVerse(entries, 'Daniel 2:1-3').texto.split('\n')).toHaveLength(3)
  })
  it('3 Juan 3 se guarda como versículo y se borra el texto equivocado', () => {
    expect(refKey('3 Juan 3')).toBe(refKey('3 Juan 1:3'))
    expect(findSavedVerse([makeBibleEntry('3 Juan 1:3', 'Me alegré mucho')], '3 Juan 3')).toMatchObject({ texto: 'Me alegré mucho' })
    const bad = makeBibleEntry('3 Juan 3', '¿Qué es Apolos? ¿Qué es Pablo?+')
    const good = makeBibleEntry('1 Corintios 3:5', '¿Qué es Apolos?')
    const nodes = [{ id: 'n1', title: '3 Juan 3', note: 'Qué es Apolos?' }, { id: 'n2', title: 'Apolos', note: 'Apolos' }]
    expect(wrongThirdJohn(nodes, [bad, good])).toEqual({ entryIds: [bad.id], nodeIds: ['n1'] })
  })
})
