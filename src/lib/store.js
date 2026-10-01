// Estado en memoria + escritura en IndexedDB.
import { useCallback, useEffect, useRef, useState } from 'react'
import * as db from './db.js'
import { makeEdge, makeRoot, ROOT_ID } from './model.js'
import { renameLinks } from './markdown.js'

export function useStore() {
  const [state, setState] = useState({ nodes: [], edges: [], entries: [], ready: false, error: null })
  const [rev, setRev] = useState(0)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    ;(async () => {
      try {
        let { nodes, edges, entries } = await db.loadAll()
        if (!nodes.some((n) => n.id === ROOT_ID)) {
          const root = makeRoot()
          await db.commit({ putNodes: [root] }, { track: false })
          nodes = [root, ...nodes]
        }
        setState({ nodes, edges, entries, ready: true, error: null })
      } catch (e) {
        setState((s) => ({ ...s, ready: true, error: 'No se pudo abrir el almacenamiento: ' + e.message }))
      }
    })()
  }, [])

  // Actualiza solo la memoria (lo que ya se guardó en IndexedDB).
  const mergeState = useCallback((change) => {
    const { putNodes = [], putEdges = [], delNodes = [], delEdges = [], putEntries = [], delEntries = [], clear = false } = change
    setState((s) => {
      const nodes = new Map(clear ? [] : s.nodes.map((n) => [n.id, n]))
      const edges = new Map(clear ? [] : s.edges.map((e) => [e.id, e]))
      const entries = new Map(s.entries.map((e) => [e.id, e]))
      for (const n of putNodes) nodes.set(n.id, n)
      for (const e of putEdges) edges.set(e.id, e)
      for (const id of delNodes) nodes.delete(id)
      for (const id of delEdges) edges.delete(id)
      for (const e of putEntries) entries.set(e.id, e)
      for (const id of delEntries) entries.delete(id)
      return { ...s, nodes: [...nodes.values()], edges: [...edges.values()], entries: [...entries.values()] }
    })
  }, [])

  // Cambio local: se guarda, se anota para subir a la nube y avisa (rev) a la sincronización.
  const apply = useCallback(
    async (change) => {
      await db.commit(change)
      mergeState(change)
      setRev((r) => r + 1)
    },
    [mergeState],
  )

  const saveNode = useCallback(
    async (node) => {
      const { nodes } = stateRef.current
      const prev = nodes.find((n) => n.id === node.id)
      const next = { ...node, updatedAt: Date.now() }
      const putNodes = [next]
      // Si cambió el título, actualiza los [[enlaces]] que apuntaban al viejo.
      if (prev && prev.title !== next.title) {
        for (const n of nodes) {
          if (n.id === next.id) continue
          const note = renameLinks(n.note, prev.title, next.title)
          if (note !== n.note) putNodes.push({ ...n, note, updatedAt: Date.now() })
        }
        next.note = renameLinks(next.note, prev.title, next.title)
      }
      await apply({ putNodes })
      return next
    },
    [apply],
  )

  const deleteNode = useCallback(
    async (id) => {
      if (id === ROOT_ID) return
      const delEdges = stateRef.current.edges.filter((e) => e.source === id || e.target === id).map((e) => e.id)
      await apply({ delNodes: [id], delEdges })
    },
    [apply],
  )

  const addEdge = useCallback(
    async ({ source, target, rel }) => {
      if (!source || !target || source === target) return null
      const edge = makeEdge({ source, target, rel })
      const dup = stateRef.current.edges.find((e) => e.source === edge.source && e.target === edge.target && e.rel === edge.rel)
      if (dup) return dup
      await apply({ putEdges: [edge] })
      return edge
    },
    [apply],
  )

  const deleteEdge = useCallback((id) => apply({ delEdges: [id] }), [apply])

  const applyImport = useCallback(
    (plan) =>
      apply({
        clear: plan.replace,
        putNodes: [...plan.newNodes, ...plan.updatedNodes.map((u) => u.after)],
        putEdges: plan.newEdges,
        putEntries: plan.entries ?? [],
      }),
    [apply],
  )

  // Pestaña Estudio.
  const saveEntry = useCallback(async (entry) => {
    const next = { ...entry, updatedAt: Date.now() }
    await apply({ putEntries: [next] })
    return next
  }, [apply])
  const deleteEntry = useCallback((id) => apply({ delEntries: [id] }), [apply])
  const saveEntries = useCallback((list) => apply({ putEntries: list.map((e) => ({ ...e, updatedAt: Date.now() })) }), [apply])
  const deleteEntries = useCallback((ids) => apply({ delEntries: ids }), [apply])

  return { ...state, rev, mergeRemote: mergeState, saveEntry, deleteEntry, saveEntries, deleteEntries, saveNode, deleteNode, addEdge, deleteEdge, applyImport }
}
