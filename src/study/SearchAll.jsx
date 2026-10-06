import { useMemo, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { searchAll } from './search.js'

const GROUPS = [['node', 'Mapa'], ['entry', 'Estudio'], ['verse', 'Mi Biblia']]

// Buscar en todo: escribes "valor" y salen tus nodos, tus entradas de Estudio (también tus respuestas
// de las reuniones) y los textos de Mi Biblia. Se queda abierto debajo de lo que abras, para volver.
export default function SearchAll({ nodes, entries, onPick, onClose }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => searchAll(q, { nodes, entries }), [q, nodes, entries])

  return (
    <div className="overlay search-all">
      <header className="bar">
        <button className="bar-btn back" onClick={onClose}><Icon d={ICONS.back} size={18} stroke={2} /> Estudio</button>
        <span className="bar-title">Buscar</span>
        <span />
      </header>
      <div className="editor-body">
        <input
          className="input note-search"
          type="search"
          autoFocus
          enterKeyHint="search"
          placeholder="Buscar en el mapa, Estudio y Mi Biblia"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q.trim().length >= 2 && !results.length && <p className="hint center">No encontré «{q.trim()}».</p>}
        {q.trim().length < 2 && <p className="hint">Busca una palabra, un tema o una cita: también encuentra lo que respondiste en tus reuniones.</p>}
        {GROUPS.map(([type, label]) => {
          const list = results.filter((r) => r.type === type)
          if (!list.length) return null
          return (
            <section key={type}>
              <h2 className="section-label">{label} · {list.length}</h2>
              <ul className="entry-list">
                {list.map((r) => (
                  <li key={r.id}>
                    <button className="entry-row search-row" onClick={() => onPick(r)}>
                      <span className="entry-main">
                        <span className="entry-title">{r.title || 'Sin título'}</span>
                        <span className="search-sub">{r.type === 'entry' ? r.sub : ''}{r.type === 'entry' && r.snip ? ' · ' : ''}
                          {r.snip && <>{r.snip.before}<mark>{r.snip.match}</mark>{r.snip.after}</>}
                        </span>
                      </span>
                      <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
