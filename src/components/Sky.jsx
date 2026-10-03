import { useEffect, useRef, useState } from 'react'
import { CELEBRATE } from '../lib/celebrate.js'
import { openRef } from '../lib/verses.js'

// Fondo de Estudio y Juegos que sigue la hora real, minuto a minuto: noche con estrellas, luna y
// Vía Láctea; amanecer que sube; día con nubes lentas; tarde con rayos de luz; atardecer de ámbar a
// rosa y morado. Todo suave; si el iPhone pide menos movimiento, nada se mueve.

// Puntos del día (minutos) con sus colores; entre uno y otro se mezclan poco a poco.
// a: resplandor principal arriba, b: resplandor secundario, base: color de arriba que se pierde en el fondo.
// stars / day (nubes) / rays / rise (amanecer que sube): de 0 a 1.
const N = (a, b, base, venus = 0) => ({ a, b, base, stars: 1, day: 0, rays: 0, rise: 0, sun: 0, venus })
const KEYS = {
  dark: [
    [0, N([80, 100, 190, 0.22], [120, 80, 180, 0.1], [10, 15, 34])],
    [300, N([80, 100, 190, 0.22], [120, 80, 180, 0.1], [10, 15, 34])],
    [360, { a: [255, 150, 120, 0.22], b: [180, 110, 200, 0.14], base: [26, 18, 32], stars: 0.35, day: 0.1, rays: 0, rise: 1, sun: 0.5, venus: 0.6 }],
    [450, { a: [255, 170, 120, 0.2], b: [255, 120, 150, 0.1], base: [22, 16, 18], stars: 0, day: 0.6, rays: 0, rise: 1, sun: 1, venus: 0 }],
    [600, { a: [255, 190, 140, 0.15], b: [150, 170, 255, 0.07], base: [16, 15, 15], stars: 0, day: 1, rays: 0, rise: 0, sun: 1, venus: 0 }],
    [780, { a: [255, 200, 140, 0.14], b: [140, 170, 255, 0.08], base: [16, 15, 14], stars: 0, day: 1, rays: 0.3, rise: 0, sun: 1, venus: 0 }],
    [960, { a: [255, 176, 84, 0.18], b: [255, 140, 80, 0.08], base: [22, 16, 10], stars: 0, day: 0.8, rays: 1, rise: 0, sun: 1, venus: 0 }],
    [1110, { a: [255, 130, 90, 0.26], b: [230, 90, 140, 0.16], base: [30, 14, 20], stars: 0, day: 0.3, rays: 0.7, rise: 0, sun: 0.9, venus: 0.3 }],
    [1170, { a: [170, 90, 200, 0.24], b: [90, 90, 200, 0.14], base: [22, 14, 36], stars: 0.5, day: 0, rays: 0, rise: 0, sun: 0, venus: 1 }],
    [1230, N([80, 100, 190, 0.22], [120, 80, 180, 0.1], [10, 15, 34], 0.5)],
    [1440, N([80, 100, 190, 0.22], [120, 80, 180, 0.1], [10, 15, 34])],
  ],
  light: [
    [0, N([120, 135, 210, 0.22], [170, 140, 220, 0.12], [232, 235, 246])],
    [300, N([120, 135, 210, 0.22], [170, 140, 220, 0.12], [232, 235, 246])],
    [360, { a: [255, 160, 130, 0.3], b: [200, 150, 230, 0.18], base: [250, 236, 236], stars: 0.3, day: 0.1, rays: 0, rise: 1, sun: 0.5, venus: 0.6 }],
    [450, { a: [255, 175, 135, 0.3], b: [255, 145, 170, 0.15], base: [252, 242, 236], stars: 0, day: 0.6, rays: 0, rise: 1, sun: 1, venus: 0 }],
    [600, { a: [255, 205, 150, 0.24], b: [150, 185, 255, 0.14], base: [246, 247, 251], stars: 0, day: 1, rays: 0, rise: 0, sun: 1, venus: 0 }],
    [780, { a: [255, 215, 150, 0.22], b: [150, 185, 255, 0.15], base: [244, 247, 252], stars: 0, day: 1, rays: 0.3, rise: 0, sun: 1, venus: 0 }],
    [960, { a: [255, 190, 110, 0.3], b: [255, 160, 100, 0.12], base: [252, 244, 232], stars: 0, day: 0.8, rays: 1, rise: 0, sun: 1, venus: 0 }],
    [1110, { a: [255, 150, 110, 0.32], b: [240, 120, 160, 0.2], base: [252, 236, 234], stars: 0, day: 0.3, rays: 0.7, rise: 0, sun: 0.9, venus: 0.3 }],
    [1170, { a: [180, 130, 220, 0.26], b: [130, 140, 220, 0.18], base: [238, 232, 248], stars: 0.5, day: 0, rays: 0, rise: 0, sun: 0, venus: 1 }],
    [1230, N([120, 135, 210, 0.22], [170, 140, 220, 0.12], [232, 235, 246], 0.5)],
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
  // Más intensidad en los resplandores (se ve más vivo sin tapar el texto).
  out.a = [...out.a.slice(0, 3), Math.min(out.a[3] * 1.4, 0.5)]
  out.b = [...out.b.slice(0, 3), Math.min(out.b[3] * 1.4, 0.4)]
  return out
}

// Dónde va el sol según la hora: sale por la izquierda (6:00), sube al mediodía y baja por la derecha (19:00).
export function sunPos(minutes) {
  const t = Math.min(Math.max((minutes - 360) / (1140 - 360), 0), 1)
  return { x: 8 + t * 84, y: 22 - Math.sin(t * Math.PI) * 19 }
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
  return [[60, 1, 0.02], [26, 1.6, 0.05], [10, 2.3, 0.1]].map(([count, size, depth]) => ({
    depth,
    stars: Array.from({ length: count }, () => ({ x: r() * 100, y: Math.pow(r(), 1.4) * 62, size: size * (0.8 + r() * 0.4), delay: r() * 6, dur: 3 + r() * 4, o: 0.35 + r() * 0.55, th: r() * 0.8 })),
  }))
})()

