import { meetingsUrl } from './midweek.js'

// Para ir por el artículo o el programa: jw.org, wol.jw.org (en línea) con la semana de
// esa fecha, y la app JW Library (si no está instalada, el enlace no hace nada).
const JW = {
  atalaya: 'https://www.jw.org/es/biblioteca/revistas/',
  entresemana: 'https://www.jw.org/es/biblioteca/guia-actividades-reunion/',
}

export default function JwLinks({ fecha, kind = 'atalaya' }) {
  return (
    <div className="jw-links">
      <a className="secondary as-btn" data-direct="1" href={JW[kind]} target="_blank" rel="noopener noreferrer">jw.org</a>
      <a className="secondary as-btn" data-direct="1" href={meetingsUrl(fecha)} target="_blank" rel="noopener noreferrer">En línea</a>
      <a className="secondary as-btn" data-direct="1" href="jwlibrary://">App</a>
    </div>
  )
}
