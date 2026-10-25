import { useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import { dailyVerse, dailyBody, dailyTextUrl, dailyTextAppUrl, dailyStudyPrompt, otherDayText } from './kinds.js'
import { findAllRefs } from '../lib/verses.js'
import { findRefs } from '../lib/bible.js'
import { isLearning } from '../lib/verseSave.js'
import { splitRefs } from './midweek.js'
import RefLink from '../components/RefLink.jsx'
import { dailyTextFor, hasDailyTexts, useDailyTexts } from '../lib/dailytexts.js'

const filled = (v) => !!String(v ?? '').trim()

// El Texto diario: leerlo y estudiarlo en el chat con Claude ("Estudiarlo con Claude" copia el texto con
// el método del usuario, ver dailyStudyPrompt). El usuario cambió las preguntas de la app (Jehová, Lección,
// Hoy, Recordar) por ese estudio guiado; "Listo" lo marca hecho (fields.estudiado). Se guarda sola.
export default function DailyStudy({ backLabel = 'Hoy', entry, isNew, entries = [], toast, onSave, onLearn, onDelete, onClose }) {
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  const base = useRef(entry)
  const saved = useRef(JSON.stringify(entry.fields))
  const exists = useRef(!isNew)
  const set = (patch) => setFields((f) => ({ ...f, ...patch }))
  // Con el folleto del año importado, el texto de esa fecha se pone solo (también si cambias la fecha).
  useDailyTexts()
  const imported = dailyTextFor(fields.fecha)
  useEffect(() => {
    if (!filled(fields.texto) && imported) set({ texto: imported })
  }, [fields.fecha, imported]) // eslint-disable-line react-hooks/exhaustive-deps

  async function flush(f = fields) {
    if (!filled(f.texto)) return
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
  }, [fields])
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
      // Si lo copiado es de otro día (el de ayer seguía en el portapapeles), se avisa y no se pega.
      const [y, m, d] = String(fields.fecha ?? '').split('-').map(Number)
      const other = y ? otherDayText(t, new Date(y, m - 1, d)) : null
      if (other) return toast(`Ese es el texto del ${other}. Copia el de este día en JW Library.`)
      set({ texto: t })
    } catch {
      toast('No se pudo pegar. Mantén presionado el cuadro y toca Pegar.')
    }
  }
  async function copyForClaude() {
    try {
      await navigator.clipboard.writeText(dailyStudyPrompt(fields))
      toast('Copiado. Pégalo en tu chat con Claude.')
    } catch {
      toast('No se pudo copiar.')
    }
  }
  async function finish() {
    const f = { ...fields, estudiado: true }
    setFields(f)
    await flush(f)
    toast('Lo de hoy, listo.')
    onClose()
  }
  const verse = dailyVerse(fields.texto)
  // El comentario: lo pegado sin la fecha ni el versículo de arriba.
  const comment = dailyBody(fields.texto).replace(verse, '').trim()
  // "Aprender este texto": el versículo entra a Repasar (el usuario elige; nada entra solo).
  const cita = findRefs(verse).at(-1) ?? ''
  const learning = !!cita && isLearning(entries, cita)
  const [fy, fm, fd] = String(fields.fecha ?? '').split('-').map(Number)
  const dateLabel = fy ? new Date(fy, fm - 1, fd).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '').replace(/^./, (c) => c.toUpperCase()) : ''

  return (
    <div className="overlay at-study">
      <header className="bar">
        <button className="bar-btn back" onClick={close}><Icon d={ICONS.back} size={18} stroke={2} /> {backLabel}</button>
        <span className="bar-title">Texto diario</span>
        <span />
      </header>

      <div className="editor-body at-body">
        {!filled(fields.texto) ? (
          <>
            <h2 className="at-h">Texto de hoy</h2>
            <p className="at-tip">Cópialo en JW Library y pégalo aquí. Luego lo estudias con Claude.</p>
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
            {dateLabel && <p className="dt-date">{dateLabel}</p>}
            <p className="dt-verse"><Refs text={verse} /></p>
            {comment && <p className="dt-comment"><Refs text={comment} /></p>}
            <a className="dt-link" data-direct="1" href={dailyTextUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">Ver el texto en wol.jw.org</a>
            {cita && onLearn && (
              <button className="dt-link" disabled={learning} onClick={() => onLearn({ cita, texto: verse.replace(/\s*\([^()]*\d[^()]*\)[.»”"]?\s*$/, '') })}>
                {learning ? 'Ya estás aprendiendo este texto' : 'Aprender este texto'}
              </button>
            )}
            <div className="action-stack">
              <button className="primary icon-left" onClick={copyForClaude}><Icon d={ICONS.pegar} size={18} /> Estudiarlo con Claude</button>
              <button className="secondary" onClick={finish}>{fields.estudiado ? 'Listo' : 'Ya lo estudié'}</button>
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

        {exists.current && (
          <button className="delete-btn" onClick={() => confirm('¿Eliminar esta entrada?') && onDelete()}>Eliminar entrada</button>
        )}
      </div>
    </div>
  )
}

// El texto con sus citas tocables ("Lea Isaías 41:10"): abren su hoja de Mi Biblia, como en las reuniones.
function Refs({ text }) {
  const refs = findAllRefs(text)
  if (!refs.length) return text
  return splitRefs(text, refs).map((x, i) => (x.ref ? <RefLink key={i} refText={x.text} /> : x.text))
}
