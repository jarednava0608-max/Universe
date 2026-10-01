import { refUrl } from '../lib/bible.js'

// Cita bíblica tocable: abre el versículo en wol.jw.org.
export default function RefLink({ refText, className = 'ref-link' }) {
  return (
    <a className={className} href={refUrl(refText)} target="_blank" rel="noopener noreferrer">
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
