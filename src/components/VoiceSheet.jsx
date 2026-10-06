import Sheet from './Sheet.jsx'
import { RATES, tryVoice, useVoices } from '../lib/speech.js'

// Elegir la voz y la velocidad con que se lee en voz alta (se guarda en este teléfono).
// Las voces "Mejorada" y "Premium" suenan mucho más naturales; se bajan gratis en Ajustes del iPhone.
export default function VoiceSheet({ onClose }) {
  const { list, voice, setVoice, rate, setRate } = useVoices()
  const pick = (name) => { setVoice(name); setTimeout(tryVoice, 50) }
  return (
    <Sheet title="Voz para escuchar" backdropClass="ref-sheet-backdrop" className="voice-sheet" onClose={onClose}>
      <p className="sfield-label">Velocidad</p>
      <div className="seg2">
        {RATES.map(([v, l]) => (
          <button key={v} className={rate === v ? 'on' : ''} onClick={() => { setRate(v); setTimeout(tryVoice, 50) }}>{l}</button>
        ))}
      </div>
      <p className="sfield-label voice-label">Voz</p>
      {list.length ? (
        <ul className="voice-list">
          {list.map((v) => (
            <li key={v.name}>
              <button className={'voice-row' + (v.name === voice ? ' on' : '')} onClick={() => pick(v.name)}>
                <span className="voice-name">{v.name}</span>
                <span className="voice-lang">{v.lang.replace('_', '-')}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Este teléfono no tiene voces en español.</p>
      )}
      <button className="secondary" onClick={tryVoice}>Probar</button>
      <p className="hint voice-tip">
        Para que suene más natural, baja una voz mejorada (es gratis): en el iPhone abre Ajustes → Accesibilidad → Contenido leído → Voces → Español → elige una que diga «Mejorada» o «Premium» (por ejemplo Paulina o Mónica) y tócala para descargarla. Luego vuelve aquí y elígela.
      </p>
    </Sheet>
  )
}
