import { GameScreen } from './ui.jsx'

// Espacio reservado para Memoria Bíblica (171 personajes, 8 mundos, 4 modos,
// línea del tiempo, mapa y repaso diario). Hoy vive en otro despliegue de Vercel;
// su código se integra aquí más adelante (ver CLAUDE.md).
export default function MemoriaBiblica({ onExit }) {
  return (
    <GameScreen title="Memoria Bíblica" onExit={onExit}>
      <div className="soon">
        <div className="soon-badge">Próximamente</div>
        <h2>Memoria Bíblica</h2>
        <p>171 personajes · 8 mundos · 4 modos</p>
        <p className="hint center">Línea del tiempo, mapa y repaso diario. Su espacio ya está listo aquí; en cuanto me pases el código, lo integro.</p>
      </div>
    </GameScreen>
  )
}
