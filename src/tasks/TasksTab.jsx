import { useEffect, useMemo, useState } from 'react'
import PageScroll from '../components/PageScroll.jsx'
import Sheet from '../components/Sheet.jsx'
import SwipeRow from '../components/SwipeRow.jsx'
import UndoBar, { useUndoDelete } from '../components/UndoBar.jsx'
import Icon, { ICONS } from '../components/Icon.jsx'
import {
  CATEGORIES, DAYS, HABIT, PRIORITIES, REMINDERS, SETTINGS_ID,
  dueLabel, groupTasks, habitStreak, habitsToday, joinLocal, makeHabit, makeSettings, makeTask,
  reminderLabel, splitLocal, timeLabel, toggleHabitDay,
} from './tasks.js'
import { enableDevicePush, pushState, testPush, deviceHasPush } from '../lib/push.js'

// Pestaña Pendientes (antes la app Centro): tareas con fecha y aviso, y hábitos de cada día.
const GROUPS = [
  ['atrasados', 'Atrasados'],
  ['hoy', 'Hoy'],
  ['manana', 'Mañana'],
  ['semana', 'Próximos 7 días'],
  ['despues', 'Después'],
  ['sinFecha', 'Sin fecha'],
]

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
  const groups = useMemo(() => groupTasks(entries, now), [entries, now])
  const todayHabits = useMemo(() => habitsToday(entries, now), [entries, now])
  const habits = useMemo(() => entries.filter((e) => e.kind === HABIT).sort((a, b) => a.createdAt - b.createdAt), [entries])
  const settings = entries.find((e) => e.id === SETTINGS_ID) ?? makeSettings()

  const [editing, setEditing] = useState(null) // { entry, isNew }
  const [habitEdit, setHabitEdit] = useState(null) // { entry, isNew }
  const [sheet, setSheet] = useState(null) // 'habitos' | 'avisos'
  const [showDone, setShowDone] = useState(false)

  const undoDel = useUndoDelete((e) => store.deleteEntry(e.id), (e) => store.saveEntry(e))

  const pendingCount = GROUPS.reduce((n, [k]) => n + groups[k].length, 0)

  const toggleDone = (e) => {
    const done = !e.fields.done
    store.saveEntry({ ...e, fields: { ...e.fields, done, doneAt: done ? Date.now() : null } })
    if (done) toast?.('Hecho')
  }

  return (
    <div className="page">
      <PageScroll title="Pendientes">
        <div className="page-head">
          <h1 className="page-title">Pendientes</h1>
          <button className="round-btn" aria-label="Nuevo pendiente" onClick={() => setEditing({ entry: makeTask({ dueAt: nextHour(now) }), isNew: true })}>
            <Icon d={ICONS.plus} size={20} stroke={2} />
          </button>
        </div>

        {todayHabits.length > 0 && (
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

        {GROUPS.map(([key, label]) =>
          groups[key].length ? (
            <section key={key}>
              <h2 className={'section-label' + (key === 'atrasados' ? ' late' : '')}>{label} · {groups[key].length}</h2>
              <TaskList items={groups[key]} now={now} onToggle={toggleDone} onOpen={(e) => setEditing({ entry: e, isNew: false })} onDelete={undoDel.remove} />
            </section>
          ) : null,
        )}

        {pendingCount === 0 && (
          <div className="empty-state">
            <p className="empty-title">Nada pendiente</p>
            <p className="hint center">Toca + para agregar algo con fecha y aviso.</p>
          </div>
        )}

        {groups.hechos.length > 0 && (
          <>
            <button className={'library-toggle done-toggle' + (showDone ? ' open' : '')} onClick={() => setShowDone((v) => !v)}>
              <span>Hechos · {groups.hechos.length}</span>
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
            {showDone && <TaskList items={groups.hechos.slice(0, 40)} now={now} onToggle={toggleDone} onOpen={(e) => setEditing({ entry: e, isNew: false })} onDelete={undoDel.remove} />}
          </>
        )}

        <h2 className="section-label">Más</h2>
        <ul className="entry-list">
          <li>
            <button className="entry-row" onClick={() => setSheet('habitos')}>
              <span className="entry-main">
                <span className="entry-title">Hábitos</span>
                <span className="entry-sub">{habits.length ? `${habits.length} ${habits.length === 1 ? 'hábito' : 'hábitos'}` : 'Agrega lo que haces cada semana'}</span>
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
                      <span className="entry-sub">{slotsSummary(h.fields.slots)}{streakText(habitStreak(h, now))}</span>
                    </span>
                    <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Un hábito es algo que haces ciertos días a cierta hora (por ejemplo, ejercicio lunes, miércoles y viernes a las 3:00). Te avisa a esa hora y lo palomeas en "Hábitos de hoy".</p>
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

function TaskList({ items, now, onToggle, onOpen, onDelete }) {
  return (
    <ul className="entry-list">
      {items.map((e) => {
        const f = e.fields
        const late = !f.done && f.dueAt && new Date(f.dueAt) < now
        return (
          <SwipeRow key={e.id} onDelete={() => onDelete(e)}>
            <div className={'entry-row task-row' + (f.done ? ' done' : '')}>
              <CheckButton done={f.done} label={f.title} onClick={() => onToggle(e)} />
              <button className="entry-main task-main" onClick={() => onOpen(e)}>
                <span className="entry-title">{f.priority === 'Alta' && !f.done && <i className="prio-dot" aria-label="Prioridad alta" />}{f.title || 'Sin título'}</span>
                <span className={'entry-sub' + (late ? ' late' : '')}>
                  {dueLabel(f.dueAt, now)}
                  {f.category ? ` · ${f.category}` : ''}
                  {f.notes?.trim() ? ' · nota' : ''}
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

function TaskEditor({ entry, isNew, onClose, onSave, onDelete }) {
  const f0 = entry.fields
  const start = splitLocal(f0.dueAt)
  const [title, setTitle] = useState(f0.title ?? '')
  const [date, setDate] = useState(start.date)
  const [time, setTime] = useState(start.time || '09:00')
  const [category, setCategory] = useState(f0.category || 'Personal')
  const [priority, setPriority] = useState(f0.priority || 'Media')
  const [reminder, setReminder] = useState(f0.reminderMinutes ?? null)
  const [notes, setNotes] = useState(f0.notes ?? '')
  const categories = CATEGORIES.includes(category) ? CATEGORIES : [...CATEGORIES, category]
  const reminders = REMINDERS.some(([m]) => m === reminder) ? REMINDERS : [...REMINDERS, [reminder, reminderLabel(reminder)]]

  const save = () => {
    const dueAt = joinLocal(date, time)
    onSave({
      ...entry,
      fields: {
        ...f0,
        title: title.trim(),
        dueAt,
        category,
        priority,
        reminderMinutes: dueAt ? reminder : null,
        notes,
      },
    })
  }

  return (
    <Sheet
      title={isNew ? 'Nuevo pendiente' : 'Pendiente'}
      onClose={onClose}
      footer={<button className="primary" disabled={!title.trim()} onClick={save}>Guardar</button>}
    >
      <label className="field">
        <span>Qué</span>
        <input className="input" value={title} placeholder="Por ejemplo: entregar la actividad 5" autoFocus={isNew} onChange={(e) => setTitle(e.target.value)} />
      </label>
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
      <label className="field">
        <span>Aviso</span>
        <select className="input select" value={reminder == null ? '' : String(reminder)} disabled={!date} onChange={(e) => setReminder(e.target.value === '' ? null : Number(e.target.value))}>
          {reminders.map(([m, l]) => <option key={String(m)} value={m == null ? '' : String(m)}>{l}</option>)}
        </select>
      </label>
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
  const [notes, setNotes] = useState(f0.notes ?? '')
  const [slots, setSlots] = useState(() => (f0.slots?.length ? f0.slots : makeHabit().fields.slots).map((s) => ({ ...s })))

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
      footer={<button className="primary" disabled={!valid} onClick={() => onSave({ ...entry, fields: { ...f0, title: title.trim(), notes, slots } })}>Guardar</button>}
    >
      <label className="field">
        <span>Hábito</span>
        <input className="input" value={title} placeholder="Por ejemplo: ejercicio" autoFocus={isNew} onChange={(e) => setTitle(e.target.value)} />
      </label>
      {slots.map((s, i) => (
        <div className="slot-card" key={i}>
          <div className="slot-head">
            <span className="sfield-label">Horario {slots.length > 1 ? i + 1 : ''}</span>
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
      {!isNew && <button className="delete-btn" onClick={() => onDelete(entry)}>Eliminar hábito</button>}
    </Sheet>
  )
}

function AlertsSheet({ settings, onSave, toast, onClose }) {
  const [device, setDevice] = useState(null) // null = revisando, true / false
  const [busy, setBusy] = useState(false)
  const state = pushState()
  const on = !!settings.fields.avisos

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
          <p className="hint small">Abre Universe desde el ícono de tu pantalla de inicio para poder recibir avisos.</p>
        ) : state === 'denied' ? (
          <p className="hint small">Las notificaciones están bloqueadas. Permítelas en Ajustes del iPhone, en Notificaciones, Universe.</p>
        ) : state === 'unsupported' ? (
          <p className="hint small">Este teléfono no puede recibir avisos (se necesita iOS 16.4 o más nuevo).</p>
        ) : device ? (
          <p className="hint small">Listo: este iPhone recibe avisos.</p>
        ) : (
          <button className="secondary" disabled={busy || device === null} onClick={() => run(async () => { await enableDevicePush(); setDevice(true) }, 'Avisos activados en este iPhone')}>Activar avisos en este iPhone</button>
        )}
      </div>

      <div className="sfield">
        <span className="sfield-label">2. Pendientes y hábitos</span>
        <div className="seg2">
          <button className={!on ? 'on' : ''} onClick={() => onSave({ ...settings, fields: { ...settings.fields, avisos: false } })}>Apagados</button>
          <button className={on ? 'on' : ''} onClick={() => onSave({ ...settings, fields: { ...settings.fields, avisos: true } })}>Prendidos</button>
        </div>
        <p className="hint small">Mientras sigas usando la app Centro, déjalos apagados para que no te lleguen dobles.</p>
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
      const days = s.days.length === 7 ? 'Diario' : s.days.length === 5 && [1, 2, 3, 4, 5].every((d) => s.days.includes(d)) ? 'L a V' : s.days.map((d) => DAYS[d]).join(', ')
      return `${days} ${timeLabel(atTime(new Date(), s.time))}${s.biweekly ? ' (cada 2 sem.)' : ''}`
    })
    .join(' · ')
}

