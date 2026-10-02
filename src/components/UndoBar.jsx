import { useRef, useState } from 'react'

// Borrar con "Deshacer": borra al momento y durante 5 s ofrece volver a guardarlo tal cual.
export function useUndoDelete(onDelete, onRestore) {
  const [pending, setPending] = useState(null)
  const timer = useRef(0)
  async function remove(item) {
    await onDelete(item)
    setPending(item)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setPending(null), 5000)
  }
  async function undo() {
    const item = pending
    setPending(null)
    if (item) await onRestore(item)
  }
  return { pending, remove, undo }
}

export default function UndoBar({ text, onUndo, inGame }) {
  return (
    <div className={'undo-bar' + (inGame ? ' in-game' : '')}>
      <span>{text}</span>
      <button onClick={onUndo}>Deshacer</button>
    </div>
  )
}
