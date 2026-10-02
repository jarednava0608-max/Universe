import { useRef, useState } from 'react'

// Hoja de abajo (como las de iOS) para contenido que puede ser largo: nunca tapa toda la pantalla,
// el contenido se desplaza adentro y se cierra con la × de arriba, deslizando hacia abajo desde
// la parte de arriba o tocando fuera.
export default function Sheet({ title, actions, onClose, className = '', backdropClass = '', footer, children }) {
  const [dy, setDy] = useState(0)
  const start = useRef(null)
  const moved = useRef(0) // la distancia se guarda aquí para leerla al soltar (el estado puede ir atrasado)

  const onTouchStart = (e) => {
    start.current = e.touches[0].clientY
    moved.current = 0
  }
  const onTouchMove = (e) => {
    if (start.current == null) return
    moved.current = Math.max(0, e.touches[0].clientY - start.current)
    setDy(moved.current)
  }
  const onTouchEnd = () => {
    if (moved.current > 80) onClose()
    else setDy(0)
    start.current = null
    moved.current = 0
  }

  return (
    <div className={'sheet-backdrop ' + backdropClass} onClick={onClose}>
      <div
        className={'sheet sheet-v2 ' + className}
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-top" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="grabber" />
          <div className="sheet-head">
            {title != null && <h2 className="sheet-h">{title}</h2>}
            <span className="sheet-head-actions">
              {actions}
              <button className="sheet-close" aria-label="Cerrar" onClick={onClose}>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </span>
          </div>
        </div>
        <div className="sheet-scroll">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}
