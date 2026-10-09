import { describe, it, expect } from 'vitest'
import { parseProgram, programTitle, withAnswer, midweekCount, midweekForClaude, partDone, meetingsUrl, programMonday, programDate, splitAsides, splitRefs, readingChapters, keysOf, midweekAnswers, meetingItems, studyChapter } from './midweek.js'
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
    expect(qs(0)).toEqual(['¿Cómo nos protege Je'])
    expect(prog.partes[0].lineas.find((l) => l.q).meditar).toBe(true)
    expect(prog.partes.map((p) => p.sec)).toEqual(['tesoros', 'tesoros', 'tesoros', 'maestros', 'vida', 'vida'])
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

  it('el enlace a la semana en wol.jw.org usa el número de semana', () => {
    expect(meetingsUrl('2026-10-05')).toBe('https://wol.jw.org/es/wol/meetings/r4/lp-s/2026/41')
    expect(meetingsUrl('2026-10-11')).toBe('https://wol.jw.org/es/wol/meetings/r4/lp-s/2026/41')
    expect(meetingsUrl('2026-10-12')).toBe('https://wol.jw.org/es/wol/meetings/r4/lp-s/2026/42')
    expect(meetingsUrl('2027-01-01')).toBe('https://wol.jw.org/es/wol/meetings/r4/lp-s/2026/53')
    expect(meetingsUrl('')).toBe('https://wol.jw.org/es/wol/h/r4/lp-s')
  })

  it('la fecha de la reunión sale de la semana del programa y del día de la reunión', () => {
    expect(programMonday('5-11 de octubre', '2026-10-05')).toBe('2026-10-05')
    expect(programDate('5-11 de octubre', 3, '2026-10-05')).toBe('2026-10-07') // miércoles
    expect(programDate('5-11 de octubre', 4, '2026-10-05')).toBe('2026-10-08') // jueves
    // Semana que empieza en un mes y termina en otro.
    expect(programDate('28 de septiembre a 4 de octubre', 3, '2026-10-01')).toBe('2026-09-30')
    // Cambio de año: el más cercano a la fecha de la entrada.
    expect(programMonday('29 de diciembre a 4 de enero', '2026-01-02')).toBe('2025-12-29')
    expect(programMonday('29 de diciembre a 4 de enero', '2025-12-20')).toBe('2025-12-29')
    // Sin día de reunión o sin semana no adivina.
    expect(programDate('5-11 de octubre', null, '2026-10-05')).toBe(null)
    expect(programDate('', 3, '2026-10-05')).toBe(null)
  })

  it('separa lo que va entre paréntesis y las citas tocables', () => {
    expect(splitAsides('Jehová protegió a Jeremías (Jer 40:2-4; jr 189 párr. 16).')).toEqual([
      { text: 'Jehová protegió a Jeremías ' },
      { text: '(Jer 40:2-4; jr 189 párr. 16)', aside: true },
      { text: '.' },
    ])
    expect(splitAsides('Sin citas')).toEqual([{ text: 'Sin citas' }])
    expect(splitRefs('(Pr 4:5, 6; 1Te 5:14)', ['Pr 4:5, 6', '1Te 5:14'])).toEqual([
      { text: '(' }, { text: 'Pr 4:5, 6', ref: true }, { text: '; ' }, { text: '1Te 5:14', ref: true }, { text: ')' },
    ])
  })

  it('la lectura de la semana, capítulo por capítulo', () => {
    expect(readingChapters('Jeremías 40, 41')).toEqual(['Jeremías 40', 'Jeremías 41'])
    expect(readingChapters('Jeremías 42-44')).toEqual(['Jeremías 42', 'Jeremías 43', 'Jeremías 44'])
    expect(readingChapters('1 Reyes 3')).toEqual(['1 Reyes 3'])
    expect(readingChapters('')).toEqual([])
  })

  it('el estudio bíblico se contesta por párrafo si pegas el capítulo', () => {
    const estudio = parseProgram(PROGRAMA).partes.at(-1)
    let f = { tipo: 'entresemana', programa: PROGRAMA }
    expect(keysOf(f, estudio)).toEqual(['6'])
    f = { ...f, estudio: '1. ¿Qué aprendemos?\n\n1 Mucho.\n\n2, 3. ¿Y luego?\n\n2 Más.\n\n3 Todavía más.' }
    expect(keysOf(f, estudio)).toEqual(['e:1', 'e:2, 3'])
    expect(midweekCount(f)).toEqual({ done: 0, total: 6 })
    f = withAnswer(f, 'e:1', 'Que Jehová nos cuida.')
    expect(midweekCount(f).done).toBe(1)
    expect(midweekAnswers(f).at(-1).rows).toEqual([{ key: 'e:1', pregunta: '¿Qué aprendemos?', respuesta: 'Que Jehová nos cuida.' }])
    expect(midweekForClaude(f)).toContain('6. Estudio bíblico de la congregación\n¿Qué aprendemos?\nQue Jehová nos cuida.')
  })

  it('el estudio bíblico de un libro de relatos: el relato, la lectura y las preguntas por sección', () => {
    const cap = ['11 MOISÉS', '“Preséntate ante el faraón”', 'MOISÉS había cambiado por completo.', '', 'Moisés y Aarón ante el faraón.',
      'Lea el relato bíblico', 'Éxodo 2:15-5:23', '¿Qué diría?', '¿De qué maneras demostró valor Moisés?', '', 'Respuesta',
      'Investigue un poco más', '1. ¿Qué razones tenemos para creer en este relato? (g04 8/4 7-9).', '', 'Respuesta',
      '2. ¿Por qué la gente le tenía miedo al faraón? (w14 15/4 8 párr. 1). A', '', 'Respuesta', '', 'PRISMA ARCHIVO/Alamy Stock Photo', '',
      'Imagen A: Antiguo relieve de un faraón.', 'Piense en las lecciones', 'Igual que Aarón ayudó a Moisés, ¿cómo ayudamos a otros? (Éx. 4:14-16). C', '', 'Respuesta',
      'Imagen C', '¿Cómo puede imitar su valor?', '', 'Respuesta', 'Para saber más', '¿Qué aprendió Moisés sobre Jehová?'].join('\n')
    const ch = studyChapter({ estudio: cap })
    expect(ch.titulo).toBe('11. Moisés')
    expect(ch.tema).toBe('“Preséntate ante el faraón”')
    expect(ch.relato).toHaveLength(2)
    expect(ch.lectura).toEqual(['Éxodo 2:15-5:23'])
    expect(ch.bloques.map((b) => [b.label, b.pregunta])).toEqual([
      ['¿Qué diría?', '¿De qué maneras demostró valor Moisés?'],
      ['Investigue un poco más · 1', '¿Qué razones tenemos para creer en este relato? (g04 8/4 7-9).'],
      ['Investigue un poco más · 2', '¿Por qué la gente le tenía miedo al faraón? (w14 15/4 8 párr. 1).'],
      ['Piense en las lecciones · 1', 'Igual que Aarón ayudó a Moisés, ¿cómo ayudamos a otros? (Éx. 4:14-16).'],
      ['Piense en las lecciones · 2', '¿Cómo puede imitar su valor?'],
    ])
    const estudio = parseProgram(PROGRAMA).partes.at(-1)
    expect(keysOf({ programa: PROGRAMA, estudio: cap }, estudio)).toEqual(['e:c1', 'e:c2', 'e:c3', 'e:c4', 'e:c5'])
  })

  it('modo reunión: las preguntas en orden con tu respuesta', () => {
    let f = { programa: PROGRAMA }
    f = withAnswer(f, '1-0', 'Mediante la congregación.')
    f = withAnswer(f, '3', 'Leer despacio.')
    const items = meetingItems(f)
    expect(items.map((x) => x.label)).toEqual(['Parte 1', 'Parte 2', 'Parte 2', 'Parte 3', 'Parte 5'])
    expect(items[0]).toMatchObject({ section: 'Tesoros de la Biblia', sec: 'tesoros', question: 'Para meditar: ¿Cómo nos protege Jehová a cada uno de nosotros hoy en día? (Pr 4:5, 6; 1Te 5:14).', answer: 'Mediante la congregación.' })
    expect(items[3]).toMatchObject({ question: 'Lectura de la Biblia', answer: 'Leer despacio.' })
  })

  it('un texto sin programa no da partes', () => {
    expect(parseProgram('hola').partes).toEqual([])
    expect(parseProgram('').semana).toBe('')
  })
})

