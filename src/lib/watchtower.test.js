import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { parseWatchtower, readWatchtowerEpub, toLines, watchtowerFor, _setWatchtower } from './watchtower.js'
import { parseArticle } from '../study/atalaya.js'

// Un artículo de estudio como viene en el EPUB de jw.org (texto inventado para la prueba).
const article = (n, titulo) => `<html><body>
<header><p class="contextTtl"><strong>ARTÍCULO DE ESTUDIO ${n}</strong></p>
<p class="pubRefs">CANCIÓN 3 Mi fuerza</p>
<h1>${titulo}</h1>
<p class="themeScrp">“Esto significa vida eterna: que lleguen a conocerte” (<a href="b.xhtml">JUAN 17:3</a>).</p></header>
<div class="docSubContent">
<p class="sb">AVANCE</p><p class="sb">Lo que aprenderemos.</p>
<p class="qu"><strong>1.</strong> ¿Cómo nos sentimos?</p>
<p class="sb"><span class="parNum">1</span> Muy felices<a href="#footnote1">*</a> (1 Cor. 3:5-9).</p>
<p class="qu">2, 3 ¿Cuál es la voluntad de Jehová?</p>
<p class="sb"><span class="parNum">2</span> Que todos se salven.</p>
<p class="sb"><span class="parNum">3</span> Y lleguen al conocimiento.</p>
<h2>Enseñemos cómo es Jehová</h2>
<p class="qu">4. ¿Qué haremos?</p>
<p class="sb"><span class="parNum">4</span> Enseñar.</p>
<figure><img src="i.jpg"/><figcaption><p>Una familia predica.</p></figcaption></figure>
<div class="blockTeach"><p class="boxTtl">¿QUÉ RESPONDERÍAS?</p>
<ul><li><p>¿Por qué conocer a Jehová?</p></li><li><p>¿Cómo enseñarlo?</p></li></ul></div>
<p class="pubRefs">CANCIÓN 84 Servimos</p>
</div>
<aside epub:type="footnote"><p>Nota que no va.</p></aside>
</body></html>`
const TOC = `<html><body><h1>Contenido</h1>
<p>ARTÍCULO DE ESTUDIO 40</p><p>Conozcamos a Jehová</p><p>Semana del 5-11 de octubre de 2026</p>
<p>ARTÍCULO DE ESTUDIO 41</p><p>Sigamos enseñando</p><p>Semana del 12-18 de octubre de 2026</p>
</body></html>`
const OPF = '<package><metadata><dc:title>La Atalaya (anuncia el Reino de Jehová). Edición de estudio. Agosto de 2026</dc:title><dc:identifier>w_S_202608</dc:identifier></metadata></package>'

