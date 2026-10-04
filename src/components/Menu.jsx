import { useRef } from 'react'
import { describe } from './AccountSheet.jsx'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ICONS = {
  nuevo: 'M12 5v14M5 12h14',
  pegar: 'M9 4h6v3H9zM8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16M9 12h6M9 16h4',
  exportar: 'M12 3v12M7 8l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
  importar: 'M12 15V3M7 10l5 5 5-5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
  nube: 'M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.1 4.5 4.5 0 0 0 7 18z',
  escarbar: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.8-4.8',
}

// Cuándo fue el último respaldo exportado ("hoy", "hace 3 días").
function ago(t) {
  const days = Math.floor((Date.now() - t) / 864e5)
  return days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`
}

// Menú: solo lo esencial.
export default function Menu({ stats, sync, themeMode, onThemeMode, onAccount, onNew, onPaste, onDig, onExport, onImportFile, onClose }) {
  const file = useRef()
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="menu-group">
          <MenuItem icon="nuevo" label="Nuevo nodo" onClick={onNew} />
          <MenuItem icon="pegar" label="Pegar conocimiento" onClick={onPaste} />
          <MenuItem icon="escarbar" label="Por escarbar" sub={stats.unfounded ? `${stats.unfounded} ${stats.unfounded === 1 ? 'idea' : 'ideas'} sin texto bíblico` : 'Todas llegan a un texto bíblico'} onClick={onDig} />
        </div>
        <div className="menu-group">
          <MenuItem icon="nube" label="Cuenta y nube" sub={<><i className={'sync-dot ' + sync.status.state} />{describe(sync.status)}</>} onClick={onAccount} />
          <MenuItem
            icon="exportar"
            label="Exportar respaldo"
            sub={stats.backupStale
              ? <span className="menu-warn">{stats.lastExport ? `El último fue ${ago(stats.lastExport)}. Conviene hacer otro.` : 'Aún no has hecho ninguno y todo está solo en este iPhone.'}</span>
              : stats.lastExport ? `El último fue ${ago(stats.lastExport)}` : null}
            onClick={onExport}
          />
          <MenuItem icon="importar" label="Importar respaldo" onClick={() => file.current.click()} />
        </div>
        <div className="menu-group appearance">
          <span className="appearance-label">Apariencia</span>
          <div className="seg2">
            {[['dark', 'Negro'], ['light', 'Blanco']].map(([v, l]) => (
              <button key={v} className={themeMode === v ? 'on' : ''} onClick={() => onThemeMode(v)}>{l}</button>
            ))}
          </div>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onImportFile(f) }} />

        <p className="stats">
          {stats.nodes} {stats.nodes === 1 ? 'nodo' : 'nodos'} · {stats.edges} {stats.edges === 1 ? 'conexión' : 'conexiones'}
        </p>
      </div>
    </div>
  )
}

function MenuItem({ icon, label, sub, onClick }) {
  return (
    <button className="menu-item" onClick={onClick}>
      <span className="menu-icon"><Icon d={ICONS[icon]} /></span>
      <span className="menu-text">
        <span>{label}</span>
        {sub && <span className="menu-sub">{sub}</span>}
      </span>
      <svg className="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  )
}
