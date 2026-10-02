import { anyRefUrl } from '../lib/verses.js'

// Cita bíblica o publicación tocable (App la abre en la hoja de la cita).
export default function RefLink({ refText, className = 'ref-link' }) {
  return (
    <a className={className} href={anyRefUrl(refText)} target="_blank" rel="noopener noreferrer">
      {refText}
    </a>
  )
}

// Fila de citas tocables.
export function RefChips({ refs }) {
  if (!refs.length) return null
  return (
    <div className="ref-chips">
      {refs.map((r) => <RefLink key={r} refText={r} className="ref-chip" />)}
    </div>
  )
}
