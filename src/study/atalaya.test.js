import { describe, it, expect } from 'vitest'
import { parseArticle, questionNums, withAnswer, answerOf, keyPhrases, firstUnanswered, withReview, reviewAnswer, paragraphUrl } from './atalaya.js'

const ARTICULO = `La Atalaya, estudio de prueba.

"Esto significa vida eterna: que lleguen a conocerte" (JUAN 17:3).

## Tema
Cómo ayudar a otros a conocer a Jehová.

1. ¿Cómo nos sentimos al ver el progreso de un estudiante?

¿CÓMO nos sentimos? Muy felices (1 Cor. 3:5-9).

2. ¿Cuál es la voluntad de Jehová? (1 Timoteo 2:3, 4).

2 La voluntad de Jehová es que todos lleguen a tener un conocimiento exacto de la verdad.

## Enseñemos cómo es Jehová

3, 4. ¿Qué preguntas responderemos?

3 Primera parte del párrafo.

4 Segundo párrafo de la misma pregunta.

## ¿Qué responderías?
- ¿Por qué necesitan conocer bien a Jehová?
- ¿Cómo podemos enseñarles?

CANCIÓN 84 Servimos donde se nos necesite

## Notas
a Una nota al pie.`

describe('La Atalaya por pasos: leer el artículo', () => {
  const a = parseArticle(ARTICULO)

  it('encuentra el texto temático y el tema', () => {
    expect(a.tema).toContain('JUAN 17:3')
    expect(a.resumen).toBe('Cómo ayudar a otros a conocer a Jehová.')
  })

  it('separa cada pregunta con sus párrafos y quita el número del párrafo', () => {
    expect(a.bloques.map((b) => b.key)).toEqual(['1', '2', '3, 4'])
    expect(a.bloques[1].pregunta).toBe('¿Cuál es la voluntad de Jehová? (1 Timoteo 2:3, 4).')
    expect(a.bloques[1].parrafos[0]).toMatch(/^La voluntad/)
    expect(a.bloques[2].parrafos).toEqual(['Primera parte del párrafo.', 'Segundo párrafo de la misma pregunta.'])
  })

  it('el subtítulo va con la pregunta que sigue', () => {
    expect(a.subtitulos).toEqual(['Enseñemos cómo es Jehová'])
    expect(a.bloques[2].subtitulo).toBe('Enseñemos cómo es Jehová')
    expect(a.bloques[0].subtitulo).toBe('')
  })

  it('junta las preguntas de repaso y la canción, sin las notas al pie', () => {
    expect(a.repaso).toEqual(['¿Por qué necesitan conocer bien a Jehová?', '¿Cómo podemos enseñarles?'])
    expect(a.canciones).toEqual(['CANCIÓN 84 Servimos donde se nos necesite'])
    expect(JSON.stringify(a)).not.toContain('nota al pie')
  })

  it('sin preguntas, cada párrafo numerado es un paso', () => {
    const b = parseArticle('Título\n\n1 Primer párrafo.\n\n2 Segundo párrafo.')
    expect(b.bloques.map((x) => [x.key, x.parrafos[0]])).toEqual([['1', 'Primer párrafo.'], ['2', 'Segundo párrafo.']])
  })

  it('reconoce preguntas sin signo, recuadros e imágenes', () => {
    const b = parseArticle(`1. ¿Primera?

Primer párrafo.

2. Explica con un ejemplo qué hacer.

2 Segundo párrafo.

Una hermana escucha a su estudiante.

## Preguntas de ejemplo
El libro trae preguntas:
- Una
- Dos

## Otro subtítulo

3, 4. a) ¿Qué? b) ¿Cómo?

3 Tercero.`)
    expect(b.bloques.map((x) => x.key)).toEqual(['1', '2', '3, 4'])
    expect(b.bloques[1].pregunta).toBe('Explica con un ejemplo qué hacer.')
    expect(b.bloques[1].parrafos).toEqual(['Segundo párrafo.'])
    expect(b.bloques[1].extras).toEqual(['Una hermana escucha a su estudiante.', 'Preguntas de ejemplo: El libro trae preguntas:\n- Una\n- Dos'])
    expect(b.subtitulos).toEqual(['Otro subtítulo'])
    expect(b.bloques[2].subtitulo).toBe('Otro subtítulo')
  })

  it('lee los números de las preguntas', () => {
    expect(questionNums('4, 5')).toEqual([4, 5])
    expect(questionNums('6-8')).toEqual([6, 7, 8])
    expect(questionNums('9 y 10')).toEqual([9, 10])
  })
})

describe('La Atalaya por pasos: respuestas', () => {
  it('guarda la respuesta de cada pregunta en parrafos (como antes) y sigue en la primera sin responder', () => {
    const { bloques } = parseArticle(ARTICULO)
    let f = { parrafos: [] }
    f = withAnswer(f, '1', 'Felices')
    f = withAnswer(f, '1', 'Muy felices')
    expect(f.parrafos).toEqual([{ num: '1', nota: 'Muy felices' }])
    expect(answerOf(f, '1')).toBe('Muy felices')
    expect(firstUnanswered(bloques, f)).toBe(1)
  })

  it('guarda las respuestas del repaso', () => {
    const f = withReview({}, '¿Cómo podemos enseñarles?', 'Con preguntas')
    expect(reviewAnswer(f, '¿Cómo podemos enseñarles?')).toBe('Con preguntas')
  })

  it('junta las palabras clave marcadas que van seguidas', () => {
    const b = { parrafos: ['Un conocimiento exacto de la verdad.'] }
    expect(keyPhrases(b, [1, 2, 5])).toEqual(['conocimiento exacto', 'verdad'])
  })
})

describe('La Atalaya por pasos: enlace al párrafo', () => {
  const p = 'La voluntad de Jehová "es que toda clase de personas se salven'
  it('con el enlace del artículo salta al párrafo', () => {
    expect(paragraphUrl('https://wol.jw.org/es/wol/d/r4/lp-s/2026600#h=1', p))
      .toBe('https://wol.jw.org/es/wol/d/r4/lp-s/2026600#:~:text=' + encodeURIComponent('La voluntad de Jehová es que'))
  })
  it('sin enlace busca el párrafo en wol.jw.org', () => {
    expect(paragraphUrl('', p)).toBe('https://wol.jw.org/es/wol/s/r4/lp-s?q=' + encodeURIComponent('"La voluntad de Jehová es que"') + '&p=par')
    expect(paragraphUrl('no es enlace', p)).toContain('wol.jw.org/es/wol/s/')
  })
})
