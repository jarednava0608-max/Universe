import Icon, { ICONS } from '../components/Icon.jsx'

// En una nota «Revisita: …», debajo del título: «Estoy aquí» guarda el lugar con el GPS del teléfono (sin mapa) y,
// al lado, si ya tiene lugar. Con lugar, en Biblioteca → Revisitas se abre en Apple Maps.
export default function RevisitaPlace({ lugar, busy, onHere }) {
  return (
    <div className="rv-place">
      <button type="button" className="rv-here" disabled={busy} onClick={onHere}>
        <Icon d={ICONS.lugar} size={16} /> {busy ? 'Buscando…' : 'Estoy aquí'}
      </button>
      <span className="rv-place-state">{lugar ? 'Lugar guardado' : 'Sin lugar guardado'}</span>
    </div>
  )
}
