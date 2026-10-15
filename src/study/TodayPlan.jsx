import { useEffect, useRef, useState } from 'react'
import { useMeetings } from './meetings.js'
import Icon, { ICONS } from '../components/Icon.jsx'
import { DAYS, nextStep, todayPlan, looksLikeDailyText } from './today.js'
import { openRef } from '../lib/verses.js'

const cap = (s) => s[0].toUpperCase() + s.slice(1)

// "Hoy": solo un botón grande con lo que sigue; al terminarlo, el botón pasa al siguiente paso
// (ver today.js). Sin lista: el usuario solo quiere entrar y hacer lo que toca.
export default function TodayPlan({ streak, chain, entries, review, challenge, leidos, plan, onBible, onOpenEntry, onCreate, onPasteDaily, onReview, onChallenge, toast }) {
  const [meetings, setMeetings] = useMeetings()
  const [changing, setChanging] = useState(false)
  const items = todayPlan({ entries, review, challenge, meetings, leidos, plan })
  const diario = items[0]
  const done = items.filter((x) => x.done).length
  const fecha = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  const act = (it) => (it.key === 'lectura' ? (it.ref ? openRef(it.ref) : onBible()) : it.key === 'repaso' ? onReview() : it.key === 'reto' ? onChallenge() : it.entry ? onOpenEntry(it.entry) : onCreate(it.create))
  const next = nextStep(items)
  // Al terminar un paso (chain cambia), se abre solo el que sigue.
  const lastChain = useRef(chain)
  useEffect(() => {
    if (!chain || chain === lastChain.current || Date.now() - chain.t > 4000) return
    if (next?.key === chain.from) return // aún no llega lo guardado
    lastChain.current = chain
    if (next) doNext()
  }) // eslint-disable-line react-hooks/exhaustive-deps
  // El botón grande hace lo que sigue; sin texto de hoy, lo pega de lo copiado.
  const doNext = () => (next.key === 'diario' && !diario.verse && onPasteDaily ? pasteDaily() : act(next))
  const setup = changing || meetings?.semana == null || meetings?.fin == null

  async function pasteDaily() {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      // Sin permiso para leer lo copiado: se abre la entrada para pegarlo a mano.
      return onCreate(diario.create ?? { kind: 'diario', fields: {} })
    }
    if (!looksLikeDailyText(text)) {
      toast?.('Primero copia el texto de hoy en JW Library (con su cita) y vuelve a tocar aquí.')
      return
    }
    onPasteDaily(text.trim(), diario.entry)
  }

  return (
    <section className="today-card plan">
      <div className="plan-head">
        <span className="today-label">Hoy · {fecha}</span>
        <span className="plan-count">{done} de {items.length}</span>
      </div>
      {streak && (
        // Constancia en un renglón bajo la fecha: lo primero que se ve al abrir es "Hoy".
        <button className="plan-streak" onClick={streak.onClick}>
          Constancia <span>{streak.label}</span>
          <Icon d={ICONS.chev} size={14} stroke={2} />
        </button>
      )}
      {next && (
        <button className="primary plan-next" onClick={doNext}>
          <span className="plan-next-label">{done || next.entry ? 'Sigue' : 'Empieza'}: {next.title}</span>
          <span className="plan-next-sub">{next.key === 'diario' && !diario.verse ? 'Copia el texto en JW Library y toca aquí' : next.sub}</span>
        </button>
      )}
      {setup ? (
        <MeetingDays value={meetings} onChange={(next) => { setMeetings(next); if (next.semana != null && next.fin != null) setChanging(false) }} />
      ) : (
        <p className="plan-foot">
          {done === items.length ? 'Todo listo por hoy. ' : ''}Reuniones: {DAYS[meetings.semana]} y {DAYS[meetings.fin]}
          <button className="plan-change" onClick={() => setChanging(true)}>Cambiar</button>
        </p>
      )}
    </section>
  )
}

// Se pregunta una vez: así "Hoy" te dice cuándo preparar La Atalaya y la reunión de entre semana.
function MeetingDays({ value, onChange }) {
  const v = value ?? {}
  const pick = (k) => (e) => onChange({ ...v, [k]: e.target.value === '' ? null : Number(e.target.value) })
  return (
    <div className="plan-setup">
      <p className="plan-setup-q">¿Qué días son tus reuniones? Así te digo cuándo preparar cada una.</p>
      <div className="plan-setup-row">
        <label>
          <span>Entre semana</span>
          <select className="input" value={v.semana ?? ''} onChange={pick('semana')}>
            <option value="">Elegir</option>
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{cap(DAYS[d])}</option>)}
          </select>
        </label>
        <label>
          <span>Fin de semana</span>
          <select className="input" value={v.fin ?? ''} onChange={pick('fin')}>
            <option value="">Elegir</option>
            {[6, 0].map((d) => <option key={d} value={d}>{cap(DAYS[d])}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}
