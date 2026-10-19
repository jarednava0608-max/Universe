import { useMemo, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { GAMES } from './registry.js'
import { memorizeSources } from './logic.js'
import { isDue, roundSize } from './progress.js'
import Review, { reviewSummary } from './Review.jsx'
import Memorize from './Memorize.jsx'
import PageScroll from '../components/PageScroll.jsx'

// Juegos (se abre desde Biblioteca). Su único objetivo es que el usuario recuerde textos de la Biblia:
// arriba, el texto que toca practicar (el versículo del último texto diario que estudió, o el que toca
// repasar); abajo, Repasar hoy, Mis textos y Constancia. Nada de juegos sueltos, racha ni logros.
export default function GamesTab({ store, toast, onBack }) {
  const [open, setOpen] = useState(null)
  const [practice, setPractice] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const game = GAMES.find((g) => g.id === open)
  const srs = store.progress.srs ?? {}
  const verses = memorizeSources(store.entries)
  // El primero que es nuevo o toca hoy: los del texto diario van primero, del más reciente.
  const next = verses.find((v) => isDue(srs['v:' + v.id])) ?? null
  const { due, fresh } = useMemo(() => reviewSummary(store), [store.nodes, store.entries, store.progress]) // eslint-disable-line react-hooks/exhaustive-deps
  const toReview = roundSize({ due, fresh })

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
          <p className="today-game-label">{next || !verses.length ? 'Para memorizar' : 'Listo por hoy'}</p>
          {next ? (
            <>
              <h2 className="today-game-title">{next.fields.cita || 'Texto'}</h2>
              <p className="today-game-verse">{next.fields.texto}</p>
              <button className="primary" onClick={() => setPractice(next)}>Practicar</button>
            </>
          ) : verses.length ? (
            <p className="today-game-sub">Ya practicaste lo que tocaba. Mañana te toca repasar otra vez.</p>
          ) : (
            <p className="today-game-sub">Cuando estudies el texto diario y toques "Ya lo estudié", su versículo aparece aquí.</p>
          )}
        </div>
        <div className="game-list">
          <button className="game-card" onClick={() => setReviewing(true)}>
            <span className="game-icon"><Icon d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" size={22} /></span>
            <span className="entry-main">
              <span className="game-title">Repasar hoy</span>
              <span className="entry-sub">Lo que estudias para las reuniones</span>
              {toReview > 0 && <span className="game-pill">{toReview}</span>}
            </span>
            <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
          </button>
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
      {practice && <Memorize store={store} toast={toast} start={practice} onExit={() => setPractice(null)} />}
      {reviewing && <Review store={store} onExit={() => setReviewing(false)} />}
    </div>
  )
}
