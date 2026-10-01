import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { nodeColor, ROOT_ID } from '../lib/model.js'
import { buildResolver, extractLinks } from '../lib/markdown.js'

const BG = '#0e0e10'
const LINK = 'rgba(160,160,175,0.28)'
const LINK_DIM = 'rgba(160,160,175,0.08)'
const LINK_HI = 'rgba(220,221,222,0.75)'

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
    // Los [[enlaces]] dentro de las notas también se dibujan, más tenues.
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
      g.origin = n.origin
      g.isRoot = n.id === ROOT_ID
      g.r = g.isRoot ? 9 : 4 + Math.min(6, Math.sqrt(degree.get(n.id) ?? 0) * 1.6)
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
    f.d3Force('charge').strength(-140).distanceMax(400)
    f.d3Force('link').distance(90)
  }, [])

  useImperativeHandle(ref, () => ({
    focus(id, zoom = 2.2) {
      const n = cache.current.get(id)
      if (!n || n.x == null || !fg.current) return
      fg.current.centerAt(n.x, n.y, 500)
      fg.current.zoom(Math.max(zoom, fg.current.zoom()), 500)
    },
  }))

  const linkEnds = (l) => [typeof l.source === 'object' ? l.source.id : l.source, typeof l.target === 'object' ? l.target.id : l.target]
  const isHi = (l) => focusId && linkEnds(l).includes(focusId)

  return (
    <div className="graph" ref={wrap}>
      <ForceGraph2D
        ref={fg}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor={BG}
        minZoom={0.15}
        maxZoom={10}
        cooldownTicks={300}
        d3VelocityDecay={0.35}
        linkCurvature={0}
        linkColor={(l) => (isHi(l) ? LINK_HI : focusId ? LINK_DIM : LINK)}
        linkWidth={(l) => (isHi(l) ? 1.4 : 1)}
        linkLineDash={(l) => (l.implicit ? [3, 3] : null)}
        linkDirectionalArrowLength={(l) => (l.implicit ? 0 : 3.5)}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(l) => (isHi(l) ? LINK_HI : focusId ? LINK_DIM : LINK)}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(l, ctx, scale) => {
          if (!l.rel || (scale < 2.6 && !isHi(l))) return
          const s = l.source
          const t = l.target
          if (s.x == null || t.x == null) return
          const fs = 9 / scale
          ctx.font = `600 ${fs}px -apple-system, system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const x = (s.x + t.x) / 2
          const y = (s.y + t.y) / 2
          const w = ctx.measureText(l.rel).width
          ctx.fillStyle = BG
          ctx.fillRect(x - w / 2 - 2 / scale, y - fs / 2 - 1 / scale, w + 4 / scale, fs + 2 / scale)
          ctx.fillStyle = isHi(l) ? '#c8c8d0' : '#7c7c86'
          ctx.fillText(l.rel, x, y)
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const dim = focusId && n.id !== focusId && !neighbors.has(n.id)
          ctx.globalAlpha = dim ? 0.25 : 1
          const r = n.r
          // Origen: JW = relleno, mío = anillo, mixto = medio relleno.
          ctx.beginPath()
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
          if (n.origin === 'propio' && !n.isRoot) {
            ctx.fillStyle = BG
            ctx.fill()
            ctx.lineWidth = Math.max(1.2, r * 0.32)
            ctx.strokeStyle = n.color
            ctx.stroke()
          } else {
            ctx.fillStyle = n.color
            ctx.fill()
            if (n.origin === 'mixto' && !n.isRoot) {
              ctx.beginPath()
              ctx.arc(n.x, n.y, r * 0.55, -Math.PI / 2, Math.PI / 2)
              ctx.closePath()
              ctx.fillStyle = BG
              ctx.fill()
            }
          }
          if (n.id === focusId) {
            ctx.beginPath()
            ctx.arc(n.x, n.y, r + 3, 0, 2 * Math.PI)
            ctx.lineWidth = 1 / scale + 0.6
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'
            ctx.stroke()
          }
          const showLabel = n.isRoot || n.id === focusId || neighbors.has(n.id) || scale >= 1.3
          if (showLabel) {
            const fs = (n.isRoot ? 13 : 11) / scale
            ctx.font = `${n.isRoot ? 600 : 400} ${fs}px -apple-system, system-ui, sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = n.isRoot ? n.color : '#c9c9d1'
            const label = n.title.length > 32 ? n.title.slice(0, 31) + '…' : n.title
            ctx.fillText(label, n.x, n.y + r + 3 / scale)
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
          if (data.nodes.length > 1) fg.current.zoomToFit(400, 60)
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
