import Icon, { ICONS } from './Icon.jsx'

// Solo 3 pestañas (al usuario lo abrumaban 4): el Mapa y los Juegos se abren desde Biblioteca
// ('estudio'), y mientras están abiertos se marca Biblioteca.
export const TABS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'estudio', label: 'Biblioteca' },
  { id: 'pendientes', label: 'Pendientes' },
]
const IN_LIBRARY = ['mapa', 'juegos']

// Barra de pestañas inferior (estilo iOS).
// `dots`: pestañas con algo pendiente (un puntito, como en iOS).
export default function TabBar({ tab: open, onChange, dots = {} }) {
  const tab = IN_LIBRARY.includes(open) ? 'estudio' : open
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => onChange(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          <span className="tab-icon">
            <Icon d={ICONS[t.id]} size={22} stroke={tab === t.id ? 2 : 1.6} />
            {dots[t.id] && <i className="tab-dot" />}
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
