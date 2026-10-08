import { useMemo } from 'react'
import AutoText from '../components/AutoText.jsx'
import Icon, { ICONS } from '../components/Icon.jsx'
import { normKey } from '../lib/model.js'
import { MAX_TITLE, conceptIdeas, conceptReady, conceptRefs, titleTip } from './concepts.js'

const newId = () => Math.random().toString(36).slice(2, 9)

// Paso "Conceptos" (Texto diario, La Atalaya y entre semana): de lo que estudiaste sacas pocas ideas
// firmes para tu mapa. Cada una: título corto, qué es con tus palabras y en qué texto se apoya.
// "Poner en el mapa" crea un nodo por concepto (los que ya están solo dicen "En el mapa").
export default function ConceptsStep({ entry, fields, set, nodes = [], onToMap, onOpenNode, onPrev, onNext, nextLabel = 'Terminar' }) {
  const list = fields.conceptos ?? []
  const current = { ...entry, fields }
  const ideas = useMemo(() => conceptIdeas(current, list.map((c) => c.titulo)), [fields]) // eslint-disable-line react-hooks/exhaustive-deps
  const refs = useMemo(() => conceptRefs(current), [fields.texto, fields.programa, fields.estudio, fields.articulo]) // eslint-disable-line react-hooks/exhaustive-deps
  const onMap = (c) => c.nodeId && nodes.some((n) => n.id === c.nodeId)
  const ready = list.filter((c) => conceptReady(c) && !onMap(c))

  const put = (next) => set({ conceptos: next })
  const change = (id, patch) => put(list.map((c) => (c.id === id ? { ...c, ...patch, nodeId: patch.titulo != null && normKey(patch.titulo) !== normKey(c.titulo) ? undefined : c.nodeId } : c)))
  const add = (titulo = '') => put([...list, { id: newId(), titulo, def: '', cita: '' }])
  const remove = (id) => put(list.filter((c) => c.id !== id))

  async function toMap() {
    const ids = await onToMap(ready)
    if (!ids) return
    put(list.map((c) => (ids[normKey(c.titulo)] ? { ...c, nodeId: ids[normKey(c.titulo)] } : c)))
  }

  return (
    <>
      <h2 className="at-h">Conceptos para tu mapa</h2>
      <p className="at-tip">Saca 1 a 3 ideas firmes de lo que estudiaste. El título corto; lo demás, con tus palabras y con el texto en que se apoya.</p>

      {ideas.length > 0 && (
        <>
          <p className="at-label">Ideas de lo que escribiste</p>
          <div className="at-missing cx-ideas">
            {ideas.map((t) => <button key={t} onClick={() => add(t)}><Icon d={ICONS.plus} size={14} stroke={2} /> {t}</button>)}
          </div>
        </>
      )}

      {list.map((c, k) => {
        const tip = titleTip(c.titulo)
        return (
          <div key={c.id} className="at-answer cx-card">
            <div className="cx-head">
              <span className="at-answer-label">Concepto {k + 1}{onMap(c) ? ' · En el mapa' : ''}</span>
              <button className="cx-remove" onClick={() => remove(c.id)}>Quitar</button>
            </div>
            <input className="input cx-title" value={c.titulo} maxLength={MAX_TITLE + 8} placeholder="Título corto: Valor, Orgullo…" onChange={(e) => change(c.id, { titulo: e.target.value })} />
            {tip && <p className="cx-tip">{tip}</p>}
            <span className="at-answer-label cx-sub">¿Qué es? Con tus palabras</span>
            <AutoText value={c.def} placeholder="No es… sino… / Es cuando…" onChange={(v) => change(c.id, { def: v })} minRows={2} />
            <span className="at-answer-label cx-sub">Se apoya en</span>
            <input className="input" value={c.cita} placeholder="Éxodo 4:10" onChange={(e) => change(c.id, { cita: e.target.value })} />
            {!c.cita?.trim() && refs.length > 0 && (
              <div className="ref-chips cx-refs">
                {refs.map((r) => <button key={r} className="ref-chip" onClick={() => change(c.id, { cita: r })}>{r}</button>)}
              </div>
            )}
            {onMap(c) && <button className="link-note" onClick={() => onOpenNode(c.nodeId)}>Ver en el mapa</button>}
          </div>
        )
      })}

      <button className="secondary icon-left" onClick={() => add()}><Icon d={ICONS.plus} size={18} /> Agregar concepto</button>
      {ready.length > 0 && (
        <button className="primary" onClick={toMap}>Poner en el mapa ({ready.length})</button>
      )}
      {list.some((c) => c.titulo?.trim() && !c.cita?.trim()) && <p className="at-tip small cx-note">Sin texto bíblico, el concepto queda en "Por escarbar" hasta que lo apoyes en uno.</p>}

      <div className="at-nav cx-nav">
        <button className="secondary" onClick={onPrev}>Anterior</button>
        <button className={ready.length ? 'secondary' : 'primary'} onClick={onNext}>{nextLabel}</button>
      </div>
    </>
  )
}
