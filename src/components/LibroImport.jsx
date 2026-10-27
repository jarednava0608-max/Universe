import { useState } from 'react'
import { importLibro } from '../lib/libro.js'

// El libro del estudio de la congregación de una vez: el usuario baja el EPUB desde jw.org y lo elige
// aquí. Se lee y se guarda solo en este teléfono. Con eso, el estudio bíblico de la reunión ya trae
// su capítulo sin copiarlo ni pegarlo.
export default function LibroImport({ toast, onDone, compact = false }) {
  const [busy, setBusy] = useState(false)
  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const done = await importLibro(await file.arrayBuffer())
      toast?.(done ? `Listo: ${done.count} capítulos de ${done.titulo} ya están en este teléfono.` : 'Ese archivo no parece el libro del estudio en EPUB.')
      if (done) onDone?.(done)
    } catch (err) {
      toast?.('No se pudo importar: ' + err.message)
    } finally {
      setBusy(false)
    }
  }
  const button = (
    <label className={(compact ? 'secondary' : 'primary') + ' as-btn' + (busy ? ' disabled' : '')}>
      {busy ? 'Leyendo el libro…' : compact ? 'Subir el libro (EPUB)' : 'Elegir el libro en EPUB'}
      {/* Sin `accept`: el iPhone deja gris el .epub si se filtra por tipo; el archivo se revisa al leerlo. */}
      <input type="file" hidden disabled={busy} onChange={pick} />
    </label>
  )
  if (compact) return button
  return (
    <div className="bh-goal dt-import">
      <p className="bh-goal-title">El estudio sin copiar ni pegar</p>
      <p className="hint">Baja el libro del estudio (Seamos valientes al andar con Dios) en EPUB desde jw.org y elige aquí el archivo. Se guarda solo en este teléfono.</p>
      {button}
    </div>
  )
}
