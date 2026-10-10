import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from './lib/store.js'
import { useSync } from './lib/useSync.js'
import { useTheme } from './lib/theme.js'
import { getMeta, loadAll, requestPersistence, setMeta } from './lib/db.js'
import { buildExport, planImport } from './lib/importer.js'
import { currentGalaxy, galaxyOf, GALAXIES, makeNode, normKey, setCurrentGalaxy } from './lib/model.js'
import Graph from './components/Graph.jsx'
import Search from './components/Search.jsx'
import NoteView from './components/NoteView.jsx'
import NodeEditor from './components/NodeEditor.jsx'
import PasteSheet from './components/PasteSheet.jsx'
import Menu from './components/Menu.jsx'
import AccountSheet from './components/AccountSheet.jsx'
import DigList from './components/DigList.jsx'
import { buildSupport, connectionCount } from './lib/support.js'
import TabBar from './components/TabBar.jsx'
import { dailyDone } from './games/daily.js'
import Icon, { ICONS } from './components/Icon.jsx'
import StudyTab from './study/StudyTab.jsx'
import GamesTab, { Daily } from './games/GamesTab.jsx'
import Constancia from './games/Constancia.jsx'
import TasksTab from './tasks/TasksTab.jsx'
import { groupTasks } from './tasks/tasks.js'
import Review, { reviewSummary } from './games/Review.jsx'
import RefSheet from './components/RefSheet.jsx'
import ChapterReader from './components/ChapterReader.jsx'
import { isRead, withRead } from './lib/reading.js'
import { OPEN_REF } from './lib/verses.js'
import { SEEDS, planSeed } from './lib/seeds.js'
import { parseRef } from './lib/bible.js'
import { isPubRef } from './lib/pubs.js'
import { entrySource, conceptNote } from './study/concepts.js'
import { planVerseSave, cleanSavedVerses, wrongThirdJohn } from './lib/verseSave.js'

let seedsRunning = false

const TAB_IDS = ['mapa', 'estudio', 'pendientes', 'juegos']
function initialTab() {
  try {
    const t = new URLSearchParams(location.search).get('tab')
    if (TAB_IDS.includes(t)) {
      history.replaceState(null, '', location.pathname + location.hash)
      return t
    }
  } catch { /* sin URL */ }
  return 'estudio'
}

const LAST_NODE = 'universe-last-node'

