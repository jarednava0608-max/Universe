import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from './lib/store.js'
import { useSync } from './lib/useSync.js'
import { useTheme } from './lib/theme.js'
import { getMeta, loadAll, requestPersistence, setMeta } from './lib/db.js'
import { buildExport, planImport } from './lib/importer.js'
import { makeNode } from './lib/model.js'
import Graph from './components/Graph.jsx'
import Search from './components/Search.jsx'
import NoteView from './components/NoteView.jsx'
import NodeEditor from './components/NodeEditor.jsx'
import PasteSheet from './components/PasteSheet.jsx'
import Menu from './components/Menu.jsx'
import AccountSheet from './components/AccountSheet.jsx'
import TabBar from './components/TabBar.jsx'
import { dailyDone } from './games/daily.js'
import Icon, { ICONS } from './components/Icon.jsx'
import StudyTab from './study/StudyTab.jsx'
import GamesTab from './games/GamesTab.jsx'
import RefSheet from './components/RefSheet.jsx'
import { OPEN_REF } from './lib/verses.js'
import { SEEDS, planSeed } from './lib/seeds.js'
import { parseRef } from './lib/bible.js'
import { isPubRef } from './lib/pubs.js'
import { planVerseSave, cleanSavedVerses } from './lib/verseSave.js'

let seedsRunning = false

const LAST_NODE = 'universe-last-node'

export default function App() {
  const store = useStore()
  const sync = useSync(store)

  // Guardar un texto en Mi Biblia también lo manda a Memorizar y crea su nodo (una sola vez por cita).
  async function saveVerse(entry) {
    await store.saveEntry(entry)
    const { memoria, node } = planVerseSave(entry, store.nodes, store.entries)
    if (memoria) await store.saveEntry(memoria)
    if (node) await store.saveNode(node)
  }
  const { mode, theme, setMode } = useTheme()
  const { nodes, edges } = store
  const graph = useRef()

  const [tab, setTab] = useState('mapa') // 'mapa' | 'estudio' | 'juegos'
  const [stack, setStack] = useState([]) // notas abiertas (para volver atrás)
  const [focusId, setFocusId] = useState(null)
  // Último nodo que viste: el mapa abre ahí (preferencia de este teléfono).
  const [startNode] = useState(() => { try { return localStorage.getItem(LAST_NODE) } catch { return null } })
  const [editor, setEditor] = useState(null)
  const [sheet, setSheet] = useState(null) // 'menu' | 'paste' | 'account'
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
  const [refOpen, setRefOpen] = useState(null)
  useEffect(() => {
    const onOpen = (e) => setRefOpen(e.detail)
    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="https://wol.jw.org/es/wol/"]')
      if (!a || a.dataset.direct) return
      const ref = a.textContent.trim()
      if (!parseRef(ref) && !isPubRef(ref)) return
      e.preventDefault()
      e.stopPropagation()
      setRefOpen(ref)
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
          for (const id of del) await store.deleteNode(id)
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
    const s = stackRef.current
    if (s.at(-1) !== id) {
      const next = [...s, id]
      stackRef.current = next
      setStack(next)
      history.pushState({ note: id, depth: next.length }, '')
    }
    setFocusId(id)
    graph.current?.focus(id)
    try { localStorage.setItem(LAST_NODE, id) } catch { /* sin almacenamiento */ }
  }, [])
  const back = useCallback(() => history.back(), [])
  const closeAll = useCallback(() => {
    const n = stack.length
    if (n) history.go(-n)
  }, [stack.length])

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
    setEditor({ node: makeNode({ origin: 'propio', ...partial, title: partial.title ?? '' }), isNew: true })
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

  function openNodeFromStudy(id) {
    setTab('mapa')
    setTimeout(() => openNote(id), 50)
  }

  if (!store.ready) return <div className="boot" />

  return (
    <div className="app">
      <div className={'tab-map' + (tab === 'mapa' ? '' : ' tab-hidden')}>
      <Graph
        ref={graph}
        nodes={nodes}
        edges={edges}
        focusId={focusId}
        startId={startNode}
        theme={theme}
        onNodeTap={openNote}
        onBackgroundTap={() => setFocusId(null)}
      />

      <Search nodes={nodes} onPick={openNote} onMenu={() => setSheet('menu')} />

      {nodes.length === 1 && !current && (
        <p className="welcome">Toca <b>Jehová</b> para escribir su definición,<br />o <b>+</b> para agregar tu primera idea.</p>
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
          onOpenNode={openNodeFromStudy}
          onSaveNode={store.saveNode}
          toast={toast}
        />
      )}
      {tab === 'juegos' && <GamesTab store={store} toast={toast} />}

      {tab !== 'mapa' && (
        <div className="top-actions">
          <button className="account-btn" aria-label={theme === 'dark' ? 'Modo claro' : 'Modo noche'} onClick={() => setMode(theme === 'dark' ? 'light' : 'dark')}>
            <Icon d={theme === 'dark' ? ICONS.sol : ICONS.luna} size={19} />
          </button>
          <button className="account-btn" aria-label="Cuenta y nube" onClick={() => setSheet('account')}>
            <Icon d={ICONS.nube} size={20} />
            <i className={'sync-dot ' + sync.status.state} />
          </button>
        </div>
      )}

      <TabBar tab={tab} onChange={setTab} dots={{ juegos: store.ready && !dailyDone(store.progress) }} />

      {store.error && <p className="banner">{store.error}</p>}

      {current && (
        <NoteView
          node={current}
          nodes={nodes}
          onOpen={openNote}
          onBack={back}
          onClose={closeAll}
          onEdit={() => setEditor({ node: current, isNew: false })}
          onCreateFromLink={(title) => startNew({ title })}
        />
      )}

      {sheet === 'menu' && (
        <Menu
          stats={{ nodes: nodes.length, edges: edges.length, persisted, lastExport }}
          sync={sync}
          themeMode={mode}
          onThemeMode={setMode}
          onAccount={() => setSheet('account')}
          onNew={() => startNew()}
          onPaste={() => setSheet('paste')}
          onExport={exportAll}
          onImportFile={importFile}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'account' && <AccountSheet sync={sync} onClose={() => setSheet(null)} />}

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
          nodes={nodes}

          onSave={saveEditor}
          onCancel={() => setEditor(null)}
          onDelete={deleteFromEditor}
        />
      )}

      {refOpen && <RefSheet key={refOpen} refText={refOpen} entries={store.entries} onSave={saveVerse} onSaveMany={store.saveEntries} onClose={() => setRefOpen(null)} toast={toast} />}

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}
