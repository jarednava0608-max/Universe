import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RevisitaPlace from './RevisitaPlace.jsx'

// El botón «Estoy aquí» de la nota de revisita (se pinta como texto: las pruebas corren sin navegador).
const html = (props) => renderToStaticMarkup(createElement(RevisitaPlace, { onHere: vi.fn(), ...props }))

describe('botón «Estoy aquí»', () => {
  it('sin lugar: el botón y «Sin lugar guardado»', () => {
    const h = html({ lugar: null, busy: false })
    expect(h).toContain('<button type="button" class="rv-here">')
    expect(h).toContain('Estoy aquí')
    expect(h).toContain('Sin lugar guardado')
  })

  it('con lugar: «Lugar guardado» (y se puede volver a tocar para cambiarlo)', () => {
    const h = html({ lugar: { lat: 25.767, lng: -100.2597 }, busy: false })
    expect(h).toContain('Lugar guardado')
    expect(h).not.toContain('Sin lugar guardado')
    expect(h).not.toContain('disabled')
  })

  it('mientras busca la ubicación, deshabilitado y «Buscando…»', () => {
    const h = html({ lugar: null, busy: true })
    expect(h).toContain('disabled')
    expect(h).toContain('Buscando…')
    expect(h).not.toContain('Estoy aquí')
  })
})