export default function App() {
  const store = useStore()
  const sync = useSync(store)

  // Guardar un texto en Mi Biblia también lo manda a Memorizar (una sola vez por cita).
  async function saveVerse(entry) {
    await store.saveEntry(entry)
    const { memoria } = planVerseSave(entry, store.entries)
    if (memoria) await store.saveEntry(memoria)
  }
  const { mode, theme, setMode, style, setStyle } = useTheme()
  const { nodes, edges } = store
  const graph = useRef()

  // La app abre en Estudio: arriba está "Hoy", lo que toca hacer hoy.
  // Un aviso de Pendientes abre la app con ?tab=pendientes.
  const [tab, setTab] = useState(initialTab) // 'mapa' | 'estudio' | 'pendientes' | 'juegos'
  const [searchOpen, setSearchOpen] = useState(false) // Buscar en todo (lupa en Estudio)
  const [studyHome, setStudyHome] = useState(true) // la lupa solo sale en el inicio de Estudio (en las listas el título es largo)
  const [play, setPlay] = useState(null) // 'review' | 'daily': Repasar hoy o el Reto del día, abiertos desde "Hoy"
  const [stack, setStack] = useState([]) // notas abiertas (para volver atrás)
  const [focusId, setFocusId] = useState(null)
  // Último nodo que viste: el mapa abre ahí (preferencia de este teléfono).
  const [startNode, setStartNode] = useState(() => { try { return localStorage.getItem(LAST_NODE) } catch { return null } })
  // Galaxias: el mapa muestra solo los nodos y conexiones de la elegida (se recuerda en este teléfono).
  const [galaxy, setGalaxy] = useState(currentGalaxy)
  const galaxyRef = useRef(galaxy)
  galaxyRef.current = galaxy
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const changeGalaxy = useCallback((id, start = null) => {
    setCurrentGalaxy(id)
    setGalaxy(id)
    setStartNode(start)
    setFocusId(start)
  }, [])
  const galNodes = useMemo(() => nodes.filter((n) => galaxyOf(n) === galaxy), [nodes, galaxy])
  const galEdges = useMemo(() => {
    const ids = new Set(galNodes.map((n) => n.id))
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target))
  }, [galNodes, edges])
  const [editor, setEditor] = useState(null)
  const [sheet, setSheet] = useState(null) // 'menu' | 'paste' | 'account' | 'dig'
  const [pasteText, setPasteText] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [persisted, setPersisted] = useState(null)
  const [lastExport, setLastExport] = useState(null)

  const toast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(toast.t)
    toast.t = setTimeout(() => setToastMsg(''), 2600)
  }, [])

  // Tocar una cita bíblica en cualquier parte abre la hoja con el texto (en vez de salir a wol.jw.org).
  // Leer toda la Biblia: marcar un capítulo como leído (se guarda en el progreso y se sincroniza).
  const toggleRead = (book, chapter, on) => store.updateProgress((f) => withRead(f, book, chapter, on))

  const [refOpen, setRefOpen] = useState(null)
  // Un capítulo entero ("Jeremías 40") se abre a pantalla completa, como la Biblia de JW Library.
  const [reader, setReader] = useState(null) // { book, chapter, verse? }
  const readerRef = useRef(null)
  readerRef.current = reader
  useEffect(() => {
    const openAny = (ref) => {
      const r = !isPubRef(ref) && parseRef(ref)
      if (r && r.verse == null) setReader({ book: r.book, chapter: r.chapter })
      else setRefOpen(ref)
    }
    const onOpen = (e) => openAny(e.detail)
    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="https://wol.jw.org/es/wol/"]')
      if (!a || a.dataset.direct) return
      const ref = a.textContent.trim()
      if (!parseRef(ref) && !isPubRef(ref)) return
      e.preventDefault()
      e.stopPropagation()
      openAny(ref)
    }
    window.addEventListener(OPEN_REF, onOpen)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener(OPEN_REF, onOpen)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  // Paquetes de nodos pedidos por el usuario (src/lib/seeds.js): una sola vez por teléfono.
  useEffect(() => {
    if (!store.ready || seedsRunning) return
    seedsRunning = true
    ;(async () => {
      for (const seed of SEEDS) {
        if (await getMeta('seed:' + seed.id)) continue
        try {
          // Se lee lo guardado en ese momento (el paquete anterior pudo haber cambiado nodos).
          const { nodes: now, edges: nowEdges, entries: nowEntries } = await loadAll()
          const { put, del, verses, trivia, entries: study } = planSeed(seed, now, nowEdges, nowEntries)
          if (put.length) await store.applyImport({ newNodes: put.map((n) => ({ ...n, updatedAt: Date.now() })), updatedNodes: [], newEdges: [] })
          if (seed.wipe && del.length) await setMeta('backup:' + seed.id, { nodes: now, edges: nowEdges, t: Date.now() })
          if (del.length) await store.deleteNodes(del)
          if (verses.length) await store.saveEntries(verses)
          if (trivia.length) await store.saveEntries(trivia)
          if (study.length) await store.saveEntries(study)
          await setMeta('seed:' + seed.id, Date.now())
        } catch (e) {
          console.warn('No se pudo aplicar', seed.id, e)
        }
      }
      // Una sola vez por teléfono: quita las marcas + y * de los textos que ya estaban guardados.
      try {
        if (!(await getMeta('clean:verses-1'))) {
          const { entries: all } = await loadAll()
          const fixed = cleanSavedVerses(all)
          if (fixed.length) await store.saveEntries(fixed)
          await setMeta('clean:verses-1', Date.now())
        }
      } catch (e) {
        console.warn('No se pudieron limpiar los textos', e)
      }
      // Una sola vez: borra el texto de 1 Corintios 3 que quedó guardado por error en "3 Juan 3".
      try {
        if (!(await getMeta('clean:3juan-1'))) {
          const { nodes: allNodes, entries: all } = await loadAll()
          const { entryIds, nodeIds } = wrongThirdJohn(allNodes, all)
          if (entryIds.length) await store.deleteEntries(entryIds)
          for (const id of nodeIds) await store.deleteNode(id)
          await setMeta('clean:3juan-1', Date.now())
        }
      } catch (e) {
        console.warn('No se pudo borrar el texto de 3 Juan 3', e)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready])

  useEffect(() => {
    requestPersistence().then(setPersisted)
    getMeta('lastExport').then((v) => v && setLastExport(v)).catch(() => {})
  }, [])

  // El gesto de "atrás" del navegador cierra la nota actual.
  useEffect(() => {
    // history.state.depth dice cuántas notas siguen abiertas (go(-n) dispara un solo popstate).
    const onPop = () => setStack((s) => s.slice(0, Math.min(s.length, history.state?.depth ?? 0)))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const stackRef = useRef(stack)
  stackRef.current = stack
  const openNote = useCallback((id) => {
    // Un nodo de otra galaxia (desde Estudio o Buscar en todo): primero se cambia a su galaxia.
    const node = nodesRef.current.find((n) => n.id === id)
    const switching = node && galaxyOf(node) !== galaxyRef.current
    if (switching) changeGalaxy(galaxyOf(node), id)
    const s = stackRef.current
    if (s.at(-1) !== id) {
      const next = [...s, id]
      stackRef.current = next
      setStack(next)
      history.pushState({ note: id, depth: next.length }, '')
    }
    setFocusId(id)
    if (!switching) graph.current?.focus(id)
    try { localStorage.setItem(LAST_NODE, id) } catch { /* sin almacenamiento */ }
  }, [changeGalaxy])
  const back = useCallback(() => history.back(), [])
  const closeAll = useCallback(() => {
    const n = stack.length
    if (n) history.go(-n)
  }, [stack.length])

  // Sin la nube, todo vive solo en este iPhone: si el último respaldo tiene más de un mes (o nunca), se avisa
  // con un puntito en el menú del mapa y en "Exportar respaldo".
  const backupStale = sync.checked && !sync.session && nodes.length > 1 && (!lastExport || Date.now() - lastExport > 30 * 864e5)

  // Ideas que todavía no llegan a ningún texto bíblico (para "Por escarbar" en el menú).
  const unfounded = useMemo(() => (sheet === 'menu' ? buildSupport(galNodes).unfounded().length : 0), [sheet, galNodes])
  const lines = useMemo(() => (sheet === 'menu' ? connectionCount(galNodes, galEdges) : 0), [sheet, galNodes, galEdges])

  const currentId = stack.at(-1)
  const current = nodes.find((n) => n.id === currentId)

  // Si la nota abierta se borró, ciérrala.
  useEffect(() => {
    if (currentId && store.ready && !current) back()
  }, [currentId, current, store.ready, back])

  useEffect(() => {
    if (currentId) setFocusId(currentId)
  }, [currentId])

  function startNew(partial = {}) {
    setSheet(null)
    setEditor({ node: makeNode({ origin: 'propio', galaxy, ...partial, title: partial.title ?? '' }), isNew: true })
  }

  async function saveEditor(node, { removed, added }) {
    const isNew = editor.isNew
    try {
      const saved = await store.saveNode(node)
      for (const id of removed) await store.deleteEdge(id)
      for (const c of added) {
        const [source, target] = c.dir === 'out' ? [saved.id, c.otherId] : [c.otherId, saved.id]
        await store.addEdge({ source, target, rel: c.rel })
      }
      setEditor(null)
      if (isNew) openNote(saved.id)
    } catch (e) {
      toast('No se pudo guardar: ' + e.message)
    }
  }

  async function deleteFromEditor() {
    await store.deleteNode(editor.node.id)
    setEditor(null)
    toast('Nodo eliminado.')
  }

  async function exportAll() {
    setSheet(null)
    const json = JSON.stringify(buildExport(nodes, edges, store.entries), null, 2)
    const name = `universe-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([json], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Respaldo Universe' })
      } else {
        const url = URL.createObjectURL(file)
        const a = Object.assign(document.createElement('a'), { href: url, download: name })
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      }
      const now = Date.now()
      await setMeta('lastExport', now)
      setLastExport(now)
      toast('Respaldo exportado.')
    } catch (e) {
      if (e?.name !== 'AbortError') toast('No se pudo exportar: ' + e.message)
    }
  }

  async function importFile(file) {
    setPasteText(await file.text())
    setSheet('paste')
  }

  async function confirmImport(plan) {
    await store.applyImport(plan)
    setSheet(null)
    setPasteText('')
    const parts = []
    if (plan.newNodes.length) parts.push(`${plan.newNodes.length} nodos nuevos`)
    if (plan.updatedNodes.length) parts.push(`${plan.updatedNodes.length} actualizados`)
    if (plan.newEdges.length) parts.push(`${plan.newEdges.length} conexiones`)
    toast('Guardado: ' + parts.join(', ') + '.')
    // Deja que el mapa se acomode y luego muestra todo.
    setFocusId(null)
    setTimeout(() => graph.current?.fit(), 1200)
  }

  // "Proponer al mapa" desde Estudio: crea el nodo (o añade la información si ya existe).
  async function proposeToMap(node) {
    const plan = planImport({ nodes: [{ title: node.title, note: node.note }] }, { nodes, edges })
    const target = plan.newNodes[0] ?? plan.updatedNodes[0]?.after
    if (!target) {
      const same = nodes.find((n) => n.title.trim().toLowerCase() === node.title.trim().toLowerCase())
      toast('Eso ya estaba en el mapa.')
      return same?.id ?? null
    }
    await store.applyImport(plan)
    toast(plan.newNodes.length ? 'Nodo agregado al mapa.' : 'Información añadida al nodo.')
    return target.id
  }

  // Paso "Conceptos" de Estudio: un nodo por concepto (en la galaxia Espiritual). Si el título ya existe,
  // se le añade la definición. Devuelve { claveDelTítulo: id } para que la entrada recuerde su nodo.
  async function conceptsToMap(list, entry) {
    const source = entrySource(entry)
    const plan = planImport({ nodes: list.map((c) => ({ title: c.titulo.trim(), note: conceptNote(c, source), galaxy: 'espiritual' })) }, { nodes, edges })
    await store.applyImport(plan)
    const all = [...plan.updatedNodes.map((u) => u.after), ...plan.newNodes, ...nodes]
    const ids = {}
    for (const c of list) {
      const n = all.find((x) => normKey(x.title) === normKey(c.titulo))
      if (n) ids[normKey(c.titulo)] = n.id
    }
    const k = list.length
    toast(`${k} ${k === 1 ? 'concepto' : 'conceptos'} en el mapa${galaxy !== 'espiritual' ? ' (galaxia Espiritual)' : ''}.`)
    return ids
  }

  function openNodeFromStudy(id) {
    setTab('mapa')
    setTimeout(() => openNote(id), 50)
  }

  // Para "Hoy" en Estudio: cuánto toca repasar y si ya hiciste el Reto del día.
  // Puntito en Pendientes si hay algo atrasado o para hoy.
  const tasksDue = useMemo(() => {
    if (!store.ready) return 0
    const g = groupTasks(store.entries)
    return g.atrasados.length + g.hoy.length
  }, [store.ready, store.entries])
  // Tocar un aviso con la app abierta: el service worker pide abrir la pestaña.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMsg = (e) => { if (e.data?.type === 'open-tab' && e.data.tab) setTab(e.data.tab) }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [])
  const reviewToday = useMemo(() => (store.ready && tab === 'estudio' ? reviewSummary(store) : { due: 0, fresh: 0 }), [store.ready, tab, store.nodes, store.entries, store.progress]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!store.ready) return <div className="boot" />

  return (
    <div className="app">
      <div className={'tab-map' + (tab === 'mapa' ? '' : ' tab-hidden')}>
      <Graph
        key={galaxy}
        ref={graph}
        nodes={galNodes}
        edges={galEdges}
        focusId={focusId}
        startId={startNode}
        theme={theme}
        onNodeTap={openNote}
        onBackgroundTap={() => setFocusId(null)}
      />

      <Search
        nodes={galNodes}
        onPick={openNote}
        onMenu={() => setSheet('menu')}
        alert={backupStale}
        below={
          <div className="galaxies" role="tablist" aria-label="Galaxias">
            {GALAXIES.map((g) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={g.id === galaxy}
                className={g.id === galaxy ? 'on' : ''}
                style={{ '--gx': `var(--gx-${g.id})` }}
                onClick={() => {
                  if (g.id === galaxy) return
                  closeAll()
                  changeGalaxy(g.id)
                }}
              >
                <i />
                {g.label}
              </button>
            ))}
          </div>
        }
      />

      {nodes.length === 1 && galNodes.length === 1 && !current && (
        <p className="welcome">Toca <b>Jehová</b> para escribir su definición,<br />o <b>+</b> para agregar tu primera idea.</p>
      )}
      {galNodes.length === 0 && !current && (
        <p className="welcome">Esta galaxia está vacía.<br />Toca <b>+</b> para agregar tu primera idea.</p>
      )}

      <button className="fab" aria-label="Nuevo nodo" onClick={() => startNew()}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      </div>

      {tab === 'estudio' && (
        <StudyTab
          entries={store.entries}
          nodes={nodes}
          onSaveEntry={store.saveEntry}
          onDeleteEntry={store.deleteEntry}
          onProposeToMap={proposeToMap}
          onConceptsToMap={conceptsToMap}
          onOpenNode={openNodeFromStudy}
          onSaveNode={store.saveNode}
          toast={toast}
          review={reviewToday}
          challenge={dailyDone(store.progress)}
          onReview={() => setPlay('review')}
          onChallenge={() => setPlay('daily')}
          constancia={store.progress.constancia}
          onConstancia={() => setPlay('constancia')}
          leidos={store.progress.leidos}
          readingPlan={store.progress.plan}
          onSetPlan={(plan) => store.updateProgress((f) => ({ ...f, plan }))}
          onToggleRead={toggleRead}
          searchOpen={searchOpen}
          onCloseSearch={() => setSearchOpen(false)}
          onHome={setStudyHome}
        />
      )}
      {play === 'review' && <Review store={store} back="Estudio" onExit={() => setPlay(null)} />}
      {play === 'daily' && <Daily store={store} back="Estudio" onExit={() => setPlay(null)} />}
      {play === 'constancia' && <Constancia store={store} toast={toast} back="Estudio" onExit={() => setPlay(null)} />}
      {tab === 'juegos' && <GamesTab store={store} toast={toast} />}
      {tab === 'pendientes' && <TasksTab store={store} toast={toast} />}

      {tab !== 'mapa' && (
        <div className="top-actions">
          {tab === 'estudio' && studyHome && (
            <button className="account-btn" aria-label="Buscar en todo" onClick={() => setSearchOpen(true)}>
              <Icon d={ICONS.buscar} size={19} />
            </button>
          )}
          <button className="account-btn" aria-label={theme === 'dark' ? 'Modo claro' : 'Modo noche'} onClick={() => setMode(theme === 'dark' ? 'light' : 'dark')}>
            <Icon d={theme === 'dark' ? ICONS.sol : ICONS.luna} size={19} />
          </button>
          <button className="account-btn" aria-label="Cuenta y nube" onClick={() => setSheet('account')}>
            <Icon d={ICONS.nube} size={20} />
            <i className={'sync-dot ' + sync.status.state} />
          </button>
        </div>
      )}

      <TabBar tab={tab} onChange={(t) => { setTab(t); setSearchOpen(false) }} dots={{ juegos: store.ready && !dailyDone(store.progress), pendientes: tasksDue > 0 }} />

      {store.error && <p className="banner">{store.error}</p>}

      {current && (
        <NoteView
          node={current}
          nodes={galNodes}
          onOpen={openNote}
          onBack={back}
          onClose={closeAll}
          onEdit={() => setEditor({ node: current, isNew: false })}
          onCreateFromLink={(title) => startNew({ title })}
        />
      )}

      {sheet === 'menu' && (
        <Menu
          stats={{ nodes: galNodes.length, edges: lines, persisted, lastExport, backupStale, unfounded }}
          sync={sync}
          themeMode={mode}
          onThemeMode={setMode}
          styleMode={style}
          onStyleMode={setStyle}
          onAccount={() => setSheet('account')}
          onNew={() => startNew()}
          onPaste={() => setSheet('paste')}
          onDig={() => setSheet('dig')}
          onExport={exportAll}
          onImportFile={importFile}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'account' && <AccountSheet sync={sync} onClose={() => setSheet(null)} />}

      {sheet === 'dig' && <DigList nodes={galNodes} onOpen={(id) => { setSheet(null); openNote(id) }} onClose={() => setSheet(null)} />}

      {sheet === 'paste' && (
        <PasteSheet
          nodes={nodes}
          edges={edges}
          initialText={pasteText}
          toast={toast}
          onConfirm={confirmImport}
          onClose={() => { setSheet(null); setPasteText('') }}
        />
      )}

      {editor && (
        <NodeEditor
          key={editor.node.id}
          node={editor.node}
          isNew={editor.isNew}
          nodes={galNodes}
          allNodes={nodes}

          onSave={saveEditor}
          onCancel={() => setEditor(null)}
          onDelete={deleteFromEditor}
        />
      )}

      {reader && (
        <ChapterReader
          {...reader}
          entries={store.entries}
          read={isRead(store.progress.leidos, reader.book, reader.chapter)}
          onToggleRead={() => toggleRead(reader.book, reader.chapter, !isRead(store.progress.leidos, reader.book, reader.chapter))}
          onGo={(to) => setReader(to)}
          onPaste={(ref) => setRefOpen(ref)}
          onClose={() => setReader(null)}
        />
      )}

      {refOpen && (
        <RefSheet
          key={refOpen}
          refText={refOpen}
          entries={store.entries}
          onSave={saveVerse}
          onSaveMany={async (list) => {
            await store.saveEntries(list)
            if (readerRef.current) setRefOpen(null) // se pegó desde el lector: vuelve a él con el capítulo
          }}
          onRead={(r) => { setRefOpen(null); setReader(r) }}
          onClose={() => setRefOpen(null)}
          toast={toast}
        />
      )}

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}
