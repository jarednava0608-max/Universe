import { useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { GAMES } from './registry.js'
import { repasoRound, learnSources } from './repaso.js'
import Repaso from './Repaso.jsx'
import PageScroll from '../components/PageScroll.jsx'

// Juegos (se abre desde Biblioteca). Una sola cosa: Repasar, 5 preguntas de los textos que el usuario
// eligió aprender y, de vez en cuando, de La Atalaya (ver repaso.js). Abajo, Mis textos y Constancia.
// Nada de juegos sueltos, racha ni logros (pedido del usuario).
export default function GamesTab({ store, toast, onBack }) {
  const [open, setOpen] = useState(null)
  const [repasando, setRepasando] = useState(false)
  const game = GAMES.find((g) => g.id === open)
  const pending = repasoRound(store.entries, store.progress.srs ?? {}, { rnd: () => 0.9 }).length
  const learning = learnSources(store.entries).length > 0

  return (
    <div className="page">
      <PageScroll title="Juegos" back={onBack && { label: 'Biblioteca', onClick: onBack }}>
        {onBack && (
          <button className="back-link" onClick={onBack}>
            <Icon d={ICONS.back} size={18} stroke={2} /> Biblioteca
          </button>
        )}
        <h1 className="page-title">Juegos</h1>
        <div className="today-game">
          <p className="today-game-label">{pending || !learning ? 'Repasar' : 'Listo por hoy'}</p>
          {pending ? (
            <>
              <h2 className="today-game-title">{pending === 1 ? '1 pregunta' : `${pending} preguntas`}</h2>
              <p className="today-game-sub">Tus textos de la Biblia · {pending > 2 ? 'unos 2 minutos' : '1 minuto'}</p>
              <button className="primary" onClick={() => setRepasando(true)}>Repasar</button>
            </>
          ) : learning ? (
            <p className="today-game-sub">Lo que toca repasar vuelve en los próximos días.</p>
          ) : (
            <p className="today-game-sub">Toca un texto de la Biblia (en el texto diario, La Atalaya o la reunión) y elige "Aprenderlo". Aquí lo repasarás.</p>
          )}
        </div>
        <div className="game-list">
          {GAMES.map((g) => {
            const st = g.stat?.(store)
            return (
              <button key={g.id} className="game-card" onClick={() => setOpen(g.id)}>
                <span className={'game-icon g-' + g.id}><Icon d={g.icon} size={22} /></span>
                <span className="entry-main">
                  <span className="game-title">{g.title}</span>
                  <span className="entry-sub">{g.desc}</span>
                  {st && <span className="game-pill">{st.text}</span>}
                </span>
                <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
              </button>
            )
          })}
        </div>
      </PageScroll>
      {game && <game.Component store={store} toast={toast} onExit={() => setOpen(null)} />}
      {repasando && <Repaso store={store} onExit={() => setRepasando(false)} />}
    </div>
  )
}