// Las Pléyades y Orión (Job 38:31): posiciones en % (y ya ajustada para que la forma no se estire).
const PLEIADES = { stars: [[16, 9.5], [18.5, 8.6], [20, 10.3], [22.5, 9.6], [19, 11.8], [21.5, 12.4], [17.5, 12.9]], lines: [[0, 1], [1, 2], [2, 3], [2, 5], [5, 4], [4, 6]] }
const ORION = {
  stars: [[64, 18], [80, 17.4], [75, 25.2], [72.5, 26], [70, 26.8], [66, 35], [82, 34.2]],
  // hombros, de los hombros al cinturón, el cinturón y del cinturón a los pies
  lines: [[0, 1], [0, 4], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6]],
}
const CONSTELLATIONS = [PLEIADES, ORION]

// Partículas de luz que flotan despacio (como polvo en un rayo de sol).
const MOTES = (() => {
  let s = 11
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 16 }, () => ({ x: r() * 100, y: 20 + r() * 70, size: 1.5 + r() * 2.5, dur: 16 + r() * 16, delay: -r() * 30 }))
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

// Fase de la luna (0 = nueva, 0.5 = llena), calculada aquí mismo a partir de una luna nueva conocida.
const SYNODIC = 29.530588853
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
export function moonPhase(date = new Date()) {
  const days = (date.getTime() - NEW_MOON) / 864e5
  return (((days / SYNODIC) % 1) + 1) % 1
}

// La parte iluminada de la luna como un trazo SVG (radio 1). Creciente: luz a la derecha.
export function moonPath(phase) {
  const k = Math.cos(2 * Math.PI * phase)
  const rx = Math.abs(k).toFixed(3)
  return `M0,-1 A1,1 0 0,1 0,1 A${rx},1 0 0,${k > 0 ? 0 : 1} 0,-1`
}

// Semana del año (para el cometa: uno por semana).
const weekId = () => Math.floor((Date.now() - Date.UTC(2026, 0, 5)) / (7 * 864e5))