describe('horario de la reunión de entre semana', () => {
  it('calcula a qué hora empieza y acaba cada parte', async () => {
    const { partTimes } = await import('./midweek.js')
    const t = partTimes(parseProgram(PROGRAMA).partes, '19:30')
    expect(t[1]).toEqual({ inicio: '7:35', fin: '7:45' })
    expect(t[2]).toEqual({ inicio: '7:45', fin: '7:55' })
    expect(t[3]).toEqual({ inicio: '7:55', fin: '7:59' })
    expect(t[4]).toEqual({ inicio: '8:00', fin: '8:02' })
    expect(t[5]).toEqual({ inicio: '8:07', fin: '8:22' })
    expect(t[6]).toEqual({ inicio: '8:22', fin: '8:52' })
    expect(t.conclusion).toEqual({ inicio: '8:52', fin: '8:55' })
    expect(t.termina).toBe('8:59')
  })
})

describe('horario de una semana completa', () => {
  it('cabe en 1 h 45 min, como la reunión de 7:30 a 9:15', async () => {
    const { partTimes } = await import('./midweek.js')
    const p = (num, sec, minutos, titulo = 'Parte', lineas = []) => ({ num, sec, minutos, titulo, lineas })
    const partes = [
      p(1, 'tesoros', 10), p(2, 'tesoros', 10, 'Busquemos perlas escondidas'), p(3, 'tesoros', 4, 'Lectura de la Biblia'),
      p(4, 'maestros', 3), p(5, 'maestros', 4), p(6, 'maestros', 5),
      p(7, 'vida', 15), p(8, 'vida', 30, 'Estudio bíblico de la congregación'),
    ]
    const t = partTimes(partes, '19:30')
    expect(t[2]).toEqual({ inicio: '7:45', fin: '7:55' })
    expect(t[4].inicio).toBe('8:00')
    expect(t[7]).toEqual({ inicio: '8:19', fin: '8:34' })
    expect(t.conclusion).toEqual({ inicio: '9:04', fin: '9:07' })
    expect(t.termina).toBe('9:11')
    // Una parte de maestros con video la lleva un anciano: sin consejo.
    const video = partTimes([p(4, 'maestros', 5, 'Parte', [{ text: 'Ponga el VIDEO.' }]), p(5, 'maestros', 3)])
    expect(video[5].inicio).toBe('7:40')
  })
})

