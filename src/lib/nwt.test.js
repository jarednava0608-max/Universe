import { describe, it, expect, afterEach } from 'vitest'
import { parseNwt, _setBible, hasBible } from './nwt.js'
import { findSavedVerse, savedChapterVerses, chapterSaved, makeBibleEntry } from './verses.js'

// Marcado como el del EPUB de jw.org (texto inventado): prosa (sb), poesía (sl / sz), título de salmo (sw),
// notas (*) y un versículo vacío de los que la TNM no tiene en el texto principal.
const prose = `<body><p class="w_navigation w_biblebookname"><a href="x">Juan</a> 3</p>
<p id="p2" data-pid="2" class="p2 sb"><span id="pos1"></span><span id="chapter3"></span><span id="chapter3_verse1"></span><span class="w_ch"><strong>3</strong> </span>Uno primero.<span id="footnotesource1"></span><a epub:type="noteref" href="#footnote1">*</a> <span id="chapter3_verse2"></span><strong><sup>2</sup></strong> Dos empieza</p>
<p id="p3" data-pid="3" class="p3 sb">y sigue. <span id="chapter3_verse3"></span><strong><sup>3</sup></strong> Tres.</p>
<p id="p4" data-pid="4" class="p4 sb"><span id="chapter3_verse4"></span></p>
<div class="groupFootnote"><aside epub:type="footnote"><p>^ Juan 3:1 Nota.</p></aside></div></body>`

const poem = `<body><p id="p1" data-pid="1" class="p1 sw">Salmo de prueba.</p>
<p id="p2" data-pid="2" class="p2 sl"><span id="chapter23_verse1"></span><span class="w_ch"><strong>23</strong> </span>Renglón uno.</p>
<p id="p3" data-pid="3" class="p3 sz">Renglón dos.</p>
<p id="p4" data-pid="4" class="p4 sl"><span id="chapter23_verse2"></span> <strong><sup>2</sup></strong> Otro renglón,</p><p data-pid="4" class="p4 sz">y el último.</p></body>`

const filler = Array.from({ length: 1001 }, (_, i) => `<p class="p9 sb"><span id="chapter1_verse${i + 1}"></span>V${i + 1}.</p>`).join('')

describe('TNM importada del EPUB', () => {
  afterEach(() => _setBible(null))

  it('lee prosa, poesía y quita números, notas y títulos', () => {
    const r = parseNwt([
      ['OEBPS/1001061147-split3.xhtml', prose],
      ['OEBPS/1001061123-split23.xhtml', poem],
      ['OEBPS/1001061103.xhtml', filler], // no es un libro de la Biblia: se ignora
      ['OEBPS/1001061105.xhtml', filler],
    ])
    expect(r.chapters['43:3']).toEqual([
      { v: 1, texto: 'Uno primero.' },
      { v: 2, texto: 'Dos empieza y sigue.' },
      { v: 3, texto: 'Tres.' },
    ])
    expect(r.chapters['19:23']).toEqual([
      { v: 1, texto: 'Renglón uno.\nRenglón dos.' },
      { v: 2, texto: 'Otro renglón,\ny el último.' },
    ])
    expect(r.verses).toBe(1001 + 3 + 2)
  })

  it('no acepta algo que no parece la Biblia', () => {
    expect(parseNwt([['OEBPS/1001061147-split3.xhtml', prose]])).toBe(null)
  })

  it('las citas usan la TNM importada cuando no hay nada guardado', () => {
    const { chapters } = parseNwt([['a/1001061147-split3.xhtml', prose], ['a/1001061105.xhtml', filler]])
    _setBible(chapters)
    expect(hasBible()).toBe(true)
    expect(findSavedVerse([], 'Juan 3:2')).toMatchObject({ texto: 'Dos empieza y sigue.', source: 'tnm' })
    expect(findSavedVerse([], 'Juan 3:1-2').texto).toBe('1 Uno primero.\n2 Dos empieza y sigue.')
    expect(findSavedVerse([], 'Juan 3')).toMatchObject({ source: 'capitulo' })
    expect(savedChapterVerses([], 43, 3).map((x) => x.v)).toEqual([1, 2, 3])
    expect(chapterSaved([], 'Juan 3')).toEqual({ saved: 36, expected: 36 })
    // Lo que el usuario guardó sigue primero.
    expect(findSavedVerse([makeBibleEntry('Juan 3:2', 'Mío.')], 'Juan 3:2')).toMatchObject({ texto: 'Mío.', source: 'biblia' })
    expect(findSavedVerse([], 'Juan 4:1')).toBe(null)
  })
})
