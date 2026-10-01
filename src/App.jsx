import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from './lib/store.js'
import { useSync } from './lib/useSync.js'
import { getMeta, requestPersistence, setMeta } from './lib/db.js'
import { buildExport } from './lib/importer.js'
import { makeNode } from './lib/model.js'
import Graph from './components/Graph.jsx'
import Search from './components/Search.jsx'
import NoteView from './components/NoteView.jsx'
import NodeEditor from './components/NodeEditor.jsx'
import PasteSheet from './components/PasteSheet.jsx'
import Menu from './components/Menu.jsx'
import AccountSheet from './components/AccountSheet.jsx'

export default function App() {
  const store = useStore()
  const sync = useSync(store)
  const { nodes, edges } = store
  const graph = useRef()

  const [stack, setStack] = useState([]) // notas abiertas (para volver atrás)
  const [focusId, setFocusId] = useState(null)
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

  useEffect(() => {
    requestPersistence().then(setPersisted)
    getMeta('lastExport').then((v) => v && setLastExport(v)).catch(() => {})
  }, [])

  // El gesto de "atrás" del navegador cierra la nota actual.
  useEffect(() => {
    const onPop = () => setStack((s) => s.slice(0, -1))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openNote = useCallback((id) => {
    setStack((s) => (s.at(-1) === id ? s : [...s, id]))
    history.pushState({ note: id }, '')
    setFocusId(id)
    graph.current?.focus(id)
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
    const json = JSON.stringify(buildExport(nodes, edges), null, 2)
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

  if (!store.ready) return <div className="boot" />

  return (
    <div className="app">
      <Graph
        ref={graph}
        nodes={nodes}
        edges={edges}
        focusId={focusId}
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

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}
