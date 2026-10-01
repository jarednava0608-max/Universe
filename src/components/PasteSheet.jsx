import { useMemo, useState } from 'react'
import { CLAUDE_FORMAT, parseJsonLoose, planImport } from '../lib/importer.js'
import { nodeColor } from '../lib/model.js'

// "Pegar conocimiento": pegar JSON → vista previa → confirmar.
export default function PasteSheet({ nodes, edges, initialText = '', onConfirm, onClose, toast }) {
  const [text, setText] = useState(initialText)
  const [plan, setPlan] = useState(null)
  const [replace, setReplace] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const titleOf = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.id, n.title]))
    plan?.newNodes.forEach((n) => m.set(n.id, n.title))
    return (id) => m.get(id) ?? '?'
  }, [nodes, plan])

  function preview(rep = replace) {
    setError('')
    try {
      const d = parseJsonLoose(text)
      setPlan(planImport(d, { nodes, edges }, { replace: rep }))
    } catch (e) {
      setPlan(null)
      setError(e.message)
    }
  }

  async function pasteClipboard() {
    try {
      setText(await navigator.clipboard.readText())
    } catch {
      setError('No se pudo leer el portapapeles. Mantén presionado el cuadro y elige “Pegar”.')
    }
  }

  async function copyFormat() {
    try {
      await navigator.clipboard.writeText(CLAUDE_FORMAT)
      toast('Formato copiado. Pégalo en tu chat con Claude.')
    } catch {
      toast('No se pudo copiar.')
    }
  }

  async function confirm() {
    if (replace && !window.confirm('Esto borrará el mapa actual y lo reemplazará con el respaldo. ¿Continuar?')) return
    setSaving(true)
    try {
      await onConfirm(plan)
    } catch (e) {
      setError('No se pudo guardar: ' + e.message)
      setSaving(false)
    }
  }

  const empty = plan && !plan.newNodes.length && !plan.updatedNodes.length && !plan.newEdges.length

  return (
    <div className="overlay paste">
      <header className="bar">
        <button className="bar-btn" onClick={plan ? () => setPlan(null) : onClose}>{plan ? 'Atrás' : 'Cerrar'}</button>
        <span className="bar-title">Pegar conocimiento</span>
        {plan ? (
          <button className="bar-btn strong" disabled={empty || saving} onClick={confirm}>Guardar</button>
        ) : (
          <button className="bar-btn strong" disabled={!text.trim()} onClick={() => preview()}>Revisar</button>
        )}
      </header>

      <div className="editor-body">
        {error && <p className="error">{error}</p>}

        {!plan && (
          <>
            <p className="hint">Pega el JSON que te generó Claude. Antes de guardar verás qué se va a crear y conectar.</p>
            <textarea className="input paste-input" value={text} placeholder='{ "nodes": [...], "edges": [...] }'
              autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setText(e.target.value)} />
            <div className="stack">
              <button className="secondary" onClick={pasteClipboard}>Pegar del portapapeles</button>
              <button className="secondary" onClick={copyFormat}>Copiar formato para Claude</button>
            </div>
          </>
        )}

        {plan && (
          <div className="preview">
            {plan.isBackup && (
              <label className="check">
                <input type="checkbox" checked={replace} onChange={(e) => { setReplace(e.target.checked); preview(e.target.checked) }} />
                <span>Es un respaldo completo: reemplazar todo el mapa (si no, se combina con lo que ya tienes).</span>
              </label>
            )}
            {empty && <p className="hint">No hay nada nuevo: todo ya está en tu mapa.</p>}

            {plan.newNodes.length > 0 && (
              <section>
                <h2>Nodos nuevos · {plan.newNodes.length}</h2>
                <ul className="pv-list">
                  {plan.newNodes.map((n) => (
                    <li key={n.id}>
                      <span className="dot" style={{ background: nodeColor(n) }} />
                      <span className="pv-title">{n.title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {plan.updatedNodes.length > 0 && (
              <section>
                <h2>Se añade información a · {plan.updatedNodes.length}</h2>
                <ul className="pv-list">
                  {plan.updatedNodes.map(({ after }) => (
                    <li key={after.id}>
                      <span className="dot" style={{ background: nodeColor(after) }} />
                      <span className="pv-title">{after.title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {plan.newEdges.length > 0 && (
              <section>
                <h2>Conexiones nuevas · {plan.newEdges.length}</h2>
                <ul className="pv-list">
                  {plan.newEdges.map((e) => (
                    <li key={e.id} className="pv-edge">
                      {titleOf(e.source)} <b>{e.rel}</b> → {titleOf(e.target)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {plan.warnings.length > 0 && (
              <section>
                <h2>Avisos · {plan.warnings.length}</h2>
                <ul className="pv-list warn">
                  {plan.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