// Lo que se puede tocar en el cielo no debe robarle toques a los botones y tarjetas.
const INTERACTIVE = 'button, a, input, textarea, select, label, [role="button"], .swipe-row, .entry-row, .kind-card, .game-card, .today-card, .continue-card, .ProseMirror, .sheet, .overlay, .page-bar'

// Para que al pasar de Estudio a Juegos el cielo no se apague (no repite la entrada ni el tinte).
let mounted = 0
let tiltState = 'unknown' // permiso de movimiento en esta sesión: 'unknown' | 'granted' | 'denied'
let lastUnmount = 0

export default function Sky() {
  const theme = useThemeAttr()
  const [minutes, setMinutes] = useState(minutesNow)
  const [shoot, setShoot] = useState(null)
  const [glow, setGlow] = useState(0)
  const [shower, setShower] = useState([])
  const [ripples, setRipples] = useState([])
  const [lit, setLit] = useState(null) // constelación encendida al tocarla
  const [comet, setComet] = useState(0)
  // Si vienes de la otra pestaña con cielo (sigue montada mientras se dibuja esta), no repite la entrada.
  const [entrance] = useState(() => mounted === 0 && Date.now() - lastUnmount > 1500)
  const el = useRef(null)
  const sky = skyAt(minutes, theme)
  const phase = moonPhase()
  const night = sky.stars > 0.5

  // La hora real, cada minuto.
  useEffect(() => {
    const t = setInterval(() => setMinutes(minutesNow()), 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // La barra de pestañas toma el color del cielo mientras estás en Estudio o Juegos.
  const tint = rgba([...sky.a.slice(0, 3), theme === 'light' ? 0.16 : 0.12])
  useEffect(() => {
    document.documentElement.style.setProperty('--sky-tint', tint)
  }, [tint])
  useEffect(() => {
    mounted++
    return () => {
      mounted--
      lastUnmount = Date.now()
      setTimeout(() => {
        if (!mounted) document.documentElement.style.removeProperty('--sky-tint')
      }, 400)
    }
  }, [])

  // Profundidad al bajar la pantalla e inclinación del iPhone.
  useEffect(() => {
    const root = el.current?.parentElement
    if (!root || calm()) return
    let frame = 0
    const set = (k, v) => el.current?.style.setProperty(k, v)
    const onScroll = (e) => {
      const y = e.target?.scrollTop ?? 0
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => set('--sy', Math.min(y, 1200) + 'px'))
    }
    let base = null
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return
      base ??= { g: e.gamma, b: e.beta } // la posición en que lo tienes es el centro
      const tx = Math.max(-1, Math.min(1, (e.gamma - base.g) / 25))
      const ty = Math.max(-1, Math.min(1, (e.beta - base.b) / 25))
      set('--tx', (tx * 18).toFixed(1) + 'px')
      set('--ty', (ty * 18).toFixed(1) + 'px')
    }
    // En iPhone el permiso de movimiento se pide con un toque. Si ya lo diste, iOS responde sin
    // volver a preguntar; por eso se pide con el primer toque cada vez que se abre la app.
    const D = window.DeviceOrientationEvent
    const listen = () => window.addEventListener('deviceorientation', onTilt)
    const ask = () => {
      if (!D?.requestPermission || tiltState !== 'unknown') return
      tiltState = 'asking'
      D.requestPermission().then((r) => {
        tiltState = r === 'granted' ? 'granted' : 'denied'
        if (tiltState === 'granted') listen()
      }).catch(() => { tiltState = 'unknown' }) // sin gesto válido: se vuelve a intentar con el siguiente toque
    }
    if (!D?.requestPermission || tiltState === 'granted') listen()
    root.addEventListener('scroll', onScroll, true)
    // iOS solo deja pedir el permiso al soltar el dedo (touchend / click), no al apoyarlo.
    root.addEventListener('touchend', ask, true)
    root.addEventListener('click', ask, true)
    return () => {
      root.removeEventListener('scroll', onScroll, true)
      root.removeEventListener('touchend', ask, true)
      root.removeEventListener('click', ask, true)
      window.removeEventListener('deviceorientation', onTilt)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Tocar el cielo: un destello; las constelaciones abren Job 38:31 y las estrellas grandes Isaías 40:26.
  useEffect(() => {
    const root = el.current?.parentElement
    if (!root) return
    let down = null
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: Date.now() } }
    const onUp = (e) => {
      const d = down
      down = null
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || Date.now() - d.t > 450) return
      if (e.target.closest?.(INTERACTIVE)) return
      const box = el.current.getBoundingClientRect()
      const x = e.clientX - box.left
      const y = e.clientY - box.top
      const sy = parseFloat(el.current.style.getPropertyValue('--sy')) || 0
      const k = Date.now()
      if (!calm()) setRipples((r) => [...r.slice(-2), { k, x, y }])
      if (!el.current.querySelector('.sky-const')) return
      const constShift = sy * 0.06
      const hit = CONSTELLATIONS.findIndex((c) => {
        const xs = c.stars.map((s) => (s[0] / 100) * box.width)
        const ys = c.stars.map((s) => (s[1] / 100) * box.height - constShift)
        return x > Math.min(...xs) - 22 && x < Math.max(...xs) + 22 && y > Math.min(...ys) - 22 && y < Math.max(...ys) + 22
      })
      if (hit >= 0) {
        setLit({ k, i: hit })
        openRef('Job 38:31')
        return
      }
      const near = LAYERS[2].stars.some((s) => Math.hypot((s.x / 100) * box.width - x, (s.y / 100) * box.height - sy * 0.1 - y) < 18)
      if (near) openRef('Isaías 40:26')
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointerup', onUp)
    return () => {
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointerup', onUp)
    }
  }, [])

  // Estrella fugaz cada 20 a 35 segundos, solo de noche y con la app a la vista.
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

  // Un cometa una vez por semana: la primera noche que abres la app esa semana.
  useEffect(() => {
    if (!night || calm()) return
    let seen = null
    try { seen = localStorage.getItem('universe-comet') } catch { /* */ }
    if (seen === String(weekId())) return
    const t = setTimeout(() => {
      try { localStorage.setItem('universe-comet', String(weekId())) } catch { /* */ }
      setComet(Date.now())
    }, 6000)
    return () => clearTimeout(t)
  }, [night])

  // Brilla y cae una lluvia de estrellas al celebrar (racha nueva, Reto del día hecho).
  useEffect(() => {
    const on = () => {
      const k = Date.now()
      setGlow(k)
      if (!calm()) setShower(showerStars(k))
    }
    window.addEventListener(CELEBRATE, on)
    return () => window.removeEventListener(CELEBRATE, on)
  }, [])

  const background = [
    `radial-gradient(130% 50% at 65% 0%, ${rgba(sky.a)}, transparent 72%)`,
    `radial-gradient(90% 40% at 10% 0%, ${rgba(sky.b)}, transparent 70%)`,
    `linear-gradient(to bottom, ${rgb(sky.base)}, var(--bg) 65%)`,
  ].join(', ')
  // Nubes: blancas a mediodía, del color del cielo al amanecer y al atardecer.
  const warm = 1 - Math.min(sky.day, 1) * 0.75
  const cloud = mix([255, 255, 255], sky.a.slice(0, 3), warm)
  const cloudOpacity = Math.max(sky.day, sky.rays * 0.8)

  return (
    <div className={'sky' + (entrance ? ' enter' : '')} ref={el} style={{ background }} aria-hidden="true">
      {sky.rise > 0.02 && <div className="sky-rise" style={{ opacity: sky.rise }} />}
      {sky.sun > 0.02 && (() => {
        const p = sunPos(minutes)
        return <div className="sky-sun" style={{ opacity: sky.sun, left: p.x + '%', top: p.y + '%', '--sun': rgba([...sky.a.slice(0, 3), 0.55]) }}><i /></div>
      })()}
      {Math.max(sky.day * 0.5, sky.rays) > 0.05 && (
        <div className="sky-motes" style={{ opacity: Math.max(sky.day * 0.5, sky.rays) }}>
          {MOTES.map((m, i) => <i key={i} style={{ left: m.x + '%', top: m.y + '%', width: m.size, height: m.size, animationDuration: m.dur + 's', animationDelay: m.delay + 's' }} />)}
        </div>
      )}
      {sky.rays > 0.02 && <div className="sky-rays" style={{ opacity: sky.rays }} />}
      {cloudOpacity > 0.02 && (
        <div className="sky-clouds" style={{ opacity: cloudOpacity, '--cloud': `${cloud[0] | 0}, ${cloud[1] | 0}, ${cloud[2] | 0}` }}>
          <i /><i /><i />
        </div>
      )}
      {sky.venus > 0.02 && <b className="sky-venus" style={{ opacity: sky.venus }} />}
      {sky.stars > 0.02 && (
        <>
          <div className="sky-milky" style={{ opacity: sky.stars }} />
          {LAYERS.map((layer, li) => (
            <div key={li} className="sky-stars" style={{ '--depth': layer.depth }}>
              {layer.stars.map((st, i) => (
                <i key={i} style={{ left: st.x + '%', top: st.y + '%', width: st.size, height: st.size, '--o': st.o * Math.min(Math.max((sky.stars - st.th) / 0.2, 0), 1), animationDelay: st.delay + 's', animationDuration: st.dur + 's' }} />
              ))}
            </div>
          ))}
          <div className="sky-const" style={{ opacity: sky.stars }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              {CONSTELLATIONS.map((c, ci) => c.lines.map(([a, b], li) => (
                <line key={ci + '-' + li + (lit?.i === ci ? '-' + lit.k : '')} className={lit?.i === ci ? 'on' : ''} x1={c.stars[a][0]} y1={c.stars[a][1]} x2={c.stars[b][0]} y2={c.stars[b][1]} pathLength="1" vectorEffect="non-scaling-stroke" style={{ animationDelay: lit?.i === ci ? li * 0.08 + 's' : ci * 13 + li * 0.25 + 's' }} />
              )))}
            </svg>
            {CONSTELLATIONS.flatMap((c, ci) => c.stars.map(([x, y], si) => <b key={ci + '-' + si} className={lit?.i === ci ? 'on' : ''} style={{ left: x + '%', top: y + '%' }} />))}
          </div>
          <svg className="sky-moon" style={{ opacity: sky.stars }} viewBox="-1.25 -1.25 2.5 2.5">
            <circle className="moon-dark" r="1" />
            <path className="moon-lit" d={moonPath(phase)} transform={phase > 0.5 ? 'scale(-1,1)' : undefined} />
          </svg>
          {shoot && <span key={shoot.k} className="sky-shoot" style={{ left: shoot.x + '%', top: shoot.y + '%' }} onAnimationEnd={() => setShoot(null)} />}
          {comet > 0 && <span key={comet} className="sky-comet" onAnimationEnd={() => setComet(0)}><i /></span>}
        </>
      )}
      {shower.map((st) => <span key={st.k} className="sky-shoot" style={{ left: st.x + '%', top: st.y + '%', animationDelay: st.delay + 's' }} onAnimationEnd={() => setShower((l) => l.filter((x) => x.k !== st.k))} />)}
      {ripples.map((r) => <span key={r.k} className="sky-ripple" style={{ left: r.x, top: r.y }} onAnimationEnd={() => setRipples((l) => l.filter((x) => x.k !== r.k))} />)}
      {glow > 0 && <div key={glow} className="sky-glow" />}
    </div>
  )
}

// Varias estrellas fugaces seguidas (lluvia de estrellas).
function showerStars(k) {
  return Array.from({ length: 8 }, (_, i) => ({ k: k + i, x: 20 + Math.random() * 70, y: 2 + Math.random() * 22, delay: i * 0.28 + Math.random() * 0.2 }))
}

// Lluvia de estrellas sobre cualquier pantalla (por ejemplo, al sacar un récord en un juego).
export function StarShower() {
  const [stars, setStars] = useState(() => (calm() ? [] : showerStars(Date.now())))
  if (!stars.length) return null
  return (
    <div className="star-shower" aria-hidden="true">
      {stars.map((st) => <span key={st.k} className="sky-shoot" style={{ left: st.x + '%', top: st.y + '%', animationDelay: 0.3 + st.delay + 's' }} onAnimationEnd={() => setStars((l) => l.filter((x) => x.k !== st.k))} />)}
    </div>
  )
}
