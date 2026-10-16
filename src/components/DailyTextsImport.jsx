import { useState } from 'react'
import { importDailyTexts } from '../lib/dailytexts.js'

// El texto diario de todo el año de una vez: el usuario baja "Examinemos las Escrituras todos los días" en
// EPUB desde jw.org y lo elige aquí. Se lee y se guarda solo en este teléfono (no se sube a la nube); en
// otro teléfono se vuelve a elegir el archivo. Con eso, Hoy ya trae el texto de cada día sin pegarlo.
export default function DailyTextsImport({ toast, onDone }) {
  const [busy, setBusy] = useState(false)
  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const done = await importDailyTexts(await file.arrayBuffer())
      toast?.(done ? `Listo: los textos de ${done.year} ya están en este teléfono. Ya no tienes que pegarlos.` : 'Ese archivo no parece "Examinemos las Escrituras todos los días" en EPUB.')
      if (done) onDone?.(done)
    } catch (err) {
      toast?.('No se pudo importar: ' + err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="bh-goal dt-import">
      <p className="bh-goal-title">El texto de cada día, sin copiar ni pegar</p>
      <p className="hint">Baja "Examinemos las Escrituras todos los días" en EPUB desde jw.org y elige aquí el archivo, una vez al año. Se guarda solo en este teléfono.</p>
      <label className={'primary as-btn' + (busy ? ' disabled' : '')}>
        {busy ? 'Leyendo el folleto…' : 'Elegir el archivo EPUB'}
        {/* Sin `accept`: el iPhone deja gris el .epub si se filtra por tipo; el archivo se revisa al leerlo. */}
        <input type="file" hidden disabled={busy} onChange={pick} />
      </label>
    </div>
  )
}
