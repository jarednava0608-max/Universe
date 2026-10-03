import { useEffect, useRef, useState } from 'react'
import { CELEBRATE } from '../lib/celebrate.js'

// Fondo de Estudio y Juegos que sigue la hora real, minuto a minuto: noche con estrellas, luna y
// Vía Láctea; amanecer que sube; día con nubes lentas; tarde con rayos de luz; atardecer de ámbar a
// rosa y morado. Todo suave; si el iPhone pide menos movimiento, nada se mueve.

// Puntos del día (minutos) con sus colores; entre uno y otro se mezclan poco a poco.
// a: resplandor principal arriba, b: resplandor secundario, base: color de arriba que se pierde en el fondo.
// stars / day (nubes) / rays / rise (amanecer que sube): de 0 a 1.
const N = (a, b, base) => ({ a, b, base, stars: 1, day: 0, rays: 0, rise: 0 })
const KEYS = {
  dark: [
    [0, N([80, 100, 190, 0.22], [120, 80, 180, 0.1], [10, 15, 34])],
    [300, N([80, 100, 190, 0.22], [120, 80, 180, 0.1], [10, 15, 34])],
    [360, { a: [255, 150, 120, 0.22], b: [180, 110, 200, 0.14], base: [26, 18, 32], stars: 0.35, day: 0.1, rays: 0, rise: 1 }],
    [450, { a: [255, 170, 120, 0.2], b: [255, 120, 150, 0.1], base: [22, 16, 18], stars: 0, day: 0.6, rays: 0, rise: 1 }],
    [600, { a: [255, 190, 140, 0.15], b: [150, 170, 255, 0.07], base: [16, 15, 15], stars: 0, day: 1, rays: 0, rise: 0 }],
    [780, { a: [255, 200, 140, 0.14], b: [140, 170, 255, 0.08], base: [16, 15, 14], stars: 0, day: 1, rays: 0.3, rise: 0 }],
    [960, { a: [255, 176, 84, 0.18], b: [255, 140, 80, 0.08], base: [22, 16, 10], stars: 0, day: 0.8, rays: 1, rise: 0 }],
    [1110, { a: [255, 130, 90, 0.26], b: [230, 90, 140, 0.16], base: [30, 14, 20], stars: 0, day: 0.3, rays: 0.7, rise: 0 }],
    [1170, { a: [170, 90, 200, 0.24], b: [90, 90, 200, 0.14], base: [22, 14, 36], stars: 0.5, day: 0, rays: 0, rise: 0 }],
    [1230, N([80, 100, 190, 0.22], [120, 80, 180, 0.1], [10, 15, 34])],
    [1440, N([80, 100, 190, 0.22], [120, 80, 180, 0.1], [10, 15, 34])],
  ],
  light: [
    [0, N([120, 135, 210, 0.22], [170, 140, 220, 0.12], [232, 235, 246])],
    [300, N([120, 135, 210, 0.22], [170, 140, 220, 0.12], [232, 235, 246])],
    [360, { a: [255, 160, 130, 0.3], b: [200, 150, 230, 0.18], base: [250, 236, 236], stars: 0.3, day: 0.1, rays: 0, rise: 1 }],
    [450, { a: [255, 175, 135, 0.3], b: [255, 145, 170, 0.15], base: [252, 242, 236], stars: 0, day: 0.6, rays: 0, rise: 1 }],
    [600, { a: [255, 205, 150, 0.24], b: [150, 185, 255, 0.14], base: [246, 247, 251], stars: 0, day: 1, rays: 0, rise: 0 }],
    [780, { a: [255, 215, 150, 0.22], b: [150, 185, 255, 0.15], base: [244, 247, 252], stars: 0, day: 1, rays: 0.3, rise: 0 }],
    [960, { a: [255, 190, 110, 0.3], b: [255, 160, 100, 0.12], base: [252, 244, 232], stars: 0, day: 0.8, rays: 1, rise: 0 }],
    [1110, { a: [255, 150, 110, 0.32], b: [240, 120, 160, 0.2], base: [252, 236, 234], stars: 0, day: 0.3, rays: 0.7, rise: 0 }],
    [1170, { a: [180, 130, 220, 0.26], b: [130, 140, 220, 0.18], base: [238, 232, 248], stars: 0.5, day: 0, rays: 0, rise: 0 }],
    [1230, N([120, 135, 210, 0.22], [170, 140, 220, 0.12], [232, 235, 246])],
    [1440, N([120, 135, 210, 0.22], [170, 140, 220, 0.12], [232, 235, 246])],
  ],
}

const mix = (x, y, t) => (Array.isArray(x) ? x.map((v, i) => mix(v, y[i], t)) : x + (y - x) * t)

// El cielo a una hora del día (minutos desde la medianoche), en negro o en blanco.
export function skyAt(minutes, theme = 'dark') {
  const keys = KEYS[theme === 'light' ? 'light' : 'dark']
  const m = ((minutes % 1440) + 1440) % 1440
  let i = keys.findIndex(([t]) => t > m) - 1
  if (i < 0) i = keys.length - 2
  const [t0, k0] = keys[i]
  const [t1, k1] = keys[i + 1]
  const t = t1 === t0 ? 0 : (m - t0) / (t1 - t0)
  const out = {}
  for (const k of Object.keys(k0)) out[k] = mix(k0[k], k1[k], t)
  return out
}

