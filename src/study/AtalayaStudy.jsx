import { useEffect, useMemo, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import { RefChips } from '../components/RefLink.jsx'
import { findAllRefs } from '../lib/verses.js'
import { entryForClaude, formatDate } from './kinds.js'
import { STEPS, parseArticle, answerOf, withAnswer, reviewAnswer, withReview, words, keyPhrases, firstUnanswered, paragraphUrl, meetingItems } from './atalaya.js'
import MeetingMode from './MeetingMode.jsx'
import ConceptsStep from './ConceptsStep.jsx'
import StarButton from '../components/StarButton.jsx'
import { isStarred, withStar } from './midweek.js'
import { canSpeak, useSpeech } from '../lib/speech.js'

// La Atalaya por pasos, como recomienda jw.org para prepararse: primero una idea general
// (título, subtítulos y preguntas de repaso), luego cada párrafo buscando la respuesta y
// subrayando solo palabras clave, y al final el repaso. Se guarda sola y al volver
// sigue en el paso y la pregunta donde te quedaste.
export default function AtalayaStudy({ entry, isNew, toast, onSave, onDelete, onClose, nodes, onToMap, onOpenNode, onSwitchToForm }) {
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  const article = useMemo(() => parseArticle(fields.articulo), [fields.articulo])
  const bloques = article.bloques
  const [step, setStep] = useState(() => {
    if (!String(entry.fields.articulo ?? '').trim()) return 'articulo'
    if (entry.fields.paso && STEPS.some((s) => s.key === entry.fields.paso)) return entry.fields.paso
    return (entry.fields.parrafos ?? []).some((p) => p.nota?.trim()) ? 'parrafos' : 'vistazo'
  })
  const [idx, setIdx] = useState(() => {
    const b = parseArticle(entry.fields.articulo).bloques
    const i = Number(entry.fields.bloque)
    return Number.isInteger(i) && i >= 0 && i < b.length ? i : firstUnanswered(b, entry.fields)
  })
  const base = useRef(entry)
  const saved = useRef(JSON.stringify(entry.fields))
  const exists = useRef(!isNew)
  const top = useRef()
  const set = (patch) => setFields((f) => ({ ...f, ...patch }))
  const [meeting, setMeeting] = useState(false)

  const hasContent = (f) => Boolean(String(f.articulo ?? '').trim() || String(f.titulo ?? '').trim() || (f.parrafos ?? []).some((p) => p.nota?.trim()))
  async function flush(extra = {}) {
    const f = { ...fields, paso: step, bloque: idx, ...extra }
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

  // El número de la pregunta abierta siempre a la vista en la fila de arriba.
  const jump = useRef()
  useEffect(() => {
    // Solo de lado (scrollIntoView también movería el texto hacia arriba o abajo).
    const nav = jump.current
    const on = nav?.querySelector('.on')
    if (on) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' })
  }, [idx, step])

  function go(next, i = idx) {
    setStep(next)
    setIdx(i)
    setBarsHidden(false)
    top.current?.scrollTo({ top: 0 })
  }

  // Al bajar leyendo se esconden los pasos y los números (se deslizan hacia arriba sin mover el
  // texto); al subir un buen tramo o al llegar arriba vuelven, como las barras de Safari.
  const [barsHidden, setBarsHidden] = useState(false)
  const scrollRef = useRef({ last: 0, turn: 0, dir: 0 })
  function onScroll(e) {
    const el = e.currentTarget
    const max = el.scrollHeight - el.clientHeight
    const y = Math.min(Math.max(el.scrollTop, 0), max) // sin el rebote de iOS en las orillas
    const r = scrollRef.current
    if (y < 60) {
      setBarsHidden(false)
      Object.assign(r, { last: y, turn: y, dir: 0 })
      return
    }
    const dir = y > r.last ? 1 : y < r.last ? -1 : r.dir
    if (dir !== r.dir) r.turn = r.last // cambió de sentido: desde aquí se mide
    r.dir = dir
    r.last = y
    if (dir === 1 && y - r.turn > 24) setBarsHidden(true)
    else if (dir === -1 && r.turn - y > 70) setBarsHidden(false)
  }
  async function close() {
    await flush()
    onClose()
  }

  // Al pegar el artículo, si no hay título se toma el primer renglón que parezca título.
  function setArticle(v) {
    const patch = { articulo: v }
    if (!String(fields.titulo ?? '').trim()) {
      // Se saltan "ARTÍCULO DE ESTUDIO 40" y la canción, que van antes del título.
      const first = String(v).split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find((l) => l && !/^(art[ií]culo de estudio|canci[oó]n)\b/i.test(l)) ?? ''
      if (first.length < 90 && !/^la atalaya\b|[“"«]|\d+:\d+/i.test(first) && !/[.?]$/.test(first)) patch.titulo = first
    }
    set(patch)
  }

  const answered = bloques.filter((b) => answerOf(fields, b.key).trim()).length
  const canGo = (key) => key === 'articulo' || bloques.length > 0

  return (
    <div className="overlay at-study">
      <header className="bar">
        <button className="bar-btn back" onClick={close}><Icon d={ICONS.back} size={18} stroke={2} /> Reuniones</button>
        <span className="bar-title">La Atalaya</span>
        <span />
      </header>

      <div className="editor-body at-body" ref={top} onScroll={onScroll}>
        <div className={'at-bars' + (barsHidden ? ' hidden' : '')}>
        <nav className="at-steps" aria-label="Pasos">
          {STEPS.map((s) => (
            <button key={s.key} className={'at-step' + (s.key === step ? ' on' : '')} disabled={!canGo(s.key)} onClick={() => go(s.key)}>{s.label}</button>
          ))}
        </nav>

        {step === 'parrafos' && bloques.length > 1 && (
          // Ir directo a cualquier pregunta: un número por pregunta (marcado si ya la respondiste).
          <nav className="at-jump" ref={jump} aria-label="Ir a la pregunta">
            {bloques.map((b, i) => (
              <button
                key={b.key}
                className={'at-jump-num' + (i === idx ? ' on' : answerOf(fields, b.key).trim() ? ' done' : '')}
                aria-current={i === idx ? 'step' : undefined}
                onClick={() => go('parrafos', i)}
              >
                {b.key.replace(/,\s*/g, '-')}
              </button>
            ))}
          </nav>
        )}
        </div>

        {step === 'articulo' && (
          <>
            <h2 className="at-h">Pega el artículo</h2>
            <div className="sfield">
              <div className="seg2">
                <button type="button" className="on">La Atalaya</button>
                <button type="button" onClick={() => onSwitchToForm({ ...base.current, fields: { ...fields, tipo: 'entresemana' } })}>Entre semana</button>
              </div>
            </div>
            <label className="sfield">
              <span className="sfield-label">Fecha del estudio</span>
              <input className="input" type="date" value={fields.fecha ?? ''} onChange={(e) => set({ fecha: e.target.value })} />
            </label>
            <label className="sfield">
              <span className="sfield-label">Título</span>
              <input className="input" value={fields.titulo ?? ''} placeholder="Título del artículo" onChange={(e) => set({ titulo: e.target.value })} />
            </label>
            <label className="sfield">
              <span className="sfield-label">Enlace en jw.org (opcional)</span>
              <input className="input" type="url" inputMode="url" value={fields.enlace ?? ''} placeholder="Para abrir cada párrafo en jw.org" onChange={(e) => set({ enlace: e.target.value.trim() })} />
            </label>
            <div className="sfield">
              <span className="sfield-label">El artículo completo, tal cual</span>
              <AutoText value={fields.articulo ?? ''} placeholder="Cópialo de JW Library o de wol.jw.org con sus preguntas y pégalo aquí" onChange={setArticle} minRows={6} />
            </div>
            {bloques.length > 0 && (
              <p className="hint">Encontré {bloques.length} {bloques.length === 1 ? 'pregunta' : 'preguntas'}{article.subtitulos.length ? `, ${article.subtitulos.length} subtítulos` : ''}{article.repaso.length ? ` y ${article.repaso.length} preguntas de repaso` : ''}.</p>
            )}
            {String(fields.articulo ?? '').trim() && !bloques.length && (
              <p className="hint warn">No encontré las preguntas. Revisa que vengan con su número, como «1. ¿Pregunta?».</p>
            )}
            <button className="primary" disabled={!bloques.length} onClick={() => go('vistazo')}>Siguiente: vistazo</button>
          </>
        )}

        {step === 'vistazo' && (
          <>
            <h2 className="at-h">Primero, una idea general</h2>
            {answered > 0 && (
              <button className="secondary icon-left mm-open" onClick={() => setMeeting(true)}>Modo reunión: solo mis respuestas</button>
            )}

            <p className="at-tip">Antes de leer, fíjate en el título y el texto temático, en cómo cada subtítulo se relaciona con el tema y en las imágenes. Las preguntas de repaso te dicen las ideas principales.</p>
            <div className="at-card at-cover">
              <p className="at-cover-kicker">La Atalaya{fields.fecha ? ` · ${formatDate(fields.fecha)}` : ''}</p>
              {articleNumber(fields.articulo) && <p className="at-art-num">Artículo de estudio {articleNumber(fields.articulo)}</p>}
              {article.canciones[0] && <p className="at-song">{songLine(article.canciones[0])}</p>}
              <p className="at-title">{fields.titulo || 'La Atalaya'}</p>
              {article.tema && <p className="at-theme">{article.tema}</p>}
              {article.resumen && <p className="at-summary">{article.resumen}</p>}
              {article.tema && <RefChips refs={findAllRefs(article.tema)} />}
            </div>
            {article.subtitulos.length > 0 && (
              <>
                <p className="at-label">Subtítulos</p>
                <ol className="at-list">
                  {article.subtitulos.map((t) => {
                    const i = bloques.findIndex((b) => b.subtitulo === t)
                    return <li key={t}><button onClick={() => go('parrafos', Math.max(0, i))}>{t}</button></li>
                  })}
                </ol>
              </>
            )}
            {article.repaso.length > 0 && (
              <>
                <p className="at-label">Preguntas de repaso</p>
                <ul className="at-list plain">
                  {article.repaso.map((q) => <li key={q}>{q}</li>)}
                </ul>
              </>
            )}
            <button className="primary" onClick={() => go('parrafos', firstUnanswered(bloques, fields))}>
              {answered ? 'Seguir párrafo por párrafo' : 'Empezar párrafo por párrafo'}
            </button>
          </>
        )}

        {step === 'parrafos' && bloques[idx] && (
          <Block
            key={bloques[idx].key}
            b={bloques[idx]}
            enlace={fields.enlace}
            n={idx}
            total={bloques.length}
            answer={answerOf(fields, bloques[idx].key)}
            marks={fields.marcas?.[bloques[idx].key] ?? []}
            onAnswer={(v) => setFields((f) => withAnswer(f, bloques[idx].key, v))}
            onMarks={(m) => setFields((f) => ({ ...f, marcas: { ...(f.marcas ?? {}), [bloques[idx].key]: m } }))}
            starred={isStarred(fields, bloques[idx].key)}
            onStar={() => setFields((f) => withStar(f, bloques[idx].key))}
            onPrev={() => (idx > 0 ? go('parrafos', idx - 1) : go('vistazo'))}
            onNext={() => (idx < bloques.length - 1 ? go('parrafos', idx + 1) : go('repaso'))}
          />
        )}

        {step === 'repaso' && (
          <>
            <h2 className="at-h">Repaso</h2>
            <p className="at-tip">Contesta con tus palabras, sin mirar el artículo. Si no te sale, vuelve a ese párrafo.</p>
            {article.repaso.map((q, ri) => (
              <label className="sfield" key={q}>
                <span className="at-answer-head">
                  <span className="sfield-label at-q">{q}</span>
                  <StarButton on={isStarred(fields, 'r' + ri)} onClick={() => setFields((f) => withStar(f, 'r' + ri))} />
                </span>
                <AutoText value={reviewAnswer(fields, q)} placeholder="Mi respuesta" onChange={(v) => setFields((f) => withReview(f, q, v))} />
              </label>
            ))}
            <label className="sfield">
              <span className="sfield-label">Idea principal del artículo</span>
              <AutoText value={fields.idea ?? ''} placeholder="En una o dos frases" onChange={(v) => set({ idea: v })} />
            </label>
            <label className="sfield">
              <span className="sfield-label">¿Cómo lo aplico en mi vida?</span>
              <AutoText value={fields.aplicacion ?? ''} placeholder="Algo concreto para esta semana" onChange={(v) => set({ aplicacion: v })} />
            </label>
            <label className="sfield">
              <span className="sfield-label">Notas</span>
              <AutoText value={fields.notas ?? ''} placeholder="Lo que quieras recordar" onChange={(v) => set({ notas: v })} />
            </label>
            <button className="primary" onClick={() => go('conceptos')}>Siguiente</button>
          </>
        )}

        {step === 'conceptos' && (
          <ConceptsStep entry={base.current} fields={fields} set={set} nodes={nodes} onToMap={(list) => onToMap(list, { ...base.current, fields })} onOpenNode={onOpenNode} onPrev={() => go('repaso')} onNext={() => go('listo')} />
        )}

        {step === 'listo' && (
          <>
            <h2 className="at-h">{answered === bloques.length ? 'Listo para la reunión' : 'Casi listo'}</h2>
            <div className="at-card">
              <p className="at-title">{fields.titulo || 'La Atalaya'}</p>
              <div className="progress"><span style={{ width: `${bloques.length ? (answered / bloques.length) * 100 : 0}%` }} /></div>
              <p className="at-summary">Respondiste {answered} de {bloques.length} {bloques.length === 1 ? 'pregunta' : 'preguntas'}.</p>
            </div>
            {answered < bloques.length && (
              <>
                <p className="at-label">Te faltan</p>
                <div className="at-missing">
                  {bloques.map((b, i) => !answerOf(fields, b.key).trim() && (
                    <button key={b.key} onClick={() => go('parrafos', i)}>Párr. {b.key}</button>
                  ))}
                </div>
              </>
            )}
            <div className="action-stack">
              {answered > 0 && <button className="secondary" onClick={() => setMeeting(true)}>Modo reunión: solo mis respuestas</button>}
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
              <button className="delete-btn" onClick={() => confirm('¿Eliminar este estudio?') && onDelete(entry.id)}>Eliminar estudio</button>
            )}
          </>
        )}
      </div>
      {meeting && (
        <MeetingMode
          kicker={['La Atalaya', fields.fecha && formatDate(fields.fecha)].filter(Boolean).join(' · ')}
          title={fields.titulo || 'La Atalaya'}
          items={meetingItems(fields)}
          starred={fields.comentar ?? []}
          onClose={() => setMeeting(false)}
        />
      )}
    </div>
  )
}

// Una pregunta con sus párrafos: tocar palabras las subraya (palabras clave), los textos
// se abren con un toque y abajo va la respuesta con tus palabras.
function Block({ b, enlace, n, total, answer, marks, starred, onStar, onAnswer, onMarks, onPrev, onNext }) {
  const speech = useSpeech()
  const refs = useMemo(() => findAllRefs(b.pregunta, ...b.parrafos), [b])
  const marked = new Set(marks)
  const toggle = (i) => onMarks(marked.has(i) ? marks.filter((x) => x !== i) : [...marks, i])
  const phrases = keyPhrases(b, marks)
  // Palabras de cada párrafo con el número de la primera (las marcas cuentan seguido en todo el bloque).
  let count = 0
  const paras = b.parrafos.map((p) => {
    const ws = words(p)
    const o = count
    count += ws.length
    return { ws, o }
  })
  return (
    <>
      {b.subtitulo && <h3 className="at-sub">{b.subtitulo}</h3>}
      <p className="at-qnum">{b.nums.length > 1 ? 'Párrafos' : 'Párrafo'} {b.key}</p>
      {b.pregunta && <p className="at-question">{b.pregunta}</p>}
      <p className="at-tip small">Lee buscando la respuesta y toca 2 o 3 palabras clave para subrayarlas.</p>
      <div className="at-text">
        {paras.map(({ ws, o }, pi) => (
          <p key={pi}>
            {runsOf(ws, (k) => marked.has(o + k)).map((run) => {
              // Las palabras marcadas seguidas van en una sola pieza amarilla (sin rayitas entre ellas).
              const items = run.words.map((word, k) => {
                const i = o + run.start + k
                return <span key={i} className="at-word" onClick={() => toggle(i)}>{word}{k < run.words.length - 1 ? ' ' : ''}</span>
              })
              return <span key={run.start}>{run.on ? <mark className="at-run">{items}</mark> : items} </span>
            })}
          </p>
        ))}
      </div>
      {b.parrafos[0] && (
        <div className="at-links">
          <a className="at-jw" data-direct="1" href={paragraphUrl(enlace, b.parrafos[0])} target="_blank" rel="noopener noreferrer">Ver este párrafo en jw.org</a>
          {canSpeak && (
            <button className="at-listen" onClick={() => (speech.speaking ? speech.stop() : speech.start([b.pregunta, ...b.parrafos].filter(Boolean)))}>
              <Icon d={speech.speaking ? ICONS.parar : ICONS.audio} size={18} /> {speech.speaking ? 'Parar' : 'Escuchar'}
            </button>
          )}
        </div>
      )}
      {b.extras?.length > 0 && (
        <details className="at-extras">
          <summary>Imágenes y recuadros</summary>
          {b.extras.map((x, i) => <p key={i}>{x}</p>)}
        </details>
      )}
      {refs.length > 0 && (
        <div className="sfield">
          <span className="sfield-label">Textos · lee también los que no están citados</span>
          <RefChips refs={refs} />
        </div>
      )}
      {phrases.length > 0 && (
        <div className="at-keys">
          {phrases.map((k, i) => <span key={i}>{k}</span>)}
        </div>
      )}
      <label className="at-answer">
        <span className="at-answer-head">
          <span className="at-answer-label">Mi respuesta, con mis palabras</span>
          <StarButton on={starred} onClick={onStar} />
        </span>
        <AutoText value={answer} placeholder="Una idea corta, como para comentarla en la reunión" onChange={onAnswer} minRows={3} />
      </label>
      <div className="at-nav">
        <button className="secondary" onClick={onPrev}>Anterior</button>
        <button className="primary" onClick={onNext}>{n < total - 1 ? 'Siguiente' : 'Ir al repaso'}</button>
      </div>
    </>
  )
}

// Parte las palabras de un párrafo en tramos seguidos marcados / sin marcar.
function runsOf(list, isOn) {
  const out = []
  list.forEach((word, k) => {
    const on = isOn(k)
    const last = out[out.length - 1]
    if (last && last.on === on) last.words.push(word)
    else out.push({ on, start: k, words: [word] })
  })
  return out
}

// "ARTÍCULO DE ESTUDIO 40" del artículo pegado (si viene).
function articleNumber(text) {
  return String(text ?? '').match(/art[ií]culo de estudio\s+(\d{1,3})/i)?.[1] ?? ''
}

// "CANCIÓN 84 Servimos donde se nos necesite" → "Canción 84 · Servimos donde se nos necesite"
function songLine(s) {
  const m = String(s).match(/canci[oó]n\s+(\d+)\s*(.*)/i)
  return m ? `Canción ${m[1]}${m[2] ? ' · ' + m[2].trim() : ''}` : s
}
