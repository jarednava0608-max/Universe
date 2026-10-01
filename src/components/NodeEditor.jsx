import { useMemo, useRef, useState } from 'react'
import { NODE_TYPES, ORIGINS, ROOT_ID, SUGGESTED_RELATIONS, nodeColor, normKey, normRel, isJwUrl } from '../lib/model.js'
import NodePicker from './NodePicker.jsx'

// Crear / editar un nodo: datos, nota, fuentes y conexiones.
export default function NodeEditor({ node, isNew, nodes, edges, initialConnections = [], onSave, onCancel, onDelete, onQuickCreate }) {
  const [draft, setDraft] = useState(() => ({ ...node, sources: node.sources.map((s) => ({ ...s })) }))
  const [removed, setRemoved] = useState(() => new Set())
  const [added, setAdded] = useState(initialConnections)
  const [picker, setPicker] = useState(null) // 'link' | 'connect'
  const [error, setError] = useState('')
  const noteRef = useRef()

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const existing = edges.filter((e) => e.source === node.id || e.target === node.id)
  const isRoot = node.id === ROOT_ID
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  function insert(text) {
    const ta = noteRef.current
    const start = ta?.selectionStart ?? draft.note.length
    const end = ta?.selectionEnd ?? draft.note.length
    const note = draft.note.slice(0, start) + text + draft.note.slice(end)
    set({ note })
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + text.length
    })
  }

  function insertBlock(kind) {
    const before = draft.note.slice(0, noteRef.current?.selectionStart ?? draft.note.length)
    const nl = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
    insert(`${nl}> [!${kind}]\n> `)
  }

  function save() {
    const title = draft.title.trim()
    if (!title) return setError('El título no puede estar vacío.')
    const clash = nodes.find((n) => n.id !== node.id && normKey(n.title) === normKey(title))
    if (clash) return setError(`Ya existe un nodo llamado «${clash.title}».`)
    const sources = draft.sources
      .map((s) => ({ label: s.label.trim(), url: (s.url ?? '').trim() }))
      .filter((s) => s.label || s.url)
      .map((s) => (s.url ? { label: s.label || s.url, url: s.url } : { label: s.label }))
    const bad = sources.find((s) => s.url && !/^https?:\/\//i.test(s.url))
    if (bad) return setError(`El enlace de «${bad.label}» debe empezar con https://`)
    onSave({ ...draft, title, sources }, { removed: [...removed], added })
  }

  async function pickConnect(id) {
    setAdded((a) => [...a, { key: Math.random().toString(36), otherId: id, rel: '', dir: 'out' }])
    setPicker(null)
  }

  return (
    <div className="overlay editor">
      <header className="bar">
        <button className="text-btn muted" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">{isNew ? 'Nuevo nodo' : 'Editar'}</span>
        <button className="text-btn strong" onClick={save}>Guardar</button>
      </header>

      <div className="editor-body">
        {error && <p className="error">{error}</p>}

        <label className="field">
          <span>Título</span>
          <input className="input big" value={draft.title} placeholder="Ej. El Reino de Dios" onChange={(e) => set({ title: e.target.value })} />
        </label>

        {!isRoot && (
          <div className="field">
            <span>Tipo</span>
            <div className="seg">
              {Object.entries(NODE_TYPES).map(([k, t]) => (
                <button key={k} className={draft.type === k ? 'on' : ''} onClick={() => set({ type: k })}>
                  <span className="dot" style={{ background: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <span>Origen</span>
          <div className="seg">
            {Object.entries(ORIGINS).map(([k, o]) => (
              <button key={k} className={draft.origin === k ? 'on' : ''} onClick={() => set({ origin: k })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Nota</span>
          <div className="tools">
            <button onClick={() => setPicker('link')}>[[ Enlazar</button>
            <button onClick={() => insertBlock('jw')}>&gt; JW dice</button>
            <button onClick={() => insertBlock('yo')}>&gt; Yo pienso</button>
          </div>
          <textarea
            ref={noteRef}
            className="input note-input"
            value={draft.note}
            placeholder={'Escribe en markdown.\n[[Título]] enlaza otro nodo.\n> [!jw] para lo que dicen las publicaciones.\n> [!yo] para tu razonamiento.'}
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>

        <div className="field">
          <span>Fuentes</span>
          {draft.sources.map((s, i) => (
            <div className="source-row" key={i}>
              <input className="input" placeholder="Juan 17:3 · La Atalaya 1/2020" value={s.label}
                onChange={(e) => set({ sources: draft.sources.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <input className="input" placeholder="https://wol.jw.org/…" inputMode="url" autoCapitalize="off" value={s.url ?? ''}
                onChange={(e) => set({ sources: draft.sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              {s.url && /^https?:/.test(s.url) && !isJwUrl(s.url) && <p className="hint warn">No es de jw.org ni wol.jw.org.</p>}
              <button className="text-btn danger small" onClick={() => set({ sources: draft.sources.filter((_, j) => j !== i) })}>Quitar fuente</button>
            </div>
          ))}
          <button className="ghost" onClick={() => set({ sources: [...draft.sources, { label: '', url: '' }] })}>+ Añadir fuente</button>
        </div>

        <div className="field">
          <span>Conexiones</span>
          <datalist id="rels">
            {SUGGESTED_RELATIONS.map((r) => <option key={r} value={r} />)}
          </datalist>
          <ul className="conn-list">
            {existing.map((e) => {
              const out = e.source === node.id
              const other = byId.get(out ? e.target : e.source)
              if (!other) return null
              const gone = removed.has(e.id)
              return (
                <li key={e.id} className={gone ? 'gone' : ''}>
                  <ConnLabel out={out} rel={e.rel} self={draft.title} other={other} />
                  <button className="text-btn small danger" onClick={() => setRemoved((r) => { const n = new Set(r); gone ? n.delete(e.id) : n.add(e.id); return n })}>
                    {gone ? 'Deshacer' : 'Quitar'}
                  </button>
                </li>
              )
            })}
            {added.map((c) => {
              const other = byId.get(c.otherId)
              if (!other) return null
              const update = (patch) => setAdded((a) => a.map((x) => (x.key === c.key ? { ...x, ...patch } : x)))
              return (
                <li key={c.key} className="new-conn">
                  <div className="conn-edit">
                    <button className="dir" onClick={() => update({ dir: c.dir === 'out' ? 'in' : 'out' })}>
                      {c.dir === 'out' ? 'Este nodo →' : 'Este nodo ←'}
                    </button>
                    <input className="input" list="rels" placeholder="ENSEÑA" autoCapitalize="characters" value={c.rel}
                      onChange={(e) => update({ rel: e.target.value })} onBlur={(e) => update({ rel: normRel(e.target.value) })} />
                  </div>
                  <ConnLabel out={c.dir === 'out'} rel={normRel(c.rel) || 'RELACIONADO'} self={draft.title || 'Este nodo'} other={other} />
                  <button className="text-btn small danger" onClick={() => setAdded((a) => a.filter((x) => x.key !== c.key))}>Quitar</button>
                </li>
              )
            })}
          </ul>
          <button className="ghost" onClick={() => setPicker('connect')}>+ Conectar con otro nodo</button>
        </div>

        {!isNew && !isRoot && (
          <button className="ghost danger" onClick={() => confirm(`¿Eliminar «${node.title}» y sus conexiones?`) && onDelete()}>
            Eliminar nodo
          </button>
        )}
      </div>

      {picker && (
        <NodePicker
          nodes={nodes}
          excludeId={node.id}
          title={picker === 'link' ? 'Enlazar en la nota' : 'Conectar con'}
          onCancel={() => setPicker(null)}
          onPick={(id) => {
            if (picker === 'link') {
              insert(`[[${byId.get(id).title}]]`)
              setPicker(null)
            } else pickConnect(id)
          }}
          onCreate={async (title) => {
            if (picker === 'link') {
              insert(`[[${title}]]`)
              setPicker(null)
            } else {
              const n = await onQuickCreate(title)
              pickConnect(n.id)
            }
          }}
        />
      )}
    </div>
  )
}

function ConnLabel({ out, rel, self, other }) {
  const a = <span className="conn-node"><span className="dot" style={{ background: nodeColor(other) }} />{other.title}</span>
  return (
    <p className="conn-label">
      {out ? <>{self} <b>{rel}</b> → {a}</> : <>{a} <b>{rel}</b> → {self}</>}
    </p>
  )
}
