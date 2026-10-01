import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { KINDS, KIND_ORDER, makeEntry, entrySortKey, fieldsFromJson, claudeFormat, proposeNode } from './kinds.js'
import { parseJsonLoose } from '../lib/importer.js'
import { normKey } from '../lib/model.js'

// Pestaña Estudio: 4 apartados, cada uno con su lista de entradas.
export default function StudyTab({ entries, nodes, onSaveEntry, onDeleteEntry, onProposeToMap, onOpenNode, toast }) {
  const [section, setSection] = useState(null) // kind abierto
  const [editing, setEditing] = useState(null) // { entry, isNew }

  const byKind = useMemo(() => {
    const m = Object.fromEntries(KIND_ORDER.map((k) => [k, []]))
    for (const e of entries) m[e.kind]?.push(e)
    for (const k of KIND_ORDER) m[k].sort((a, b) => entrySortKey(b).localeCompare(entrySortKey(a)))
    return m
  }, [entries])

  const recent = useMemo(() => entries.filter((e) => KINDS[e.kind]).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5), [entries])

  return (
    <div className="page">
      {!section ? (
        <div className="page-scroll">
          <h1 className="page-title">Estudio</h1>
          <div className="kind-grid">
            {KIND_ORDER.map((k) => (
              <button key={k} className="kind-card" onClick={() => setSection(k)}>
                <span className="kind-icon"><Icon d={KINDS[k].icon} size={20} /></span>
                <span className="kind-label">{KINDS[k].label}</span>
                <span className="kind-desc">{KINDS[k].desc}</span>
                <span className="kind-count">{byKind[k].length || 'Vacío'}</span>
              </button>
            ))}
          </div>

          {recent.length > 0 && (
            <>
              <h2 className="section-label">Recientes</h2>
              <EntryList items={recent} showKind onOpen={(e) => setEditing({ entry: e, isNew: false })} />
            </>
          )}
        </div>
      ) : (
        <div className="page-scroll">
          <button className="back-link" onClick={() => setSection(null)}>
            <Icon d={ICONS.back} size={18} stroke={2} /> Estudio
          </button>
          <div className="page-head">
            <h1 className="page-title">{KINDS[section].label}</h1>
            <button className="round-btn" aria-label="Nueva entrada" onClick={() => setEditing({ entry: makeEntry(section), isNew: true })}>
              <Icon d={ICONS.plus} size={20} stroke={2} />
            </button>
          </div>
          {byKind[section].length ? (
            <EntryList items={byKind[section]} onOpen={(e) => setEditing({ entry: e, isNew: false })} />
          ) : (
            <div className="empty-state">
              <p>Aún no hay nada aquí.</p>
              <button className="primary" onClick={() => setEditing({ entry: makeEntry(section), isNew: true })}>Nueva entrada</button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <EntryEditor
          key={editing.entry.id}
          entry={editing.entry}
          isNew={editing.isNew}
          nodes={nodes}
          toast={toast}
          onCancel={() => setEditing(null)}
          onSave={async (e) => {
            await onSaveEntry(e)
            setEditing(null)
            toast('Guardado.')
          }}
          onDelete={async () => {
            await onDeleteEntry(editing.entry.id)
            setEditing(null)
            toast('Entrada eliminada.')
          }}
          onPropose={async (e, node) => {
            const saved = await onSaveEntry(e)
            const nodeId = await onProposeToMap(node)
            if (nodeId) await onSaveEntry({ ...saved, mapNodeId: nodeId })
            setEditing(null)
          }}
          onOpenNode={onOpenNode}
        />
      )}
    </div>
  )
}

function EntryList({ items, onOpen, showKind }) {
  return (
    <ul className="entry-list">
      {items.map((e) => {
        const def = KINDS[e.kind]
        const sub = [showKind && def.short, def.subtitle(e)].filter(Boolean).join(' · ')
        return (
          <li key={e.id}>
            <button className="entry-row" onClick={() => onOpen(e)}>
              <span className="entry-main">
                <span className="entry-title">{def.title(e)}</span>
                {sub && <span className="entry-sub">{sub}</span>}
              </span>
              {e.mapNodeId && <span className="in-map" title="En el mapa"><Icon d={ICONS.nodo} size={14} /></span>}
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function EntryEditor({ entry, isNew, nodes, toast, onCancel, onSave, onDelete, onPropose, onOpenNode }) {
  const def = KINDS[entry.kind]
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  const [paste, setPaste] = useState(false)
  const [proposal, setProposal] = useState(null)
  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }))
  const draft = () => ({ ...entry, fields })
  const linked = entry.mapNodeId && nodes.find((n) => n.id === entry.mapNodeId)

  return (
    <div className="overlay">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">{def.short}</span>
        <button className="bar-btn strong" onClick={() => onSave(draft())}>Guardar</button>
      </header>

      <div className="editor-body">
        {def.fields.map((f) => (
          <Field key={f.key} field={f} value={fields[f.key]} onChange={(v) => set(f.key, v)} />
        ))}

        <div className="action-stack">
          <button className="secondary icon-left" onClick={() => setPaste(true)}>
            <Icon d={ICONS.pegar} size={18} /> Pegar de Claude
          </button>
          <button className="secondary icon-left" onClick={() => setProposal(proposeNode(draft()))}>
            <Icon d={ICONS.nodo} size={18} /> Proponer al mapa
          </button>
          {linked && (
            <button className="link-note" onClick={() => onOpenNode(linked.id)}>
              Ya está en el mapa como «{linked.title}» · Ver
            </button>
          )}
        </div>

        {!isNew && (
          <button className="delete-btn" onClick={() => confirm('¿Eliminar esta entrada?') && onDelete()}>Eliminar entrada</button>
        )}
      </div>

      {paste && (
        <PasteFields
          kind={entry.kind}
          toast={toast}
          onCancel={() => setPaste(false)}
          onApply={(data) => {
            setFields((f) => fieldsFromJson(entry.kind, data, f))
            setPaste(false)
            toast('Campos llenados. Revisa y guarda.')
          }}
        />
      )}

      {proposal && (
        <ProposeSheet
          initial={proposal}
          nodes={nodes}
          onCancel={() => setProposal(null)}
          onApprove={(node) => onPropose(draft(), node)}
        />
      )}
    </div>
  )
}

function Field({ field, value, onChange }) {
  if (field.type === 'paragraphs') return <Paragraphs field={field} value={value ?? []} onChange={onChange} />
  return (
    <label className="sfield">
      <span className="sfield-label">{field.label}</span>
      {field.type === 'date' ? (
        <input className="input" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'choice' ? (
        <div className="seg2">
          {field.options.map(([v, l]) => (
            <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
          ))}
        </div>
      ) : field.type === 'line' ? (
        <input className="input" value={value ?? ''} placeholder={field.hint ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <AutoText value={value ?? ''} placeholder={field.hint ?? ''} onChange={onChange} />
      )}
    </label>
  )
}

function AutoText({ value, placeholder, onChange, minRows = 2 }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const ta = ref.current
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 2 + 'px'
  }, [value])
  return <textarea ref={ref} className="input auto" rows={minRows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

function Paragraphs({ field, value, onChange }) {
  const update = (i, patch) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const nextNum = () => {
    const last = Number(value.at(-1)?.num)
    return Number.isFinite(last) ? String(last + 1) : String(value.length + 1)
  }
  return (
    <div className="sfield">
      <span className="sfield-label">{field.label}</span>
      <div className="para-list">
        {value.map((p, i) => (
          <div className="para" key={i}>
            <div className="para-head">
              <span>Párrafo</span>
              <input className="para-num" inputMode="numeric" value={p.num} onChange={(e) => update(i, { num: e.target.value })} />
              <button className="para-del" aria-label="Quitar párrafo" onClick={() => onChange(value.filter((_, j) => j !== i))}>Quitar</button>
            </div>
            <AutoText value={p.nota} placeholder="Notas de este párrafo" onChange={(v) => update(i, { nota: v })} />
          </div>
        ))}
      </div>
      <button className="add-row" onClick={() => onChange([...value, { num: nextNum(), nota: '' }])}>
        <Icon d={ICONS.plus} size={16} stroke={2} /> Agregar párrafo
      </button>
    </div>
  )
}

function PasteFields({ kind, toast, onCancel, onApply }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  function apply() {
    try {
      onApply(parseJsonLoose(text))
    } catch (e) {
      setError(e.message)
    }
  }
  return (
    <div className="overlay picker">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">Pegar de Claude</span>
        <button className="bar-btn strong" disabled={!text.trim()} onClick={apply}>Llenar</button>
      </header>
      <div className="editor-body">
        <p className="hint">Pega el JSON que te dio Claude. Se llenan los campos y tú revisas antes de guardar.</p>
        {error && <p className="error">{error}</p>}
        <textarea className="input paste-input" value={text} placeholder="{ … }" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setText(e.target.value)} />
        <div className="stack">
          <button className="secondary" onClick={async () => {
            try { setText(await navigator.clipboard.readText()) } catch { setError('No se pudo leer el portapapeles. Mantén presionado el cuadro y elige “Pegar”.') }
          }}>Pegar del portapapeles</button>
          <button className="secondary" onClick={async () => {
            try { await navigator.clipboard.writeText(claudeFormat(kind)); toast('Formato copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
          }}>Copiar formato para Claude</button>
        </div>
      </div>
    </div>
  )
}

// Vista previa del nodo propuesto: se puede editar, aprobar o descartar.
function ProposeSheet({ initial, nodes, onCancel, onApprove }) {
  const [title, setTitle] = useState(initial.title)
  const [note, setNote] = useState(initial.note)
  const existing = nodes.find((n) => normKey(n.title) === normKey(title))
  return (
    <div className="overlay picker">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Descartar</button>
        <span className="bar-title">Proponer al mapa</span>
        <button className="bar-btn strong" disabled={!title.trim()} onClick={() => onApprove({ title: title.trim(), note })}>Aprobar</button>
      </header>
      <div className="editor-body">
        <p className="hint">Así quedaría el nodo. Puedes editarlo antes de aprobar.</p>
        <div className="propose-card">
          <input className="title-input" value={title} placeholder="Título" onChange={(e) => setTitle(e.target.value)} />
          <AutoText value={note} placeholder="Idea principal" onChange={setNote} minRows={4} />
        </div>
        {existing && <p className="notice">Ya existe «{existing.title}» en el mapa: se le añadirá esta información sin borrar lo que tiene.</p>}
      </div>
    </div>
  )
}
