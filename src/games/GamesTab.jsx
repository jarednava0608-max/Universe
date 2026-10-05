import { useEffect, useMemo, useRef, useState } from 'react'
import Icon, { ICONS } from '../components/Icon.jsx'
import { GAMES } from './registry.js'
import { memorizeSources } from './logic.js'
import { achievements, lastWeek, streak, todayISO } from './progress.js'
import Review, { SESSION, reviewSummary } from './Review.jsx'
import { dailyDone, dailyQuestions, DAILY_SIZE } from './daily.js'
import { GameScreen, Quiz } from './ui.jsx'
import Sheet from '../components/Sheet.jsx'
import PageScroll from '../components/PageScroll.jsx'

// Pestaña Juegos: menú armado desde registry.js.
export default function GamesTab({ store, toast }) {
  const [open, setOpen] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const [medals, setMedals] = useState(false)
  const [daily, setDaily] = useState(false)
  const game = GAMES.find((g) => g.id === open)
  useNewMedals(store, toast)

  return (
    <div className="page">
      <PageScroll title="Juegos">
        <h1 className="page-title">Juegos</h1>
        <ProgressCard store={store} onReview={() => setReviewing(true)} onMedals={() => setMedals(true)} />
        <DailyCard store={store} onOpen={() => setDaily(true)} />
        <p className="section-label">Más juegos</p>
        <div className="game-list">
          {GAMES.map((g) => {
            const st = g.stat?.(store)
            return (
              <button key={g.id} className="game-card" onClick={() => setOpen(g.id)}>
                <span className={'game-icon g-' + g.id}><Icon d={g.icon} size={22} /></span>
                <span className="entry-main">
                  <span className="game-title">{g.title}{g.soon && <em className="soon-tag">Pronto</em>}</span>
                  <span className="entry-sub">{g.desc}</span>
                </span>
                {st && <span className={'game-pill' + (st.due ? ' due' : '')}>{st.text}</span>}
                <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
              </button>
            )
          })}
        </div>
      </PageScroll>
      {game && <game.Component store={store} toast={toast} onExit={() => setOpen(null)} />}
      {reviewing && <Review store={store} onExit={() => setReviewing(false)} />}
      {medals && <Medals store={store} onClose={() => setMedals(false)} />}
      {daily && <Daily store={store} onExit={() => setDaily(false)} />}
    </div>
  )
}

// Reto del día: 5 preguntas iguales todo el día. Muestra si ya lo hiciste y cómo te fue.
function DailyCard({ store, onOpen }) {
  const done = dailyDone(store.progress)
  return (
    <button className={'daily-card' + (done ? ' done' : '')} onClick={onOpen}>
      <span className="daily-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          {done
            ? <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </span>
      <span className="entry-main">
        <span className="game-title">Reto del día</span>
        <span className="entry-sub">{done ? `Hecho: ${done.score} de ${DAILY_SIZE}. Mañana hay otro` : `${DAILY_SIZE} preguntas nuevas cada día`}</span>
      </span>
      {done ? <span className="daily-dots">{Array.from({ length: DAILY_SIZE }, (_, i) => <i key={i} className={i < done.score ? 'on' : ''} />)}</span> : <span className="game-pill due">Hoy</span>}
    </button>
  )
}

export function Daily({ store, onExit, back }) {
  const [questions] = useState(() => dailyQuestions({ nodes: store.nodes, entries: store.entries, best: store.progress.best }))
  const [nonce, setNonce] = useState(0)
  return (
    <GameScreen title="Reto del día" back={back} onExit={onExit}>
      <Quiz
        key={nonce}
        questions={questions}
        onDone={onExit}
        onAgain={() => setNonce((n) => n + 1)}
        onFinish={(score) => {
          store.updateProgress((f) => {
            const prev = dailyDone(f)
            return prev && prev.score >= score ? f : { ...f, daily: { day: todayISO(), score } }
          })
        }}
      />
    </GameScreen>
  )
}

// Avisa cuando ganas un logro mientras juegas (los que ya tenías al abrir Juegos no cuentan).
function useNewMedals(store, toast) {
  const { memorized } = useStats(store)
  const done = achievements(store.progress, { nodes: store.nodes.length, memorized }).filter((m) => m.done)
  const seen = useRef(null)
  const key = done.map((m) => m.id).join()
  useEffect(() => {
    if (!store.ready) return
    if (seen.current == null) {
      seen.current = new Set(done.map((m) => m.id))
      return
    }
    const fresh = done.filter((m) => !seen.current.has(m.id))
    for (const m of fresh) seen.current.add(m.id)
    if (fresh.length) setTimeout(() => toast(`Logro nuevo: ${fresh.map((m) => m.title).join(', ')}`), 900)
  }, [key, store.ready]) // eslint-disable-line react-hooks/exhaustive-deps
}

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

// Racha de días seguidos estudiando, la semana y lo que toca repasar hoy.
function useStats(store) {
  const verses = memorizeSources(store.entries)
  return { verses, memorized: verses.filter((v) => (v.fields.nivel ?? 0) >= 3).length }
}

function ProgressCard({ store, onReview, onMedals }) {
  const p = store.progress
  const days = p.days ?? []
  const { current, best } = streak(days)
  const week = lastWeek(days)
  const { verses, memorized } = useStats(store)
  const medals = achievements(p, { nodes: store.nodes.length, memorized })
  const got = medals.filter((m) => m.done).length
  // Lo que ya viste y hoy toca repasar, y las cosas nuevas de hoy (unas pocas por día).
  const { due, fresh } = useMemo(() => reviewSummary(store), [store.nodes, store.entries, p]) // eslint-disable-line react-hooks/exhaustive-deps
  const today = Math.min(due + fresh, SESSION)

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
        <div><b>{fresh}</b><span>{fresh === 1 ? 'nueva hoy' : 'nuevas hoy'}</span></div>
        <div><b>{memorized}<small>/{verses.length}</small></b><span>textos memorizados</span></div>
      </div>
      <div className="progress-actions">
        <button className="primary" onClick={onReview}>{today ? `Repasar hoy · ${today}` : 'Repasar hoy'}</button>
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
  // Primero los que ya tienes; luego los que te faltan, del más cercano al más lejano.
  const list = achievements(store.progress, { nodes: store.nodes.length, memorized }).sort((a, b) => b.done - a.done || b.have / b.need - a.have / a.need)
  return (
    <Sheet title={`Logros · ${list.filter((m) => m.done).length} de ${list.length}`} onClose={onClose}>
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
              {!m.done && (
                <span className="medal-progress">
                  <span className="medal-bar"><i style={{ width: `${(m.have / m.need) * 100}%` }} /></span>
                  <small>{m.need === 100 ? `${m.have} %` : `${m.have}/${m.need}`}</small>
                </span>
              )}
            </div>
          ))}
        </div>
    </Sheet>
  )
}
