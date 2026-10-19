import { useEffect, useState } from 'react'

// Animación de arranque: se ve una sola vez cada vez que se abre la app; un toque la quita.
let shown = false

export default function Splash() {
  const [fase, setFase] = useState(shown ? 'fuera' : 'dentro')

  useEffect(() => {
    if (shown) return
    shown = true
    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches
    const t1 = setTimeout(() => setFase('saliendo'), reducir ? 600 : 2300)
    const t2 = setTimeout(() => setFase('fuera'), reducir ? 900 : 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (fase === 'fuera') return null
  return (
    <div className={`splash ${fase}`} onClick={() => setFase('fuera')} aria-hidden="true">
      <svg viewBox="0 0 512 512" className="splash-art">
        <defs>
          <radialGradient id="splash-aura">
            <stop offset="0" className="splash-aura-a" />
            <stop offset="1" className="splash-aura-b" />
          </radialGradient>
        </defs>
        <circle className="splash-orbita" cx="256" cy="152" r="84" />
        <circle className="splash-halo" cx="256" cy="152" r="96" fill="url(#splash-aura)" />
        <circle className="splash-punto" cx="256" cy="152" r="30" />
        <g className="splash-libro">
          <path className="splash-pag izq" d="M256 392 C222 366 166 356 116 362 L116 244 C166 238 222 248 256 274 Z" />
          <path className="splash-pag der" d="M256 392 C290 366 346 356 396 362 L396 244 C346 238 290 248 256 274 Z" />
        </g>
      </svg>
    </div>
  )
}
