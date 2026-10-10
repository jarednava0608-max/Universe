import { useState } from 'react'
import { GameScreen } from './ui.jsx'
import RefLink from '../components/RefLink.jsx'
import { constanciaDays, restartConstancia, todayISO } from './progress.js'

// Constancia: días seguidos de una meta personal. A propósito no dice cuál es.
const TEXTS = [
  ['Filipenses 4:8', 'Llena tu mente de lo que es limpio y digno de alabanza.'],
  ['1 Corintios 10:13', 'Jehová no deja que la prueba sea más de lo que puedes aguantar.'],
  ['Salmo 51:10', 'Pídele a Jehová un corazón puro.'],
  ['Isaías 41:10', 'Jehová te sostiene con su mano.'],
  ['Proverbios 24:16', 'El justo puede caer, pero se levanta.'],
  ['Gálatas 6:9', 'No te rindas haciendo lo que está bien.'],
  ['Salmo 119:9', 'La palabra de Dios mantiene limpio el camino.'],
  ['Filipenses 4:13', 'Jehová te da las fuerzas que necesitas.'],
  ['Colosenses 3:5', 'Haz morir los deseos que te alejan de Jehová.'],
  ['2 Corintios 4:16', 'Por dentro te renuevas día tras día.'],
]

export default function Constancia({ store, toast, onExit }) {
  const c = store.progress.constancia
  const today = todayISO()
  const [start, setStart] = useState(today)
  const days = constanciaDays(c, today)
  const best = Math.max(c?.best ?? 0, days)
  const dayNum = Number(today.replaceAll('-', ''))
  const [cita, msg] = TEXTS[dayNum % TEXTS.length]

  const save = (constancia) => store.updateProgress((f) => ({ ...f, constancia }))

  if (!c?.start) {
    return (
      <GameScreen title="Constancia" onExit={onExit}>
        <p className="hint">Cuenta los días seguidos de tu meta. Solo tú sabes cuál es.</p>
        <label className="field">
          <span>¿Desde cuándo?</span>
          <input className="input" type="date" value={start} max={today} onChange={(e) => setStart(e.target.value || today)} />
        </label>
        <button className="primary" onClick={() => save({ start, best: 0, at: Date.now() })}>Empezar</button>
      </GameScreen>
    )
  }

  return (
    <GameScreen title="Constancia" onExit={onExit}>
      <div className="constancia">
        <p className="constancia-num">{days}</p>
        <p className="constancia-label">{days === 1 ? 'día' : 'días'}</p>
        <p className="hint center">{best > days ? `Tu mejor: ${best} días` : days > 0 ? 'Es tu mejor racha' : 'Hoy empieza'}</p>
      </div>
      <div className="constancia-text">
        <p>{msg}</p>
        <RefLink refText={cita} />
      </div>
      <button
        className="secondary"
        onClick={() => {
          if (!confirm('¿Volver a empezar desde hoy? Tu mejor racha se queda guardada.')) return
          save(restartConstancia(c, today))
          toast('Volver a empezar también es avanzar.')
        }}
      >
        Volver a empezar
      </button>
    </GameScreen>
  )
}
