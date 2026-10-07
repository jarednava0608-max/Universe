import { useState } from 'react'
import { claudeFormat } from './kinds.js'
import { parseJsonLoose } from '../lib/importer.js'

// "Pegar de Claude": se pega el JSON y se llenan los campos del apartado.
export default function PasteFields({ kind, toast, onCancel, onApply }) {
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
