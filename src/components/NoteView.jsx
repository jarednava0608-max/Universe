import { useEffect, useMemo, useRef, useState } from 'react'
import { ROOT_ID } from '../lib/model.js'
import { buildResolver, renderNote } from '../lib/markdown.js'
import Icon, { ICONS } from './Icon.jsx'

const CLOSE_AT = 110 // px que hay que arrastrar hacia abajo para cerrar

// Nota como hoja de iOS: solo título y texto, como Obsidian.
// - Deslizar hacia abajo (desde arriba del texto) o tocar fuera: cerrar.
// - Deslizar a la derecha: volver a la nota anterior.
// - Lápiz arriba a la derecha: editar.
// (Las fuentes se guardan pero no se muestran.)
export default function NoteView({ node, nodes, onOpen, onBack, onClose, onEdit, onCreateFromLink }) {
  const sheet = useRef()
  const scroller = useRef()
  const backdrop = useRef()
  const [closing, setClosing] = useState(false)

  const resolve = useMemo(() => buildResolver(nodes), [nodes])
  const html = useMemo(() => renderNote(node.note, resolve), [node.note, resolve])

  // Al saltar a otra nota por un enlace, vuelve arriba.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
  }, [node.id])

  function dismiss() {
    if (closing) return
    setClosing(true)
    sheet.current.style.transition = ''
    sheet.current.style.transform = 'translateY(100%)'
    backdrop.current.style.opacity = '0'
    setTimeout(onClose, 220)
  }

  // Gestos con listeners nativos (no pasivos) para poder evitar el rebote del scroll.
  useEffect(() => {
    const el = sheet.current
    let s = null
    const reset = () => {
      el.style.transition = ''
      el.style.transform = ''
      backdrop.current.style.opacity = ''
    }
    const start = (e) => {
      const t = e.touches[0]
      s = { x: t.clientX, y: t.clientY, dx: 0, dy: 0, lock: null, atTop: scroller.current.scrollTop <= 0 }
    }
    const move = (e) => {
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (s.lock == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        if (Math.abs(dx) > Math.abs(dy) * 1.4 && dx > 0) s.lock = 'x'
        else if (dy > 0 && s.atTop && Math.abs(dy) > Math.abs(dx)) s.lock = 'down'
        else s.lock = 'scroll'
      }
      if (s.lock === 'down') {
        e.preventDefault()
        s.dy = Math.max(0, dy)
        el.style.transition = 'none'
        el.style.transform = `translateY(${s.dy}px)`
        backdrop.current.style.opacity = String(Math.max(0, 1 - s.dy / 400))
      } else if (s.lock === 'x') {
        e.preventDefault()
        s.dx = Math.max(0, dx)
        el.style.transition = 'none'
        el.style.transform = `translateX(${s.dx}px)`
      }
    }
    const end = () => {
      if (!s) return
      const { lock, dx, dy } = s
      s = null
      if (lock === 'down' && dy > CLOSE_AT) return dismiss()
      if (lock === 'x' && dx > 90) {
        el.style.transition = ''
        el.style.transform = 'translateX(100%)'
        return setTimeout(onBack, 180)
      }
      if (lock === 'down' || lock === 'x') reset()
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  })

  // Al volver a otra nota (deslizar a la derecha) la hoja reaparece en su lugar.
  useEffect(() => {
    const el = sheet.current
    el.style.transition = 'none'
    el.style.transform = ''
  }, [node.id])

  function onContentClick(e) {
    const a = e.target.closest('a')
    if (!a) return
    e.preventDefault()
    if (a.dataset.node) return onOpen(a.dataset.node)
    if (a.dataset.missing) return onCreateFromLink(a.dataset.missing)
    const href = a.getAttribute('href')
    if (href && /^https?:/i.test(href)) window.open(href, '_blank', 'noopener')
  }

  const isRoot = node.id === ROOT_ID

  return (
    <>
      <div className="note-backdrop" ref={backdrop} onClick={dismiss} />
      <div className="note" ref={sheet} role="dialog" aria-label={node.title}>
        <div className="note-grabber" />
        <button className="note-edit" aria-label="Editar" onClick={onEdit}>
          <Icon d={ICONS.editar} size={17} stroke={1.8} />
        </button>
        <article className="note-scroll" ref={scroller} key={node.id}>
          <h1 className={'note-title' + (isRoot ? ' root' : '')}>{node.title}</h1>
          {node.note.trim() ? (
            <div className="md" onClick={onContentClick} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="empty">Aún no hay definición.</p>
          )}
        </article>
      </div>
    </>
  )
}
