import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { nodeColor, ROOT_ID } from '../lib/model.js'
import { buildResolver, extractLinks } from '../lib/markdown.js'

const BG = '#0c0a08'
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
const LINK = 'rgba(255,236,205,0.14)'
const LINK_DIM = 'rgba(255,236,205,0.04)'
const LINK_HI = 'rgba(245,210,122,0.6)'

// Vista de grafo: canvas con zoom/arrastre táctil y líneas rectas.
const Graph = forwardRef(function Graph({ nodes, edges, focusId, onNodeTap, onBackgroundTap }, ref) {
  const fg = useRef()
  const wrap = useRef()
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const cache = useRef(new Map()) // conserva posiciones entre renders
  const didFit = useRef(false)

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

    const gNodes = nodes.map((n) => {
      const g = old.get(n.id) ?? { id: n.id }
      g.title = n.title
      g.color = nodeColor(n)
      g.isRoot = n.id === ROOT_ID
      g.r = g.isRoot ? 8 : 3.5 + Math.min(5, Math.sqrt(degree.get(n.id) ?? 0) * 1.4)
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

  useEffect(() => {
    const f = fg.current
    if (!f) return
    f.d3Force('charge').strength(-150).distanceMax(420)
    f.d3Force('link').distance(90)
  }, [])

  useImperativeHandle(ref, () => ({
    fit() {
      fg.current?.zoomToFit(600, 70)
    },
    focus(id, zoom = 2.2) {
      const n = cache.current.get(id)
      if (!n || n.x == null || !fg.current) return
      // Centra el nodo en la mitad de arriba (la nota abre como hoja en la mitad de abajo).
      const z = Math.max(zoom, fg.current.zoom())
      const h = wrap.current?.clientHeight ?? window.innerHeight
      fg.current.centerAt(n.x, n.y + (h * 0.22) / z, 500)
      fg.current.zoom(z, 500)
    },
  }))

  const linkEnds = (l) => [typeof l.source === 'object' ? l.source.id : l.source, typeof l.target === 'object' ? l.target.id : l.target]
  const isHi = (l) => focusId && linkEnds(l).includes(focusId)
  const linkColor = (l) => (isHi(l) ? LINK_HI : focusId ? LINK_DIM : LINK)

  return (
    <div className="graph" ref={wrap}>
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
        linkWidth={(l) => (isHi(l) ? 1.2 : 0.8)}
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
          ctx.strokeStyle = BG
          ctx.strokeText(l.rel, x, y)
          ctx.fillStyle = isHi(l) ? 'rgba(245,225,180,0.85)' : 'rgba(255,236,205,0.42)'
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

          // Brillo sutil alrededor de cada nodo.
          ctx.beginPath()
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
          ctx.fillStyle = n.color
          ctx.shadowColor = n.isRoot ? 'rgba(245,210,122,0.6)' : 'rgba(255,236,205,0.35)'
          ctx.shadowBlur = n.isRoot ? 18 : focused ? 14 : 8
          ctx.fill()
          ctx.shadowBlur = 0

          if (focused) {
            ctx.beginPath()
            ctx.arc(n.x, n.y, r + 4 / scale, 0, 2 * Math.PI)
            ctx.lineWidth = 1.5 / scale
            ctx.strokeStyle = 'rgba(245,210,122,0.9)'
            ctx.stroke()
          }

          const showLabel = n.isRoot || focused || neighbors.has(n.id) || scale >= 0.9
          if (showLabel) {
            const fs = (n.isRoot ? 13 : 11) / scale
            ctx.font = `${n.isRoot ? 600 : 500} ${fs}px ${FONT}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = n.isRoot ? n.color : focused ? '#f7f0e4' : 'rgba(241,235,226,0.78)'
            const label = n.title.length > 32 ? n.title.slice(0, 31) + '…' : n.title
            ctx.fillText(label, n.x, n.y + r + (focused ? 9 : 4) / scale)
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
        onNodeClick={(n) => onNodeTap(n.id)}
        onBackgroundClick={onBackgroundTap}
        onEngineStop={() => {
          if (didFit.current || !fg.current) return
          didFit.current = true
          if (data.nodes.length > 1) fg.current.zoomToFit(400, 70)
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
