import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCollide, forceRadial } from 'd3-force-3d'
import { nodeColor, ROOT_ID } from '../lib/model.js'
import { buildResolver, extractLinks } from '../lib/markdown.js'

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'

// Colores del mapa según el tema negro / blanco (variables --graph-* de styles.css).
function readPalette() {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  const fg = v('--graph-link-rgb', '255, 255, 255')
  return {
    bg: v('--graph-bg', '#09090b'),
    node: v('--graph-node', '#b4b4bc'),
    label: v('--graph-label', 'rgba(228,228,231,0.78)'),
    focus: v('--graph-focus', '#fafafa'),
    rootLabel: v('--graph-root-label', '#f5d27a'),
    link: `rgba(${fg},0.13)`,
    linkDim: `rgba(${fg},0.04)`,
    linkHi: `rgba(${fg},0.55)`,
    relText: `rgba(${fg},0.4)`,
    relTextHi: `rgba(${fg},0.75)`,
    ring: `rgba(${fg},0.85)`,
    fresh: `rgba(${fg},0.08)`,
  }
}

// Lugar que ocupa el nombre de un nodo (deja el tipo de letra listo en ctx).
function labelBox(ctx, n, scale, focused) {
  const fs = (n.isRoot ? 13 : 11) / scale
  ctx.font = `${n.isRoot ? 600 : 500} ${fs}px ${FONT}`
  // De lejos los nombres largos se acortan más (el nodo abierto se ve completo hasta 32 letras).
  const max = focused || scale >= 1.6 ? 32 : 20
  const label = n.title.length > max ? n.title.slice(0, max - 1).trimEnd() + '…' : n.title
  const w = ctx.measureText(label).width
  const y = n.y + n.r + (focused ? 9 : 4) / scale
  return { label, x1: n.x - w / 2 - 2 / scale, x2: n.x + w / 2 + 2 / scale, y1: y, y2: y + fs * 1.2 }
}

// Vista de grafo: canvas con zoom/arrastre táctil y líneas rectas.
// Margen al ajustar el mapa a la pantalla (90 dejaba el mapa chiquito en el iPhone).
const FIT_PAD = 58
// Distancia entre anillos: Jehová en el centro, lo que se enlaza con él en el primer anillo, lo que
// se enlaza con esos en el segundo… y lo suelto (sin enlaces) en el anillo de afuera, no perdido lejos.
const RING = 105

