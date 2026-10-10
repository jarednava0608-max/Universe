import { useEffect, useMemo, useState } from 'react'
import PageScroll from '../components/PageScroll.jsx'
import Sheet from '../components/Sheet.jsx'
import SwipeRow from '../components/SwipeRow.jsx'
import UndoBar, { useUndoDelete } from '../components/UndoBar.jsx'
import Icon, { ICONS } from '../components/Icon.jsx'
import {
  CATEGORIES, DAYS, HABIT, PRIORITIES, REMINDERS, REPEATS, SETTINGS_ID, TASK, TYPES,
  categoriesIn, dueLabel, groupTasks, habitStreak, habitsToday, isFinished, joinLocal, makeHabit, makeSettings, makeTask,
  nextOccurrence, reminderLabel, splitLocal, timeLabel, toggleHabitDay,
} from './tasks.js'
import { deviceHasPush, enableDevicePush, pushState, testPush } from '../lib/push.js'

// Pestaña Pendientes (antes la app Centro): pendientes con fecha y aviso, y hábitos de cada día.
const GROUPS = [
  ['atrasados', 'Atrasados'],
  ['hoy', 'Hoy'],
  ['manana', 'Mañana'],
  ['semana', 'Próximos 7 días'],
  ['despues', 'Después'],
  ['sinFecha', 'Sin fecha'],
]
const DONE_SHOWN = 30
// En estas secciones los recordatorios ("faltan 3 días"...) se juntan en un renglón para que se vean
// los pendientes de verdad; los de hoy y mañana sí se ven sueltos.
const FOLD = new Set(['semana', 'despues'])

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    const vis = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [])
  return now
}

