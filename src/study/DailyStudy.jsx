import { createRef, useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import { DAILY_QUESTIONS, DAILY_STEPS, DAILY_TYPES, DAILY_MIN, dailyMinimum, dailyType, dailyVerse, dailyBody, dailyTextUrl, dailyTextAppUrl, entryForClaude } from './kinds.js'

const filled = (v) => !!String(v ?? '').trim()

// El Texto diario: leer y tres preguntas cortas, una a la vez (Jehová → la lección → dónde lo
// necesito hoy), y una frase para recordarlo todo el día. Se guarda sola y al volver sigue en el
// paso donde te quedaste (fields.paso).
export default function DailyStudy({ backLabel = 'Hoy', entry, isNew, toast, onSave, onDelete, onClose }) {
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  const [step, setStep] = useState(() => {
    const f = entry.fields
    if (DAILY_STEPS.some((s) => s.key === f.paso)) return f.paso
    // Las entradas de antes guardaban pasos que ya no existen: van a lo que falte.
    if (!filled(f.texto) || !DAILY_QUESTIONS.some((q) => filled(f[q.key]))) return 'leer'
    return DAILY_MIN.find((k) => !filled(f[k])) ?? 'resumen'
  })
  const base = useRef(entry)
  const saved = useRef(JSON.stringify(entry.fields))
  const exists = useRef(!isNew)
  const top = useRef()
  const set = (patch) => setFields((f) => ({ ...f, ...patch }))
  const answers = useRef(Object.fromEntries(DAILY_QUESTIONS.map((q) => [q.key, createRef()])))
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
    onClose()
  }
  function go(next) {
    setStep(next)
    top.current?.scrollTo({ top: 0 })
  }
  const i = Math.max(0, DAILY_STEPS.findIndex((s) => s.key === step))
  const cur = DAILY_STEPS[i]
  const next = DAILY_STEPS[i + 1]
  const prev = DAILY_STEPS[i - 1]
  const verse = dailyVerse(fields.texto)
  // El comentario: lo pegado sin la fecha ni el versículo de arriba.
  const comment = dailyBody(fields.texto).replace(verse, '').trim()
  // La lección arranca con las frases del tipo de texto que adivina la app ("Jehová promete…").
  const type = DAILY_TYPES.find((t) => t.key === dailyType(fields))
  // Las frases solo ayudan a arrancar: se quitan las que ya usaste y todas cuando ya escribiste
  // unas palabras tuyas, para que la respuesta no se vuelva de puro relleno.
  const list = (step === 'principio' && type?.starters) || cur.starters || []
  const mine = String(fields[step] ?? '')
  const own = list.reduce((t, x) => t.replace(x, ''), mine).trim()
  const starters = own.length >= 40 ? [] : list.filter((x) => !mine.includes(x))
  const missing = DAILY_MIN.filter((k) => !filled(fields[k])).map((k) => DAILY_STEPS.find((s) => s.key === k))
  const wol = <a className="dt-link" data-direct="1" href={dailyTextUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">Ver el texto en wol.jw.org</a>

  return (
    <div className="overlay at-study">
      <header className="bar">
        <button className="bar-btn back" onClick={close}><Icon d={ICONS.back} size={18} stroke={2} /> {backLabel}</button>
        <span className="bar-title">Texto diario</span>
        <span />
      </header>

      <div className="editor-body at-body" ref={top}>
        <div className="at-bars">
          <nav className="at-steps" aria-label="Pasos">
            {DAILY_STEPS.map((s) => (
              <button key={s.key} className={'at-step' + (s.key === step ? ' on' : '')} disabled={s.key !== 'leer' && !filled(fields.texto)} onClick={() => go(s.key)}>{s.label}</button>
            ))}
          </nav>
        </div>

        {step === 'leer' && (
          <>
            {!filled(fields.texto) ? (
              <>
                <h2 className="at-h">Texto de hoy</h2>
                <p className="at-tip">Cópialo en JW Library y pégalo aquí. Luego, tres preguntas cortas.</p>
                <div className="action-stack">
                  <a className="secondary as-btn" data-direct="1" href={dailyTextAppUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">1. Abrir el texto en JW Library</a>
                  <a className="secondary as-btn" data-direct="1" href={dailyTextUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">Ver el texto en wol.jw.org</a>
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
                {comment && <p className="dt-comment">{comment}</p>}
                {wol}
                <div className="action-stack">
                  <button className="primary" onClick={() => go('jehova')}>Ya lo leí</button>
                </div>
              </>
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
            </details>
          </>
        )}

        {cur.q && (
          <>
            {verse && <p className="dt-verse">{verse}</p>}
            {comment && step !== 'resumen' && (
              <details className="dt-more">
                <summary>Leer el comentario</summary>
                <p>{comment}</p>
              </details>
            )}
            {step !== 'resumen' && wol}
            {step === 'resumen' && (
              <div className="at-card dt-recap">
                {DAILY_STEPS.filter((s) => s.q && s.key !== 'resumen' && filled(fields[s.key])).map((s) => (
                  <p key={s.key}><span>{s.label}</span>{fields[s.key]}</p>
                ))}
              </div>
            )}
            <h2 className="at-h dt-q">{cur.q}</h2>
            <p className="at-tip small">{cur.guide}</p>
            {starters.length > 0 && (
              <div className="dt-chips">
                {starters.map((t) => <button key={t} className="dt-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => addStarter(step, t)}>{t}</button>)}
              </div>
            )}
            {step === 'resumen' ? (
              <input className="input dt-phrase" value={fields.resumen ?? ''} placeholder={cur.hint} onChange={(e) => set({ resumen: e.target.value })} />
            ) : (
              <label className="at-answer">
                <span className="at-answer-label">Mi respuesta</span>
                <AutoText key={step} inputRef={answers.current[step]} value={fields[step] ?? ''} placeholder={cur.hint} onChange={(v) => set({ [step]: v })} minRows={3} />
              </label>
            )}
            {next ? (
              <div className="at-nav">
                <button className="secondary" onClick={() => go(prev.key)}>Anterior</button>
                <button className="primary" onClick={() => go(next.key)}>Siguiente</button>
              </div>
            ) : (
              <div className="action-stack">
                {missing.length > 0 && <p className="at-tip small">Te falta {missing.map((s) => s.short).join(' y ')}.</p>}
                {missing.length > 0
                  ? <button className="primary" onClick={() => go(missing[0].key)}>Contestar: {missing[0].q}</button>
                  : <button className="primary" onClick={finish}>Listo</button>}
                <button className="secondary icon-left" onClick={async () => {
                  try { await navigator.clipboard.writeText(entryForClaude({ ...base.current, fields })); toast('Copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
                }}>
                  <Icon d={ICONS.pegar} size={18} /> Copiar para Claude
                </button>
                {wol}
              </div>
            )}
          </>
        )}

        {step === 'resumen' && exists.current && (
          <button className="delete-btn" onClick={() => confirm('¿Eliminar esta entrada?') && onDelete()}>Eliminar entrada</button>
        )}
      </div>
    </div>
  )
}
