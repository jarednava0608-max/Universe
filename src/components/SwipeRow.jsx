import { useRef, useState } from 'react'

// Fila que se desliza a la izquierda para mostrar "Eliminar" (como en la app Notas).
const REVEAL = 88
export default function SwipeRow({ children, onDelete }) {
  const [x, setX] = useState(0)
  const [open, setOpen] = useState(false)
  const drag = useRef(null)
  const close = () => { setOpen(false); setX(0) }
  return (
    <li className="swipe-row">
      <button className="swipe-del" tabIndex={open ? 0 : -1} onClick={() => { close(); onDelete() }}>Eliminar</button>
      <div
        className="swipe-front"
        style={{ transform: `translateX(${x}px)`, transition: drag.current?.on ? 'none' : undefined }}
        onTouchStart={(e) => {
          const t = e.touches[0]
          drag.current = { x: t.clientX, y: t.clientY, base: open ? -REVEAL : 0, on: false, nx: open ? -REVEAL : 0 }
        }}
        onTouchMove={(e) => {
          const d = drag.current
          if (!d) return
          const t = e.touches[0]
          const dx = t.clientX - d.x
          if (!d.on) {
            if (Math.abs(t.clientY - d.y) > Math.abs(dx)) { drag.current = null; return }
            if (Math.abs(dx) < 8) return
            d.on = true
          }
          d.nx = Math.max(-REVEAL - 30, Math.min(0, d.base + dx))
          setX(d.nx)
        }}
        onTouchEnd={() => {
          const d = drag.current
          drag.current = null
          if (!d?.on) return
          const o = d.nx < -REVEAL / 2
          setOpen(o)
          setX(o ? -REVEAL : 0)
        }}
        onClickCapture={(e) => {
          if (!open) return
          e.stopPropagation()
          e.preventDefault()
          close()
        }}
      >
        {children}
      </div>
    </li>
  )
}
