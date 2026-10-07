import { useMemo, useState } from 'react'
import { nodeColor, normKey } from '../lib/model.js'
import { plainText } from '../lib/markdown.js'

// Barra de búsqueda minimalista: busca en títulos y en el texto de las notas.
export default function Search({ nodes, onPick, onMenu, alert, below }) {
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)

  const index = useMemo(
    () => nodes.map((n) => {
      const text = plainText(n.note) + ' ' + n.sources.map((s) => s.label).join(' ')
      return { node: n, title: normKey(n.title), text, textKey: normKey(text) }
    }),
    [nodes],
  )

  const results = useMemo(() => {
    const words = normKey(q).split(' ').filter(Boolean)
    if (!words.length) return []
    const out = []
    for (const it of index) {
      if (!words.every((w) => it.title.includes(w) || it.textKey.includes(w))) continue
      const inTitle = words.every((w) => it.title.includes(w))
      // Primero el título exacto, luego el que empieza con lo escrito, luego el que tiene todas las palabras.
      const qk = words.join(' ')
      const score = it.title === qk ? 0 : it.title.startsWith(qk) ? 1 : inTitle ? 2 : it.title.startsWith(words[0]) ? 3 : 4
      const inTitleCount = words.filter((w) => it.title.includes(w)).length
      out.push({ ...it, score, inTitleCount, snippet: snippet(it.text, it.textKey, words) })
    }
    return out.sort((a, b) => a.score - b.score || b.inTitleCount - a.inTitleCount || a.node.title.localeCompare(b.node.title, 'es')).slice(0, 50)
  }, [index, q])

  // Sin escribir nada: los nodos que editaste hace poco, para llegar rápido.
  const recent = useMemo(() => [...nodes].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 8), [nodes])
  const open = focused && (q.trim() || recent.length > 1)
  const pick = (id) => { onPick(id); setQ(''); document.activeElement?.blur() }

  return (
    <>
      <div className="topbar-wrap">
      <div className="topbar">
        <div className="search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Buscar en tu mapa"
            value={q}
            enterKeyHint="search"
            autoCorrect="off"
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
          />
          {q && <button className="clear" aria-label="Borrar" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ('')}>×</button>}
        </div>
        <button className="icon-btn" aria-label={alert ? 'Menú (conviene hacer un respaldo)' : 'Menú'} onClick={onMenu}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {alert && <i className="menu-alert" />}
        </button>
      </div>
      {below}
      </div>
      {open && (
        <div className="search-results">
          {!q.trim() ? (
            <>
              <p className="results-label">Recientes</p>
              <ul className="results">
                {recent.map((node) => (
                  <li key={node.id}>
                    <button className="result" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(node.id)}>
                      <span className="dot" style={{ background: nodeColor(node) }} />
                      <span className="result-main"><span className="result-title">{node.title}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : results.length === 0 ? (
            <p className="hint pad">Sin resultados.</p>
          ) : (
            <ul className="results">
              {results.map(({ node, snippet }) => (
                <li key={node.id}>
                  <button className="result" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(node.id)}>
                    <span className="dot" style={{ background: nodeColor(node) }} />
                    <span className="result-main">
                      <span className="result-title">{node.title}</span>
                      {snippet && <span className="snippet">{snippet}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}

function snippet(text, key, words) {
  // normKey conserva la longitud del texto salvo espacios repetidos; plainText ya los colapsó.
  const pos = Math.min(...words.map((w) => key.indexOf(w)).filter((i) => i >= 0))
  if (!isFinite(pos)) return text.slice(0, 90)
  const start = Math.max(0, pos - 35)
  return (start > 0 ? '…' : '') + text.slice(start, start + 110).trim() + (start + 110 < text.length ? '…' : '')
}
