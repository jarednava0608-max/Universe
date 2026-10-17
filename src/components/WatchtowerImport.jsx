import { useState } from 'react'
import { importWatchtower } from '../lib/watchtower.js'

// La Atalaya de estudio de una vez: el usuario baja el número en EPUB desde jw.org y lo elige aquí.
// Se lee y se guarda solo en este teléfono (no se sube a la nube). Con eso, cada La Atalaya ya trae
// el artículo de su semana sin copiarlo ni pegarlo.
export default function WatchtowerImport({ toast, onDone, compact = false }) {
  const [busy, setBusy] = useState(false)
  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const done = await importWatchtower(await file.arrayBuffer())
      toast?.(done ? `Listo: ${done.count} artículos de ${done.titulo} ya están en este teléfono.` : 'Ese archivo no parece La Atalaya (edición de estudio) en EPUB.')
      if (done) onDone?.(done)
    } catch (err) {
      toast?.('No se pudo importar: ' + err.message)
    } finally {
      setBusy(false)
    }
  }
  const button = (
    <label className={(compact ? 'secondary' : 'primary') + ' as-btn' + (busy ? ' disabled' : '')}>
      {busy ? 'Leyendo la revista…' : compact ? 'Agregar otra revista (EPUB)' : 'Elegir el archivo EPUB'}
      {/* Sin `accept`: el iPhone deja gris el .epub si se filtra por tipo; el archivo se revisa al leerlo. */}
      <input type="file" hidden disabled={busy} onChange={pick} />
    </label>
  )
  if (compact) return button
  return (
    <div className="bh-goal dt-import">
      <p className="bh-goal-title">La Atalaya sin copiar ni pegar</p>
      <p className="hint">Baja La Atalaya (edición de estudio) en EPUB desde jw.org y elige aquí el archivo. Cada número trae los artículos de varias semanas. Se guarda solo en este teléfono.</p>
      {button}
    </div>
  )
}
