import { useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { GAMES } from './registry.js'

// Pestaña Juegos: menú armado desde registry.js.
export default function GamesTab({ store, toast }) {
  const [open, setOpen] = useState(null)
  const game = GAMES.find((g) => g.id === open)

  return (
    <div className="page">
      <div className="page-scroll">
        <h1 className="page-title">Juegos</h1>
        <div className="game-list">
          {GAMES.map((g) => (
            <button key={g.id} className="game-card" onClick={() => setOpen(g.id)}>
              <span className="game-icon"><Icon d={g.icon} size={22} /></span>
              <span className="entry-main">
                <span className="game-title">{g.title}{g.soon && <em className="soon-tag">Pronto</em>}</span>
                <span className="entry-sub">{g.desc}</span>
              </span>
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
          ))}
        </div>
      </div>
      {game && <game.Component store={store} toast={toast} onExit={() => setOpen(null)} />}
    </div>
  )
}
