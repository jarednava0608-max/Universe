import { createRef, useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import { RefChips } from '../components/RefLink.jsx'
import { findAllRefs, openRef } from '../lib/verses.js'
import { refUrl } from '../lib/bible.js'
import ConceptsStep from './ConceptsStep.jsx'
import PasteFields from './PasteFields.jsx'
import { DAILY_QUESTIONS, DAILY_TODAY, DAILY_TYPES, DAILY_MIN, dailyMinimum, dailyPeople, dailySteps, dailyType, dailyChapter, dailyVerse, dailyTextUrl, dailyTextAppUrl, entryForClaude, fieldsFromJson, formatDate, refsIn } from './kinds.js'

const filled = (v) => !!String(v ?? '').trim()

// El Texto diario, fácil: la pantalla "Hoy" tiene el texto (se pega con un toque), "¿Qué enseña?" y
// "¿Qué hago hoy?", y con eso ya está. Profundizar (Contexto, Relato, Concepto) es opcional. Se guarda
// sola y al volver sigue en el paso donde te quedaste (fields.paso).
export default function DailyStudy({ onDone, entry, isNew, toast, onSave, onDelete, onClose, nodes, onToMap, onOpenNode }) {
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  // Las entradas de antes guardaban pasos que ya no existen (texto, principio, aplicación): van a "Hoy".
  const [step, setStep] = useState(() => dailySteps(entry.fields).some((s) => s.key === entry.fields.paso) ? entry.fields.paso : 'hoy')
  const [paste, setPaste] = useState(false)
  const base = useRef(entry)
  const saved = useRef(JSON.stringify(entry.fields))
  const exists = useRef(!isNew)
  const top = useRef()
  const set = (patch) => setFields((f) => ({ ...f, ...patch }))
  const answers = useRef(Object.fromEntries(DAILY_QUESTIONS.map((q) => [q.key, createRef()])))
  const answerRef = (key) => answers.current[key]
  // Frases para empezar: un toque las escribe donde está el cursor (o al final, en un renglón nuevo,
  // si no estabas escribiendo) y deja el cursor después, listo para seguir.
  function addStarter(key, text) {
    const ta = answers.current[key]?.current
    const v = fields[key] ?? ''
    const typing = ta && document.activeElement === ta
    const at = typing ? ta.selectionStart : v.length
    const before = v.slice(0, at)
    const lead = !before ? '' : typing ? (/\s$/.test(before) ? '' : ' ') : (/\n$/.test(before) ? '' : '\n')
    const ins = lead + text + ' '
    set({ [key]: before + ins + v.slice(at) })
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(at + ins.length, at + ins.length)
    })
  }

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
  // Pega el texto de hoy de un toque (iOS pide permiso con "Pegar"); si no deja, queda el cuadro.
  async function pasteText() {
    try {
      const t = (await navigator.clipboard.readText()).trim()
      if (!t) return toast('No hay nada copiado. Copia el texto en JW Library.')
      set({ texto: t })
    } catch {
      toast('No se pudo pegar. Mantén presionado el cuadro y toca Pegar.')
    }
  }
  async function finish() {
    await flush()
    toast('Lo de hoy, listo.')
    ;(onDone ?? onClose)()
  }
  function go(next) {
    setStep(next)
    top.current?.scrollTo({ top: 0 })
  }
  const steps = dailySteps(fields)
  const questions = DAILY_QUESTIONS.filter((q) => q.key !== 'relato' || steps.some((s) => s.key === 'relato'))
  const i = Math.max(0, steps.findIndex((s) => s.key === step))
  const cur = steps[i]
  const next = steps[i + 1]
  const prev = steps[i - 1]
  const verse = dailyVerse(fields.texto)
  const chapter = dailyChapter(fields.texto)
  // El comentario: lo pegado sin el versículo de arriba.
  const comment = String(fields.texto ?? '').trim().replace(verse, '').trim()
  const ref = refsIn(verse)[0] ?? refsIn(fields.texto)[0]
  const done = questions.filter((s) => filled(fields[s.key])).length
  const people = step === 'relato' ? dailyPeople(fields.texto) : []
  // "¿Qué enseña?" arranca con las frases del tipo de texto que adivina la app ("Jehová promete…").
  const type = DAILY_TYPES.find((t) => t.key === dailyType(fields))
  // Las frases solo ayudan a arrancar: se quitan las que ya usaste y todas cuando ya escribiste
  // unas palabras tuyas, para que la respuesta no se vuelva de puro relleno.
  function startersFor(q) {
    const list = (q.key === 'principio' && type?.starters) || q.starters
    const mine = String(fields[q.key] ?? '')
    const own = list.reduce((t, x) => t.replace(x, ''), mine).trim()
    return own.length >= 40 ? [] : list.filter((x) => !mine.includes(x))
  }
  const starters = cur?.q ? startersFor(cur) : []
  const missing = DAILY_TODAY.filter((q) => !filled(fields[q.key]))
  const refs = findAllRefs(fields.contexto, fields.relato, fields.aplicacion, fields.notas)

  return (
    <div className="overlay at-study">
      <header className="bar">
        <button className="bar-btn back" onClick={close}><Icon d={ICONS.back} size={18} stroke={2} /> Estudio</button>
        <span className="bar-title">Texto diario</span>
        <span />
      </header>

      <div className="editor-body at-body" ref={top}>
        {step !== 'hoy' && <div className="at-bars">
          <nav className="at-steps" aria-label="Pasos">
            {steps.map((s) => (
              <button key={s.key} className={'at-step' + (s.key === step ? ' on' : '')} disabled={s.key !== 'hoy' && !filled(fields.texto)} onClick={() => go(s.key)}>{s.label}</button>
            ))}
          </nav>
        </div>}

        {step === 'hoy' && (
          <>
            {!filled(fields.texto) ? (
              <>
                <h2 className="at-h">Texto de hoy</h2>
                <p className="at-tip">Cópialo en JW Library y pégalo aquí. Luego, dos respuestas cortas y listo.</p>
                <div className="action-stack">
                  <a className="secondary as-btn" data-direct="1" href={dailyTextAppUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">1. Abrir el texto en JW Library</a>
                  <button className="primary" onClick={pasteText}>2. Pegar el texto</button>
                </div>
                <label className="at-answer">
                  <span className="at-answer-label">O pégalo aquí</span>
                  <AutoText value={fields.texto ?? ''} placeholder="El texto y el comentario" onChange={(v) => set({ texto: v })} minRows={3} />
                </label>
              </>
            ) : (
              <>
                <p className="dt-verse">{verse}</p>
                {comment && (
                  <details className="dt-more">
                    <summary>Leer el comentario</summary>
                    <p>{comment}</p>
                  </details>
                )}
              </>
            )}
            {filled(fields.texto) && DAILY_TODAY.map((q) => (
              <div key={q.key}>
                <h2 className="at-h dt-q">{q.q}</h2>
                {startersFor(q).length > 0 && (
                  <div className="dt-chips">
                    {startersFor(q).map((t) => <button key={t} className="dt-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => addStarter(q.key, t)}>{t}</button>)}
                  </div>
                )}
                <label className="at-answer">
                  <span className="at-answer-label">Mi respuesta</span>
                  <AutoText inputRef={answerRef(q.key)} value={fields[q.key] ?? ''} placeholder={q.hint} onChange={(v) => set({ [q.key]: v })} minRows={2} />
                </label>
              </div>
            ))}
            {filled(fields.texto) && (
              <div className="action-stack">
                <button className="primary" disabled={missing.length > 0} onClick={finish}>{missing.length ? `Te falta: ${missing.map((q) => q.label).join(' y ')}` : 'Listo'}</button>
                <button className="secondary" onClick={() => go('contexto')}>Profundizar (opcional)</button>
              </div>
            )}
            <details className="dt-more">
              <summary>Cambiar la fecha o el texto</summary>
              <label className="sfield">
                <span className="sfield-label">Fecha</span>
                <input className="input" type="date" value={fields.fecha ?? ''} onChange={(e) => set({ fecha: e.target.value })} />
              </label>
              {filled(fields.texto) && (
                <label className="at-answer">
                  <span className="at-answer-label">El texto y el comentario</span>
                  <AutoText value={fields.texto ?? ''} onChange={(v) => set({ texto: v })} minRows={3} />
                </label>
              )}
              <a className="dt-link" data-direct="1" href={dailyTextUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">Ver este texto en wol.jw.org</a>
            </details>
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
            <p className="at-qnum">Para profundizar · opcional</p>
            <h2 className="at-h">{cur.q}</h2>
            <ul className="dt-guide">
              {cur.guide.map((g) => <li key={g}>{g}</li>)}
            </ul>
            <p className="at-tip small">Si hoy no hay tiempo, salta este paso. Con una o dos oraciones basta.</p>
            {step === 'contexto' && chapter && (
              <div className="dt-links">
                <button className="at-listen" onClick={() => openRef(chapter)}>Leer {chapter}</button>
                {ref && <a className="at-listen" data-direct="1" href={refUrl(ref)} target="_blank" rel="noopener noreferrer">Notas de estudio en wol.jw.org</a>}
              </div>
            )}
            {people.length > 0 && (
              <>
                <p className="at-tip small">En el texto de hoy sale:</p>
                <div className="dt-chips">
                  {people.map((n) => <button key={n} className="dt-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => addStarter(step, n)}>{n}</button>)}
                </div>
              </>
            )}
            {starters?.length > 0 && (
              <div className="dt-chips">
                {starters.map((t) => <button key={t} className="dt-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => addStarter(step, t)}>{t}</button>)}
              </div>
            )}
            <label className="at-answer">
              <span className="at-answer-label">Mi respuesta</span>
              <AutoText key={step} inputRef={answerRef(step)} value={fields[step] ?? ''} placeholder={cur.hint} onChange={(v) => set({ [step]: v })} minRows={4} />
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
            <h2 className="at-h">{done === questions.length ? 'Texto de hoy, listo' : dailyMinimum(fields) ? 'Lo de hoy, cumplido' : 'Casi listo'}</h2>
            <div className="at-card">
              {verse && <p className="dt-verse flat">{verse}</p>}
              <div className="progress"><span style={{ width: `${(done / questions.length) * 100}%` }} /></div>
              {dailyMinimum(fields) && <p className="at-summary">Mínimo de hoy cumplido: Principio y Aplicación.</p>}
              <p className="at-summary">Contestaste {done} de {questions.length} preguntas{fields.fecha ? ` · ${formatDate(fields.fecha)}` : ''}.</p>
            </div>
            {done < questions.length && (
              <div className="at-missing dt-missing">
                <p className="at-label">{dailyMinimum(fields) ? 'Si quieres, suma' : 'Te faltan'}</p>
                {questions.map((s) => !filled(fields[s.key]) && <button key={s.key} onClick={() => go(DAILY_MIN.includes(s.key) ? 'hoy' : s.key)}>{s.label}{DAILY_MIN.includes(s.key) ? '' : ' (opcional)'}</button>)}
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
              <button className="primary" onClick={finish}>Listo · sigue con lo demás</button>
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
