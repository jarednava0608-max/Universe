import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import PageScroll from '../components/PageScroll.jsx'
import SwipeRow from '../components/SwipeRow.jsx'
import UndoBar, { useUndoDelete } from '../components/UndoBar.jsx'
import Icon, { ICONS } from '../components/Icon.jsx'
import { KINDS, KIND_ORDER, makeEntry, entrySortKey, fieldsFromJson, claudeFormat, entryForClaude, proposeNode, noteBody, noteDate, today, dailyVerse, dailyTextUrl, dailyTextAppUrl, dailyAnalyzed } from './kinds.js'
import { answeredCount } from './atalaya.js'
import { midweekCount } from './midweek.js'
import TodayPlan from './TodayPlan.jsx'
import { parseJsonLoose } from '../lib/importer.js'
import { normKey, ROOT_ID } from '../lib/model.js'
import { RefChips } from '../components/RefLink.jsx'
import NodePeek from '../components/NodePeek.jsx'
import { definitionText, markdownToHtml, unwrapCallouts } from '../lib/markdown.js'
import { docToText, docToMarkdown, docToNodeMarkdown, tidyDoc, enrichDoc, relatedIds, claudeTidyPrompt, capRefs } from './noteText.js'
import { findSavedVerse, findAllRefs, anyRefKey } from '../lib/verses.js'
import TitleArea from '../components/TitleArea.jsx'
import AutoText from '../components/AutoText.jsx'
import AtalayaStudy from './AtalayaStudy.jsx'
import MidweekStudy from './MidweekStudy.jsx'
// El editor con formato se carga aparte para que la app abra rápido (main.jsx lo precarga).
const RichNote = lazy(() => import('./RichNote.jsx'))

