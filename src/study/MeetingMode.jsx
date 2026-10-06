import { useEffect } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'

// Modo reunión: para tenerlo abierto en la reunión. Solo tus respuestas, en orden y en letra
// grande, con la pregunta chica arriba para seguir el hilo. La pantalla no se apaga mientras
// está abierto (Wake Lock, si el teléfono lo permite).
// items: [{ section?, sec?, label, question, answer }]
export default function MeetingMode({ kicker, title, items, starred = [], onClose }) {
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

  const done = items.filter((x) => x.answer.trim()).length
  let lastSection = ''
  return (
    <div className="overlay mm">
      <header className="bar">
        <button className="bar-btn back" onClick={onClose}><Icon d={ICONS.back} size={18} stroke={2} /> Volver</button>
        <span className="bar-title">Modo reunión</span>
        <span />
      </header>
      <div className="editor-body mm-body">
        <p className="at-cover-kicker">{kicker}</p>
        <h1 className="mm-title">{title}</h1>
        <p className="mm-count">{done} de {items.length} contestadas</p>
        {/* Lo que marcaste para comentar va primero, para tenerlo a la mano al levantar la mano. */}
        {items.some((x) => starred.includes(x.key)) && (
          <section className="mm-stars">
            <p className="mm-stars-h">Vas a comentar</p>
            {items.filter((x) => starred.includes(x.key)).map((x, i) => (
              <div key={i} className="mm-item">
                <p className="mm-label">{x.label}</p>
                <p className="mm-q">{x.question}</p>
                {x.answer.trim() ? <p className="mm-a">{x.answer.trim()}</p> : <p className="mm-a empty">Sin respuesta</p>}
              </div>
            ))}
          </section>
        )}
        {items.map((x, i) => {
          const head = x.section && x.section !== lastSection
          if (head) lastSection = x.section
          return (
            <div key={i}>
              {head && <p className={'mw-sec ' + (x.sec ?? '')}>{x.section}</p>}
              <section className="mm-item">
                <p className="mm-label">{x.label}{starred.includes(x.key) && <span className="mm-star"> · Vas a comentar</span>}</p>
                <p className="mm-q">{x.question}</p>
                {x.answer.trim() ? <p className="mm-a">{x.answer.trim()}</p> : <p className="mm-a empty">Sin respuesta</p>}
              </section>
            </div>
          )
        })}
      </div>
    </div>
  )
}
