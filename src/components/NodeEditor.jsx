import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ROOT_ID, SUGGESTED_RELATIONS, normKey, normRel, isJwUrl } from '../lib/model.js'
import NodePicker from './NodePicker.jsx'

// Crear / editar un nodo: título, definición, fuentes y conexiones.
// (Tipo y origen se conservan en los datos pero por ahora no se muestran.)
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

  // El cuadro de texto crece con el contenido (se escribe como en una hoja).
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
    if (!title) return setError('Escribe un título.')
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

  function pickConnect(id) {
    setAdded((a) => [...a, { key: Math.random().toString(36), otherId: id, rel: '', dir: 'out' }])
    setPicker(null)
  }

  const updateSource = (i, patch) => set({ sources: draft.sources.map((x, j) => (j === i ? { ...x, ...patch } : x)) })

  return (
    <div className="overlay editor">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">{isNew ? 'Nuevo nodo' : 'Editar'}</span>
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

        <div className="tools">
          <button onClick={() => setPicker('link')}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Enlazar
          </button>
          <button onClick={() => insertBlock('jw')}><i className="tool-dot jw" />JW dice</button>
          <button onClick={() => insertBlock('yo')}><i className="tool-dot yo" />Yo pienso</button>
        </div>

        <textarea
          ref={noteRef}
          className="body-input"
          value={draft.note}
          placeholder="Escribe la definición…"
          onChange={(e) => set({ note: e.target.value })}
        />

        <section className="group">
          <h3>Fuentes</h3>
          {draft.sources.map((s, i) => (
            <div className="source-card" key={i}>
              <input className="input" placeholder="Juan 17:3 · La Atalaya 1/2020" value={s.label} onChange={(e) => updateSource(i, { label: e.target.value })} />
              <input className="input" placeholder="https://wol.jw.org/…" inputMode="url" autoCapitalize="off" autoCorrect="off" value={s.url ?? ''} onChange={(e) => updateSource(i, { url: e.target.value })} />
              {s.url && /^https?:/.test(s.url) && !isJwUrl(s.url) && <p className="hint warn">No es de jw.org ni wol.jw.org.</p>}
              <button className="link-btn danger" onClick={() => set({ sources: draft.sources.filter((_, j) => j !== i) })}>Quitar</button>
            </div>
          ))}
          <button className="add-btn" onClick={() => set({ sources: [...draft.sources, { label: '', url: '' }] })}>
            <span>+</span> Añadir fuente
          </button>
        </section>

        <section className="group">
          <h3>Conexiones</h3>
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
                  <ConnLabel out={out} rel={e.rel} self={draft.title || 'Este nodo'} other={other} />
                  <button className="link-btn danger" onClick={() => setRemoved((r) => { const n = new Set(r); gone ? n.delete(e.id) : n.add(e.id); return n })}>
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
                      {c.dir === 'out' ? 'Este →' : 'Este ←'}
                    </button>
                    <input className="input" list="rels" placeholder="ENSEÑA" autoCapitalize="characters" value={c.rel}
                      onChange={(e) => update({ rel: e.target.value })} onBlur={(e) => update({ rel: normRel(e.target.value) })} />
                  </div>
                  <ConnLabel out={c.dir === 'out'} rel={normRel(c.rel) || 'RELACIONADO'} self={draft.title || 'Este nodo'} other={other} />
                  <button className="link-btn danger" onClick={() => setAdded((a) => a.filter((x) => x.key !== c.key))}>Quitar</button>
                </li>
              )
            })}
          </ul>
          <button className="add-btn" onClick={() => setPicker('connect')}>
            <span>+</span> Conectar con otro nodo
          </button>
        </section>

        {!isNew && !isRoot && (
          <button className="delete-btn" onClick={() => confirm(`¿Eliminar «${node.title}» y sus conexiones?`) && onDelete()}>
            Eliminar nodo
          </button>
        )}
      </div>

      {picker && (
        <NodePicker
          nodes={nodes}
          excludeId={node.id}
          title={picker === 'link' ? 'Enlazar' : 'Conectar con'}
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
  return (
    <p className="conn-label">
      {out ? <>{self} <b>{rel}</b> {other.title}</> : <>{other.title} <b>{rel}</b> {self}</>}
    </p>
  )
}
