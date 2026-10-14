import { useState } from 'react'
import Icon, { ICONS } from './Icon.jsx'

// Contenido de una página (Estudio, Juegos) que hace scroll. Al bajar aparece arriba una barra
// de vidrio con el título chico (como en iOS), así el texto no se encima con los botones de arriba.
// En una lista dentro de Estudio, `back` ("‹ Estudio") y `action` (el +) van en esa misma barra
// en el estilo Como JW, igual que en las pantallas de La Atalaya o entre semana.
export default function PageScroll({ title, back, action, children }) {
  const [scrolled, setScrolled] = useState(false)
  const nav = Boolean(back || action)
  return (
    <>
      <div className={'page-bar' + (scrolled ? ' on' : '') + (nav ? ' nav' : '')} aria-hidden={!scrolled && !nav}>
        {back && (
          <button className="bar-btn back page-bar-back" onClick={back.onClick}>
            <Icon d={ICONS.back} size={18} stroke={2} /> {back.label}
          </button>
        )}
        <span>{title}</span>
        {action && <span className="page-bar-action">{action}</span>}
      </div>
      <div className="page-scroll" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 44)}>
        {children}
      </div>
    </>
  )
}
