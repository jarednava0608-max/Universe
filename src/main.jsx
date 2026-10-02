import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Evita que iOS haga zoom a toda la página: el zoom es solo del grafo.
document.addEventListener('gesturestart', (e) => e.preventDefault())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

// Precarga el editor de Notas (así también queda guardado para usarlo sin conexión).
window.addEventListener('load', () => setTimeout(() => import('./study/RichNote.jsx'), 2500))
