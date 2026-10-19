import { useState } from 'react'
import { importGuia } from '../lib/guia.js'

// La Guía de actividades de una vez: el usuario baja el número en EPUB desde jw.org y lo elige aquí.
// Se lee y se guarda solo en este teléfono. Con eso, cada reunión de entre semana ya trae el
// programa de su semana sin copiarlo ni pegarlo.
export default function GuiaImport({ toast, onDone, compact = false }) {
  const [busy, setBusy] = useState(false)
  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const done = await importGuia(await file.arrayBuffer())
      toast?.(done ? `Listo: ${done.count} semanas de ${done.titulo} ya están en este teléfono.` : 'Ese archivo no parece la Guía de actividades en EPUB.')
      if (done) onDone?.(done)
    } catch (err) {
      toast?.('No se pudo importar: ' + err.message)
    } finally {
      setBusy(false)
    }
  }
  const button = (
    <label className={(compact ? 'secondary' : 'primary') + ' as-btn' + (busy ? ' disabled' : '')}>
      {busy ? 'Leyendo la Guía…' : compact ? 'Agregar otra Guía (EPUB)' : 'Elegir la Guía en EPUB'}
      {/* Sin `accept`: el iPhone deja gris el .epub si se filtra por tipo; el archivo se revisa al leerlo. */}
      <input type="file" hidden disabled={busy} onChange={pick} />
    </label>
  )
  if (compact) return button
  return (
    <div className="bh-goal dt-import">
      <p className="bh-goal-title">El programa sin copiar ni pegar</p>
      <p className="hint">Baja la Guía de actividades en EPUB desde jw.org y elige aquí el archivo. Cada número trae el programa de unas 8 semanas. Se guarda solo en este teléfono.</p>
      {button}
    </div>
  )
}