describe('La Atalaya de estudio del EPUB', () => {
  it('cada artículo queda como el texto copiado de JW Library', () => {
    const r = parseWatchtower([TOC, article(40, 'Conozcamos a Jehová'), article(41, 'Sigamos enseñando')], OPF)
    expect(r.titulo).toBe('agosto de 2026')
    expect(r.articulos.map((a) => [a.num, a.titulo, a.semana])).toEqual([
      [40, 'Conozcamos a Jehová', '2026-10-05'],
      [41, 'Sigamos enseñando', '2026-10-12'],
    ])
    const p = parseArticle(r.articulos[0].texto)
    expect(p.tema).toMatch(/JUAN 17:3/)
    expect(p.resumen).toBe('Lo que aprenderemos.')
    expect(p.bloques.map((b) => b.key)).toEqual(['1', '2, 3', '4'])
    expect(p.bloques[0].parrafos).toEqual(['Muy felices (1 Cor. 3:5-9).'])
    expect(p.bloques[1].parrafos).toHaveLength(2)
    expect(p.bloques[2].subtitulo).toBe('Enseñemos cómo es Jehová')
    expect(p.bloques[2].extras).toEqual(['Una familia predica.'])
    expect(p.repaso).toEqual(['¿Por qué conocer a Jehová?', '¿Cómo enseñarlo?'])
    expect(r.articulos[0].texto).not.toMatch(/Nota que no va/)
  })

  it('sin semana en el índice, se calcula de otro artículo; sin ninguna, queda para elegir', () => {
    const toc = TOC.replace('Semana del 12-18 de octubre de 2026', '')
    const r = parseWatchtower([toc, article(40, 'A'), article(41, 'B')], OPF)
    expect(r.articulos[1].semana).toBe('2026-10-12')
    const none = parseWatchtower([article(40, 'A')], OPF)
    expect(none.articulos[0].semana).toBe(null)
  })

  it('la semana "28 de septiembre a 4 de octubre" (sin año) cae en el lunes 28', () => {
    const toc = '<p>ARTÍCULO DE ESTUDIO 39</p><p>28 de septiembre a 4 de octubre</p>'
    expect(parseWatchtower([toc, article(39, 'A')], OPF).articulos[0].semana).toBe('2026-09-28')
  })

  it('el artículo de la semana de la reunión (sábado o domingo)', () => {
    _setWatchtower({ x: parseWatchtower([TOC, article(40, 'A'), article(41, 'B')], OPF) })
    expect(watchtowerFor('2026-10-11').num).toBe(40)
    expect(watchtowerFor('2026-10-17').num).toBe(41)
    expect(watchtowerFor('2026-10-19')).toBe(null)
    _setWatchtower(null)
  })

  it('lee el archivo EPUB completo y rechaza otros', () => {
    const zip = zipSync({
      'OEBPS/content.opf': strToU8(OPF.replace('</metadata>', '</metadata><manifest><item id="t" href="toc.xhtml"/><item id="a" href="a.xhtml"/></manifest><spine><itemref idref="t"/><itemref idref="a"/></spine>')),
      'OEBPS/a.xhtml': strToU8(article(40, 'Conozcamos a Jehová')),
      'OEBPS/toc.xhtml': strToU8(TOC),
    })
    expect(readWatchtowerEpub(zip).articulos[0].semana).toBe('2026-10-05')
    expect(readWatchtowerEpub(zipSync({ 'OEBPS/x.xhtml': strToU8('<p>Hola</p>') }))).toBe(null)
    expect(readWatchtowerEpub(strToU8('no es zip'))).toBe(null)
  })

  it('preguntas sin punto reciben el punto', () => {
    expect(toLines('<body><p class="qu">5 ¿Y?</p></body>')).toEqual(['5. ¿Y?'])
  })
})

describe('Índice con la semana antes de la etiqueta', () => {
  it('toma la semana que va antes, sin mezclar artículos', () => {
    const toc = '<p>5-11 de octubre de 2026</p><p>ARTÍCULO DE ESTUDIO 40</p><p>12-18 de octubre de 2026</p><p>ARTÍCULO DE ESTUDIO 41</p>'
    const r = parseWatchtower([toc, article(40, 'A'), article(41, 'B')], OPF)
    expect(r.articulos.map((a) => a.semana)).toEqual(['2026-10-05', '2026-10-12'])
  })
})

