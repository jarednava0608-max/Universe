import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ROOT_ID, normKey } from '../lib/model.js'
import NodePicker from './NodePicker.jsx'
import { unwrapCallouts } from '../lib/markdown.js'

// Crear / editar un nodo: solo título y definición.
// Para conectar ideas se enlaza otro nodo dentro del texto con [[Título]].
// (Tipo, origen, fuentes y conexiones se conservan en los datos pero no se editan aquí.)
export default function NodeEditor({ node, isNew, nodes, onSave, onCancel, onDelete }) {
  // Las marcas antiguas [!jw] / [!yo] se limpian al editar.
  // Un nodo nuevo empieza con el título vacío (no "Sin título"), así el cursor queda listo para escribirlo.
  const [draft, setDraft] = useState(() => ({ ...node, title: isNew && node.title === 'Sin título' ? '' : node.title, note: unwrapCallouts(node.note) }))
  const [picker, setPicker] = useState(false)
  const [error, setError] = useState('')
  const noteRef = useRef()

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const isRoot = node.id === ROOT_ID
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  // El texto crece con el contenido (se escribe como en una hoja).
  useLayoutEffect(() => {
    const ta = noteRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }, [draft.note])

  function insert(text) {
    const ta = noteRef.current
    const start = ta?.selectionStart ?? draft.note.length
    const end = ta?.selectionEnd ?? draft.note.length
    set({ note: draft.note.slice(0, start) + text + draft.note.slice(end) })
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + text.length
    })
  }

  function save() {
    const title = draft.title.trim()
    if (!title) return setError('Escribe un título.')
    const clash = nodes.find((n) => n.id !== node.id && normKey(n.title) === normKey(title))
    if (clash) return setError(`Ya existe un nodo llamado «${clash.title}».`)
    onSave({ ...draft, title }, { removed: [], added: [] })
  }

  return (
    <div className="overlay editor">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">{isNew ? 'Nuevo' : 'Editar'}</span>
        <button className="bar-btn strong" onClick={save}>Guardar</button>
      </header>

      <div className="editor-body">
        {error && <p className="error">{error}</p>}

        <input
          className="title-input"
          value={draft.title}
          placeholder="Título"
          autoFocus={isNew && !draft.title}
          onChange={(e) => set({ title: e.target.value })}
        />

        <textarea
          ref={noteRef}
          className="body-input"
          value={draft.note}
          placeholder="Escribe la definición…"
          onChange={(e) => set({ note: e.target.value })}
        />

        <div className="editor-foot">
          <button className="link-pill" onClick={() => setPicker(true)}>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Enlazar otro nodo
          </button>
          <p className="foot-hint">Los nodos enlazados en el texto quedan conectados en el mapa.</p>
        </div>

        {!isNew && !isRoot && (
          <button className="delete-btn" onClick={() => confirm(`¿Eliminar «${node.title}»?`) && onDelete()}>
            Eliminar nodo
          </button>
        )}
      </div>

      {picker && (
        <NodePicker
          nodes={nodes}
          excludeId={node.id}
          title="Enlazar"
          onCancel={() => setPicker(false)}
          onPick={(id) => {
            insert(`[[${byId.get(id).title}]]`)
            setPicker(false)
          }}
          onCreate={(title) => {
            insert(`[[${title}]]`)
            setPicker(false)
          }}
        />
      )}
    </div>
  )
}
