import { useEffect, useMemo, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import { RefChips } from '../components/RefLink.jsx'
import { findAllRefs } from '../lib/verses.js'
import { entryForClaude } from './kinds.js'
import { STEPS, parseProgram, programTitle, answerOf, withAnswer, partDone, midweekCount, meetingsUrl, programDate, programMonday } from './midweek.js'
import { useMeetings } from './meetings.js'
import { DAYS } from './today.js'

// La reunión de entre semana por pasos, como La Atalaya: se pega el programa de la Guía de
// actividades, luego cada parte con sus preguntas para contestar (o notas, si no tiene) y al
// final cómo lo aplico y, si quieres, tus respuestas pasan al mapa. Se guarda sola y al volver sigue en la parte donde te quedaste.
export default function MidweekStudy({ entry, isNew, toast, onSave, onDelete, onClose, onPropose, onSwitchToAtalaya }) {
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  const prog = useMemo(() => parseProgram(fields.programa), [fields.programa])
  const partes = prog.partes
  const [step, setStep] = useState(() => {
    if (!parseProgram(entry.fields.programa).partes.length) return 'programa'
    return STEPS.some((s) => s.key === entry.fields.paso) ? entry.fields.paso : 'partes'
  })
  const [idx, setIdx] = useState(() => {
    const ps = parseProgram(entry.fields.programa).partes
    const i = Number(entry.fields.parte)
    if (Number.isInteger(i) && i >= 0 && i < ps.length) return i
    return Math.max(0, ps.findIndex((pt) => !partDone(entry.fields, pt)))
  })
  const base = useRef(entry)
  const saved = useRef(JSON.stringify(entry.fields))
  const exists = useRef(!isNew)
  const top = useRef()
  const jump = useRef()
  const set = (patch) => setFields((f) => ({ ...f, ...patch }))

  const hasContent = (f) => Boolean(String(f.programa ?? '').trim() || ['idea', 'aplicacion', 'notas'].some((k) => String(f[k] ?? '').trim()))
  async function flush() {
    const f = { ...fields, paso: step, parte: idx }
    if (!hasContent(f)) return
    const json = JSON.stringify(f)
    if (json === saved.current) return
    saved.current = json
    base.current = await onSave({ ...base.current, fields: f })
    exists.current = true
  }

  // Se guarda sola al dejar de escribir, al cambiar de paso y si la app pasa a segundo plano.
  useEffect(() => {
    const t = setTimeout(flush, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, step, idx])
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  })

  useEffect(() => {
    const nav = jump.current
    const on = nav?.querySelector('.on')
    if (on) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' })
  }, [idx, step])

  function go(next, i = idx) {
    setStep(next)
    setIdx(i)
    top.current?.scrollTo({ top: 0 })
  }
  async function close() {
    await flush()
    onClose()
  }

  // Al pegar el programa, el título es la lectura de la semana (si aún no tiene).
  function setProgram(v) {
    const patch = { programa: v }
    const t = programTitle(parseProgram(v))
    if (t && !String(fields.titulo ?? '').trim()) patch.titulo = t
    set(patch)
  }

  // La fecha de la reunión sale sola: la semana del programa + el día de tu reunión entre semana.
  // Si la cambias a mano (por ejemplo, la semana de la visita del superintendente), se respeta.
  const [meetings, setMeetings] = useMeetings()
  const auto = programDate(prog.semana, meetings?.semana, fields.fecha)
  useEffect(() => {
    if (!fields.fechaManual && auto && auto !== fields.fecha) set({ fecha: auto })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, fields.fechaManual])
  const linkDate = fields.fechaManual ? fields.fecha : auto ?? programMonday(prog.semana, fields.fecha) ?? fields.fecha

  const count = midweekCount(fields)
  const pt = partes[idx]

  return (
    <div className="overlay at-study">
      <header className="bar">
        <button className="bar-btn back" onClick={close}><Icon d={ICONS.back} size={18} stroke={2} /> Reuniones</button>
        <span className="bar-title">Entre semana</span>
        <span />
      </header>

      <div className="editor-body at-body" ref={top}>
        <div className="at-bars">
          <nav className="at-steps" aria-label="Pasos">
            {STEPS.map((s) => (
              <button key={s.key} className={'at-step' + (s.key === step ? ' on' : '')} disabled={s.key !== 'programa' && !partes.length} onClick={() => go(s.key)}>{s.label}</button>
            ))}
          </nav>
          {step === 'partes' && partes.length > 1 && (
            <nav className="at-jump" ref={jump} aria-label="Ir a la parte">
              {partes.map((p, i) => (
                <button
                  key={p.num}
                  className={'at-jump-num' + (i === idx ? ' on' : partDone(fields, p) ? ' done' : '')}
                  aria-current={i === idx ? 'step' : undefined}
                  onClick={() => go('partes', i)}
                >
                  {p.num}
                </button>
              ))}
            </nav>
          )}
        </div>

        {step === 'programa' && (
          <>
            <h2 className="at-h">Pega el programa</h2>
            <div className="sfield">
              <div className="seg2">
                <button type="button" onClick={() => onSwitchToAtalaya({ ...base.current, fields: { ...fields, tipo: 'atalaya' } })}>La Atalaya</button>
                <button type="button" className="on">Entre semana</button>
              </div>
            </div>
            <label className="sfield">
              <span className="sfield-label">Fecha de la reunión</span>
              <input className="input" type="date" value={fields.fecha ?? ''} onChange={(e) => set({ fecha: e.target.value, fechaManual: true })} />
            </label>
            {prog.semana && meetings?.semana == null && (
              <label className="sfield">
                <span className="sfield-label">¿Qué día es tu reunión entre semana?</span>
                <select className="input" value="" onChange={(e) => setMeetings({ ...(meetings ?? {}), semana: Number(e.target.value) })}>
                  <option value="" disabled>Elegir</option>
                  {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}
                </select>
              </label>
            )}
            <label className="sfield">
              <span className="sfield-label">Título</span>
              <input className="input" value={fields.titulo ?? ''} placeholder="La lectura de la semana" onChange={(e) => set({ titulo: e.target.value })} />
            </label>
            <a className="secondary as-btn" data-direct="1" href={meetingsUrl(linkDate)} target="_blank" rel="noopener noreferrer">
              Ver esta semana en wol.jw.org
            </a>
            <div className="sfield">
              <span className="sfield-label">La semana completa de la Guía de actividades</span>
              <AutoText value={fields.programa ?? ''} placeholder="En JW Library abre la Guía de actividades, copia toda la semana y pégala aquí" onChange={setProgram} minRows={6} />
            </div>
            {partes.length > 0 && (
              <p className="hint">Encontré {partes.length} partes y {count.total} {count.total === 1 ? 'pregunta' : 'preguntas'}.</p>
            )}
            {String(fields.programa ?? '').trim() && !partes.length && (
              <p className="hint warn">No encontré las partes. Revisa que vengan las secciones (TESOROS DE LA BIBLIA…) y cada parte con su número, como «1. Título».</p>
            )}
            <button className="primary" disabled={!partes.length} onClick={() => go('partes', Math.max(0, partes.findIndex((p) => !partDone(fields, p))))}>
              Siguiente: las partes
            </button>
          </>
        )}

        {step === 'partes' && pt && (
          <Part
            key={pt.num}
            pt={pt}
            fields={fields}
            fecha={linkDate}
            onAnswer={(k, v) => setFields((f) => withAnswer(f, k, v))}
            last={idx === partes.length - 1}
            onPrev={() => (idx > 0 ? go('partes', idx - 1) : go('programa'))}
            onNext={() => (idx < partes.length - 1 ? go('partes', idx + 1) : go('listo'))}
          />
        )}

        {step === 'listo' && (
          <>
            <h2 className="at-h">{count.done === count.total ? 'Lista para la reunión' : 'Casi lista'}</h2>
            <div className="at-card">
              <p className="at-cover-kicker">{['Vida y Ministerio', prog.semana].filter(Boolean).join(' · ')}</p>
              <p className="at-title">{fields.titulo || 'Reunión de entre semana'}</p>
              {count.total > 0 && (
                <>
                  <div className="progress"><span style={{ width: `${(count.done / count.total) * 100}%` }} /></div>
                  <p className="at-summary">Contestaste {count.done} de {count.total} {count.total === 1 ? 'pregunta' : 'preguntas'}.</p>
                </>
              )}
            </div>
            {count.done < count.total && (
              <>
                <p className="at-label">Te faltan</p>
                <div className="at-missing">
                  {partes.map((p, i) => p.lineas.some((l) => l.q && !answerOf(fields, l.key).trim()) && (
                    <button key={p.num} onClick={() => go('partes', i)}>Parte {p.num}</button>
                  ))}
                </div>
              </>
            )}
            {String(fields.idea ?? '').trim() && (
              <label className="sfield">
                <span className="sfield-label">Idea principal</span>
                <AutoText value={fields.idea ?? ''} onChange={(v) => set({ idea: v })} />
              </label>
            )}
            <label className="sfield">
              <span className="sfield-label">¿Cómo lo aplico en mi vida?</span>
              <AutoText value={fields.aplicacion ?? ''} placeholder="Algo concreto para esta semana" onChange={(v) => set({ aplicacion: v })} />
            </label>
            <label className="sfield">
              <span className="sfield-label">Notas</span>
              <AutoText value={fields.notas ?? ''} placeholder="Lo que quieras recordar" onChange={(v) => set({ notas: v })} />
            </label>
            <div className="action-stack">
              <button className="secondary icon-left" onClick={async () => {
                try { await navigator.clipboard.writeText(entryForClaude({ ...base.current, fields })); toast('Copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
              }}>
                <Icon d={ICONS.pegar} size={18} /> Copiar para Claude
              </button>
              <button className="secondary icon-left" disabled={!count.done && !String(fields.aplicacion ?? '').trim()} onClick={async () => { await flush(); onPropose({ ...base.current, fields }) }}>
                <Icon d={ICONS.nodo} size={18} /> Proponer al mapa
              </button>
              <button className="primary" onClick={close}>Guardar y salir</button>
            </div>
            {exists.current && (
              <button className="delete-btn" onClick={() => confirm('¿Eliminar esta reunión?') && onDelete(entry.id)}>Eliminar reunión</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Una parte del programa: su sección, el texto con las citas tocables y una tarjeta de respuesta
// debajo de cada pregunta. Si no tiene preguntas (lectura, maestros, estudio bíblico), lleva notas.
function Part({ pt, fields, fecha, onAnswer, last, onPrev, onNext }) {
  const refs = useMemo(() => findAllRefs(pt.titulo, ...pt.lineas.map((l) => l.text)), [pt])
  const asks = pt.lineas.some((l) => l.q)
  return (
    <>
      <h3 className="at-sub">{pt.seccion}</h3>
      <p className="at-qnum">Parte {pt.num}{pt.minutos ? ` · ${pt.minutos} min` : ''}</p>
      <p className="at-question">{pt.titulo}</p>
      {pt.lineas.map((l, i) => (l.q ? (
        <div key={i}>
          <p className="at-question mw-q">{l.text}</p>
          <label className="at-answer">
            <span className="at-answer-label">Mi respuesta</span>
            <AutoText value={answerOf(fields, l.key)} placeholder="Con mis palabras, como para comentarla" onChange={(v) => onAnswer(l.key, v)} minRows={2} />
          </label>
        </div>
      ) : (
        <p key={i} className="mw-text">{l.text}</p>
      )))}
      {refs.length > 0 && (
        <div className="sfield">
          <span className="sfield-label">Textos y publicaciones</span>
          <RefChips refs={refs} />
        </div>
      )}
      <a className="at-jw" data-direct="1" href={meetingsUrl(fecha)} target="_blank" rel="noopener noreferrer">Ver la reunión en wol.jw.org</a>
      {!asks && (
        <label className="at-answer">
          <span className="at-answer-label">Mis notas</span>
          <AutoText value={answerOf(fields, String(pt.num))} placeholder="Lo que aprendí o quiero recordar de esta parte" onChange={(v) => onAnswer(String(pt.num), v)} minRows={2} />
        </label>
      )}
      <div className="at-nav">
        <button className="secondary" onClick={onPrev}>Anterior</button>
        <button className="primary" onClick={onNext}>{last ? 'Terminar' : 'Siguiente'}</button>
      </div>
    </>
  )
}
