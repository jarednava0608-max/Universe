import { useState } from 'react'

// Contenido de una página (Estudio, Juegos) que hace scroll. Al bajar aparece arriba una barra
// de vidrio con el título chico (como en iOS), así el texto no se encima con los botones de arriba.
export default function PageScroll({ title, children }) {
  const [scrolled, setScrolled] = useState(false)
  return (
    <>
      <div className={'page-bar' + (scrolled ? ' on' : '')} aria-hidden={!scrolled}>
        <span>{title}</span>
      </div>
      <div className="page-scroll" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 44)}>
        {children}
      </div>
    </>
  )
}
