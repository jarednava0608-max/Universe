import { describe, it, expect, afterEach } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { parseGuia, readGuiaEpub, toProgram, guiaFor, guiaRange, _setGuia } from './guia.js'
import { parseProgram, midweekCount } from '../study/midweek.js'

// Una semana como viene en el EPUB de jw.org (texto inventado para la prueba).
const week = (dias, lectura, cancion = 21) => `<html><head><title>${dias}</title></head><body>
<header><h1><span class="pageNum" data-no="14"></span>${dias.toUpperCase()}</h1>
<h2><strong><a epub:type="noteref" href="#citation1">${lectura}</a></strong></h2></header>
<div class="bodyTxt">
<h3><a href="x-extracted.xhtml"><strong>Canción ${cancion}</strong></a> <strong>y oración | Palabras de introducción</strong> <span>(1 min.)</span></h3>
<h2>TESOROS DE LA BIBLIA</h2>
<h3><strong>1. Una parte de prueba</strong></h3>
<p>(10 mins.)</p>
<ul><li><p>Baruc no estaba contento (Jer 45:3).</p></li></ul>
<figure><img src="a.jpg" alt="Foto"/><figcaption><p>Pie de foto.</p></figcaption></figure>
<h3><strong>2. Busquemos perlas escondidas</strong></h3>
<p>(10 mins.)</p>
<p>Jer 46:22. ¿Por qué dice esto?</p>
<div class="gen-field"><label class="dc-screenReaderText">Respuesta</label><textarea></textarea></div>
<h3><strong>3. Lectura de la Biblia</strong></h3>
<p>(4 mins.) Jer 46:13-24 (th lección 10).</p>
<h2>SEAMOS MEJORES MAESTROS</h2>
<h3><strong>4. Empiece conversaciones</strong></h3>
<p>(3 mins.) PREDICACIÓN INFORMAL.</p>
<h2>NUESTRA VIDA CRISTIANA</h2>
<h3><strong>Canción 117</strong></h3>
<h3><strong>5. Estudio bíblico de la congregación</strong></h3>
<p>(30 mins.) wcg cap. 13.</p>
<h3><strong>Palabras de conclusión</strong> (3 mins.) | <strong>Canción 87 y oración</strong></h3>
</div>
<div class="groupExt"><aside epub:type="footnote"><p>^ (Jer. 45:1-5) Texto de la Biblia que no va.</p></aside></div>
</body></html>`
const INTRO = '<html><body><h1>Guía de actividades para la reunión Vida y Ministerio Cristianos</h1><p>Contenido</p></body></html>'
const OPF = '<package><metadata><dc:title>Guía de actividades, septiembre y octubre de 2026</dc:title></metadata></package>'

afterEach(() => _setGuia(null))

describe('toProgram', () => {
  it('deja el programa como se copia de JW Library, sin los textos del final', () => {
    const t = toProgram(week('19-25 de octubre', 'JEREMÍAS 45, 46'))
    const lines = t.split('\n')
    expect(lines.slice(0, 3)).toEqual(['19-25 DE OCTUBRE', 'JEREMÍAS 45, 46', 'Canción 21 y oración | Palabras de introducción (1 min.)'])
    expect(lines).toContain('Respuesta')
    expect(t).not.toMatch(/no va|Pie de foto/)
  })

  it('se lee igual que el programa pegado: partes, minutos y preguntas', () => {
    const t = toProgram(week('19-25 de octubre', 'JEREMÍAS 45, 46'))
    const p = parseProgram(t)
    expect(p.semana).toBe('19-25 de octubre')
    expect(p.partes.map((x) => [x.num, x.titulo, x.sec, x.minutos])).toEqual([
      [1, 'Una parte de prueba', 'tesoros', 10],
      [2, 'Busquemos perlas escondidas', 'tesoros', 10],
      [3, 'Lectura de la Biblia', 'tesoros', 4],
      [4, 'Empiece conversaciones', 'maestros', 3],
      [5, 'Estudio bíblico de la congregación', 'vida', 30],
    ])
    expect(midweekCount({ programa: t }).total).toBe(1)
  })
})

describe('parseGuia', () => {
  it('una semana por lunes, con el año del título (también la que cruza de mes)', () => {
    const g = parseGuia([INTRO, week('19-25 de octubre', 'JEREMÍAS 45, 46'), week('26 de octubre a 1 de noviembre', 'JEREMÍAS 47, 48')], OPF)
    expect(g.titulo).toBe('septiembre y octubre de 2026')
    expect(Object.keys(g.weeks).sort()).toEqual(['2026-10-19', '2026-10-26'])
    expect(g.weeks['2026-10-19'].titulo).toBe('Jeremías 45, 46')
  })

  it('null si el archivo no trae semanas', () => {
    expect(parseGuia([INTRO], OPF)).toBeNull()
  })

  it('lee el EPUB (sin las páginas -extracted)', () => {
    const zip = zipSync({
      'OEBPS/content.opf': strToU8(OPF),
      'OEBPS/1.xhtml': strToU8(INTRO),
      'OEBPS/8.xhtml': strToU8(week('19-25 de octubre', 'JEREMÍAS 45, 46')),
      'OEBPS/8-extracted.xhtml': strToU8(week('5-11 de enero', 'GÉNESIS 1')),
    })
    expect(Object.keys(readGuiaEpub(zip).weeks)).toEqual(['2026-10-19'])
    expect(readGuiaEpub(strToU8('no es un zip'))).toBeNull()
  })
})

describe('guiaFor', () => {
  it('la semana de la fecha, de lunes a domingo', () => {
    _setGuia(parseGuia([week('19-25 de octubre', 'JEREMÍAS 45, 46')], OPF).weeks)
    expect(guiaFor('2026-10-22').titulo).toBe('Jeremías 45, 46')
    expect(guiaFor('2026-10-25').lunes).toBe('2026-10-19')
    expect(guiaFor('2026-10-26')).toBeNull()
    expect(guiaFor('2026-10-18')).toBeNull()
    expect(guiaRange()).toBe('octubre de 2026')
  })
})
