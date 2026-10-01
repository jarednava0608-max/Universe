import { useRef } from 'react'
import { NODE_TYPES, ORIGINS, ROOT_COLOR } from '../lib/model.js'
import { describe } from './AccountSheet.jsx'

// Menú: solo lo esencial.
export default function Menu({ stats, sync, onAccount, onNew, onPaste, onExport, onImportFile, onClose }) {
  const file = useRef()
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <ul className="menu">
          <li><button onClick={onNew}>Nuevo nodo</button></li>
          <li><button onClick={onPaste}>Pegar conocimiento</button></li>
          <li><button onClick={onExport}>Exportar respaldo (JSON)</button></li>
          <li><button onClick={() => file.current.click()}>Importar archivo JSON</button></li>
          <li>
            <button className="menu-account" onClick={onAccount}>
              <span>Cuenta y nube</span>
              <span className="menu-sub"><i className={'sync-dot ' + sync.status.state} />{describe(sync.status)}</span>
            </button>
          </li>
        </ul>
        <input ref={file} type="file" accept="application/json,.json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onImportFile(f) }} />

        <div className="legend">
          <span><i className="dot" style={{ background: ROOT_COLOR }} />Jehová</span>
          {Object.values(NODE_TYPES).map((t) => (
            <span key={t.label}><i className="dot" style={{ background: t.color }} />{t.label}</span>
          ))}
        </div>
        <div className="legend">
          <span><i className="glyph jw" />{ORIGINS.jw.label}</span>
          <span><i className="glyph propio" />{ORIGINS.propio.label}</span>
          <span><i className="glyph mixto" />{ORIGINS.mixto.label}</span>
        </div>

        <p className="stats">
          {stats.nodes} nodos · {stats.edges} conexiones
          <br />
          Almacenamiento persistente: {stats.persisted === true ? 'sí' : stats.persisted === false ? 'no (exporta seguido)' : 'desconocido'}
          <br />
          Último respaldo: {stats.lastExport ? new Date(stats.lastExport).toLocaleDateString('es') : 'nunca'}
        </p>
      </div>
    </div>
  )
}