// Como viene el EPUB de 2026 (w_S_202608): la semana arriba, sin "Artículo de estudio", números de párrafo
// en `data-pnum`, cuadros "Respuesta", repaso dentro de <aside> y notas al final (texto inventado).
const real = (semana, titulo, box, items) => `<html><body class="pub-w"><header>
<div class="dc-bleed"><p class="contextTtl" id="p1"><span class="pageNum" data-no="2"></span><strong>${semana}</strong></p></div>
<div><p class="pubRefs"><a href="x-extracted.xhtml#pcitation1"><strong>CANCIÓN 55</strong></a> ¡No los temas!</p></div>
<h1 id="p3"><strong>${titulo}</strong></h1></header>
<div><p class="themeScrp"><em>Texto temático sin comillas</em> (<a epub:type="noteref" href="#citation1">FILEM. 9</a>).</p></div>
<div><p class="pubRefs"><strong>TEMA</strong></p><p class="pubRefs">Lo que veremos.</p></div>
<div class="bodyTxt">
<p id="q1" class="qu"> <strong>1.</strong> ¿Primera?</p>
<div class="gen-field"><label class="dc-screenReaderText">Respuesta</label><textarea></textarea></div>
<p id="p7" class="p7"><span class="parNum" data-pnum="1"></span>CUANDO empezamos (<a epub:type="noteref" href="#citation2">2 Cor. 11:14</a>).<span id="footnotesource1"></span><a href="#footnote1">*</a></p>
<h2><span class="pageNum" data-no="3"></span><strong>UN SUBTÍTULO</strong></h2>
<p id="q2" class="qu"> <strong>2, 3.</strong> ¿Segunda?</p>
<div class="gen-field"><label>Respuesta</label><textarea></textarea></div>
<p class="p8"><span class="parNum" data-pnum="2"><strong><sup>2</sup></strong></span> Dos.</p>
<p class="p9"><span class="parNum" data-pnum="3"><strong><sup>3</sup></strong></span> Tres.</p>
<figure><img src="i.jpg" alt="x" /><figcaption class="figcaption"><p>Pie de la imagen.</p></figcaption></figure>
</div>
<div class="blockTeach"><aside><div class="boxTtl"><div><strong>${box}</strong></div></div>
<div class="boxContent"><ul>${items.map((t) => `<li><p>  ${t}</p><div class="gen-field"><label>Respuesta</label><textarea></textarea></div></li>`).join('')}</ul></div></aside></div>
<div><p class="pubRefs"><strong>CANCIÓN 150</strong> ¡Jehová será tu Salvador!</p></div>
<div class="groupFootnote"><div id="footnote1"><p><a href="#footnotesource1">^ </a> Nota al pie.</p></div></div>
<div class="groupExt"><aside epub:type="footnote"><div class="extScrpCite"><p class="extScrpCiteTxt">(Sant. 4:7) Texto de la cita.</p></div></aside></div>
</body></html>`
const OPF26 = '<package><metadata><dc:title>La Atalaya, agosto de 2026</dc:title><dc:identifier>urn:uuid:1</dc:identifier></metadata></package>'

describe('La Atalaya de estudio: EPUB de 2026', () => {
  const r = parseWatchtower([
    real('5-11 DE OCTUBRE DE 2026', 'Primer artículo', '¿QUÉ RESPONDERÍAS?', ['¿Una?', '¿Dos?']),
    real('26 DE OCTUBRE-1 DE NOVIEMBRE DE 2026', 'Segundo artículo', '¿QUÉ APRENDEMOS DE LOS SIGUIENTES PERSONAJES BÍBLICOS?', ['Onésimo', 'Filemón']),
    '<html><body><h1>¿Lo sabías?</h1><p>Algo más de la revista.</p></body></html>',
  ], OPF26)

  it('cada artículo con su semana (la de arriba) y su título', () => {
    expect(r.key).toBe('La Atalaya, agosto de 2026')
    expect(r.articulos.map((a) => [a.num, a.titulo, a.semana])).toEqual([[1, 'Primer artículo', '2026-10-05'], [2, 'Segundo artículo', '2026-10-26']])
  })

  it('preguntas, párrafos numerados, subtítulo, imagen y repaso; sin "Respuesta" ni notas', () => {
    const p = parseArticle(r.articulos[0].texto)
    expect(p.tema).toBe('Texto temático sin comillas (FILEM. 9).')
    expect(p.resumen).toBe('Lo que veremos.')
    expect(p.bloques.map((b) => [b.key, b.parrafos])).toEqual([['1', ['CUANDO empezamos (2 Cor. 11:14).']], ['2, 3', ['Dos.', 'Tres.']]])
    expect(p.bloques[1].subtitulo).toBe('UN SUBTÍTULO')
    expect(p.bloques[1].extras).toEqual(['Pie de la imagen.'])
    expect(p.repaso).toEqual(['¿Una?', '¿Dos?'])
    expect(p.canciones).toHaveLength(2)
    expect(r.articulos[0].texto).not.toMatch(/Respuesta|Nota al pie|Texto de la cita|\*/)
  })

  it('un repaso que no son preguntas lleva el título del cuadro', () => {
    expect(parseArticle(r.articulos[1].texto).repaso).toEqual([
      '¿Qué aprendemos de los siguientes personajes bíblicos? Onésimo',
      '¿Qué aprendemos de los siguientes personajes bíblicos? Filemón',
    ])
  })
})
