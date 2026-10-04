import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ROOT_ID } from '../lib/model.js'
import { buildResolver, renderNote } from '../lib/markdown.js'
import { buildSupport, supportLines } from '../lib/support.js'
import Icon, { ICONS } from './Icon.jsx'

const HALF = 0.5 // la hoja abre mostrando la mitad de la pantalla
const SNAP = 70 // px de arrastre para cambiar de altura

// Nota como hoja de iOS con dos alturas (como Apple Maps): solo título y texto.
// - Abre a la mitad. Arrastrar hacia arriba: se ve completa.
// - Arrastrar hacia abajo: de completa a la mitad, y de la mitad se cierra. Tocar fuera también cierra.
// - Deslizar a la derecha: volver a la nota anterior.
// - Lápiz arriba a la derecha: editar.
// - Al final, en texto: en qué se apoya (hasta un texto bíblico) y qué ideas la usan.
// (Las fuentes se guardan pero no se muestran.)
export default function NoteView({ node, nodes, onOpen, onBack, onClose, onEdit, onCreateFromLink }) {
  const sheet = useRef()
  const scroller = useRef()
  const backdrop = useRef()
  const [full, setFull] = useState(false)
  const fullRef = useRef(false)
  const closing = useRef(false)

  const resolve = useMemo(() => buildResolver(nodes), [nodes])
  const html = useMemo(() => renderNote(node.note, resolve), [node.note, resolve])
  const support = useMemo(() => buildSupport(nodes), [nodes])
  const lines = useMemo(() => supportLines(node, nodes, support).map((l) => ({ ...l, html: renderNote(l.md, resolve) })), [node, nodes, support, resolve])

  const halfOffset = () => Math.round(sheet.current.offsetHeight - window.innerHeight * HALF)

  function place(y, animate = true) {
    const el = sheet.current
    el.style.transition = animate ? '' : 'none'
    el.style.transform = `translateY(${y}px)`
    const h = el.offsetHeight || 1
    backdrop.current.style.transition = animate ? '' : 'none'
    backdrop.current.style.opacity = String(Math.max(0, Math.min(1, 1 - y / h)) * 0.9 + 0.1)
  }

  function snapTo(isFull) {
    fullRef.current = isFull
    setFull(isFull)
    place(isFull ? 0 : halfOffset())
  }

  function dismiss() {
    if (closing.current) return
    closing.current = true
    place(sheet.current.offsetHeight)
    backdrop.current.style.opacity = '0'
    setTimeout(onClose, 230)
  }

  // Entrada: sube desde abajo hasta la mitad.
  useLayoutEffect(() => {
    place(sheet.current.offsetHeight, false)
    requestAnimationFrame(() => requestAnimationFrame(() => place(halfOffset())))
  }, [])

  // Al saltar a otra nota por un enlace: arriba del texto y la hoja en su lugar.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
    if (!closing.current) place(fullRef.current ? 0 : halfOffset(), false)
  }, [node.id])

  // Gestos con listeners nativos (no pasivos) para poder evitar el scroll mientras se arrastra la hoja.
  useEffect(() => {
    const el = sheet.current
    let s = null
    const start = (e) => {
      const t = e.touches[0]
      s = {
        x: t.clientX, y: t.clientY, dx: 0, dy: 0, lock: null,
        base: fullRef.current ? 0 : halfOffset(),
        atTop: scroller.current.scrollTop <= 0,
      }
    }
    const move = (e) => {
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (s.lock == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        if (Math.abs(dx) > Math.abs(dy) * 1.4 && dx > 0) s.lock = 'x'
        else if (!fullRef.current || (dy > 0 && s.atTop)) s.lock = 'sheet'
        else s.lock = 'scroll'
      }
      if (s.lock === 'sheet') {
        e.preventDefault()
        s.dy = dy
        place(Math.max(0, s.base + dy), false)
      } else if (s.lock === 'x') {
        e.preventDefault()
        s.dx = Math.max(0, dx)
        el.style.transition = 'none'
        el.style.transform = `translate(${s.dx}px, ${s.base}px)`
      }
    }
    const end = () => {
      if (!s) return
      const { lock, dx, dy } = s
      s = null
      if (lock === 'x') {
        if (dx > 90) {
          el.style.transition = ''
          el.style.transform = `translate(100%, ${fullRef.current ? 0 : halfOffset()}px)`
          return setTimeout(onBack, 180)
        }
        return place(fullRef.current ? 0 : halfOffset())
      }
      if (lock !== 'sheet') return
      if (fullRef.current) {
        if (dy > halfOffset() + SNAP) return dismiss()
        return snapTo(dy < SNAP)
      }
      if (dy < -SNAP) return snapTo(true)
      if (dy > SNAP) return dismiss()
      snapTo(false)
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
      <div className={'note' + (full ? ' full' : ' half')} ref={sheet} role="dialog" aria-label={node.title}>
        <button className="note-grabber" aria-label={full ? 'Reducir' : 'Ver completa'} onClick={() => snapTo(!full)} />
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
          {lines.length > 0 && (
            <footer className="note-support" onClick={onContentClick}>
              {lines.map((l) => (
                <div key={l.key} className={'ns-row' + (l.missing ? ' missing' : '')}>
                  <p className="ns-label">{l.label}</p>
                  <div className="md ns-md" dangerouslySetInnerHTML={{ __html: l.html }} />
                </div>
              ))}
            </footer>
          )}
        </article>
      </div>
    </>
  )
}
