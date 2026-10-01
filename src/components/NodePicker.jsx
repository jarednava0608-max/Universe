import { useMemo, useState } from 'react'
import { nodeColor, normKey } from '../lib/model.js'

// Lista para elegir un nodo (para conectar o enlazar). Permite crear uno nuevo.
export default function NodePicker({ nodes, excludeId, title = 'Elegir nodo', onPick, onCreate, onCancel }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const k = normKey(q)
    return nodes
      .filter((n) => n.id !== excludeId && (!k || normKey(n.title).includes(k)))
      .sort((a, b) => a.title.localeCompare(b.title, 'es'))
      .slice(0, 80)
  }, [nodes, q, excludeId])
  const exact = nodes.some((n) => normKey(n.title) === normKey(q))

  return (
    <div className="overlay picker">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">{title}</span>
        <span className="bar-spacer" />
      </header>
      <div className="picker-body">
        <input className="input search-input" autoFocus placeholder="Buscar nodo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="results">
          {q.trim() && !exact && onCreate && (
            <li>
              <button className="result" onClick={() => onCreate(q.trim())}>
                <span className="plus">+</span>
                <span className="result-title">Crear «{q.trim()}»</span>
              </button>
            </li>
          )}
          {list.map((n) => (
            <li key={n.id}>
              <button className="result" onClick={() => onPick(n.id)}>
                <span className="dot" style={{ background: nodeColor(n) }} />
                <span className="result-title">{n.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
