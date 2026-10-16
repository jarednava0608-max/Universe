import { describe, it, expect } from 'vitest'
import { parseDailyTexts } from './dailytexts.js'
import { dailyVerse, dailyBody } from '../study/kinds.js'

// Un día como vienen en el EPUB de jw.org (texto inventado para la prueba).
const page = (h2, verse, ...ps) => `<html><body><header><h1>Mes</h1><h2 id="p2">${h2}</h2></header>
<p id="p3" class="themeScrp"><em>${verse} (</em><span id="c1"></span><em><a epub:type="noteref" href="#citation1">Sal. 1:1</a></em><em>).</em></p>
<div class="bodyTxt">${ps.map((p, i) => `<p id="p${4 + i}" class="p${4 + i} sb">${p}</p>`).join('')}</div>
<div class="groupExt"><aside epub:type="footnote"><p class="extScrpCiteTxt">Nota que no va.</p></aside></div></body></html>`
const OPF = '<package><metadata><dc:title>Examinemos 2026 (es26-S)</dc:title></metadata></package>'

describe('Textos diarios del EPUB', () => {
  const year = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(2026, 0, 1 + i)
    const dia = d.toLocaleDateString('es', { weekday: 'long' })
    const mes = d.toLocaleDateString('es', { month: 'long' })
    return page(`${dia[0].toUpperCase() + dia.slice(1)} ${d.getDate()} de ${mes}`, `Texto del día ${i + 1}`, `Comentario del día ${i + 1} (Juan 3:16). <a href="x.xhtml#p1"><em>w24.04</em> 2 párr. 1</a>`)
  })

  it('lee cada día con su fecha, el versículo con su cita y el comentario', () => {
    const r = parseDailyTexts(year, OPF)
    expect(r.year).toBe(2026)
    expect(Object.keys(r.days)).toHaveLength(365)
    const t = r.days['2026-01-01']
    expect(t.split('\n')[0]).toBe('Jueves 1 de enero')
    expect(dailyVerse(t)).toBe('Texto del día 1 (Sal. 1:1).')
    expect(dailyBody(t).replace(dailyVerse(t), '').trim()).toBe('Comentario del día 1 (Juan 3:16). w24.04 2 párr. 1')
    expect(t).not.toMatch(/Nota que no va/)
  })

  it('varios párrafos y una fecha con algo antes (la Conmemoración)', () => {
    const memorial = page('<span>FECHA DE LA CONMEMORACIÓN</span><span>(tras la puesta del sol)</span>Jueves 2 de abril', 'No teman', 'Uno.', 'Dos.')
    const r = parseDailyTexts([...year.filter((_, i) => i !== 91), memorial], OPF)
    const t = r.days['2026-04-02']
    expect(t.split('\n')[0]).toBe('Jueves 2 de abril')
    expect(dailyVerse(t)).toBe('No teman (Sal. 1:1).')
    expect(t.endsWith('Uno.\n\nDos.\n\nFECHA DE LA CONMEMORACIÓN (tras la puesta del sol)')).toBe(true)
  })

  it('otro archivo (sin año en el título o con pocos días) no cuenta', () => {
    expect(parseDailyTexts(year, '<dc:title>Otra cosa</dc:title>')).toBeNull()
    expect(parseDailyTexts(year.slice(0, 20), OPF)).toBeNull()
  })
})