// Para compatibilidad: el nombre del momento del día.
export function skyPeriod(date = new Date()) {
  const h = date.getHours()
  return h >= 5 && h < 12 ? 'manana' : h >= 12 && h < 19 ? 'tarde' : 'noche'
}

const rgba = ([r, g, b, a]) => `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a.toFixed(3)})`
const rgb = ([r, g, b]) => `rgb(${r | 0}, ${g | 0}, ${b | 0})`

// Estrellas fijas en tres capas (lejos, medio, cerca) que se mueven distinto al bajar la pantalla.
const LAYERS = (() => {
  let s = 7
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return [[34, 1, 0.02], [16, 1.6, 0.05], [7, 2.3, 0.1]].map(([count, size, depth]) => ({
    depth,
    stars: Array.from({ length: count }, () => ({ x: r() * 100, y: Math.pow(r(), 1.4) * 62, size: size * (0.8 + r() * 0.4), delay: r() * 6, dur: 3 + r() * 4, o: 0.35 + r() * 0.55 })),
  }))
})()

const minutesNow = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useThemeAttr() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  useEffect(() => {
    const o = new MutationObserver(() => setTheme(document.documentElement.dataset.theme || 'dark'))
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => o.disconnect()
  }, [])
  return theme
}

export default function Sky() {
  const theme = useThemeAttr()
  const [minutes, setMinutes] = useState(minutesNow)
  const [shoot, setShoot] = useState(null)
  const [glow, setGlow] = useState(0)
  const el = useRef(null)
  const sky = skyAt(minutes, theme)

  // La hora real, cada minuto.
  useEffect(() => {
    const t = setInterval(() => setMinutes(minutesNow()), 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // Profundidad: al bajar la pantalla, las capas del cielo se mueven a distinta velocidad.
  useEffect(() => {
    const root = el.current?.parentElement
    if (!root || calm()) return
    let frame = 0
    const onScroll = (e) => {
      const y = e.target?.scrollTop ?? 0
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => el.current?.style.setProperty('--sy', Math.min(y, 1200) + 'px'))
    }
    root.addEventListener('scroll', onScroll, true)
    return () => {
      root.removeEventListener('scroll', onScroll, true)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Estrella fugaz cada 20 a 35 segundos, solo de noche y con la app a la vista.
  const night = sky.stars > 0.5
  useEffect(() => {
    if (!night || calm()) return
    let t
    const plan = () => {
      t = setTimeout(() => {
        if (document.visibilityState === 'visible') setShoot({ k: Date.now(), x: 15 + Math.random() * 60, y: 4 + Math.random() * 18 })
        plan()
      }, 20000 + Math.random() * 15000)
    }
    plan()
    return () => clearTimeout(t)
  }, [night])

  // Brilla unos segundos al celebrar (racha nueva, Reto del día hecho).
  useEffect(() => {
    const on = () => setGlow(Date.now())
    window.addEventListener(CELEBRATE, on)
    return () => window.removeEventListener(CELEBRATE, on)
  }, [])

  const background = [
    `radial-gradient(130% 50% at 65% 0%, ${rgba(sky.a)}, transparent 72%)`,
    `radial-gradient(90% 40% at 10% 0%, ${rgba(sky.b)}, transparent 70%)`,
    `linear-gradient(to bottom, ${rgb(sky.base)}, var(--bg) 65%)`,
  ].join(', ')

  return (
    <div className="sky" ref={el} style={{ background }} aria-hidden="true">
      {sky.rise > 0.02 && <div className="sky-rise" style={{ opacity: sky.rise }} />}
      {sky.rays > 0.02 && <div className="sky-rays" style={{ opacity: sky.rays }} />}
      {sky.day > 0.02 && (
        <div className="sky-clouds" style={{ opacity: sky.day }}>
          <i /><i /><i />
        </div>
      )}
      {sky.stars > 0.02 && (
        <>
          <div className="sky-milky" style={{ opacity: sky.stars }} />
          {LAYERS.map((layer, li) => (
            <div key={li} className="sky-stars" style={{ opacity: sky.stars, '--depth': layer.depth }}>
              {layer.stars.map((st, i) => (
                <i key={i} style={{ left: st.x + '%', top: st.y + '%', width: st.size, height: st.size, '--o': st.o, animationDelay: st.delay + 's', animationDuration: st.dur + 's' }} />
              ))}
            </div>
          ))}
          <div className="sky-moon" style={{ opacity: sky.stars }} />
          {shoot && <span key={shoot.k} className="sky-shoot" style={{ left: shoot.x + '%', top: shoot.y + '%' }} onAnimationEnd={() => setShoot(null)} />}
        </>
      )}
      {glow > 0 && <div key={glow} className="sky-glow" />}
    </div>
  )
}
