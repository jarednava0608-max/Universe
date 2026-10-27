import { describe, it, expect, afterEach } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { parseLibro, readLibroEpub, chapterRef, libroFor, _setLibro } from './libro.js'
import { studyChapter } from '../study/midweek.js'

// Un capítulo como viene en el EPUB de jw.org (texto inventado para la prueba).
const chapter = (n, title) => `<html><body><header><h1><span class="pageNum" data-no="9"></span>${n} ${title}</h1><p>“Un tema de prueba.”</p></header>
<div class="bodyTxt"><p>Era un día cualquiera en el desierto.</p><figure><img src="a.jpg"/><figcaption><p>Imagen: un hombre.</p></figcaption></figure>
<h2>Lea el relato bíblico</h2><p>Éxodo 3:1-4</p>
<h2>¿Qué diría?</h2><p>1. ¿Qué hizo Moisés?</p><div class="gen-field"><label>Respuesta</label><textarea></textarea></div>
<h2>Investigue un poco más</h2><p>2. ¿Por qué confió?</p><div class="gen-field"><label>Respuesta</label><textarea></textarea></div>
</div><div class="groupExt"><aside><p>Texto bíblico que no va.</p></aside></div></body></html>`
const INTRO = '<html><body><h1>Contenido</h1><p>Presentación</p></body></html>'
const OPF = '<package><metadata><dc:title>Seamos valientes al andar con Dios</dc:title><dc:identifier>wcg_S</dc:identifier></metadata></package>'

afterEach(() => _setLibro(null))

describe('parseLibro', () => {
  it('guarda cada capítulo con su número y salta lo que no lo es', () => {
    const r = parseLibro([INTRO, chapter(13, 'MOISÉS'), chapter(14, 'JOSUÉ')], OPF)
    expect(r.titulo).toBe('Seamos valientes al andar con Dios')
    expect(Object.keys(r.capitulos)).toEqual(['13', '14'])
    expect(r.capitulos['14']).toMatch(/^14 JOSUÉ\n/)
    expect(r.capitulos['14']).not.toMatch(/no va/)
  })
  it('lo lee studyChapter como si se hubiera pegado', () => {
    const r = parseLibro([chapter(14, 'JOSUÉ')], OPF)
    const c = studyChapter({ estudio: r.capitulos['14'] })
    expect(c.titulo).toBe('14. Josué')
    expect(c.bloques.map((b) => b.pregunta)).toEqual(['Qué hizo Moisés?'.replace(/^/, '¿'), '¿Por qué confió?'])
  })
  it('no trae capítulos: null', () => {
    expect(parseLibro([INTRO], OPF)).toBeNull()
    expect(readLibroEpub(strToU8('no es un zip'))).toBeNull()
  })
  it('lee el EPUB completo', () => {
    const zip = zipSync({ 'OEBPS/content.opf': strToU8(OPF), 'OEBPS/c14.xhtml': strToU8(chapter(14, 'JOSUÉ')) })
    expect(Object.keys(readLibroEpub(zip).capitulos)).toEqual(['14'])
  })
})

describe('libroFor', () => {
  it('busca el capítulo que pide la parte', () => {
    expect(chapterRef('(30 mins.) wcg cap. 14.')).toEqual({ pub: 'wcg', n: 14 })
    _setLibro({ wcg_s: { titulo: 'x', capitulos: { 14: 'texto 14' } } })
    expect(libroFor('Estudio bíblico de la congregación (30 mins.) wcg cap. 14.')).toBe('texto 14')
    expect(libroFor('wcg cap. 15.')).toBeNull()
    expect(libroFor('sin capítulo')).toBeNull()
  })
})