const Graph = forwardRef(function Graph({ nodes, edges, focusId, startId, theme, onNodeTap, onBackgroundTap }, ref) {
  // Los colores se leen después de que el tema ya se aplicó en <html> (si se leen al dibujar,
  // todavía están los del tema anterior y los nombres quedan casi invisibles).
  const [pal, setPal] = useState(readPalette)
  useEffect(() => {
    const id = requestAnimationFrame(() => setPal(readPalette()))
    return () => cancelAnimationFrame(id)
  }, [theme])
  const fg = useRef()
  const wrap = useRef()
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const cache = useRef(new Map()) // conserva posiciones entre renders
  const didFit = useRef(false) // true cuando el usuario ya movió el mapa o se abrió un nodo: ya no se reajusta solo
  const labels = useRef(new Set()) // nodos cuyo nombre cabe en este cuadro sin encimarse
  const lastBgTap = useRef(0)

  useEffect(() => {
    const el = wrap.current
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const data = useMemo(() => {
    const old = cache.current
    const next = new Map()
    const degree = new Map()
    const bump = (id) => degree.set(id, (degree.get(id) ?? 0) + 1)

    const links = []
    const pairs = new Set()
    for (const e of edges) {
      links.push({ source: e.source, target: e.target, rel: e.rel, implicit: false })
      pairs.add(e.source + '|' + e.target).add(e.target + '|' + e.source)
      bump(e.source)
      bump(e.target)
    }
    // Los [[enlaces]] dentro de las notas también conectan nodos (sin flecha).
    const resolve = buildResolver(nodes)
    for (const n of nodes) {
      for (const t of extractLinks(n.note)) {
        const id = resolve(t)
        if (!id || id === n.id || pairs.has(n.id + '|' + id)) continue
        pairs.add(n.id + '|' + id).add(id + '|' + n.id)
        links.push({ source: n.id, target: id, rel: '', implicit: true })
        bump(n.id)
        bump(id)
      }
    }

    // Anillo de cada nodo: cuántos pasos hay desde Jehová siguiendo las líneas.
    const near = new Map()
    for (const l of links) {
      if (!near.has(l.source)) near.set(l.source, [])
      if (!near.has(l.target)) near.set(l.target, [])
      near.get(l.source).push(l.target)
      near.get(l.target).push(l.source)
    }
    const depth = new Map([[ROOT_ID, 0]])
    for (let queue = [ROOT_ID]; queue.length; ) {
      const id = queue.shift()
      for (const m of near.get(id) ?? []) {
        if (depth.has(m)) continue
        depth.set(m, depth.get(id) + 1)
        queue.push(m)
      }
    }
    const outer = Math.max(1, ...depth.values())

    const gNodes = nodes.map((n) => {
      const g = old.get(n.id) ?? { id: n.id }
      g.title = n.title
      g.color = nodeColor(n)
      g.isRoot = n.id === ROOT_ID
      g.fresh = !g.isRoot && Date.now() - (n.createdAt ?? 0) < 24 * 3600 * 1000 // creado en las últimas 24 h
      g.deg = degree.get(n.id) ?? 0
      g.r = g.isRoot ? 8 : 3.5 + Math.min(5, Math.sqrt(g.deg) * 1.4)
      g.ring = depth.get(n.id) ?? outer
      if (g.isRoot) {
        g.fx = 0
        g.fy = 0
      }
      next.set(n.id, g)
      return g
    })
    cache.current = next
    return { nodes: gNodes, links }
  }, [nodes, edges])

  const neighbors = useMemo(() => {
    const set = new Set()
    if (!focusId) return set
    for (const l of data.links) {
      const s = typeof l.source === 'object' ? l.source.id : l.source
      const t = typeof l.target === 'object' ? l.target.id : l.target
      if (s === focusId) set.add(t)
      if (t === focusId) set.add(s)
    }
    return set
  }, [data, focusId])

  // Fuerzas para que el mapa se vea ordenado y no como un enredo: anillos alrededor de Jehová,
  // los nodos no se enciman y los muy conectados se separan más.
  useEffect(() => {
    const f = fg.current
    if (!f) return
    f.d3Force('charge').strength((n) => (n.isRoot ? -300 : -90 - 15 * Math.min(n.deg, 8))).distanceMax(360)
    f.d3Force('link').distance((l) => (l.source.isRoot || l.target.isRoot ? RING : 60 + 6 * Math.min(8, Math.max(l.source.deg ?? 0, l.target.deg ?? 0))))
    f.d3Force('collide', forceCollide((n) => n.r + 10).iterations(2))
    f.d3Force('radial', forceRadial((n) => RING * n.ring, 0, 0).strength((n) => (n.isRoot ? 0 : 0.14)))
  }, [data])

  // Al abrir la app, el mapa vuelve al último nodo que viste (cuando ya se acomodó un poco).
  useEffect(() => {
    if (!startId) return
    const t = setTimeout(() => {
      const n = cache.current.get(startId)
      if (didFit.current || !n || !Number.isFinite(n.x) || !fg.current) return
      didFit.current = true
      fg.current.centerAt(n.x, n.y, 600)
      fg.current.zoom(1.9, 600)
    }, 1200)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    fit() {
      fg.current?.zoomToFit(600, FIT_PAD)
    },
    focus(id, zoom = 2.2) {
      // Si abres un nodo antes de que el mapa termine de acomodarse, ya no se aleja solo al final.
      didFit.current = true
      const n = cache.current.get(id)
      if (!n || n.x == null || !fg.current) return
      // Centra el nodo en la mitad de arriba (la nota abre como hoja en la mitad de abajo).
      const z = Math.max(zoom, fg.current.zoom())
      const h = wrap.current?.clientHeight ?? window.innerHeight
      fg.current.centerAt(n.x, n.y + (h * 0.22) / z, 500)
      fg.current.zoom(z, 500)
    },
  }))

  // Al abrir un nodo, sus líneas se encienden poco a poco (0 → 1 en ~0.5 s).
  const hiStart = useRef(0)
  const [, setTick] = useState(0)
  // El puntito que recorre las conexiones solo se ve unos segundos (si no, el mapa se redibuja
  // todo el tiempo mientras lees la nota y gasta batería).
  const [glow, setGlow] = useState(false)
  useEffect(() => {
    if (!focusId) return setGlow(false)
    setGlow(true)
    const t = setTimeout(() => setGlow(false), 3500)
    return () => clearTimeout(t)
  }, [focusId])
  useEffect(() => {
    if (!focusId) return
    hiStart.current = performance.now()
    let id
    const step = () => {
      setTick((t) => t + 1)
      if (performance.now() - hiStart.current < 520) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [focusId])
  const hiK = () => Math.min(1, (performance.now() - hiStart.current) / 500)
  const fg2 = pal.link.replace(/,[^,]*\)$/, '')
  const linkHiNow = () => `${fg2},${(0.13 + (0.55 - 0.13) * hiK()).toFixed(3)})`

  const linkEnds = (l) => [typeof l.source === 'object' ? l.source.id : l.source, typeof l.target === 'object' ? l.target.id : l.target]
  const isHi = (l) => focusId && linkEnds(l).includes(focusId)
  const linkColor = (l) => (isHi(l) ? linkHiNow() : focusId ? pal.linkDim : pal.link)

  return (
    <div className="graph" ref={wrap} onPointerDownCapture={() => { didFit.current = true }} onWheelCapture={() => { didFit.current = true }}>
      <ForceGraph2D
        ref={fg}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        minZoom={0.15}
        maxZoom={10}
        cooldownTicks={300}
        d3VelocityDecay={0.35}
        linkCurvature={0}
        linkColor={linkColor}
        linkWidth={(l) => (isHi(l) ? 0.8 + 0.6 * hiK() : 0.8)}
        linkDirectionalParticles={(l) => (glow && isHi(l) ? 1 : 0)}
        linkDirectionalParticleWidth={2.2}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleColor={() => pal.linkHi}
        linkDirectionalArrowLength={(l) => (l.implicit ? 0 : 3)}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={linkColor}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(l, ctx, scale) => {
          if (!l.rel || (scale < 2.6 && !isHi(l))) return
          const s = l.source
          const t = l.target
          if (s.x == null || t.x == null) return
          const fs = 8.5 / scale
          ctx.font = `600 ${fs}px ${FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const x = (s.x + t.x) / 2
          const y = (s.y + t.y) / 2
          ctx.lineWidth = 3 / scale
          ctx.strokeStyle = pal.bg
          ctx.strokeText(l.rel, x, y)
          ctx.fillStyle = isHi(l) ? pal.relTextHi : pal.relText
          ctx.fillText(l.rel, x, y)
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return
          const focused = n.id === focusId
          const dim = focusId && !focused && !neighbors.has(n.id)
          ctx.globalAlpha = dim ? 0.22 : 1
          const r = n.r

          if (n.isRoot) {
            // Halo suave para Jehová.
            const g = ctx.createRadialGradient(n.x, n.y, r * 0.6, n.x, n.y, r * 3.2)
            g.addColorStop(0, 'rgba(245,210,122,0.28)')
            g.addColorStop(1, 'rgba(245,210,122,0)')
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(n.x, n.y, r * 3.2, 0, 2 * Math.PI)
            ctx.fill()
          }

          if (n.fresh) {
            // Nodo nuevo (último día): un brillo suave alrededor, nunca dorado.
            ctx.beginPath()
            ctx.arc(n.x, n.y, r * 1.8, 0, 2 * Math.PI)
            ctx.fillStyle = pal.fresh
            ctx.fill()
          }

          ctx.beginPath()
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
          ctx.fillStyle = n.isRoot ? n.color : pal.node
          ctx.fill()

          if (focused) {
            ctx.beginPath()
            ctx.arc(n.x, n.y, r + 4 / scale, 0, 2 * Math.PI)
            ctx.lineWidth = 1.5 / scale
            ctx.strokeStyle = pal.ring
            ctx.stroke()
          }

          if (labels.current.has(n.id)) {
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            const box = labelBox(ctx, n, scale, focused)
            ctx.fillStyle = n.isRoot ? pal.rootLabel : focused ? pal.focus : pal.label
            ctx.fillText(box.label, n.x, box.y1)
          }
          ctx.globalAlpha = 1
        }}
        nodePointerAreaPaint={(n, color, ctx, scale) => {
          // Área táctil generosa para el dedo.
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(n.x, n.y, Math.max(n.r + 4, 16 / scale), 0, 2 * Math.PI)
          ctx.fill()
        }}
        onRenderFramePre={(ctx, scale) => {
          // Qué nombres se dibujan: primero Jehová y el nodo abierto (siempre), luego sus vecinos y
          // después los más conectados. Si un nombre se encima con otro ya puesto, se oculta hasta
          // acercar el zoom. De lejos solo salen los nodos importantes.
          const rank = (n) => (n.isRoot ? 3e3 : n.id === focusId ? 2e3 : neighbors.has(n.id) ? 1e3 + n.deg : n.deg)
          // Los puntos también cuentan: un nombre no se dibuja encima de otro nodo.
          const boxes = data.nodes.filter((n) => Number.isFinite(n.x)).map((n) => ({ id: n.id, x1: n.x - n.r, x2: n.x + n.r, y1: n.y - n.r, y2: n.y + n.r }))
          labels.current = new Set()
          for (const n of [...data.nodes].sort((a, b) => rank(b) - rank(a))) {
            if (!Number.isFinite(n.x)) continue
            const must = n.isRoot || n.id === focusId
            if (!must && !neighbors.has(n.id) && scale < (n.deg >= 4 ? 0.45 : 0.9)) continue
            const box = labelBox(ctx, n, scale, n.id === focusId)
            if (!must && boxes.some((b) => b.id !== n.id && box.x1 < b.x2 && box.x2 > b.x1 && box.y1 < b.y2 && box.y2 > b.y1)) continue
            boxes.push(box)
            labels.current.add(n.id)
          }
        }}
        onNodeClick={(n) => onNodeTap(n.id)}
        onBackgroundClick={() => {
          // Doble toque en el fondo: ver todo el mapa.
          const now = Date.now()
          if (now - lastBgTap.current < 320) fg.current?.zoomToFit(500, FIT_PAD)
          lastBgTap.current = now
          onBackgroundTap()
        }}
        onEngineStop={() => {
          // Se ajusta cada vez que el mapa termina de acomodarse (por ejemplo, si llegan nodos nuevos
          // al abrir), mientras el usuario no lo haya movido ni abierto un nodo.
          if (didFit.current || !fg.current) return
          if (data.nodes.length > 1) fg.current.zoomToFit(400, FIT_PAD)
          else {
            fg.current.centerAt(0, 0, 0)
            fg.current.zoom(1.8, 0)
          }
        }}
      />
    </div>
  )
})

export default Graph