describe('asignaciones de la congregación', () => {
  // Nombres inventados: los reales solo viven en la nube privada del usuario.
  const ASIG = {
    id: 'asig-2026-10-08', kind: 'asignaciones',
    fields: {
      fecha: '2026-10-08', presidente: 'Ana Presidenta', oracion: 'Beto Oración',
      filas: [
        { sec: 'tesoros', min: 10, titulo: 'Tengamos un punto de vista equilibrado de la protección de Jehová', nombres: ['Carlos Uno'] },
        { sec: 'tesoros', min: 10, titulo: 'Busquemos perlas escondidas (Jeremías 40-41)', nombres: ['Dani Dos'] },
        { sec: 'tesoros', min: 4, titulo: 'Lectura de la Biblia (Jer 40:1-10)', nombres: ['Eli Tres'] },
        { sec: 'maestros', min: 2, titulo: 'Empiece conversaciones: De casa en casa', nombres: ['Fer Cuatro', 'Gabi Cinco'] },
        { sec: 'vida', min: 15, titulo: 'Jehová protege a las viudas', nombres: ['Hugo Seis'] },
        { sec: 'vida', min: 15, titulo: 'El informe 6 del Cuerpo Gobernante del año 2026', nombres: ['Ana Presidenta'] },
        { sec: 'vida', min: 15, titulo: 'Estudio bíblico de la congregación', nombres: ['Iván Siete'] },
      ],
      salaB: { consejero: 'Juan Ocho', filas: [
        { sec: 'tesoros', min: 4, titulo: 'Lectura de la Biblia', nombres: ['Kike Nueve'] },
        { sec: 'maestros', min: 2, titulo: 'Empiece conversaciones', nombres: ['Lalo Diez', 'Memo Once'] },
      ] },
    },
  }

  it('encuentra la de la semana, aunque la fecha sea otro día', async () => {
    const { weekSchedule } = await import('./midweek.js')
    expect(weekSchedule([ASIG], '2026-10-08').presidente).toBe('Ana Presidenta')
    expect(weekSchedule([ASIG], '2026-10-06').presidente).toBe('Ana Presidenta')
    expect(weekSchedule([ASIG], '2026-10-15')).toBe(null)
  })

  it('pone los nombres en cada parte y usa los minutos de la congregación', async () => {
    const { outline } = await import('./midweek.js')
    const { sections, times } = outline(parseProgram(PROGRAMA).partes, ASIG.fields, '19:30')
    const rows = sections.flatMap(([, , l]) => l)
    const byNum = (n) => rows.find((r) => r.part?.num === n)
    expect(byNum(2).nombres).toEqual(['Dani Dos'])
    expect(byNum(3).salaB).toEqual(['Kike Nueve'])
    expect(byNum(4).nombres).toEqual(['Fer Cuatro', 'Gabi Cinco'])
    expect(byNum(4).salaB).toEqual(['Lalo Diez', 'Memo Once'])
    // El informe no está en el programa: sale como fila aparte, entre las dos partes.
    const vida = sections.find(([, sec]) => sec === 'vida')[2]
    expect(vida.map((r) => r.part?.num ?? r.titulo)).toEqual([5, 'El informe 6 del Cuerpo Gobernante del año 2026', 6])
    // Esa semana el estudio dura 15 min (no 30).
    expect(times[2]).toEqual({ inicio: '7:45', fin: '7:55' })
    expect(times[5]).toEqual({ inicio: '8:07', fin: '8:22' })
    expect(times.x5).toEqual({ inicio: '8:22', fin: '8:37' })
    expect(times[6]).toEqual({ inicio: '8:37', fin: '8:52' })
  })

  it('sin asignaciones queda como antes', async () => {
    const { outline } = await import('./midweek.js')
    const { sections, times } = outline(parseProgram(PROGRAMA).partes, null, '19:30')
    expect(sections.flatMap(([, , l]) => l).every((r) => r.nombres.length === 0)).toBe(true)
    expect(times[2]).toEqual({ inicio: '7:45', fin: '7:55' })
  })
})