export default function TasksTab({ store, toast }) {
  const now = useNow()
  const entries = store.entries
  const [category, setCategory] = useState(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const filter = useMemo(() => ({ category, query }), [category, query])
  const groups = useMemo(() => groupTasks(entries, now, filter), [entries, now, filter])
  const todayHabits = useMemo(() => habitsToday(entries, now), [entries, now])
  const habits = useMemo(() => entries.filter((e) => e.kind === HABIT).sort((a, b) => a.createdAt - b.createdAt), [entries])
  const cats = useMemo(() => categoriesIn(entries), [entries])
  const total = useMemo(() => entries.reduce((n, e) => n + (e.kind === TASK ? 1 : 0), 0), [entries])
  const settings = entries.find((e) => e.id === SETTINGS_ID) ?? makeSettings()

  const [editing, setEditing] = useState(null) // { entry, isNew }
  const [habitEdit, setHabitEdit] = useState(null) // { entry, isNew }
  const [sheet, setSheet] = useState(null) // 'habitos' | 'avisos'
  const [showDone, setShowDone] = useState(false)

  const undoDel = useUndoDelete((e) => store.deleteEntry(e.id), (e) => store.saveEntry(e))
  const pendingCount = GROUPS.reduce((n, [k]) => n + groups[k].length, 0)
  const filtering = !!category || !!query.trim()

  const toggleDone = async (e) => {
    const done = !e.fields.done
    const saved = { ...e, fields: { ...e.fields, done, doneAt: done ? Date.now() : null } }
    // Si se repite, al terminarlo aparece el siguiente (como en Centro).
    const next = done ? nextOccurrence(e, now) : null
    await store.saveEntries(next ? [saved, next] : [saved])
    if (done) toast?.(next ? `Hecho. El siguiente: ${dueLabel(next.fields.dueAt, now)}` : 'Hecho')
  }

  const newTask = () => setEditing({ entry: makeTask({ dueAt: nextHour(now), category: category ?? 'Personal' }), isNew: true })

  return (
    <div className="page">
      <PageScroll title="Pendientes">
        <h1 className="page-title">Pendientes</h1>
        <button className="new-task" onClick={newTask}>
          <span className="new-task-plus"><Icon d={ICONS.plus} size={18} stroke={2.2} /></span>
          Nuevo pendiente
        </button>

        {todayHabits.length > 0 && !filtering && (
          <>
            <h2 className="section-label first">Hábitos de hoy</h2>
            <ul className="entry-list">
              {todayHabits.map(({ entry, slot, done }) => (
                <li key={entry.id}>
                  <div className={'entry-row task-row' + (done ? ' done' : '')}>
                    <CheckButton done={done} label={entry.fields.title} onClick={() => store.saveEntry(toggleHabitDay(entry, now))} />
                    <button className="entry-main task-main" onClick={() => setHabitEdit({ entry, isNew: false })}>
                      <span className="entry-title">{slot.label || entry.fields.title}</span>
                      <span className="entry-sub">{timeLabel(atTime(now, slot.time))}{streakText(habitStreak(entry, now))}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {(cats.length > 1 || total > 8) && (
          <div className="task-filters">
            {/* Tocar una categoría filtra; tocarla otra vez quita el filtro. */}
            <div className="chips" role="group" aria-label="Filtrar">
              {total > 8 && (
                <button className={'chip-icon' + (searching ? ' on' : '')} aria-label="Buscar pendientes" aria-pressed={searching} onClick={() => { if (searching) setQuery(''); setSearching(!searching) }}>
                  <span><Icon d={ICONS.buscar} size={17} stroke={2} /></span>
                </button>
              )}
              {cats.length > 1 && cats.map((c) => (
                <button key={c} className={category === c ? 'on' : ''} aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)}><span>{c}</span></button>
              ))}
            </div>
            {searching && <input className="input note-search" type="search" placeholder="Buscar pendientes" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} />}
          </div>
        )}

        {GROUPS.map(([key, label]) =>
          groups[key].length ? (
            <GroupSection
              key={key}
              id={key}
              label={label}
              items={groups[key]}
              now={now}
              foldReminders={FOLD.has(key) && !filtering}
              onToggle={toggleDone}
              onOpen={(e) => setEditing({ entry: e, isNew: false })}
              onDelete={undoDel.remove}
            />
          ) : null,
        )}

        {pendingCount === 0 && (
          <div className="empty-state">
            <span className="empty-icon kind-icon"><Icon d={ICONS.pendientes} size={26} /></span>
            <p className="empty-title">{filtering ? 'Nada con ese filtro' : 'Nada pendiente'}</p>
            {!filtering && <p className="hint center">Toca "Nuevo pendiente" para agregar algo con fecha y aviso.</p>}
          </div>
        )}

        {groups.hechos.length > 0 && (
          <>
            <button className={'library-toggle done-toggle' + (showDone ? ' open' : '')} aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
              <span>Hechos · {groups.hechos.length}</span>
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
            {showDone && (
              <>
                <TaskList items={groups.hechos.slice(0, DONE_SHOWN)} now={now} onToggle={toggleDone} onOpen={(e) => setEditing({ entry: e, isNew: false })} onDelete={undoDel.remove} />
                {groups.hechos.length > DONE_SHOWN && <p className="hint small center pad-top">Se muestran los {DONE_SHOWN} más recientes.</p>}
              </>
            )}
          </>
        )}

        <h2 className="section-label">Más</h2>
        <ul className="entry-list">
          <li>
            <button className="entry-row" onClick={() => setSheet('habitos')}>
              <span className="entry-main">
                <span className="entry-title">Hábitos</span>
                <span className="entry-sub">{habits.length ? `${habits.length} ${habits.length === 1 ? 'hábito' : 'hábitos'}` : 'Lo que haces ciertos días a cierta hora'}</span>
              </span>
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
          </li>
          <li>
            <button className="entry-row" onClick={() => setSheet('avisos')}>
              <span className="entry-main">
                <span className="entry-title">Avisos</span>
                <span className="entry-sub">{settings.fields.avisos ? 'Prendidos' : 'Apagados'}</span>
              </span>
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
          </li>
        </ul>
      </PageScroll>

      {undoDel.pending && <UndoBar text={undoDel.pending.kind === HABIT ? 'Hábito eliminado' : 'Pendiente eliminado'} onUndo={undoDel.undo} />}

      {editing && (
        <TaskEditor
          key={editing.entry.id}
          entry={editing.entry}
          isNew={editing.isNew}
          now={now}
          onClose={() => setEditing(null)}
          onSave={async (e) => { await store.saveEntry(e); setEditing(null) }}
          onDelete={(e) => { setEditing(null); undoDel.remove(e) }}
        />
      )}

      {sheet === 'habitos' && (
        <Sheet title="Hábitos" onClose={() => setSheet(null)} footer={<button className="primary" onClick={() => setHabitEdit({ entry: makeHabit(), isNew: true })}>Nuevo hábito</button>}>
          {habits.length ? (
            <ul className="entry-list">
              {habits.map((h) => (
                <li key={h.id}>
                  <button className="entry-row" onClick={() => setHabitEdit({ entry: h, isNew: false })}>
                    <span className="entry-main">
                      <span className="entry-title">{h.fields.title || 'Sin título'}</span>
                      <span className="entry-sub">{h.fields.active === false ? 'En pausa' : slotsSummary(h.fields.slots)}{streakText(habitStreak(h, now))}</span>
                    </span>
                    <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Un hábito es algo que haces ciertos días a cierta hora (por ejemplo, ejercicio lunes, miércoles y viernes a las 3:00 pm). Te avisa a esa hora y lo palomeas en "Hábitos de hoy".</p>
          )}
        </Sheet>
      )}

      {habitEdit && (
        <HabitEditor
          key={habitEdit.entry.id}
          entry={habitEdit.entry}
          isNew={habitEdit.isNew}
          onClose={() => setHabitEdit(null)}
          onSave={async (e) => { await store.saveEntry(e); setHabitEdit(null) }}
          onDelete={(e) => { setHabitEdit(null); undoDel.remove(e) }}
        />
      )}

      {sheet === 'avisos' && <AlertsSheet settings={settings} onSave={store.saveEntry} toast={toast} onClose={() => setSheet(null)} />}
    </div>
  )
}

function GroupSection({ id, label, items, now, foldReminders, onToggle, onOpen, onDelete }) {
  const [open, setOpen] = useState(false)
  const reminders = foldReminders ? items.filter((e) => e.fields.type === 'Recordatorio') : []
  const shown = reminders.length ? items.filter((e) => e.fields.type !== 'Recordatorio') : items
  return (
    <section>
      <h2 className={'section-label' + (id === 'atrasados' ? ' late' : '')}>{label}{shown.length ? ` · ${shown.length}` : ''}</h2>
      {shown.length > 0 && <TaskList items={shown} now={now} onToggle={onToggle} onOpen={onOpen} onDelete={onDelete} />}
      {reminders.length > 0 && (
        <>
          <button className={'fold-row' + (open ? ' open' : '') + (shown.length ? '' : ' alone')} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span>{reminders.length} {reminders.length === 1 ? 'recordatorio programado' : 'recordatorios programados'}</span>
            <span className="chev"><Icon d={ICONS.chev} size={15} stroke={2} /></span>
          </button>
          {open && <TaskList items={reminders} now={now} onToggle={onToggle} onOpen={onOpen} onDelete={onDelete} />}
        </>
      )}
    </section>
  )
}

function TaskList({ items, now, onToggle, onOpen, onDelete }) {
  return (
    <ul className="entry-list">
      {items.map((e) => {
        const f = e.fields
        const finished = isFinished(f, now)
        const late = !finished && f.dueAt && new Date(f.dueAt) < now
        const extra = [
          f.type && f.type !== 'Tarea' ? f.type : null,
          f.category || null,
          f.repeat && f.repeat !== 'none' ? 'se repite' : null,
          f.notes?.trim() ? 'nota' : null,
        ].filter(Boolean)
        return (
          <SwipeRow key={e.id} onDelete={() => onDelete(e)}>
            <div className={'entry-row task-row' + (finished ? ' done' : '')}>
              <CheckButton done={finished} label={f.title} onClick={() => onToggle(e)} />
              <button className="entry-main task-main" onClick={() => onOpen(e)}>
                <span className="entry-title">{f.priority === 'Alta' && !finished && <i className="prio-dot" aria-label="Prioridad alta" />}{f.title || 'Sin título'}</span>
                <span className={'entry-sub' + (late ? ' late' : '')}>
                  {dueLabel(f.dueAt, now)}
                  {extra.length ? ` · ${extra.join(' · ')}` : ''}
                </span>
              </button>
            </div>
          </SwipeRow>
        )
      })}
    </ul>
  )
}

function CheckButton({ done, label, onClick }) {
  return (
    <button className={'task-check' + (done ? ' on' : '')} aria-label={(done ? 'Desmarcar: ' : 'Marcar como hecho: ') + (label || '')} aria-pressed={done} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill={done ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
        {done && <path d="m7.5 12.2 3 3 6-6.4" fill="none" stroke="var(--check-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </button>
  )
}

function TaskEditor({ entry, isNew, now, onClose, onSave, onDelete }) {
  const f0 = entry.fields
  const start = splitLocal(f0.dueAt)
  const [title, setTitle] = useState(f0.title ?? '')
  const [date, setDate] = useState(start.date)
  const [time, setTime] = useState(start.time || '09:00')
  const [type, setType] = useState(f0.type || 'Tarea')
  const [category, setCategory] = useState(f0.category || 'Personal')
  const [priority, setPriority] = useState(f0.priority || 'Media')
  const [reminder, setReminder] = useState(f0.reminderMinutes === undefined ? 0 : f0.reminderMinutes)
  const [repeat, setRepeat] = useState(f0.repeat || 'none')
  const [notes, setNotes] = useState(f0.notes ?? '')
  const categories = CATEGORIES.includes(category) ? CATEGORIES : [...CATEGORIES, category]
  const reminders = REMINDERS.some(([m]) => m === reminder) ? REMINDERS : [...REMINDERS, [reminder, reminderLabel(reminder)]]
  const dueAt = joinLocal(date, time)
  const fire = dueAt && reminder != null ? new Date(new Date(dueAt).getTime() - reminder * 60000) : null
  const firePast = fire && fire < now && !f0.done

  const save = () =>
    onSave({
      ...entry,
      fields: { ...f0, title: title.trim(), dueAt, type, category, priority, reminderMinutes: dueAt ? reminder : null, repeat: dueAt ? repeat : 'none', notes },
    })

  return (
    <Sheet
      title={isNew ? 'Nuevo pendiente' : 'Pendiente'}
      onClose={onClose}
      footer={<button className="primary" disabled={!title.trim()} onClick={save}>Guardar</button>}
    >
      <label className="field">
        <span>Qué</span>
        <input className="input" value={title} placeholder="Por ejemplo: entregar la actividad 5" autoFocus={isNew} enterKeyHint="done" onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="field">
        <span>Tipo</span>
        <div className="seg2">
          {TYPES.map((t) => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t}</button>)}
        </div>
        {type === 'Recordatorio' && <p className="hint small after">Solo es un aviso: cuando pasa su hora se va a Hechos.</p>}
      </div>
      <div className="field-row">
        <label className="field">
          <span>Fecha</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Hora</span>
          <input className="input" type="time" value={time} disabled={!date} onChange={(e) => setTime(e.target.value || '09:00')} />
        </label>
      </div>
      {date ? (
        <button className="link-btn" onClick={() => setDate('')}>Quitar la fecha</button>
      ) : (
        <p className="hint small">Sin fecha no hay aviso.</p>
      )}
      {date && (
        <div className="field-row">
          <label className="field">
            <span>Aviso</span>
            <select className="input select" value={reminder == null ? '' : String(reminder)} onChange={(e) => setReminder(e.target.value === '' ? null : Number(e.target.value))}>
              {reminders.map(([m, l]) => <option key={String(m)} value={m == null ? '' : String(m)}>{l}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Repetir</span>
            <select className="input select" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
              {REPEATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      )}
      {date && firePast && <p className="hint small warn-text">Esa hora de aviso ya pasó: no va a sonar.</p>}
      <div className="field">
        <span>Categoría</span>
        <div className="seg2 wrap">
          {categories.map((c) => <button key={c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
      </div>
      <div className="field">
        <span>Prioridad</span>
        <div className="seg2">
          {PRIORITIES.map((p) => <button key={p} className={priority === p ? 'on' : ''} onClick={() => setPriority(p)}>{p}</button>)}
        </div>
      </div>
      <label className="field">
        <span>Notas</span>
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {!isNew && f0.source && f0.source !== 'Universe' && <p className="hint small">Lo agregó: {f0.source}</p>}
      {!isNew && <button className="delete-btn" onClick={() => onDelete(entry)}>Eliminar pendiente</button>}
    </Sheet>
  )
}

function HabitEditor({ entry, isNew, onClose, onSave, onDelete }) {
  const f0 = entry.fields
  const [title, setTitle] = useState(f0.title ?? '')
  const [goal, setGoal] = useState(f0.goal ?? '')
  const [notes, setNotes] = useState(f0.notes ?? '')
  const [active, setActive] = useState(f0.active !== false)
  const [slots, setSlots] = useState(() => (f0.slots?.length ? f0.slots : makeHabit().fields.slots).map((s) => ({ ...s, days: [...s.days] })))

  const setSlot = (i, patch) => setSlots((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const toggleDay = (i, d) => {
    const days = slots[i].days.includes(d) ? slots[i].days.filter((x) => x !== d) : [...slots[i].days, d].sort()
    setSlot(i, { days })
  }
  const valid = title.trim() && slots.length && slots.every((s) => s.days.length && s.time)

  return (
    <Sheet
      title={isNew ? 'Nuevo hábito' : 'Hábito'}
      onClose={onClose}
      footer={<button className="primary" disabled={!valid} onClick={() => onSave({ ...entry, fields: { ...f0, title: title.trim(), goal: goal.trim(), notes, active, slots } })}>Guardar</button>}
    >
      <label className="field">
        <span>Hábito</span>
        <input className="input" value={title} placeholder="Por ejemplo: ejercicio" autoFocus={isNew} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        <span>Meta (opcional)</span>
        <input className="input" value={goal} placeholder="Por ejemplo: 5 días por semana" onChange={(e) => setGoal(e.target.value)} />
      </label>
      {slots.map((s, i) => (
        <div className="slot-card" key={i}>
          <div className="slot-head">
            <span className="sfield-label">{slots.length > 1 ? `Horario ${i + 1}` : 'Horario'}</span>
            {slots.length > 1 && <button className="para-del" onClick={() => setSlots((l) => l.filter((_, j) => j !== i))}>Quitar</button>}
          </div>
          <div className="day-picks" role="group" aria-label="Días">
            {DAYS.map((d, n) => (
              <button key={d} className={s.days.includes(n) ? 'on' : ''} aria-pressed={s.days.includes(n)} onClick={() => toggleDay(i, n)}>{d}</button>
            ))}
          </div>
          <div className="field-row">
            <label className="field">
              <span>Hora</span>
              <input className="input" type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} />
            </label>
            <label className="field">
              <span>Cada</span>
              <select className="input select" value={s.biweekly ? '2' : '1'} onChange={(e) => setSlot(i, { biweekly: e.target.value === '2' ? mondayOf(new Date()) : null })}>
                <option value="1">Cada semana</option>
                <option value="2">Cada 2 semanas</option>
              </select>
            </label>
          </div>
          {s.biweekly && (
            <label className="field">
              <span>Empezando la semana del</span>
              <input className="input" type="date" value={s.biweekly} onChange={(e) => setSlot(i, { biweekly: e.target.value || mondayOf(new Date()) })} />
            </label>
          )}
          <label className="field">
            <span>Texto del aviso (opcional)</span>
            <input className="input" value={s.label ?? ''} placeholder={title || 'Igual que el hábito'} onChange={(e) => setSlot(i, { label: e.target.value })} />
          </label>
        </div>
      ))}
      <button className="add-row" onClick={() => setSlots((l) => [...l, { days: [], time: '07:00', label: '', biweekly: null }])}>
        <Icon d={ICONS.plus} size={18} stroke={2} /> Otro horario
      </button>
      <label className="field">
        <span>Notas</span>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {!isNew && (
        <div className="field">
          <span>Estado</span>
          <div className="seg2">
            <button className={active ? 'on' : ''} onClick={() => setActive(true)}>Activo</button>
            <button className={!active ? 'on' : ''} onClick={() => setActive(false)}>En pausa</button>
          </div>
          {!active && <p className="hint small after">En pausa no sale en "Hábitos de hoy" ni manda avisos.</p>}
        </div>
      )}
      {!isNew && <button className="delete-btn" onClick={() => onDelete(entry)}>Eliminar hábito</button>}
    </Sheet>
  )
}

function AlertsSheet({ settings, onSave, toast, onClose }) {
  const [device, setDevice] = useState(null) // null = revisando, true / false
  const [busy, setBusy] = useState(false)
  const state = pushState()
  const on = !!settings.fields.avisos
  const setOn = (avisos) => onSave({ ...settings, fields: { ...settings.fields, avisos }, createdAt: settings.createdAt || Date.now() })

  useEffect(() => {
    let live = true
    deviceHasPush().then((v) => live && setDevice(v)).catch(() => live && setDevice(false))
    return () => { live = false }
  }, [])

  const run = async (fn, ok) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast?.(ok)
    } catch (e) {
      toast?.(e.message || 'No se pudo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Avisos" onClose={onClose}>
      <p className="hint">Te llega una notificación a la hora del aviso de cada pendiente y a la hora de cada hábito.</p>

      <div className="sfield">
        <span className="sfield-label">1. Este iPhone</span>
        {state === 'install' ? (
          <p className="hint small after">Abre Universe desde el ícono de tu pantalla de inicio para poder recibir avisos.</p>
        ) : state === 'denied' ? (
          <p className="hint small after">Las notificaciones están bloqueadas. Permítelas en Ajustes del iPhone, en Notificaciones, Universe.</p>
        ) : state === 'unsupported' ? (
          <p className="hint small after">Este teléfono no puede recibir avisos (se necesita iOS 16.4 o más nuevo).</p>
        ) : device ? (
          <p className="hint small after">Listo: este iPhone recibe avisos.</p>
        ) : (
          <button className="secondary" disabled={busy || device === null} onClick={() => run(async () => { await enableDevicePush(); setDevice(true) }, 'Avisos activados en este iPhone')}>Activar avisos en este iPhone</button>
        )}
      </div>

      <div className="sfield">
        <span className="sfield-label">2. Pendientes y hábitos</span>
        <div className="seg2">
          <button className={!on ? 'on' : ''} onClick={() => setOn(false)}>Apagados</button>
          <button className={on ? 'on' : ''} onClick={() => setOn(true)}>Prendidos</button>
        </div>
        <p className="hint small after">Mientras sigas usando la app Centro, déjalos apagados para que no te lleguen dobles.</p>
      </div>

      {device && (
        <button className="secondary" disabled={busy} onClick={() => run(testPush, 'Aviso de prueba enviado')}>Mandar un aviso de prueba</button>
      )}
    </Sheet>
  )
}

function nextHour(now) {
  const d = new Date(now)
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.toISOString()
}
function atTime(day, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}
function mondayOf(d) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  const p = (n) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}
function streakText(n) {
  return n >= 2 ? ` · ${n} seguidos` : ''
}
function slotsSummary(slots = []) {
  return slots
    .map((s) => {
      const days = s.days.length === 7 ? 'Diario' : s.days.length === 5 && [1, 2, 3, 4, 5].every((d) => s.days.includes(d)) ? 'Lun a Vie' : s.days.map((d) => DAYS[d]).join(', ')
      return `${days} ${timeLabel(atTime(new Date(), s.time))}${s.biweekly ? ' (cada 2 sem.)' : ''}`
    })
    .join(' · ')
}
