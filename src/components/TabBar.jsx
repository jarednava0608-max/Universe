import Icon, { ICONS } from './Icon.jsx'

export const TABS = [
  { id: 'mapa', label: 'Mapa' },
  { id: 'estudio', label: 'Estudio' },
  { id: 'juegos', label: 'Juegos' },
]

// Barra de pestañas inferior (estilo iOS).
export default function TabBar({ tab, onChange }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => onChange(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          <Icon d={ICONS[t.id]} size={22} stroke={tab === t.id ? 2 : 1.6} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
