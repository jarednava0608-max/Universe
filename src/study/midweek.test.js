import { describe, it, expect } from 'vitest'
import { parseProgram, programTitle, withAnswer, midweekCount, midweekForClaude, partDone } from './midweek.js'
import { entryForClaude, proposeNode } from './kinds.js'

// Tal como se copia de la Guía de actividades en JW Library (5-11 de octubre de 2026, recortado).
const PROGRAMA = `00
5-11 DE OCTUBRE
JEREMÍAS 40, 41
Canción 33 y oración | Palabras de introducción (1 min.)
TESOROS DE LA BIBLIA
1. Tengamos un punto de vista equilibrado de la protección de Jehová
(10 mins.)
Jehová protegió a Jeremías (Jer 40:2-4; jr 189 párr. 16).

PARA MEDITAR: ¿Cómo nos protege Jehová a cada uno de nosotros hoy en día? (Pr 4:5, 6; 1Te 5:14).

En los momentos difíciles, Jehová nos protege mediante la congregación.
2. Busquemos perlas escondidas
(10 mins.)
Jer 40:12. ¿Cómo demuestra este versículo que Jehová le dio a su pueblo la buena tierra descrita en Deuteronomio 8:6-8? (w06 15/6 16 párr. 4).

Respuesta
¿Qué perlas espirituales ha encontrado en la lectura bíblica de esta semana?

Respuesta
3. Lectura de la Biblia
(4 mins.) Jer 40:1-10 (th lección 2).
SEAMOS MEJORES MAESTROS
4. Empiece conversaciones
(2 mins.) DE CASA EN CASA. (lmd lección 2 punto 3).
NUESTRA VIDA CRISTIANA
Canción 17
5. Jehová protege a las viudas
(15 mins.) Análisis con el auditorio.
El rey David dijo que Jehová es “protector de viudas” (Sl 68:5).

¿Cómo podemos honrar a las viudas hoy en día?

Respuesta
6. Estudio bíblico de la congregación
(30 mins.) wcg cap. 11.
Palabras de conclusión (3 mins.) | Canción 38 y oración`

describe('reunión de entre semana', () => {
  const prog = parseProgram(PROGRAMA)

  it('lee la semana, la lectura y cada parte con su sección y minutos', () => {
    expect(prog.semana).toBe('5-11 de octubre')
    expect(prog.lectura).toBe('Jeremías 40, 41')
    expect(programTitle(prog)).toBe('Jeremías 40, 41')
    expect(prog.partes.map((p) => [p.num, p.seccion, p.minutos])).toEqual([
      [1, 'Tesoros de la Biblia', 10],
      [2, 'Tesoros de la Biblia', 10],
      [3, 'Tesoros de la Biblia', 4],
      [4, 'Seamos mejores maestros', 2],
      [5, 'Nuestra vida cristiana', 15],
      [6, 'Nuestra vida cristiana', 30],
    ])
    expect(prog.partes[0].titulo).toBe('Tengamos un punto de vista equilibrado de la protección de Jehová')
  })

  it('las preguntas son los renglones antes de "Respuesta" y PARA MEDITAR', () => {
    const qs = (n) => prog.partes[n].lineas.filter((l) => l.q).map((l) => l.text.slice(0, 20))
    expect(qs(0)).toEqual(['PARA MEDITAR: ¿Cómo '])
    expect(qs(1)).toEqual(['Jer 40:12. ¿Cómo dem', '¿Qué perlas espiritu'])
    expect(qs(4)).toEqual(['¿Cómo podemos honrar'])
    expect(prog.partes[1].keys).toEqual(['2-0', '2-1'])
    // Sin preguntas: la parte tiene sus notas.
    expect(prog.partes[2].keys).toEqual(['3'])
    expect(prog.partes[2].lineas).toEqual([{ text: 'Jer 40:1-10 (th lección 2).' }])
    // Las canciones no quedan como texto.
    expect(prog.partes[4].lineas.some((l) => /Canción/.test(l.text))).toBe(false)
  })

  it('cuenta las respuestas y las copia para Claude', () => {
    let f = { tipo: 'entresemana', fecha: '2026-10-07', programa: PROGRAMA }
    expect(midweekCount(f)).toEqual({ done: 0, total: 4 })
    f = withAnswer(f, '2-1', 'Que Jehová cumple lo que promete.')
    f = withAnswer(f, '3', 'Leer despacio.')
    expect(midweekCount(f)).toEqual({ done: 1, total: 4 })
    expect(partDone(f, parseProgram(f.programa).partes[2])).toBe(true)
    const text = midweekForClaude(f)
    expect(text).toContain('2. Busquemos perlas escondidas\n¿Qué perlas espirituales')
    expect(text).toContain('Que Jehová cumple lo que promete.')
    expect(text).toContain('3. Lectura de la Biblia\nLeer despacio.')
    expect(entryForClaude({ kind: 'reunion', fields: f })).toContain('Mis respuestas:\n2. Busquemos perlas escondidas')
  })

  it('propone al mapa solo lo que contesté, con la semana como título', () => {
    let f = { tipo: 'entresemana', fecha: '2026-10-07', programa: PROGRAMA, aplicacion: 'Apoyar a las viudas de mi congregación.' }
    f = withAnswer(f, '2-1', 'Que Jehová cumple lo que promete.')
    const node = proposeNode({ kind: 'reunion', fields: f })
    expect(node.title).toBe('Vida y Ministerio, 5-11 de octubre de 2026')
    expect(node.note).toBe([
      'Lectura de la semana: Jeremías 40, 41',
      '## Busquemos perlas escondidas\n¿Qué perlas espirituales ha encontrado en la lectura bíblica de esta semana?\nQue Jehová cumple lo que promete.',
      '## Cómo lo aplico\nApoyar a las viudas de mi congregación.',
    ].join('\n\n'))
  })

  it('un texto sin programa no da partes', () => {
    expect(parseProgram('hola').partes).toEqual([])
    expect(parseProgram('').semana).toBe('')
  })
})
