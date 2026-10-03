import { useEffect, useState } from 'react'

// Fondo de la pestaña Juegos según la hora: amanecer (mañana), luz ámbar (tarde) y cielo con
// estrellas (noche). Solo decoración; los colores están en styles.css (.sky[data-sky]).
export function skyPeriod(date = new Date()) {
  const h = date.getHours()
  return h >= 5 && h < 12 ? 'manana' : h >= 12 && h < 19 ? 'tarde' : 'noche'
}

// Estrellas fijas (siempre en el mismo lugar), con brillo y tamaño variados.
const STARS = (() => {
  let s = 7
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 46 }, () => ({ x: r() * 100, y: Math.pow(r(), 1.4) * 62, size: r() < 0.15 ? 2.2 : r() < 0.5 ? 1.6 : 1.1, delay: r() * 6, dur: 3 + r() * 4, o: 0.35 + r() * 0.55 }))
})()

export default function Sky() {
  const [period, setPeriod] = useState(() => skyPeriod())
  useEffect(() => {
    const t = setInterval(() => setPeriod(skyPeriod()), 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="sky" data-sky={period} aria-hidden="true">
      {period === 'noche' && (
        <div className="sky-stars">
          {STARS.map((st, i) => (
            <i key={i} style={{ left: st.x + '%', top: st.y + '%', width: st.size, height: st.size, '--o': st.o, animationDelay: st.delay + 's', animationDuration: st.dur + 's' }} />
          ))}
        </div>
      )}
    </div>
  )
}
