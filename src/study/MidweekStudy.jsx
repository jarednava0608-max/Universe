import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import RefLink from '../components/RefLink.jsx'
import { findAllRefs, chapterSaved } from '../lib/verses.js'
import { parseRef } from '../lib/bible.js'
import { isRead } from '../lib/reading.js'
import { entryForClaude } from './kinds.js'
import { STEPS, parseProgram, programTitle, answerOf, withAnswer, partDone, midweekCount, meetingsUrl, programDate, programMonday, splitAsides, splitRefs, readingChapters, isStudyPart, studyBlocks, studyChapter, meetingItems, isStarred, withStar, DEFAULT_HOUR, weekSchedule, outline, whoLabel, withExtras } from './midweek.js'
import MeetingMode from './MeetingMode.jsx'
import ConceptsStep from './ConceptsStep.jsx'
import StarButton from '../components/StarButton.jsx'
import { useMeetings } from './meetings.js'
import { DAYS } from './today.js'

// La reunión de entre semana por pasos, como La Atalaya: se pega el programa de la Guía de
// actividades, luego cada parte con sus preguntas para contestar (o notas, si no tiene) y al
// final cómo lo aplico y, si quieres, tus respuestas pasan al mapa. Se guarda sola y al volver sigue en la parte donde te quedaste.
export default function MidweekStudy({ entry, entries = [], leidos, onToggleRead, isNew, toast, onSave, onDelete, onClose, nodes, onToMap, onOpenNode, onSwitchToAtalaya }) {
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  const prog = useMemo(() => parseProgram(fields.programa), [fields.programa])
  const schedule = weekSchedule(entries, fields.fecha)
  // Las partes de la Guía y, en su lugar, las que agrega la congregación (un informe).
  const partes = useMemo(() => withExtras(prog.partes, schedule), [prog, schedule])
  const [step, setStep] = useState(() => {
    if (!parseProgram(entry.fields.programa).partes.length) return 'programa'
    return STEPS.some((s) => s.key === entry.fields.paso) ? entry.fields.paso : 'partes'
  })
  const [idx, setIdx] = useState(() => {
    const ps = withExtras(parseProgram(entry.fields.programa).partes, weekSchedule(entries, entry.fields.fecha))
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
  const [editingProgram, setEditingProgram] = useState(false)
  const [meeting, setMeeting] = useState(false)

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

  // Al bajar leyendo se esconden los pasos y los números; al subir un buen tramo o al llegar
  // arriba vuelven (igual que en La Atalaya).
  const [barsHidden, setBarsHidden] = useState(false)
  const scrollRef = useRef({ last: 0, turn: 0, dir: 0 })
  function onScroll(e) {
    const el = e.currentTarget
    const y = Math.min(Math.max(el.scrollTop, 0), el.scrollHeight - el.clientHeight)
    const r = scrollRef.current
    if (y < 60) {
      setBarsHidden(false)
      Object.assign(r, { last: y, turn: y, dir: 0 })
      return
    }
    const dir = y > r.last ? 1 : y < r.last ? -1 : r.dir
    if (dir !== r.dir) r.turn = r.last
    r.dir = dir
    r.last = y
    if (dir === 1 && y - r.turn > 24) setBarsHidden(true)
    else if (dir === -1 && r.turn - y > 70) setBarsHidden(false)
  }

  function go(next, i = idx) {
    setBarsHidden(false)
    setEditingProgram(false)
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
  const { sections: rows, times } = outline(partes, schedule, meetings?.hora)
  const rowOf = (num) => rows.flatMap(([, , l]) => l).find((r) => r.part?.num === num)
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

      <div className="editor-body at-body" ref={top} onScroll={onScroll}>
        <div className={'at-bars' + (barsHidden ? ' hidden' : '')}>
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
                  className={'at-jump-num ' + p.sec + (i === idx ? ' on' : partDone(fields, p) ? ' done' : '')}
                  aria-current={i === idx ? 'step' : undefined}
                  onClick={() => go('partes', i)}
                >
                  {p.label ?? p.num}
                </button>
              ))}
            </nav>
          )}
        </div>

        {step === 'programa' && partes.length > 0 && !editingProgram && (
          <>
            <div className="at-card mw-cover">
              <p className="at-cover-kicker">Vida y Ministerio{prog.semana ? ` · ${prog.semana}` : ''}</p>
              {prog.semana && <p className="mw-week">{prog.semana}</p>}
              <p className="mw-cover-title">{fields.titulo || prog.lectura || 'Reunión de entre semana'}</p>
              <p className="at-summary">{meetingDay(fields.fecha)}{count.total ? ` · ${count.done} de ${count.total} contestadas` : ''}</p>
            </div>
            {count.done > 0 && (
              <button className="secondary mm-open" onClick={() => setMeeting(true)}>Modo reunión: solo mis respuestas</button>
            )}
            {readingChapters(prog.lectura).length > 0 && (
              <div className="mw-reading">
                <p className="at-label">Lectura de la semana</p>
                {readingChapters(prog.lectura).map((c) => {
                  // Leído cuenta para "Leer la Biblia" (el progreso de todos tus capítulos).
                  const r = parseRef(c)
                  const read = r ? isRead(leidos, r.book, r.chapter) || (fields.leidos ?? []).includes(c) : (fields.leidos ?? []).includes(c)
                  const toggle = () => {
                    const on = !read
                    if (r && onToggleRead) onToggleRead(r.book, r.chapter, on)
                    set({ leidos: on ? [...new Set([...(fields.leidos ?? []), c])] : (fields.leidos ?? []).filter((x) => x !== c) })
                  }
                  return (
                    <div key={c} className={'mw-read-row' + (read ? ' on' : '')}>
                      <button
                        className="mw-check"
                        aria-label={read ? `${c}: leído` : `Marcar ${c} como leído`}
                        onClick={toggle}
                      >
                        <span className="plan-check">{read && <Check />}</span>
                      </button>
                      <RefLink refText={c} className="mw-read-link" />
                      <span className="mw-read-state">{savedLabel(chapterSaved(entries, c))}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {prog.semana && meetings?.semana == null && !fields.fechaManual && (
              <label className="sfield">
                <span className="sfield-label">¿Qué día es tu reunión entre semana? Así pongo la fecha sola.</span>
                <select className="input" value="" onChange={(e) => setMeetings({ ...(meetings ?? {}), semana: Number(e.target.value) })}>
                  <option value="" disabled>Elegir</option>
                  {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}
                </select>
              </label>
            )}
            {schedule && (
              <p className="mw-who-top">
                {schedule.presidente && <span>Presidente: {schedule.presidente}</span>}
                {schedule.salaB?.consejero && <span>Sala B: {schedule.salaB.consejero}</span>}
              </p>
            )}
            {rows.map(([name, sec, list]) => (
              <section key={name} className="mw-outline">
                <p className={'mw-sec ' + sec}>{name}</p>
                {list.map((r) => {
                  const body = (
                    <>
                      <span className={'mw-num ' + r.sec + (r.part && partDone(fields, r.part) ? ' done' : '')}>{r.part ? r.part.label ?? r.part.num : ''}</span>
                      <span className="mw-row-title">
                        {r.titulo}
                        {r.part && kindOf(r.part) && <span className="mw-row-sub">{kindOf(r.part)}</span>}
                        {r.nombres.length > 0 && <span className="mw-row-who">{whoLabel(r.nombres)}</span>}
                        {r.salaB.length > 0 && <span className="mw-row-who">Sala B: {whoLabel(r.salaB)}</span>}
                      </span>
                      {r.minutos > 0 && (
                        <span className="mw-min">
                          {times[r.key] ? `${times[r.key].inicio} a ${times[r.key].fin}` : `${r.minutos} min`}
                        </span>
                      )}
                    </>
                  )
                  return r.part
                    ? <button key={r.key} className="mw-row" onClick={() => go('partes', partes.indexOf(r.part))}>{body}</button>
                    : <div key={r.key} className="mw-row extra">{body}</div>
                })}
              </section>
            ))}
            {times.conclusion && (
              <p className="mw-close">
                <span>Palabras de conclusión{schedule?.presidente ? <span className="mw-row-who">{schedule.presidente}</span> : null}</span>
                <span className="mw-min">{times.conclusion.inicio} a {times.conclusion.fin}</span>
                <span className="mw-close-end">Canción y oración{schedule?.oracion ? ` (${schedule.oracion})` : ''} · termina como a las {times.termina}</span>
              </p>
            )}
            <button className="primary" onClick={() => go('partes', Math.max(0, partes.findIndex((p) => !partDone(fields, p))))}>
              {Object.values(fields.respuestas ?? {}).some((v) => String(v).trim()) ? 'Seguir donde me quedé' : 'Empezar'}
            </button>
            <a className="secondary as-btn" data-direct="1" href={meetingsUrl(linkDate)} target="_blank" rel="noopener noreferrer">
              Ver esta semana en wol.jw.org
            </a>
            <button className="mw-edit" onClick={() => setEditingProgram(true)}>Cambiar fecha, título o programa</button>
          </>
        )}

        {step === 'programa' && (!partes.length || editingProgram) && (
          <>
            <h2 className="at-h">{partes.length ? 'Fecha y programa' : 'Pega el programa'}</h2>
            {!partes.length && (
              <div className="sfield">
                <div className="seg2">
                  <button type="button" onClick={() => onSwitchToAtalaya({ ...base.current, fields: { ...fields, tipo: 'atalaya' } })}>La Atalaya</button>
                  <button type="button" className="on">Entre semana</button>
                </div>
              </div>
            )}
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
              <span className="sfield-label">Hora de tu reunión entre semana</span>
              <input className="input" type="time" value={meetings?.hora || DEFAULT_HOUR} onChange={(e) => setMeetings({ ...(meetings ?? {}), hora: e.target.value })} />
            </label>
            <label className="sfield">
              <span className="sfield-label">Título</span>
              <input className="input" value={fields.titulo ?? ''} placeholder="La lectura de la semana" onChange={(e) => set({ titulo: e.target.value })} />
            </label>
            {!partes.length && (
              <a className="secondary as-btn" data-direct="1" href={meetingsUrl(linkDate)} target="_blank" rel="noopener noreferrer">
                Ver esta semana en wol.jw.org
              </a>
            )}
            <div className="sfield">
              <span className="sfield-label">La semana completa de la Guía de actividades</span>
              <AutoText value={fields.programa ?? ''} placeholder="En JW Library abre la Guía de actividades, copia toda la semana y pégala aquí" onChange={setProgram} minRows={partes.length ? 4 : 6} />
            </div>
            {partes.length > 0 && (
              <p className="hint">Encontré {partes.length} partes y {count.total} {count.total === 1 ? 'pregunta' : 'preguntas'}.</p>
            )}
            {String(fields.programa ?? '').trim() && !partes.length && (
              <p className="hint warn">No encontré las partes. Revisa que vengan las secciones (TESOROS DE LA BIBLIA…) y cada parte con su número, como «1. Título».</p>
            )}
            <button className="primary" disabled={!partes.length} onClick={() => setEditingProgram(false)}>
              Listo
            </button>
          </>
        )}

        {step === 'partes' && pt && (
          <Part
            key={pt.num}
            pt={pt}
            time={times[pt.num]}
            who={rowOf(pt.num)}
            fields={fields}
            fecha={linkDate}
            onAnswer={(k, v) => setFields((f) => withAnswer(f, k, v))}
            onSet={set}
            onStar={(k) => setFields((f) => withStar(f, k))}
            onMarks={(k, m) => setFields((f) => ({ ...f, marcas: { ...(f.marcas ?? {}), [k]: m } }))}
            last={idx === partes.length - 1}
            onPrev={() => (idx > 0 ? go('partes', idx - 1) : go('programa'))}
            onNext={() => (idx < partes.length - 1 ? go('partes', idx + 1) : go('conceptos'))}
          />
        )}

        {step === 'conceptos' && (
          <ConceptsStep entry={base.current} fields={fields} set={set} nodes={nodes} onToMap={(list) => onToMap(list, { ...base.current, fields })} onOpenNode={onOpenNode} onPrev={() => go('partes', Math.max(0, partes.length - 1))} onNext={() => go('listo')} />
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
              {count.done > 0 && <button className="secondary" onClick={() => setMeeting(true)}>Modo reunión: solo mis respuestas</button>}
              <button className="secondary icon-left" onClick={async () => {
                try { await navigator.clipboard.writeText(entryForClaude({ ...base.current, fields })); toast('Copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
              }}>
                <Icon d={ICONS.pegar} size={18} /> Copiar para Claude
              </button>
              <button className="secondary icon-left" onClick={() => go('conceptos')}>
                <Icon d={ICONS.nodo} size={18} /> Conceptos para el mapa{fields.conceptos?.length ? ` (${fields.conceptos.length})` : ''}
              </button>
              <button className="primary" onClick={close}>Guardar y salir</button>
            </div>
            {exists.current && (
              <button className="delete-btn" onClick={() => confirm('¿Eliminar esta reunión?') && onDelete(entry.id)}>Eliminar reunión</button>
            )}
          </>
        )}
      </div>
      {meeting && (
        <MeetingMode
          kicker={['Vida y Ministerio', prog.semana].filter(Boolean).join(' · ')}
          title={fields.titulo || prog.lectura || 'Reunión de entre semana'}
          items={meetingItems(fields)}
          starred={fields.comentar ?? []}
          onClose={() => setMeeting(false)}
        />
      )}
    </div>
  )
}

// Una parte del programa con el color de su sección. Lo que va entre paréntesis (citas y
// publicaciones) va más tenue y se toca ahí mismo; cada pregunta va en una tarjeta con su
// respuesta. Si la parte no tiene preguntas (lectura, maestros, estudio bíblico), lleva notas.
function Part({ pt, time, who, fields, fecha, onAnswer, onSet, onStar, onMarks, last, onPrev, onNext }) {
  // Los minutos de la congregación (si recortaron el estudio, 15 en vez de 30).
  const mins = who?.minutos || pt.minutos
  const asks = pt.lineas.some((l) => l.q)
  const study = isStudyPart(pt)
  return (
    <>
      <p className={'mw-sec ' + pt.sec}>{pt.seccion}</p>
      <p className="at-qnum mw-meta">{pt.extra ? 'Parte de la congregación' : `Parte ${pt.num}`}{mins ? ` · ${mins} min` : ''}</p>
      <h2 className={'mw-title ' + pt.sec} data-num={pt.extra ? undefined : pt.num}>{pt.titulo}</h2>
      {mins > 0 && <p className="mw-mins">({mins} mins.){mins !== pt.minutos && pt.minutos ? ` · la Guía dice ${pt.minutos}` : ''}</p>}
      {time && <p className="mw-time">De {time.inicio} a {time.fin}</p>}
      {who?.nombres.length > 0 && <p className="mw-who">{whoLabel(who.nombres)}{who.salaB.length > 0 && <span>Sala B: {whoLabel(who.salaB)}</span>}</p>}
      {pt.lineas.some((l) => !l.q && !l.media) && <p className="at-tip small">Toca 2 o 3 palabras clave para subrayarlas.</p>}
      {pt.lineas.map((l, i) => {
        if (l.q) return (
          <label key={i} className="at-answer mw-qcard">
            <span className="at-answer-head">
              <span className="at-answer-label">{l.meditar ? 'Para meditar' : 'Pregunta'}</span>
              <StarButton on={isStarred(fields, l.key)} onClick={() => onStar(l.key)} />
            </span>
            <span className="mw-q"><Rich text={l.text} /></span>
            <AutoText value={answerOf(fields, l.key)} placeholder="Mi respuesta, con mis palabras" onChange={(v) => onAnswer(l.key, v)} minRows={2} />
          </label>
        )
        if (l.media) return <p key={i} className="mw-media"><Rich text={l.text} /></p>
        const k = `${pt.num}-${i}`
        const marks = fields.marcas?.[k] ?? []
        const on = new Set(marks)
        return (
          <p key={i} className="mw-text">
            <Rich text={l.text} marks={on} onToggle={(w) => onMarks(k, on.has(w) ? marks.filter((x) => x !== w) : [...marks, w])} />
          </p>
        )
      })}
      {study && <StudyChapter fields={fields} onSet={onSet} onAnswer={onAnswer} onStar={onStar} />}
      {!asks && !(study && studyBlocks(fields).length) && (
        <label className="at-answer">
          <span className="at-answer-label">Mis notas</span>
          <AutoText value={answerOf(fields, String(pt.num))} placeholder="Lo que aprendí o quiero recordar de esta parte" onChange={(v) => onAnswer(String(pt.num), v)} minRows={2} />
        </label>
      )}
      <a className="at-jw" data-direct="1" href={meetingsUrl(fecha)} target="_blank" rel="noopener noreferrer">Ver la reunión en wol.jw.org</a>
      <div className="at-nav">
        <button className="secondary" onClick={onPrev}>Anterior</button>
        <button className="primary" onClick={onNext}>{last ? 'Terminar' : 'Siguiente'}</button>
      </div>
    </>
  )
}

// El estudio bíblico de la congregación: pegas el capítulo del libro y lo contestas pregunta por
// pregunta (el párrafo se abre al tocarlo para no llenar la pantalla).
function StudyChapter({ fields, onSet, onAnswer, onStar }) {
  const chap = studyChapter(fields)
  const blocks = chap.bloques
  const [editing, setEditing] = useState(!blocks.length)
  const done = blocks.filter((b) => answerOf(fields, 'e:' + b.key).trim()).length
  return (
    <div className="mw-study">
      {editing ? (
        <div className="sfield">
          <span className="sfield-label">Pega el capítulo para contestarlo pregunta por pregunta</span>
          <AutoText value={fields.estudio ?? ''} placeholder="En JW Library abre el libro del estudio, copia el capítulo completo con sus preguntas y pégalo aquí" onChange={(v) => onSet({ estudio: v })} minRows={4} />
          {String(fields.estudio ?? '').trim() && !blocks.length && (
            <p className="hint warn">No encontré las preguntas. Copia el capítulo completo, con las preguntas del final.</p>
          )}
          {blocks.length > 0 && (
            <button className="primary" onClick={() => setEditing(false)}>Listo: {blocks.length} {blocks.length === 1 ? 'pregunta' : 'preguntas'}</button>
          )}
        </div>
      ) : (
        <>
          {chap.titulo && <h3 className="mw-chap">{chap.titulo}</h3>}
          {chap.tema && <p className="mw-chap-tema">{chap.tema}</p>}
          {chap.relato.length > 0 && (
            <details className="mw-para mw-relato">
              <summary>Leer el relato del capítulo</summary>
              {chap.relato.map((t, i) => <p key={i} className={t.length < 120 ? 'mw-media' : ''}><Rich text={t} /></p>)}
            </details>
          )}
          {chap.lectura.length > 0 && (
            <div className="mw-lectura">
              <p className="at-label">Lea el relato bíblico</p>
              {chap.lectura.map((t, i) => <p key={i}><Rich text={t} /></p>)}
            </div>
          )}
          <p className="at-label">Preguntas · {done} de {blocks.length} contestadas</p>
          {blocks.map((b, i) => (
            <Fragment key={b.key}>
              {b.seccion && b.seccion !== blocks[i - 1]?.seccion && <p className="mw-study-sec">{b.seccion}</p>}
              <div className="at-answer mw-qcard">
                <span className="at-answer-head">
                  <span className="at-answer-label">{b.seccion ? (b.label === b.seccion ? 'Pregunta' : `Pregunta ${b.n}`) : b.label}</span>
                  <StarButton on={isStarred(fields, 'e:' + b.key)} onClick={() => onStar('e:' + b.key)} />
                </span>
                <span className="mw-q"><Rich text={b.pregunta} /></span>
                {b.parrafos.length > 0 && (
                  <details className="mw-para">
                    <summary>Leer el párrafo</summary>
                    {b.parrafos.map((t, k) => <p key={k}><Rich text={t} /></p>)}
                  </details>
                )}
                <AutoText value={answerOf(fields, 'e:' + b.key)} placeholder="Mi respuesta, con mis palabras" onChange={(v) => onAnswer('e:' + b.key, v)} minRows={2} />
              </div>
            </Fragment>
          ))}
          <button className="mw-edit" onClick={() => setEditing(true)}>Cambiar el capítulo pegado</button>
        </>
      )}
    </div>
  )
}

// Texto con lo de entre paréntesis más tenue y las citas tocables. Con `onToggle`, las palabras
// (fuera de los paréntesis) se tocan para subrayarlas como palabras clave; las marcadas seguidas
// van en una sola pieza amarilla.
function Rich({ text, marks, onToggle }) {
  let n = 0
  return splitAsides(text).map((piece, i) => {
    const refs = findAllRefs(piece.text)
    const parts = refs.length ? splitRefs(piece.text, refs) : [{ text: piece.text }]
    const inner = parts.map((x, k) => {
      if (x.ref) return <RefLink key={k} refText={x.text} />
      if (!onToggle || piece.aside) return x.text
      const r = markable(x.text, n, marks, onToggle)
      n = r.next
      return <span key={k}>{r.nodes}</span>
    })
    return piece.aside ? <span key={i} className="mw-aside">{inner}</span> : <span key={i}>{inner}</span>
  })
}

function markable(text, start, marks, onToggle) {
  const out = []
  let run = null
  let n = start
  const flush = () => {
    if (!run) return
    const tail = typeof run.at(-1) === 'string' ? run.pop() : null
    out.push(<mark key={'m' + out.length} className="at-run">{run}</mark>)
    if (tail) out.push(tail)
    run = null
  }
  for (const t of text.split(/(\s+)/)) {
    if (!t) continue
    if (/^\s+$/.test(t)) {
      ;(run ?? out).push(t)
      continue
    }
    const i = n++
    const el = <span key={'w' + i} className="at-word" onClick={() => onToggle(i)}>{t}</span>
    if (marks.has(i)) (run ??= []).push(el)
    else {
      flush()
      out.push(el)
    }
  }
  flush()
  return { nodes: out, next: n }
}

const Check = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// "jueves 8 de octubre"
function meetingDay(iso) {
  const [y, m, d] = String(iso ?? '').split('-').map(Number)
  if (!y) return 'Sin fecha'
  const s = new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')
  return s[0].toUpperCase() + s.slice(1)
}

// Las partes de maestros dicen dónde es ("DE CASA EN CASA." → "De casa en casa").
function kindOf(p) {
  const m = p.lineas[0]?.text.match(/^([A-ZÁÉÍÓÚÑ ]{4,})\./)
  if (!m) return ''
  const t = m[1].trim().toLowerCase()
  return t[0].toUpperCase() + t.slice(1)
}

// Si ya pegaste ese capítulo en Mi Biblia: "Guardado", "9 de 16" o "Pegar".
function savedLabel({ saved, expected }) {
  if (expected && saved >= expected) return 'Guardado'
  return saved ? `${saved} de ${expected}` : 'Pegar'
}
