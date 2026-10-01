import { useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { GAMES } from './registry.js'
import { buildCards, verseSources } from './logic.js'
import { achievements, dueCount, lastWeek, streak } from './progress.js'
import Review from './Review.jsx'

// Pestaña Juegos: menú armado desde registry.js.
export default function GamesTab({ store, toast }) {
  const [open, setOpen] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const [medals, setMedals] = useState(false)
  const game = GAMES.find((g) => g.id === open)

  return (
    <div className="page">
      <div className="page-scroll">
        <h1 className="page-title">Juegos</h1>
        <ProgressCard store={store} onReview={() => setReviewing(true)} onMedals={() => setMedals(true)} />
        <div className="game-list">
          {GAMES.map((g) => (
            <button key={g.id} className="game-card" onClick={() => setOpen(g.id)}>
              <span className={'game-icon g-' + g.id}><Icon d={g.icon} size={22} /></span>
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
      {reviewing && <Review store={store} onExit={() => setReviewing(false)} />}
      {medals && <Medals store={store} onClose={() => setMedals(false)} />}
    </div>
  )
}

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

// Racha de días seguidos estudiando, la semana y lo que toca repasar hoy.
function useStats(store) {
  const verses = verseSources(store.entries)
  return { verses, memorized: verses.filter((v) => (v.fields.nivel ?? 0) >= 3).length }
}

function ProgressCard({ store, onReview, onMedals }) {
  const p = store.progress
  const days = p.days ?? []
  const { current, best } = streak(days)
  const week = lastWeek(days)
  const srs = p.srs ?? {}
  const { verses, memorized } = useStats(store)
  const medals = achievements(p, { nodes: store.nodes.length, memorized })
  const got = medals.filter((m) => m.done).length
  const keys = [
    ...buildCards(store.nodes, store.entries).map((c) => 'c:' + c.id),
    ...verses.map((v) => 'v:' + v.id),
    ...store.entries.filter((e) => e.kind === 'trivia').map((e) => 'q:' + e.id),
  ]
  const due = dueCount(keys, srs)

  return (
    <section className="progress-card">
      <div className="streak">
        <span className={'flame' + (current ? ' on' : '')}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2c1 3.5 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 0-6 1-9z" fill="currentColor" /></svg>
        </span>
        <div>
          <p className="streak-num">{current} {current === 1 ? 'día' : 'días'}</p>
          <p className="streak-sub">{current ? 'seguidos estudiando' : 'Estudia hoy para empezar tu racha'}{best > current ? ` · récord ${best}` : ''}</p>
        </div>
      </div>
      <div className="week">
        {week.map((d) => {
          const [y, m, dd] = d.day.split('-').map(Number)
          return (
            <span key={d.day} className={'week-day' + (d.done ? ' done' : '')}>
              <i />
              {DAY_LETTERS[new Date(y, m - 1, dd).getDay()]}
            </span>
          )
        })}
      </div>
      <div className="stats-row">
        <div><b>{due}</b><span>para repasar hoy</span></div>
        <div><b>{memorized}<small>/{verses.length}</small></b><span>textos memorizados</span></div>
        <div><b>{p.triviaBest ? p.triviaBest + '%' : '—'}</b><span>mejor trivia</span></div>
      </div>
      <div className="progress-actions">
        <button className="primary" onClick={onReview}>{due ? `Repasar hoy · ${Math.min(due, 20)}` : 'Repasar hoy'}</button>
        <button className="secondary medals-btn" onClick={onMedals}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 14.5 6 22l6-3 6 3-2-7.5M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {got}/{medals.length}
        </button>
      </div>
    </section>
  )
}

// Logros: se calculan con tu progreso (no hay que hacer nada extra).
function Medals({ store, onClose }) {
  const { memorized } = useStats(store)
  const list = achievements(store.progress, { nodes: store.nodes.length, memorized })
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <p className="sheet-title">Logros · {list.filter((m) => m.done).length} de {list.length}</p>
        <div className="medal-grid">
          {list.map((m) => (
            <div key={m.id} className={'medal' + (m.done ? ' done' : '')}>
              <span className="medal-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  {m.done ? <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />}
                </svg>
              </span>
              <span className="medal-title">{m.title}</span>
              <span className="medal-desc">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
