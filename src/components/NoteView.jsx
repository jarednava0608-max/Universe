import { useMemo, useRef } from 'react'
import { ROOT_ID } from '../lib/model.js'
import { buildResolver, renderNote } from '../lib/markdown.js'

// Nota a pantalla completa: solo el título y la definición.
// Se cierra deslizando hacia la derecha; "Editar" va al final del texto.
export default function NoteView({ node, nodes, onOpen, onBack, onClose, onEdit, onCreateFromLink }) {
  const panel = useRef()
  const touch = useRef(null)

  const resolve = useMemo(() => buildResolver(nodes), [nodes])
  const html = useMemo(() => renderNote(node.note, resolve), [node.note, resolve])

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

  const isRoot = node.id === ROOT_ID

  return (
    <div className="note" ref={panel} key={node.id} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <article className="note-scroll">
        <h1 className={'note-title' + (isRoot ? ' root' : '')}>{node.title}</h1>

        {node.note.trim() ? (
          <div className="md" onClick={onContentClick} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="empty">Aún no hay definición.</p>
        )}

        {node.sources.length > 0 && (
          <section className="sources">
            <h2>Fuentes</h2>
            <ol>
              {node.sources.map((s, i) => (
                <li key={i}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                      <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </a>
                  ) : (
                    s.label
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="note-footer">
          <button onClick={onEdit}>Editar</button>
          <button onClick={onClose}>Cerrar</button>
        </footer>
      </article>
    </div>
  )
}
