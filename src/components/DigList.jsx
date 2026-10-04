import { useMemo } from 'react'
import Sheet from './Sheet.jsx'
import { buildSupport } from '../lib/support.js'
import { definitionText } from '../lib/markdown.js'

// "Por escarbar": las ideas del mapa que todavía no llegan a ningún texto bíblico
// (ni lo citan ni se apoyan en otra idea que lo haga). Las que más ideas usan van primero.
export default function DigList({ nodes, onOpen, onClose }) {
  const sup = useMemo(() => buildSupport(nodes), [nodes])
  const list = sup.unfounded()
  return (
    <Sheet title={`Por escarbar · ${list.length}`} onClose={onClose}>
      {list.length ? (
        <>
          <p className="hint">Ideas que todavía no llegan a ningún texto bíblico. Cuando encuentres el texto que las apoya, escríbelo en su nota o enlaza la idea que lo tiene.</p>
          <ul className="entry-list">
            {list.map((n) => {
              const used = sup.usedBy(n.id).length
              const def = definitionText(n.note)
              return (
                <li key={n.id}>
                  <button className="entry-row" onClick={() => onOpen(n.id)}>
                    <span className="entry-main">
                      <span className="entry-title">{n.title}</span>
                      <span className="entry-sub">{[used ? `La usan ${used} ${used === 1 ? 'idea' : 'ideas'}` : '', def].filter(Boolean).join(' · ') || 'Aún no hay definición.'}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="hint">Todas tus ideas llegan a un texto bíblico.</p>
      )}
    </Sheet>
  )
}
