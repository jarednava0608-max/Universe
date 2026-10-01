import { useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { GAMES } from './registry.js'
import { buildCards, verseSources } from './logic.js'
import { dueCount, lastWeek, streak } from './progress.js'

// Pestaña Juegos: menú armado desde registry.js.
export default function GamesTab({ store, toast }) {
  const [open, setOpen] = useState(null)
  const game = GAMES.find((g) => g.id === open)

  return (
    <div className="page">
      <div className="page-scroll">
        <h1 className="page-title">Juegos</h1>
        <ProgressCard store={store} />
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

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

// Racha de días seguidos estudiando, la semana y lo que toca repasar hoy.
function ProgressCard({ store }) {
  const p = store.progress
  const days = p.days ?? []
  const { current, best } = streak(days)
  const week = lastWeek(days)
  const srs = p.srs ?? {}
  const verses = verseSources(store.entries)
  const memorized = verses.filter((v) => (v.fields.nivel ?? 0) >= 3).length
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
    </section>
  )
}
