import { useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import { Refs } from './DailyStudy.jsx'
import { formatDate } from './kinds.js'
import { LETRAS, RUTINA_FORMAT, emptyRutina, findRutina, lastOracion, parseRutina, tidyRutina, validateRutina } from './rutina.js'

// La rutina bíblica de la mañana (lógica en rutina.js). Pedida por Jared: acompaña al Texto diario en Hoy.

// "Hecha": la acción de hoy (se guarda al tocarla).
function Hecha({ hecha, onToggle }) {
  return (
    <button className={'rutina-hecha' + (hecha ? ' on' : '')} aria-pressed={hecha} onClick={onToggle}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill={hecha ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
        {hecha && <path d="m7.5 12.2 3 3 6-6.4" fill="none" stroke="var(--check-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      Hecha
    </button>
  )
}

const Recuerdo = ({ f }) => <p className="rutina-p">{f.recuerdo}</p>

// Los 3 puntos con sus ganchos; el elegido, marcado.
function Mapa({ f }) {
  return (
    <ol className="rutina-mapa">
      {f.puntos.map((p, i) => (
        <li key={i}>
          <p className="rutina-punto">{p.titulo}</p>
          <ul className="rutina-ganchos">
            {LETRAS.filter((L) => p.ganchos?.[L]).map((L) => (
              <li key={L} className={p.elegido === L ? 'on' : ''}>
                <b>{L}</b>
                <span>{p.ganchos[L]}{p.elegido === L && <em> · elegido</em>}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

// La acción y su disparador; la oración, fija aparte (nunca es una opción).
function Cierre({ f }) {
  return (
    <dl className="rutina-cierre">
      <dt>Acción{f.cierre.opcion ? ` (opción ${f.cierre.opcion})` : ''}</dt>
      <dd>{f.cierre.accion}</dd>
      <dt>Disparador</dt>
      <dd>{f.cierre.disparador}</dd>
      <dt>Oración fija</dt>
      <dd>{f.oracion}</dd>
    </dl>
  )
}

// Toda la rutina, para la vista previa y el historial.
export function RutinaDetail({ f }) {
  return (
    <div className="rutina-detail">
      <p className="rutina-fecha">{formatDate(f.fecha)}</p>
      <h2 className="rutina-titulo">{f.tema || f.cita}</h2>
      {f.tema && <p className="rutina-cita"><Refs text={f.cita} /></p>}
      <section><h3>1. Recuerdo activo</h3><Recuerdo f={f} /></section>
      <section><h3>2. Mapa</h3><Mapa f={f} /></section>
      <section><h3>3. Cierre</h3><Cierre f={f} /></section>
    </div>
  )
}

// En Hoy, debajo del Texto diario: la acción con su disparador a la vista y los 3 pasos plegables.
// Sin rutina de hoy: pegarla (lo copiado de Gemini) o escribirla.
export function RutinaCard({ entry, onPaste, onWrite, onEdit, onToggle }) {
  const f = entry?.fields
  return (
    <section className="rutina-card" aria-label="Rutina bíblica de hoy">
      <p className="rutina-label">Rutina bíblica de hoy</p>
      {f ? (
        <>
          <p className="rutina-cita-hoy"><Refs text={f.cita} />{f.tema ? ` · ${f.tema}` : ''}</p>
          <div className="rutina-accion">
            <p className="rutina-accion-q">{f.cierre.accion}</p>
            <p className="rutina-disparador"><span>Disparador · </span>{f.cierre.disparador}</p>
            <Hecha hecha={!!f.cierre.hecha} onToggle={onToggle} />
          </div>
          <details className="rutina-paso">
            <summary>1. Recuerdo activo<Icon d={ICONS.chev} size={14} stroke={2} /></summary>
            <Recuerdo f={f} />
          </details>
          <details className="rutina-paso">
            <summary>2. Mapa<Icon d={ICONS.chev} size={14} stroke={2} /></summary>
            <Mapa f={f} />
          </details>
          <details className="rutina-paso">
            <summary>3. Cierre<Icon d={ICONS.chev} size={14} stroke={2} /></summary>
            <Cierre f={f} />
          </details>
          <button className="rutina-link" onClick={onEdit}>Cambiar</button>
        </>
      ) : (
        <>
          <p className="rutina-hint">Al terminar tu rutina en Gemini, copia el bloque final y pégalo aquí.</p>
          <div className="rutina-btns">
            <button className="rutina-link" onClick={onPaste}>Pegar rutina de hoy</button>
            <button className="rutina-link" onClick={onWrite}>Guardar rutina de hoy</button>
          </div>
        </>
      )}
    </section>
  )
}

// Historial (Biblioteca → Más → Rutina bíblica): una rutina pasada, para repasarla.
export function RutinaView({ entry, backLabel, onClose, onEdit, onToggle }) {
  const f = entry.fields
  return (
    <div className="overlay">
      <header className="bar">
        <button className="bar-btn back" onClick={onClose}><Icon d={ICONS.back} size={18} stroke={2} /> {backLabel}</button>
        <span className="bar-title">Rutina bíblica</span>
        <button className="bar-btn" onClick={() => onEdit(entry)}>Cambiar</button>
      </header>
      <div className="editor-body">
        <RutinaDetail f={f} />
        <Hecha hecha={!!f.cierre?.hecha} onToggle={() => onToggle(entry)} />
      </div>
    </div>
  )
}

// La hoja para guardarla: pegar el bloque de Gemini o escribirla, vista previa y "Guardar".
// Si ya hay una de esa fecha, pregunta si reemplazarla o conservarla. Nunca guarda a medias.
export function RutinaEditor({ mode: startMode, entry, initialText = '', today, entries, onSave, onClose, toast }) {
  const editing = !!entry
  const [mode, setMode] = useState(startMode) // 'pegar' | 'escribir'
  const [text, setText] = useState(initialText)
  const [draft, setDraft] = useState(() => (editing ? structuredClone(entry.fields) : emptyRutina(today, lastOracion(entries))))
  const [step, setStep] = useState('editar') // 'editar' | 'vista' | 'repetida'
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const body = useRef(null)

  const fail = (msg) => {
    setError(msg)
    body.current?.scrollTo(0, 0)
  }
  function revisarPegado(t = text) {
    const r = parseRutina(t, today)
    if (!r.ok) return fail(r.error)
    setError('')
    setDraft(r.fields)
    setStep('vista')
  }
  function revisarEscrito() {
    const f = tidyRutina(draft)
    const msg = validateRutina(f)
    if (msg) return fail(msg)
    setError('')
    setDraft(f)
    setStep('vista')
  }
  // Lo copiado al tocar "Pegar rutina de hoy": si está completo, directo a la vista previa.
  useEffect(() => {
    if (startMode === 'pegar' && initialText.trim()) revisarPegado(initialText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function pegar() {
    try {
      const t = await navigator.clipboard.readText()
      setText(t)
      revisarPegado(t)
    } catch {
      fail('No se pudo leer lo copiado. Mantén presionado el cuadro y elige «Pegar».')
    }
  }
  async function copiarFormato() {
    try {
      await navigator.clipboard.writeText(RUTINA_FORMAT)
      toast?.('Formato copiado. Pégalo en la instrucción de tu chat «rutina bíblica».')
    } catch {
      toast?.('No se pudo copiar.')
    }
  }
  async function guardar(reemplazar = false) {
    const prev = findRutina(entries, draft.fecha)
    if (prev && prev.id !== entry?.id && !reemplazar) return setStep('repetida')
    setSaving(true)
    try {
      await onSave(draft, prev)
    } catch (e) {
      setSaving(false)
      fail('No se pudo guardar: ' + e.message)
    }
  }

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setPunto = (i, patch) => setDraft((d) => ({ ...d, puntos: d.puntos.map((p, j) => (j === i ? { ...p, ...patch } : p)) }))
  const setCierre = (patch) => setDraft((d) => ({ ...d, cierre: { ...d.cierre, ...patch } }))

  return (
    <div className="overlay rutina-editor">
      <header className="bar">
        {step === 'editar'
          ? <button className="bar-btn" onClick={onClose}>Cerrar</button>
          : <button className="bar-btn" onClick={() => setStep(step === 'repetida' ? 'vista' : 'editar')}>Atrás</button>}
        <span className="bar-title">{editing ? 'Cambiar rutina' : 'Rutina de hoy'}</span>
        {step === 'editar' && <button className="bar-btn strong" disabled={mode === 'pegar' && !text.trim()} onClick={() => (mode === 'pegar' ? revisarPegado() : revisarEscrito())}>Revisar</button>}
        {step === 'vista' && <button className="bar-btn strong" disabled={saving} onClick={() => guardar()}>Guardar</button>}
        {step === 'repetida' && <span className="bar-spacer" />}
      </header>

      <div className="editor-body" ref={body}>
        {error && <p className="error">{error}</p>}

        {step === 'editar' && (
          <>
            <div className="seg2 rutina-modo" role="group" aria-label="Cómo guardarla">
              <button className={mode === 'pegar' ? 'on' : ''} aria-pressed={mode === 'pegar'} onClick={() => { setMode('pegar'); setError('') }}>Pegar de Gemini</button>
              <button className={mode === 'escribir' ? 'on' : ''} aria-pressed={mode === 'escribir'} onClick={() => { setMode('escribir'); setError('') }}>Escribirla</button>
            </div>
            {mode === 'pegar' ? (
              <>
                <p className="hint">Copia el bloque final de tu chat «rutina bíblica» y pégalo aquí. Antes de guardar verás la rutina completa.</p>
                <textarea className="input paste-input" value={text} placeholder='{ "fecha": "…", "texto": "…", "mapa": [ … ] }'
                  autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setText(e.target.value)} />
                <div className="stack">
                  <button className="secondary" onClick={pegar}>Pegar del portapapeles</button>
                  <button className="secondary" onClick={copiarFormato}>Copiar formato para Gemini</button>
                </div>
              </>
            ) : (
              <div className="rutina-form">
                {editing ? <p className="rutina-fecha">{formatDate(draft.fecha)}</p> : (
                  <label className="field"><span>Fecha</span><input className="input" type="date" value={draft.fecha} onChange={(e) => set({ fecha: e.target.value })} /></label>
                )}
                <label className="field"><span>Texto o cita base</span><input className="input" value={draft.cita} placeholder="Salmo 83:18" onChange={(e) => set({ cita: e.target.value })} /></label>
                <label className="field"><span>Tema</span><input className="input" value={draft.tema} onChange={(e) => set({ tema: e.target.value })} /></label>
                <div className="field"><span>1. Recuerdo activo, con tus palabras</span><AutoText value={draft.recuerdo} minRows={3} onChange={(v) => set({ recuerdo: v })} /></div>
                <h2 className="rutina-form-h">2. Mapa</h2>
                {draft.puntos.map((p, i) => (
                  <fieldset className="rutina-punto-form" key={i}>
                    <legend>Punto {i + 1}</legend>
                    <label className="field"><span>Título</span><input className="input" value={p.titulo} onChange={(e) => setPunto(i, { titulo: e.target.value })} /></label>
                    {LETRAS.map((L) => (
                      <div className="field" key={L}><span>Gancho {L}</span><AutoText value={p.ganchos[L]} minRows={1} onChange={(v) => setPunto(i, { ganchos: { ...p.ganchos, [L]: v } })} /></div>
                    ))}
                    <div className="field">
                      <span>Gancho elegido</span>
                      <div className="seg2" role="group" aria-label={`Gancho elegido del punto ${i + 1}`}>
                        {LETRAS.map((L) => <button key={L} className={p.elegido === L ? 'on' : ''} aria-pressed={p.elegido === L} onClick={() => setPunto(i, { elegido: L })}>{L}</button>)}
                      </div>
                    </div>
                  </fieldset>
                ))}
                <h2 className="rutina-form-h">3. Cierre</h2>
                <div className="field"><span>Acción de hoy (una acción concreta, nunca orar)</span><AutoText value={draft.cierre.accion} onChange={(v) => setCierre({ accion: v })} /></div>
                <div className="field"><span>Disparador</span><AutoText value={draft.cierre.disparador} onChange={(v) => setCierre({ disparador: v })} /></div>
                <div className="field"><span>Oración fija</span><AutoText value={draft.oracion} onChange={(v) => set({ oracion: v })} /></div>
              </div>
            )}
          </>
        )}

        {step === 'vista' && (
          <>
            <RutinaDetail f={draft} />
            <button className="secondary" onClick={() => { setMode('escribir'); setStep('editar') }}>Corregir</button>
          </>
        )}

        {step === 'repetida' && (
          <div className="rutina-repetida">
            <p className="hint">Ya hay una rutina del {formatDate(draft.fecha)}. ¿Qué hago con la nueva?</p>
            <button className="primary" disabled={saving} onClick={() => guardar(true)}>Reemplazar la que ya está</button>
            <button className="secondary" onClick={onClose}>Conservar la que ya está</button>
          </div>
        )}
      </div>
    </div>
  )
}
