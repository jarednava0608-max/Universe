import { useMemo, useState } from 'react'
import { buildResolver, renderNote } from '../lib/markdown.js'

// Vista rápida de un nodo del mapa desde una nota: su título y su definición, sin salir de la nota.
// Los [[enlaces]] de adentro abren el otro nodo aquí mismo; las citas abren su hoja (App).
export default function NodePeek({ node, nodes, onOpenMap, onClose }) {
  const [current, setCurrent] = useState(node)
  const resolve = useMemo(() => buildResolver(nodes), [nodes])
  const html = useMemo(() => renderNote(current.note || '', resolve), [current, resolve])

  function onClick(e) {
    const a = e.target.closest('a')
    if (!a) return
    if (a.dataset.node) {
      e.preventDefault()
      const next = nodes.find((n) => n.id === a.dataset.node)
      if (next) setCurrent(next)
    } else if (a.dataset.missing) e.preventDefault()
  }

  return (
    <div className="sheet-backdrop peek-backdrop" onClick={onClose}>
      <div className="sheet peek" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <h2 className="peek-title">{current.title}</h2>
        {current.note?.trim() ? (
          <div className="md peek-body" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="hint">Este nodo todavía no tiene definición.</p>
        )}
        <button className="secondary" onClick={() => onOpenMap(current)}>Abrir en el mapa</button>
      </div>
    </div>
  )
}
