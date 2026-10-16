import { useEffect, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'

// Modo reunión: para tenerlo abierto en la reunión. Solo tus respuestas, en orden y en letra
// grande, con la pregunta chica arriba para seguir el hilo. Arriba, fija, una fila con el número de
// cada párrafo (o parte): tocas el que dice el conductor y salta a tu respuesta. Los que marcaste
// para comentar llevan estrellita en su número. La pantalla no se apaga mientras está abierto (Wake
// Lock, si el teléfono lo permite), y recuerda el último número que tocaste (por si iOS recarga la
// app al pasar a JW Library).
// items: [{ key, jump, section?, sec?, label, question, answer, keys? }]
export default function MeetingMode({ id, back = 'Volver', kicker, title, items, starred = [], onClose }) {
  useEffect(() => {
    let lock = null
    const ask = async () => {
      try { lock = await navigator.wakeLock?.request('screen') } catch { /* sin permiso: no pasa nada */ }
    }
    ask()
    // iOS suelta el bloqueo al salir de la app; al volver se pide otra vez.
    const onShow = () => document.visibilityState === 'visible' && ask()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onShow)
      lock?.release?.().catch(() => {})
    }
  }, [])

  // Un número por párrafo o parte: lleva a la primera respuesta que tiene ese número.
  const jumps = []
  for (const [i, x] of items.entries()) {
    const j = jumps.find((y) => y.label === x.jump)
    if (j) j.keys.push(x.key)
    else if (x.jump) jumps.push({ label: x.jump, index: i, keys: [x.key] })
  }
  const memo = id ? 'universe-mm-' + id : null
  const [on, setOn] = useState(() => { try { return (memo && localStorage.getItem(memo)) || null } catch { return null } })
  const body = useRef()
  const nav = useRef()
  function go(label, smooth = true) {
    const j = jumps.find((y) => y.label === label)
    if (!j) return
    setOn(label)
    try { if (memo) localStorage.setItem(memo, label) } catch { /* sin almacenamiento */ }
    const el = body.current?.querySelector(`[data-i="${j.index}"]`)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (el) body.current.scrollTo({ top: el.getBoundingClientRect().top - body.current.getBoundingClientRect().top + body.current.scrollTop - 8, behavior: smooth && !reduce ? 'smooth' : 'auto' })
  }
  // Al abrir, regresa al último número que tocaste.
  useEffect(() => { if (on) go(on, false) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // El número tocado siempre a la vista en la fila.
  useEffect(() => {
    const n = nav.current
    const el = n?.querySelector('.on')
    if (el) n.scrollTo({ left: el.offsetLeft - n.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' })
  }, [on])

  let lastSection = ''
  return (
    <div className="overlay mm">
      <header className="bar">
        <button className="bar-btn back" onClick={onClose}><Icon d={ICONS.back} size={18} stroke={2} /> {back}</button>
        <span className="bar-title">Modo reunión</span>
        <span />
      </header>
      {jumps.length > 1 && (
        <nav className="at-jump mm-jump" ref={nav} aria-label="Ir al párrafo">
          {jumps.map((j) => {
            const star = j.keys.some((k) => starred.includes(k))
            const done = j.keys.some((k) => items.find((x) => x.key === k)?.answer.trim())
            return (
              <button
                key={j.label}
                className={'at-jump-num' + (j.label === on ? ' on' : done ? ' done' : '') + (star ? ' star' : '')}
                aria-current={j.label === on ? 'step' : undefined}
                aria-label={star ? `${j.label}, vas a comentar` : undefined}
                onClick={() => go(j.label)}
              >
                {j.label}
              </button>
            )
          })}
        </nav>
      )}
      <div className="editor-body mm-body" ref={body}>
        <p className="at-cover-kicker">{kicker}</p>
        <h1 className="mm-title">{title}</h1>
        {items.map((x, i) => {
          const head = x.section && x.section !== lastSection
          if (head) lastSection = x.section
          return (
            <div key={i} data-i={i}>
              {head && <p className={'mw-sec ' + (x.sec ?? '')}>{x.section}</p>}
              <section className="mm-item">
                <p className="mm-label">{x.label}{starred.includes(x.key) && <span className="mm-star"> · Vas a comentar</span>}</p>
                <p className="mm-q">{x.question}</p>
                {x.answer.trim() ? <p className="mm-a">{x.answer.trim()}</p>
                  : x.keys?.length ? <p className="mm-keys">{x.keys.join(' · ')}</p>
                  : <p className="mm-a empty">Sin respuesta</p>}
              </section>
            </div>
          )
        })}
      </div>
    </div>
  )
}
