import { useEffect, useMemo, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import AutoText from '../components/AutoText.jsx'
import { RefChips } from '../components/RefLink.jsx'
import { findAllRefs } from '../lib/verses.js'
import { entryForClaude, formatDate } from './kinds.js'
import { STEPS, parseArticle, answerOf, withAnswer, reviewAnswer, withReview, words, keyPhrases, firstUnanswered, paragraphUrl } from './atalaya.js'

// La Atalaya por pasos, como recomienda jw.org para prepararse: primero una idea general
// (título, subtítulos y preguntas de repaso), luego cada párrafo buscando la respuesta y
// subrayando solo palabras clave, y al final el repaso. Se guarda sola y al volver
// sigue en el paso y la pregunta donde te quedaste.
export default function AtalayaStudy({ entry, isNew, toast, onSave, onDelete, onClose, onPropose, onSwitchToForm }) {
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
    jump.current?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [idx, step])

  function go(next, i = idx) {
    setStep(next)
    setIdx(i)
    setBarsHidden(false)
    top.current?.scrollTo({ top: 0 })
  }

  // Al bajar leyendo se esconden los pasos y los números para dejar más espacio al texto;
  // al subir un poco (o al llegar arriba) vuelven.
  const [barsHidden, setBarsHidden] = useState(false)
  const lastY = useRef(0)
  function onScroll(e) {
    const el = e.currentTarget
    const y = el.scrollTop
    const dy = y - lastY.current
    // Si el texto es corto no se esconde (si no, al esconderse cabría todo y volverían a salir).
    if (y < 40 || el.scrollHeight - el.clientHeight < 200) setBarsHidden(false)
    else if (dy > 8) setBarsHidden(true)
    else if (dy < -8) setBarsHidden(false)
    if (Math.abs(dy) > 8 || y < 40) lastY.current = y
  }
  async function close() {
    await flush()
    onClose()
  }

  // Al pegar el artículo, si no hay título se toma el primer renglón que parezca título.
  function setArticle(v) {
    const patch = { articulo: v }
    if (!String(fields.titulo ?? '').trim()) {
      const first = String(v).split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean) ?? ''
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

      <div className={'at-bars' + (barsHidden ? ' hidden' : '')}>
      <div className="at-bars-in">
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
      </div>

      <div className="editor-body at-body" ref={top} onScroll={onScroll}>
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
            <p className="at-tip">Antes de leer, fíjate en el título y el texto temático, en cómo cada subtítulo se relaciona con el tema y en las imágenes. Las preguntas de repaso te dicen las ideas principales.</p>
            <div className="at-card at-cover">
              <p className="at-cover-kicker">La Atalaya{fields.fecha ? ` · ${formatDate(fields.fecha)}` : ''}</p>
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
            onPrev={() => (idx > 0 ? go('parrafos', idx - 1) : go('vistazo'))}
            onNext={() => (idx < bloques.length - 1 ? go('parrafos', idx + 1) : go('repaso'))}
          />
        )}

        {step === 'repaso' && (
          <>
            <h2 className="at-h">Repaso</h2>
            <p className="at-tip">Contesta con tus palabras, sin mirar el artículo. Si no te sale, vuelve a ese párrafo.</p>
            {article.repaso.map((q) => (
              <label className="sfield" key={q}>
                <span className="sfield-label at-q">{q}</span>
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
            <button className="primary" onClick={() => go('listo')}>Terminar</button>
          </>
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
              <button className="secondary icon-left" onClick={async () => {
                try { await navigator.clipboard.writeText(entryForClaude({ ...base.current, fields })); toast('Copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
              }}>
                <Icon d={ICONS.pegar} size={18} /> Copiar para Claude
              </button>
              <button className="secondary icon-left" onClick={async () => { await flush(); onPropose({ ...base.current, fields }) }}>
                <Icon d={ICONS.nodo} size={18} /> Proponer al mapa
              </button>
              <button className="primary" onClick={close}>Guardar y salir</button>
            </div>
            {exists.current && (
              <button className="delete-btn" onClick={() => confirm('¿Eliminar este estudio?') && onDelete(entry.id)}>Eliminar estudio</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Una pregunta con sus párrafos: tocar palabras las subraya (palabras clave), los textos
// se abren con un toque y abajo va la respuesta con tus palabras.
function Block({ b, enlace, n, total, answer, marks, onAnswer, onMarks, onPrev, onNext }) {
  const refs = useMemo(() => findAllRefs(b.pregunta, ...b.parrafos), [b])
  const marked = new Set(marks)
  const toggle = (i) => onMarks(marked.has(i) ? marks.filter((x) => x !== i) : [...marks, i])
  const phrases = keyPhrases(b, marks)
  let w = 0
  return (
    <>
      {b.subtitulo && <h3 className="at-sub">{b.subtitulo}</h3>}
      <p className="at-qnum">{b.nums.length > 1 ? 'Párrafos' : 'Párrafo'} {b.key}</p>
      {b.pregunta && <p className="at-question">{b.pregunta}</p>}
      <p className="at-tip small">Lee buscando la respuesta y toca 2 o 3 palabras clave para subrayarlas.</p>
      <div className="at-text">
        {b.parrafos.map((p, pi) => (
          <p key={pi}>
            {words(p).map((word, j, list) => {
              const i = w++
              // El espacio entre dos palabras marcadas también se pinta, como con un marcatexto.
              const joined = marked.has(i) && j < list.length - 1 && marked.has(i + 1)
              return (
                <span key={i}>
                  <span className={'at-word' + (marked.has(i) ? ' on' : '')} onClick={() => toggle(i)}>{word}</span>
                  <span className={joined ? 'at-gap on' : 'at-gap'}> </span>
                </span>
              )
            })}
          </p>
        ))}
      </div>
      {b.parrafos[0] && (
        <a className="at-jw" data-direct="1" href={paragraphUrl(enlace, b.parrafos[0])} target="_blank" rel="noopener noreferrer">Ver este párrafo en jw.org</a>
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
        <span className="at-answer-label">Mi respuesta, con mis palabras</span>
        <AutoText value={answer} placeholder="Una idea corta, como para comentarla en la reunión" onChange={onAnswer} minRows={3} />
      </label>
      <div className="at-nav">
        <button className="secondary" onClick={onPrev}>Anterior</button>
        <button className="primary" onClick={onNext}>{n < total - 1 ? 'Siguiente' : 'Ir al repaso'}</button>
      </div>
    </>
  )
}