// Pestaña Estudio: 5 apartados, cada uno con su lista de entradas.
export default function StudyTab({ entries, nodes, onSaveEntry, onDeleteEntry, onProposeToMap, onOpenNode, onSaveNode, toast, review, challenge, onReview, onChallenge }) {
  const [section, setSection] = useState(null) // kind abierto
  const [editing, setEditing] = useState(null) // { entry, isNew }
  const [query, setQuery] = useState('')
  const [peekNode, setPeekNode] = useState(null) // nodo abierto desde "Tus nodos"
  const [proposal, setProposal] = useState(null) // { entry, node } desde La Atalaya por pasos
  // Todos los nodos del mapa: Jehová primero y luego por orden alfabético.
  const allNodes = useMemo(() => [...nodes].sort((a, b) => (a.id === ROOT_ID ? -1 : b.id === ROOT_ID ? 1 : a.title.localeCompare(b.title, 'es'))), [nodes])
  // Entrada borrada deslizando, con "Deshacer".
  const undoDel = useUndoDelete((e) => onDeleteEntry(e.id), (e) => onSaveEntry(e))

  const byKind = useMemo(() => {
    const m = Object.fromEntries(KIND_ORDER.map((k) => [k, []]))
    for (const e of entries) m[e.kind]?.push(e)
    for (const k of KIND_ORDER) m[k].sort((a, b) => entrySortKey(b).localeCompare(entrySortKey(a)))
    return m
  }, [entries])

  // Recientes: entradas de Estudio y nodos del mapa juntos, por última edición (un nodo se abre como nota).
  const recent = useMemo(() => [
    ...entries.filter((e) => KINDS[e.kind]).map((e) => ({ entry: e, at: e.updatedAt })),
    ...nodes.map((n) => ({ node: n, at: n.updatedAt || n.createdAt || 0 })),
  ].sort((a, b) => b.at - a.at).slice(0, 6), [entries, nodes])
  const openRecent = (r) => (r.node ? setPeekNode(r.node.id) : setEditing({ entry: r.entry, isNew: false }))
  // Arriba en Estudio: "Hoy" (lo que toca hacer hoy, en orden) y "Seguir donde te quedaste" (lo último que editaste esta semana).
  const todayEntry = byKind.diario.find((e) => e.fields.fecha === today())
  const last = recent[0] && recent[0].entry?.id !== todayEntry?.id && Date.now() - recent[0].at < 7 * 864e5 ? recent[0] : null

  return (
    <div className="page">
      {!section ? (
        <PageScroll title="Estudio">
          <h1 className="page-title">Estudio</h1>
          <TodayPlan
            entries={entries}
            review={review}
            challenge={challenge}
            onOpenEntry={(e) => setEditing({ entry: e, isNew: false })}
            onCreate={({ kind, fields }) => {
              const e = makeEntry(kind)
              setEditing({ entry: { ...e, fields: { ...e.fields, ...fields } }, isNew: true })
            }}
            onReview={onReview}
            onChallenge={onChallenge}
          />
          {last && (
            <button className="continue-card" onClick={() => openRecent(last)}>
              <span className="continue-label">Seguir donde te quedaste</span>
              <span className="continue-title">{last.node ? last.node.title : KINDS[last.entry.kind].title(last.entry)}</span>
              <span className="continue-sub">{last.node ? 'Nodo' : KINDS[last.entry.kind].short} · {noteDate(last.at)}</span>
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
          )}
          <div className="kind-grid">
            {KIND_ORDER.map((k) => (
              <button key={k} className="kind-card" onClick={() => setSection(k)}>
                <span className={'kind-icon k-' + k}><Icon d={KINDS[k].icon} size={20} /></span>
                <span className="kind-label">{KINDS[k].label}</span>
                <span className="kind-desc">{KINDS[k].desc}</span>
                <span className="kind-count">{byKind[k].length || 'Vacío'}</span>
              </button>
            ))}
          </div>

          {recent.length > 0 && (
            <>
              <h2 className="section-label">Recientes</h2>
              <RecentList items={recent} onOpen={openRecent} />
            </>
          )}

          {allNodes.length > 0 && (
            <>
              <h2 className="section-label">Tus nodos · {allNodes.length}</h2>
              <ul className="entry-list">
                {allNodes.map((n) => {
                  const def = firstSentence(definitionText(n.note))
                  return (
                    <li key={n.id}>
                      <button className="entry-row" onClick={() => setPeekNode(n.id)}>
                        <span className={'node-dot' + (n.id === ROOT_ID ? ' root' : '')} />
                        <span className="entry-main">
                          <span className="entry-title">{n.title}</span>
                          <span className="entry-sub">{def || 'Sin definición todavía'}</span>
                        </span>
                        <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </PageScroll>
      ) : (
        <PageScroll key={section} title={KINDS[section].label}>
          <button className="back-link" onClick={() => { setSection(null); setQuery('') }}>
            <Icon d={ICONS.back} size={18} stroke={2} /> Estudio
          </button>
          <div className="page-head">
            <h1 className="page-title">{KINDS[section].label}</h1>
            <button className="round-btn" aria-label="Nueva entrada" onClick={() => setEditing({ entry: makeEntry(section), isNew: true })}>
              <Icon d={ICONS.plus} size={20} stroke={2} />
            </button>
          </div>
          {KINDS[section].notes && byKind[section].length > 0 && (
            <input className="input note-search" type="search" placeholder="Buscar en notas" value={query} onChange={(e) => setQuery(e.target.value)} />
          )}
          {undoDel.pending?.kind === section && <UndoBar text={KINDS[section].notes ? 'Nota eliminada' : 'Entrada eliminada'} onUndo={undoDel.undo} />}
          {byKind[section].length ? (
            <EntryList items={KINDS[section].notes ? filterNotes(byKind[section], query) : byKind[section]} onOpen={(e) => setEditing({ entry: e, isNew: false })} onDelete={undoDel.remove} />
          ) : (
            <div className="empty-state">
              <span className={'empty-icon kind-icon k-' + section}><Icon d={KINDS[section].icon} size={26} /></span>
              <p className="empty-title">Aún no hay nada aquí</p>
              <p>{KINDS[section].desc}.</p>
              <button className="primary" onClick={() => setEditing({ entry: makeEntry(section), isNew: true })}>{KINDS[section].notes ? 'Nueva nota' : 'Nueva entrada'}</button>
            </div>
          )}
        </PageScroll>
      )}

      {peekNode && nodes.some((n) => n.id === peekNode) && (
        <NodeNote
          key={peekNode}
          node={nodes.find((n) => n.id === peekNode)}
          nodes={nodes}
          toast={toast}
          onSave={onSaveNode}
          onClose={() => setPeekNode(null)}
          onOpenMap={(id) => { setPeekNode(null); onOpenNode(id) }}
        />
      )}

      {editing && KINDS[editing.entry.kind].notes && (
        <NoteEditor
          key={editing.entry.id}
          entry={editing.entry}
          isNew={editing.isNew}
          nodes={nodes}
          entries={entries}
          toast={toast}
          onSave={onSaveEntry}
          onDelete={onDeleteEntry}
          onClose={() => setEditing(null)}
          onOpenEntry={(e) => setEditing({ entry: e, isNew: false })}
          onPropose={async (e, node) => {
            const saved = await onSaveEntry(e)
            const nodeId = await onProposeToMap(node)
            if (nodeId) await onSaveEntry({ ...saved, mapNodeId: nodeId })
            setEditing(null)
          }}
          onOpenNode={onOpenNode}
        />
      )}

      {editing && isAtalaya(editing.entry) && (
        <AtalayaStudy
          key={editing.entry.id}
          entry={editing.entry}
          isNew={editing.isNew}
          toast={toast}
          onSave={onSaveEntry}
          onClose={() => setEditing(null)}
          onDelete={async (id) => {
            await onDeleteEntry(id)
            setEditing(null)
            toast('Estudio eliminado.')
          }}
          onSwitchToForm={(e) => setEditing({ entry: e, isNew: editing.isNew })}
          onPropose={(e) => setProposal({ entry: e, node: proposeNode(e) })}
        />
      )}

      {editing && isMidweek(editing.entry) && (
        <MidweekStudy
          key={editing.entry.id}
          entry={editing.entry}
          isNew={editing.isNew}
          toast={toast}
          onSave={onSaveEntry}
          onClose={() => setEditing(null)}
          onDelete={async (id) => {
            await onDeleteEntry(id)
            setEditing(null)
            toast('Reunión eliminada.')
          }}
          onSwitchToAtalaya={(e) => setEditing({ entry: e, isNew: editing.isNew })}
        />
      )}

      {proposal && (
        <ProposeSheet
          initial={proposal.node}
          nodes={nodes}
          onCancel={() => setProposal(null)}
          onApprove={async (node) => {
            const saved = await onSaveEntry(proposal.entry)
            const nodeId = await onProposeToMap(node)
            if (nodeId) await onSaveEntry({ ...saved, mapNodeId: nodeId })
            setProposal(null)
            setEditing(null)
          }}
        />
      )}

      {editing && !KINDS[editing.entry.kind].notes && editing.entry.kind !== 'reunion' && (
        <EntryEditor
          key={editing.entry.id}
          entry={editing.entry}
          isNew={editing.isNew}
          nodes={nodes}
          toast={toast}
          onCancel={() => setEditing(null)}
          onSave={async (e) => {
            await onSaveEntry(e)
            setEditing(null)
            toast('Guardado.')
          }}
          onDelete={async () => {
            await onDeleteEntry(editing.entry.id)
            setEditing(null)
            toast('Entrada eliminada.')
          }}
          onPropose={async (e, node) => {
            const saved = await onSaveEntry(e)
            const nodeId = await onProposeToMap(node)
            if (nodeId) await onSaveEntry({ ...saved, mapNodeId: nodeId })
            setEditing(null)
          }}
          onOpenNode={onOpenNode}
        />
      )}
    </div>
  )
}

// Un nodo del mapa abierto como nota: se lee y se edita con el mismo editor de Notas.
// Se guarda solo (título y definición en Markdown, con sus [[enlaces]] y subtítulos) y solo si lo cambiaste.
function NodeNote({ node, nodes, toast, onSave, onClose, onOpenMap }) {
  const isRoot = node.id === ROOT_ID
  const [title, setTitle] = useState(node.title)
  const [initialHtml] = useState(() => markdownToHtml(unwrapCallouts(node.note || '')))
  const [version, setVersion] = useState(0)
  const [slot, setSlot] = useState(null)
  const [editing, setEditing] = useState(false)
  const [peek, setPeek] = useState(null)
  const box = useVisibleBox()
  const editor = useRef()
  const dirty = useRef(false)
  const saved = useRef({ title: node.title, note: node.note || '' })
  const titleRef = useRef(title)
  titleRef.current = title

  async function flush() {
    if (!dirty.current && titleRef.current === saved.current.title) return true
    const t = titleRef.current.trim()
    if (!t) return toast('Escribe un título.'), false
    const clash = nodes.find((n) => n.id !== node.id && normKey(n.title) === normKey(t))
    if (clash) return toast(`Ya existe un nodo llamado «${clash.title}».`), false
    const note = dirty.current && editor.current ? docToNodeMarkdown(editor.current.getJSON()) : saved.current.note
    if (t === saved.current.title && note === saved.current.note) return true
    saved.current = { title: t, note }
    dirty.current = false
    await onSave({ ...node, title: t, note })
    return true
  }

  useEffect(() => {
    if (!editing) return
    const tm = setTimeout(() => editor.current?.commands.scrollIntoView(), 60)
    return () => clearTimeout(tm)
  }, [box.height, editing])
  useEffect(() => {
    const tm = setTimeout(flush, 900)
    return () => clearTimeout(tm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, version])
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function close() {
    if (await flush()) onClose()
  }
  function openByTitle(t) {
    const n = nodes.find((x) => normKey(x.title) === normKey(t))
    if (!n) return toast(`«${t}» todavía no está en tu mapa.`)
    setPeek(n)
  }

  return (
    <div className={'overlay note-editor' + (editing ? ' editing' : '')} style={box.style}>
      <header className="bar">
        <button className="bar-btn back" onClick={close}><Icon d={ICONS.back} size={18} stroke={2} /> Estudio</button>
        <span className="bar-spacer" />
        <button className="bar-btn" onClick={async () => { if (await flush()) onOpenMap(node.id) }}>Ver en el mapa</button>
      </header>
      <div className="editor-body">
        <p className="note-date">Nodo del mapa</p>
        <TitleArea
          value={title}
          placeholder="Título"
          readOnly={isRoot}
          enterKeyHint="next"
          onChange={setTitle}
          onEnter={() => editor.current?.commands.focus('start')}
        />
        <Suspense fallback={<div className="rich-loading" />}>
          <RichNote html={initialHtml} onChange={() => { dirty.current = true; setVersion((v) => v + 1) }} editorRef={editor} nodes={nodes} onOpenNode={openByTitle} toolbarSlot={slot} onEditing={setEditing} />
        </Suspense>
      </div>
      <div className="toolbar-slot" ref={setSlot} />
      {peek && <NodePeek node={peek} nodes={nodes} onOpenMap={async (n) => { setPeek(null); if (await flush()) onOpenMap(n.id) }} onClose={() => setPeek(null)} />}
    </div>
  )
}

// Primera oración de una definición (para la lista de nodos).
function firstSentence(text) {
  const t = (text || '').trim()
  const m = t.match(/^.{12,}?[.!?](\s|$)/)
  return (m ? m[0] : t).trim()
}

// "2026-10-04" → { d: 4, m: 'oct' } para la fecha de cada reunión.
function meetingDay(iso) {
  const [y, m, d] = String(iso ?? '').split('-').map(Number)
  if (!y || !m || !d) return null
  return { d, m: new Date(y, m - 1, d).toLocaleDateString('es', { month: 'short' }).replace('.', '') }
}

function EntryList({ items, onOpen, onDelete }) {
  return (
    <ul className="entry-list">
      {items.map((e) => {
        const def = KINDS[e.kind]
        const day = e.kind === 'reunion' || e.kind === 'diario' ? meetingDay(e.fields.fecha) : null
        const diario = day && e.kind === 'diario'
        // La fecha ya va en su hoja de calendario: abajo el tipo de reunión o el texto de ese día.
        // En Texto diario el título es el texto bíblico de ese día y abajo el resumen.
        const verse = diario && dailyVerse(e.fields.texto)
        const title = verse || def.title(e)
        // Lo que falta: el texto diario sin analizar y cuántas preguntas de La Atalaya llevas.
        const pending = diario ? !!verse && !dailyAnalyzed(e.fields) : false
        const progress = isAtalaya(e) && String(e.fields.articulo ?? '').trim() ? answeredCount(e.fields) : null
        const sub = !day ? def.subtitle(e)
          : diario ? (verse ? e.fields.resumen || (pending ? 'Falta analizarlo' : '') : 'Sin texto todavía')
          : e.fields.tipo === 'entresemana' ? midweekSub(e.fields)
          : progress?.total ? `La Atalaya · ${progress.done === progress.total ? 'Lista para la reunión' : `${progress.done} de ${progress.total} respondidas`}` : 'La Atalaya'
        // Reuniones y Texto diario: tarjeta con la fecha como en un calendario.
        const row = (
            <button className={'entry-row' + (day ? ' meeting' : '') + (diario ? ' daily' : '')} onClick={() => onOpen(e)}>
              {day && (
                <span className="meeting-date" aria-hidden="true">
                  <b>{day.d}</b>
                  <span>{day.m}</span>
                </span>
              )}
              <span className="entry-main">
                <span className="entry-title">{title}</span>
                {sub && <span className={'entry-sub' + (pending ? ' pending' : '')}>{sub}</span>}
              </span>
              {e.mapNodeId && <span className="in-map" title="En el mapa"><Icon d={ICONS.nodo} size={14} /></span>}
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
        )
        return onDelete ? <SwipeRow key={e.id} onDelete={() => onDelete(e)}>{row}</SwipeRow> : <li key={e.id}>{row}</li>
      })}
    </ul>
  )
}


// Las dos reuniones se estudian por pasos: La Atalaya y la de entre semana (con el programa pegado).
const isAtalaya = (e) => e.kind === 'reunion' && e.fields.tipo !== 'entresemana'
const isMidweek = (e) => e.kind === 'reunion' && e.fields.tipo === 'entresemana'
function midweekSub(f) {
  const c = midweekCount(f)
  return c.total ? `Entre semana · ${c.done === c.total ? 'Lista para la reunión' : `${c.done} de ${c.total} contestadas`}` : 'Entre semana'
}

// Lo último que tocaste: entradas de Estudio y nodos del mapa.
function RecentList({ items, onOpen }) {
  return (
    <ul className="entry-list">
      {items.map((r) => {
        const key = r.node ? 'n-' + r.node.id : r.entry.id
        if (r.node) {
          return (
            <li key={key}>
              <button className="entry-row" onClick={() => onOpen(r)}>
                <span className={'node-dot' + (r.node.id === ROOT_ID ? ' root' : '')} />
                <span className="entry-main">
                  <span className="entry-title">{r.node.title}</span>
                  <span className="entry-sub">Nodo · {noteDate(r.at)}</span>
                </span>
                <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
              </button>
            </li>
          )
        }
        const e = r.entry
        const def = KINDS[e.kind]
        return (
          <li key={key}>
            <button className="entry-row" onClick={() => onOpen(r)}>
              <span className="entry-main">
                <span className="entry-title">{def.title(e)}</span>
                <span className="entry-sub">{[def.short, def.notes ? noteDate(e.updatedAt) : def.subtitle(e)].filter(Boolean).join(' · ')}</span>
              </span>
              {e.mapNodeId && <span className="in-map" title="En el mapa"><Icon d={ICONS.nodo} size={14} /></span>}
              <span className="chev"><Icon d={ICONS.chev} size={16} stroke={2} /></span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function filterNotes(list, query) {
  const q = normKey(query)
  if (!q) return list
  return list.filter((e) => normKey(`${e.fields.titulo} ${e.fields.texto} ${e.fields.preguntas ?? ''}`).includes(q))
}

// Nota como en la app Notas del iPhone: título y texto, se guarda sola mientras escribes
// y al salir. Una nota que se queda vacía se borra.
// Ajusta la nota a lo que se ve en pantalla. En iPhone el teclado no achica la página:
// sin esto, lo último que escribes queda detrás del teclado.
function useVisibleBox() {
  const [box, setBox] = useState({ top: 0, height: null })
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      setBox({ top: vv.offsetTop, height: vv.height })
      // iOS a veces desplaza la página al abrir el teclado; se regresa para que nada se mueva.
      if (window.scrollY) window.scrollTo(0, 0)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return { ...box, style: box.height ? { top: box.top, height: box.height, bottom: 'auto' } : undefined }
}

const TIDY_ICON = 'M4 6h16M4 12h10M4 18h6M17 14l1.2 2.8L21 18l-2.8 1.2L17 22l-1.2-2.8L13 18l2.8-1.2z'
const SHARE_ICON = 'M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1'

function NoteEditor({ entry, isNew, nodes, entries, toast, onSave, onDelete, onClose, onPropose, onOpenNode, onOpenEntry }) {
  const [titulo, setTitulo] = useState(entry.fields.titulo ?? '')
  // El contenido con formato vive en `html`; `texto` es la versión en texto simple (buscar, mapa, citas).
  // No se convierte en cada letra: se lee del editor solo al guardar.
  const [initialHtml] = useState(() => entry.fields.html || markdownToHtml(noteBody(entry.fields)))
  const [version, setVersion] = useState(0) // sube con cada cambio del texto
  const [menu, setMenu] = useState(false)
  const [paste, setPaste] = useState(false)
  const [proposal, setProposal] = useState(null)
  const [slot, setSlot] = useState(null) // lugar de la barra de formato
  const [editing, setEditing] = useState(false)
  const box = useVisibleBox()
  const editor = useRef()
  const saved = useRef({ titulo: entry.fields.titulo ?? '', html: initialHtml, exists: !isNew })
  const tituloRef = useRef(titulo)
  tituloRef.current = titulo
  const [relatedText, setRelatedText] = useState(() => `${entry.fields.titulo ?? ''}\n${noteBody(entry.fields)}`)

  const read = () => {
    const ed = editor.current
    if (!ed) return { titulo: tituloRef.current, html: saved.current.html, texto: noteBody(entry.fields) }
    return { titulo: tituloRef.current, html: ed.getHTML(), texto: ed.getText({ blockSeparator: '\n' }) }
  }
  const isEmpty = (c) => !c.titulo.trim() && !c.texto.trim() && !/<(table|hr)/.test(c.html)
  const draft = (c = read()) => ({ ...entry, fields: { ...entry.fields, titulo: c.titulo, texto: c.texto, html: c.html, preguntas: '' } })

  async function flush() {
    const cur = read()
    if (cur.titulo === saved.current.titulo && cur.html === saved.current.html) return
    if (isEmpty(cur)) return
    saved.current = { titulo: cur.titulo, html: cur.html, exists: true }
    setRelatedText(`${cur.titulo}\n${cur.texto}`)
    await onSave(draft(cur))
  }

  // Con el teclado abierto, mantiene el cursor a la vista.
  useEffect(() => {
    if (!editing) return
    const t = setTimeout(() => editor.current?.commands.scrollIntoView(), 60)
    return () => clearTimeout(t)
  }, [box.height, editing])

  // Guardado automático: un momento después de dejar de escribir.
  useEffect(() => {
    const t = setTimeout(flush, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, version])

  // Si la app se va a segundo plano, se guarda de inmediato.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function close() {
    if (isEmpty(read())) {
      if (saved.current.exists) await onDelete(entry.id)
    } else {
      await flush()
    }
    onClose()
  }

  // Tocar un enlace [[nodo]] abre ese nodo en el mapa (antes se guarda la nota).
  // Tocar un enlace [[nodo]] muestra su definición aquí mismo (con botón para abrirlo en el mapa).
  const [peek, setPeek] = useState(null)
  async function openByTitle(title) {
    const node = nodes.find((n) => normKey(n.title) === normKey(title))
    if (!node) return toast(`«${title}» todavía no está en tu mapa.`)
    setPeek(node)
  }
  async function openInMap(node) {
    setPeek(null)
    await flush()
    onOpenNode(node.id)
  }

  // Ordenar (local, sin IA): limpia espacios, mayúsculas y renglones vacíos, y arma listas y subtítulos.
  const [undo, setUndo] = useState(null)
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 8000)
    return () => clearTimeout(t)
  }, [undo])

  function tidy() {
    const ed = editor.current
    if (!ed) return
    const before = { json: ed.getJSON(), titulo }
    const after = enrichDoc(tidyDoc(before.json), {
      nodes: nodes.filter((n) => n.id !== ROOT_ID),
      findRefs: findAllRefs,
      refKey: anyRefKey,
      verseText: (r) => findSavedVerse(entries, r)?.texto ?? null,
      plain: definitionText,
    })
    const nuevoTitulo = capRefs(titulo.replace(/\s+/g, ' ').trim()).replace(/^(\p{Ll})/u, (l) => l.toUpperCase())
    if (JSON.stringify(after) === JSON.stringify(before.json) && nuevoTitulo === titulo) return toast('La nota ya está ordenada.')
    ed.commands.setContent(after)
    setTitulo(nuevoTitulo)
    setVersion((v) => v + 1)
    setUndo(before)
  }

  // Otras entradas que comparten citas o ideas del mapa con esta nota.
  const related = useMemo(() => {
    const items = entries
      .filter((e) => e.id !== entry.id && KINDS[e.kind])
      .map((e) => ({ id: e.id, text: Object.values(e.fields ?? {}).map((v) => (Array.isArray(v) ? v.map((x) => x?.nota ?? x).join('\n') : typeof v === 'string' ? v : '')).join('\n') }))
    const ids = relatedIds(relatedText, items, { findRefs: findAllRefs, refKey: anyRefKey })
    return ids.map((id) => entries.find((e) => e.id === id))
  }, [entries, entry.id, relatedText])

  async function openEntry(e) {
    await flush()
    onOpenEntry(e)
  }

  function undoTidy() {
    editor.current?.commands.setContent(undo.json)
    setTitulo(undo.titulo)
    setVersion((v) => v + 1)
    setUndo(null)
  }

  async function tidyWithClaude() {
    setMenu(false)
    const md = editor.current ? docToMarkdown(editor.current.getJSON()) : read().texto
    try {
      await navigator.clipboard.writeText(claudeTidyPrompt(titulo, md))
      toast('Copiado. Pégalo en tu chat con Claude y luego usa “Pegar de Claude”.')
    } catch {
      toast('No se pudo copiar.')
    }
  }

  async function share() {
    setMenu(false)
    const text = editor.current ? docToText(editor.current.getJSON(), titulo) : [titulo, read().texto].filter(Boolean).join('\n\n')
    try {
      if (navigator.share) await navigator.share({ title: titulo || 'Nota', text })
      else {
        await navigator.clipboard.writeText(text)
        toast('Nota copiada.')
      }
    } catch (e) {
      if (e?.name !== 'AbortError') toast('No se pudo compartir.')
    }
  }

  const linked = entry.mapNodeId && nodes.find((n) => n.id === entry.mapNodeId)

  return (
    <div className={'overlay note-editor' + (editing ? ' editing' : '')} style={box.style}>
      <header className="bar">
        <button className="bar-btn back" onClick={close}><Icon d={ICONS.back} size={18} stroke={2} /> Notas</button>
        <span className="bar-spacer" />
        <span className="bar-actions">
          <button className="bar-btn tidy-btn" onPointerDown={(e) => e.preventDefault()} onClick={tidy}>Ordenar</button>
          <button className="bar-btn more-btn" aria-label="Más opciones" onClick={() => setMenu(true)}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>
          </button>
        </span>
      </header>

      {undo && (
        <div className="tidy-banner">
          <span>Nota ordenada</span>
          <button onPointerDown={(e) => e.preventDefault()} onClick={undoTidy}>Deshacer</button>
        </div>
      )}

      <div className="editor-body">
        <p className="note-date">{new Date(entry.updatedAt || Date.now()).toLocaleString('es', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        <TitleArea
          value={titulo}
          placeholder="Título"
          autoFocus={isNew}
          enterKeyHint="next"
          onChange={setTitulo}
          onEnter={() => editor.current?.commands.focus('start')}
        />
        <Suspense fallback={<div className="rich-loading" />}>
          <RichNote html={initialHtml} onChange={() => setVersion((v) => v + 1)} editorRef={editor} nodes={nodes} onOpenNode={openByTitle} toolbarSlot={slot} onEditing={setEditing} />
        </Suspense>
        {linked && (
          <button className="link-note" onClick={async () => { await flush(); onOpenNode(linked.id) }}>En el mapa como «{linked.title}» · Ver</button>
        )}
        {!editing && related.length > 0 && (
          <div className="related">
            <p className="related-title">Relacionado</p>
            {related.map((e) => (
              <button key={e.id} className="related-row" onClick={() => openEntry(e)}>
                <span className="related-kind">{KINDS[e.kind].short}</span>
                <span className="related-name">{KINDS[e.kind].title(e)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="toolbar-slot" ref={setSlot} />

      {peek && <NodePeek node={peek} nodes={nodes} onOpenMap={openInMap} onClose={() => setPeek(null)} />}

      {menu && (
        <div className="sheet-backdrop" onClick={() => setMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <div className="menu-group">
              <button className="menu-item" onClick={() => { setMenu(false); tidy() }}>
                <span className="menu-icon"><Icon d={TIDY_ICON} size={20} /></span><span className="menu-text"><span>Ordenar nota</span><span className="menu-sub">Limpia, arma listas y agrega tus textos y tu mapa</span></span>
              </button>
              <button className="menu-item" onClick={tidyWithClaude}>
                <span className="menu-icon"><Icon d={ICONS.pegar} size={20} /></span><span className="menu-text"><span>Ordenar con Claude</span><span className="menu-sub">Copia la nota con instrucciones para tu chat</span></span>
              </button>
            </div>
            <div className="menu-group">
              <button className="menu-item" onClick={share}>
                <span className="menu-icon"><Icon d={SHARE_ICON} size={20} /></span><span className="menu-text"><span>Compartir</span></span>
              </button>
              <button className="menu-item" onClick={() => { setMenu(false); setPaste(true) }}>
                <span className="menu-icon"><Icon d={ICONS.pegar} size={20} /></span><span className="menu-text"><span>Pegar de Claude</span></span>
              </button>
              <button className="menu-item" onClick={() => { setMenu(false); setProposal(proposeNode(draft())) }}>
                <span className="menu-icon"><Icon d={ICONS.nodo} size={20} /></span><span className="menu-text"><span>Proponer al mapa</span></span>
              </button>
            </div>
            <div className="menu-group">
              <button className="menu-item danger" onClick={async () => {
                if (!confirm('¿Eliminar esta nota?')) return
                if (saved.current.exists) await onDelete(entry.id)
                toast('Nota eliminada.')
                onClose()
              }}>
                <span className="menu-text"><span>Eliminar nota</span></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {paste && (
        <PasteFields
          kind={entry.kind}
          toast={toast}
          onCancel={() => setPaste(false)}
          onApply={(data) => {
            const now = read().texto
            const f = fieldsFromJson(entry.kind, data, { titulo, texto: now })
            setTitulo(f.titulo ?? '')
            if (f.texto !== now && editor.current) {
              editor.current.commands.setContent(markdownToHtml(f.texto))
              setVersion((v) => v + 1)
            }
            setPaste(false)
            toast('Nota llenada.')
          }}
        />
      )}

      {proposal && (
        <ProposeSheet initial={proposal} nodes={nodes} onCancel={() => setProposal(null)} onApprove={(node) => onPropose(draft(), node)} />
      )}
    </div>
  )
}

function EntryEditor({ entry, isNew, nodes, toast, onCancel, onSave, onDelete, onPropose, onOpenNode }) {
  const def = KINDS[entry.kind]
  const [fields, setFields] = useState(() => structuredClone(entry.fields))
  const [paste, setPaste] = useState(false)
  const [proposal, setProposal] = useState(null)
  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }))
  const draft = () => ({ ...entry, fields })
  const linked = entry.mapNodeId && nodes.find((n) => n.id === entry.mapNodeId)

  return (
    <div className="overlay">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">{def.short}</span>
        <button className="bar-btn strong" onClick={() => onSave(draft())}>Guardar</button>
      </header>

      <div className="editor-body">
        {def.fields.map((f) => (
          <Field key={f.key} field={f} value={fields[f.key]} onChange={(v) => set(f.key, v)} />
        ))}

        {(() => {
          const refs = findAllRefs(...Object.values(fields).flatMap((v) => (Array.isArray(v) ? v.map((p) => p.nota) : [v])))
          return refs.length > 0 && (
            <div className="sfield">
              <span className="sfield-label">Textos y publicaciones · toca para verlos</span>
              <RefChips refs={refs} />
            </div>
          )
        })()}

        <div className="action-stack">
          {entry.kind === 'diario' && (
            <>
              <a className="secondary as-btn" data-direct="1" href={dailyTextAppUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">
                Abrir este texto en JW Library
              </a>
              <a className="secondary as-btn" data-direct="1" href={dailyTextUrl(fields.fecha)} target="_blank" rel="noopener noreferrer">
                Ver en wol.jw.org
              </a>
            </>
          )}
          <button className="secondary icon-left" onClick={() => setPaste(true)}>
            <Icon d={ICONS.pegar} size={18} /> Pegar de Claude
          </button>
          <button className="secondary icon-left" onClick={async () => {
            try { await navigator.clipboard.writeText(entryForClaude(draft())); toast('Copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
          }}>
            <Icon d={ICONS.pegar} size={18} /> Copiar para Claude
          </button>
          {!def.noMap && (
            <button className="secondary icon-left" onClick={() => setProposal(proposeNode(draft()))}>
              <Icon d={ICONS.nodo} size={18} /> Proponer al mapa
            </button>
          )}
          {linked && (
            <button className="link-note" onClick={() => onOpenNode(linked.id)}>
              Ya está en el mapa como «{linked.title}» · Ver
            </button>
          )}
        </div>

        {!isNew && (
          <button className="delete-btn" onClick={() => confirm('¿Eliminar esta entrada?') && onDelete()}>Eliminar entrada</button>
        )}
      </div>

      {paste && (
        <PasteFields
          kind={entry.kind}
          toast={toast}
          onCancel={() => setPaste(false)}
          onApply={(data) => {
            setFields((f) => fieldsFromJson(entry.kind, data, f))
            setPaste(false)
            toast('Campos llenados. Revisa y guarda.')
          }}
        />
      )}

      {proposal && (
        <ProposeSheet
          initial={proposal}
          nodes={nodes}
          onCancel={() => setProposal(null)}
          onApprove={(node) => onPropose(draft(), node)}
        />
      )}
    </div>
  )
}

function Field({ field, value, onChange }) {
  if (field.type === 'paragraphs') return <Paragraphs field={field} value={value ?? []} onChange={onChange} />
  return (
    <label className="sfield">
      <span className="sfield-label">{field.label}</span>
      {field.type === 'date' ? (
        <input className="input" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'choice' ? (
        <div className="seg2">
          {field.options.map(([v, l]) => (
            <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
          ))}
        </div>
      ) : field.type === 'line' ? (
        <input className="input" value={value ?? ''} placeholder={field.hint ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <AutoText value={value ?? ''} placeholder={field.hint ?? ''} onChange={onChange} />
      )}
    </label>
  )
}


function Paragraphs({ field, value, onChange }) {
  const update = (i, patch) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const nextNum = () => {
    const last = Number(value.at(-1)?.num)
    return Number.isFinite(last) ? String(last + 1) : String(value.length + 1)
  }
  return (
    <div className="sfield">
      <span className="sfield-label">{field.label}</span>
      <div className="para-list">
        {value.map((p, i) => (
          <div className="para" key={i}>
            <div className="para-head">
              <span>Párrafo</span>
              <input className="para-num" inputMode="numeric" value={p.num} onChange={(e) => update(i, { num: e.target.value })} />
              <button className="para-del" aria-label="Quitar párrafo" onClick={() => onChange(value.filter((_, j) => j !== i))}>Quitar</button>
            </div>
            <AutoText value={p.nota} placeholder="Notas de este párrafo" onChange={(v) => update(i, { nota: v })} />
          </div>
        ))}
      </div>
      <button className="add-row" onClick={() => onChange([...value, { num: nextNum(), nota: '' }])}>
        <Icon d={ICONS.plus} size={16} stroke={2} /> Agregar párrafo
      </button>
    </div>
  )
}

function PasteFields({ kind, toast, onCancel, onApply }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  function apply() {
    try {
      onApply(parseJsonLoose(text))
    } catch (e) {
      setError(e.message)
    }
  }
  return (
    <div className="overlay picker">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Cancelar</button>
        <span className="bar-title">Pegar de Claude</span>
        <button className="bar-btn strong" disabled={!text.trim()} onClick={apply}>Llenar</button>
      </header>
      <div className="editor-body">
        <p className="hint">Pega el JSON que te dio Claude. Se llenan los campos y tú revisas antes de guardar.</p>
        {error && <p className="error">{error}</p>}
        <textarea className="input paste-input" value={text} placeholder="{ … }" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setText(e.target.value)} />
        <div className="stack">
          <button className="secondary" onClick={async () => {
            try { setText(await navigator.clipboard.readText()) } catch { setError('No se pudo leer el portapapeles. Mantén presionado el cuadro y elige “Pegar”.') }
          }}>Pegar del portapapeles</button>
          <button className="secondary" onClick={async () => {
            try { await navigator.clipboard.writeText(claudeFormat(kind)); toast('Formato copiado. Pégalo en tu chat con Claude.') } catch { toast('No se pudo copiar.') }
          }}>Copiar formato para Claude</button>
        </div>
      </div>
    </div>
  )
}

// Vista previa del nodo propuesto: se puede editar, aprobar o descartar.
function ProposeSheet({ initial, nodes, onCancel, onApprove }) {
  const [title, setTitle] = useState(initial.title)
  const [note, setNote] = useState(initial.note)
  const existing = nodes.find((n) => normKey(n.title) === normKey(title))
  return (
    <div className="overlay picker">
      <header className="bar">
        <button className="bar-btn" onClick={onCancel}>Descartar</button>
        <span className="bar-title">Proponer al mapa</span>
        <button className="bar-btn strong" disabled={!title.trim()} onClick={() => onApprove({ title: title.trim(), note })}>Aprobar</button>
      </header>
      <div className="editor-body">
        <p className="hint">Así quedaría el nodo. Puedes editarlo antes de aprobar.</p>
        <div className="propose-card">
          <TitleArea value={title} placeholder="Título" enterKeyHint="done" onChange={setTitle} />
          <AutoText value={note} placeholder="Idea principal" onChange={setNote} minRows={4} />
        </div>
        {existing && <p className="notice">Ya existe «{existing.title}» en el mapa: se le añadirá esta información sin borrar lo que tiene.</p>}
      </div>
    </div>
  )
}
