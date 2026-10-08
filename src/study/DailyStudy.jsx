import { useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import { RefChips } from '../components/RefLink.jsx'
import { findAllRefs, openRef } from '../lib/verses.js'
import { refUrl } from '../lib/bible.js'
import ConceptsStep from './ConceptsStep.jsx'
import PasteFields from './PasteFields.jsx'
import { DAILY_STEPS, DAILY_QUESTIONS, dailyChapter, dailyVerse, dailyTextUrl, dailyTextAppUrl, entryForClaude, fieldsFromJson, formatDate, refsIn } from './kinds.js'

const filled = (v) => !!String(v ?? '').trim()

// El Texto diario por pasos: el texto arriba y una pregunta a la vez con sus preguntas guía
// (Contexto → Principio → Relato → Aplicación), y al final el resumen. Se guarda sola y al
// volver sigue en el paso donde te quedaste (fields.paso).
export default function DailyStudy({ onDone, entry, isNew, toast, onSave, onDelete, onClose, nodes, onToMap, onOpenNode }) {
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  const [step, setStep] = useState(() => {
    if (!filled(entry.fields.texto)) return 'texto'
    if (DAILY_STEPS.some((s) => s.key === entry.fields.paso)) return entry.fields.paso
    return DAILY_QUESTIONS.find((s) => !filled(entry.fields[s.key]))?.key ?? 'listo'
  })
  const [paste, setPaste] = useState(false)
  const base = useRef(entry)
  const saved = useRef(JSON.stringify(entry.fields))
  const exists = useRef(!isNew)
  const top = useRef()
  const set = (patch) => setFields((f) => ({ ...f, ...patch }))

  async function flush() {
    const f = { ...fields, paso: step }
    if (!filled(f.texto) && !DAILY_QUESTIONS.some((s) => filled(f[s.key]))) return
    const json = JSON.stringify(f)
    if (json === saved.current) return
    saved.current = json
    base.current = (await onSave({ ...base.current, fields: f })) ?? { ...base.current, fields: f }
    exists.current = true
  }
  useEffect(() => {
    const t = setTimeout(flush, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, step])
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  })

  async function close() {
    await flush()
    onClose()
  }
  function go(next) {
    setStep(next)
    top.current?.scrollTo({ top: 0 })
  }
  const i = DAILY_STEPS.findIndex((s) => s.key === step)
  const cur = DAILY_STEPS[i]
  const next = DAILY_STEPS[i + 1]
  const prev = DAILY_STEPS[i - 1]
  const verse = dailyVerse(fields.texto)
  const chapter = dailyChapter(fields.texto)
  // El comentario: lo pegado sin el versículo de arriba.
  const comment = String(fields.texto ?? '').trim().replace(verse, '').trim()
  const ref = refsIn(verse)[0] ?? refsIn(fields.texto)[0]
  const done = DAILY_QUESTIONS.filter((s) => filled(fields[s.key])).length
  const refs = findAllRefs(fields.contexto, fields.relato, fields.aplicacion, fields.notas)

  return (
    <div className="overlay at-study">
      <header className="bar">
        <button className="bar-btn back" onClick={close}><Icon d={ICONS.back} size={18} stroke={2} /> Estudio</button>
        <span className="bar-title">Texto diario</span>
        <span />
      </header>

      <div className="editor-body at-body" ref={top}>
        <div className="at-bars">
          <nav className="at-steps" aria-label="Pasos">
            {DAILY_STEPS.map((s) => (
              <button key={s.key} className={'at-step' + (s.key === step ? ' on' : '')} disabled={s.key !== 'texto' && !filled(fields.texto)} onClick={() => go(s.key)}>{s.label}</button>
            ))}
          </nav>
        </div>

        {step === 'texto' && (
          <>
            <h2 className="at-h">Lee el texto de hoy</h2>
            <p className="at-tip">Léelo despacio, con el comentario. Luego te hago 4 preguntas, una a la vez.</p>
            <label className="sfield">
              <span className="sfield-label">Fecha</span>
              <input className="input" type="date" value={fields.fecha ?? ''} onChange={(e) => set({ fecha: e.target.value })} />
            </label>
            <label className="at-answer">
              <span className="at-answer-label">El texto y el comentario</span>
              <AutoText value={fields.texto ?? ''} placeholder="Pega aquí el texto de hoy de JW Library" onChange={(v) => set({ texto: v })} minRows={6} />
            </label>
            <div className="action-stack">
              <a className="secondary as-btn" data-direct="1" href={dailyTextAppUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">Abrir este texto en JW Library</a>
              <button className="primary" disabled={!filled(fields.texto)} onClick={() => go('contexto')}>Empezar</button>
            </div>
          </>
        )}

        {cur?.q && (
          <>
            {verse && <p className="dt-verse">{verse}</p>}
            {comment && (
              <details className="dt-more">
                <summary>Leer el comentario</summary>
                <p>{comment}</p>
              </details>
            )}
            <p className="at-qnum">Pregunta {i} de {DAILY_QUESTIONS.length}</p>
            <h2 className="at-h">{cur.q}</h2>
            <ul className="dt-guide">
              {cur.guide.map((g) => <li key={g}>{g}</li>)}
            </ul>
            {step === 'contexto' && chapter && (
              <div className="dt-links">
                <button className="at-listen" onClick={() => openRef(chapter)}>Leer {chapter}</button>
                {ref && <a className="at-listen" data-direct="1" href={refUrl(ref)} target="_blank" rel="noopener noreferrer">Notas de estudio en wol.jw.org</a>}
              </div>
            )}
            <label className="at-answer">
              <span className="at-answer-label">Mi respuesta</span>
              <AutoText key={step} value={fields[step] ?? ''} placeholder={cur.hint} onChange={(v) => set({ [step]: v })} minRows={4} />
            </label>
            <div className="at-nav">
              <button className="secondary" onClick={() => go(prev.key)}>Anterior</button>
              <button className="primary" onClick={() => go(next.key)}>Siguiente</button>
            </div>
          </>
        )}

        {step === 'conceptos' && (
          <ConceptsStep entry={base.current} fields={fields} set={set} nodes={nodes} onToMap={(list) => onToMap(list, { ...base.current, fields })} onOpenNode={onOpenNode} onPrev={() => go(prev.key)} onNext={() => go('listo')} />
        )}

        {step === 'listo' && (
          <>
            <h2 className="at-h">{done === DAILY_QUESTIONS.length ? 'Texto de hoy, listo' : 'Casi listo'}</h2>
            <div className="at-card">
              {verse && <p className="dt-verse flat">{verse}</p>}
              <div className="progress"><span style={{ width: `${(done / DAILY_QUESTIONS.length) * 100}%` }} /></div>
              <p className="at-summary">Contestaste {done} de {DAILY_QUESTIONS.length} preguntas{fields.fecha ? ` · ${formatDate(fields.fecha)}` : ''}.</p>
            </div>
            {done < DAILY_QUESTIONS.length && (
              <div className="at-missing dt-missing">
                <p className="at-label">Te faltan</p>
                {DAILY_QUESTIONS.map((s) => !filled(fields[s.key]) && <button key={s.key} onClick={() => go(s.key)}>{s.label}</button>)}
              </div>
            )}
            <label className="at-answer">
              <span className="at-answer-label">Resumen en 3 o 4 palabras</span>
              <input className="input" value={fields.resumen ?? ''} placeholder="Para acordarte durante el día" onChange={(e) => set({ resumen: e.target.value })} />
            </label>
            <label className="at-answer">
              <span className="at-answer-label">Mis notas</span>
              <AutoText value={fields.notas ?? ''} placeholder="Una frase del comentario que quieras recordar" onChange={(v) => set({ notas: v })} minRows={2} />
            </label>
            {refs.length > 0 && (
              <div className="sfield">
                <span className="sfield-label">Textos y publicaciones · toca para verlos</span>
                <RefChips refs={refs} />
              </div>
            )}
            <div className="action-stack">
              <button className="primary" onClick={async () => { await flush(); (onDone ?? onClose)() }}>Listo · sigue con lo demás</button>
              <button className="secondary icon-left" onClick={async () => {
                try { await navigator.clipboard.writeText(entryForClaude({ ...base.current, fields })); toast('Copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
              }}>
                <Icon d={ICONS.pegar} size={18} /> Copiar para Claude
              </button>
              <button className="secondary icon-left" onClick={() => setPaste(true)}>
                <Icon d={ICONS.pegar} size={18} /> Pegar de Claude
              </button>
              <button className="secondary icon-left" onClick={() => go('conceptos')}>
                <Icon d={ICONS.nodo} size={18} /> Concepto para el mapa{fields.conceptos?.length ? ` (${fields.conceptos.length})` : ''}
              </button>
              <a className="secondary as-btn" data-direct="1" href={dailyTextUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">Ver en wol.jw.org</a>
            </div>
            {exists.current && (
              <button className="delete-btn" onClick={() => confirm('¿Eliminar esta entrada?') && onDelete()}>Eliminar entrada</button>
            )}
          </>
        )}
      </div>

      {paste && (
        <PasteFields
          kind="diario"
          toast={toast}
          onCancel={() => setPaste(false)}
          onApply={(data) => {
            setFields((f) => fieldsFromJson('diario', data, f))
            setPaste(false)
            toast('Campos llenados. Revisa cada paso.')
          }}
        />
      )}
    </div>
  )
}
