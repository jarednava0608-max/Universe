import { useMemo, useRef } from 'react'
import { NODE_TYPES, ORIGINS, nodeColor, ROOT_ID } from '../lib/model.js'
import { buildResolver, extractLinks, renderNote } from '../lib/markdown.js'

// Nota a pantalla completa, como en Obsidian: solo título y texto.
// Se cierra deslizando hacia la derecha. Las acciones van al final del texto.
export default function NoteView({ node, nodes, edges, onOpen, onBack, onClose, onEdit, onNewLinked, onCreateFromLink }) {
  const panel = useRef()
  const touch = useRef(null)

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const resolve = useMemo(() => buildResolver(nodes), [nodes])
  const html = useMemo(() => renderNote(node.note, resolve), [node.note, resolve])

  const outgoing = edges.filter((e) => e.source === node.id && byId.has(e.target))
  const incoming = edges.filter((e) => e.target === node.id && byId.has(e.source))
  const mentions = useMemo(
    () => nodes.filter((n) => n.id !== node.id && extractLinks(n.note).some((t) => resolve(t) === node.id)),
    [nodes, node.id, resolve],
  )

  function onContentClick(e) {
    const a = e.target.closest('a')
    if (!a) return
    e.preventDefault()
    if (a.dataset.node) return onOpen(a.dataset.node)
    if (a.dataset.missing) return onCreateFromLink(a.dataset.missing)
    const href = a.getAttribute('href')
    if (href && /^https?:/i.test(href)) window.open(href, '_blank', 'noopener')
  }

  // Deslizar a la derecha = volver.
  function onTouchStart(e) {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY, dx: 0, lock: null }
  }
  function onTouchMove(e) {
    const s = touch.current
    if (!s) return
    const t = e.touches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (s.lock == null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) s.lock = Math.abs(dx) > Math.abs(dy) * 1.4 && dx > 0 ? 'x' : 'y'
    if (s.lock !== 'x') return
    s.dx = Math.max(0, dx)
    panel.current.style.transition = 'none'
    panel.current.style.transform = `translateX(${s.dx}px)`
  }
  function onTouchEnd() {
    const s = touch.current
    touch.current = null
    if (!s || s.lock !== 'x') return
    const p = panel.current
    p.style.transition = ''
    if (s.dx > 90) {
      p.style.transform = 'translateX(100%)'
      setTimeout(onBack, 180)
    } else {
      p.style.transform = ''
    }
  }

  const type = NODE_TYPES[node.type]
  const color = nodeColor(node)
  const isRoot = node.id === ROOT_ID

  return (
    <div className="note" ref={panel} key={node.id} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <article className="note-scroll">
        <h1 className="note-title" style={isRoot ? { color } : undefined}>{node.title}</h1>
        <p className="note-meta">
          <span className="dot" style={{ background: color }} />
          {isRoot ? 'Raíz' : type?.label}
          <span className="sep">·</span>
          <span className={'origin origin-' + node.origin}>{ORIGINS[node.origin]?.label}</span>
        </p>

        {node.note.trim() ? (
          <div className="md" onClick={onContentClick} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="empty">Nota vacía.</p>
        )}

        {node.sources.length > 0 && (
          <section className="note-section">
            <h2>Fuentes</h2>
            <ul className="sources">
              {node.sources.map((s, i) => (
                <li key={i}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
                  ) : (
                    s.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(outgoing.length > 0 || incoming.length > 0) && (
          <section className="note-section">
            <h2>Conexiones</h2>
            <ul className="links">
              {outgoing.map((e) => (
                <LinkRow key={e.id} rel={e.rel} dir="→" node={byId.get(e.target)} onOpen={onOpen} />
              ))}
              {incoming.map((e) => (
                <LinkRow key={e.id} rel={e.rel} dir="←" node={byId.get(e.source)} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        )}

        {mentions.length > 0 && (
          <section className="note-section">
            <h2>Mencionado en</h2>
            <ul className="links">
              {mentions.map((n) => (
                <LinkRow key={n.id} node={n} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        )}

        <footer className="note-actions">
          <button className="text-btn" onClick={onEdit}>Editar</button>
          <button className="text-btn" onClick={onNewLinked}>Nuevo nodo conectado</button>
          <button className="text-btn muted" onClick={onClose}>Volver al mapa</button>
        </footer>
      </article>
    </div>
  )
}

function LinkRow({ rel, dir, node, onOpen }) {
  return (
    <li>
      <button className="link-row" onClick={() => onOpen(node.id)}>
        {rel && (
          <span className="rel">
            {dir === '←' ? '← ' : ''}
            {rel}
            {dir === '→' ? ' →' : ''}
          </span>
        )}
        <span className="dot" style={{ background: nodeColor(node) }} />
        <span className="link-title">{node.title}</span>
      </button>
    </li>
  )
}
