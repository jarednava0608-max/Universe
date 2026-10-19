// Lista de abajo en Juegos (arriba va Repasar, lo único que se juega). Su objetivo es recordar textos de
// la Biblia (pedido del usuario: se quitaron Memoria Bíblica, Trivia, Con lo que estudio, Libros, Reto del
// día, Logros, los modos de Memorizar y el Memorama; no regresarlos).
//   id, título, descripción, ícono (path SVG), componente y `stat(store)` (tu avance, opcional).
// Cada componente recibe { store, toast, onExit }.
import Memorize from './Memorize.jsx'
import Constancia from './Constancia.jsx'
import { learnSources } from './repaso.js'
import { constanciaDays } from './progress.js'

export const GAMES = [
  {
    id: 'memorizar',
    title: 'Mis textos',
    desc: 'Los que elegiste aprender',
    icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 7h7M9 11h5',
    Component: Memorize,
    stat: (store) => {
      const n = learnSources(store.entries).length
      return n ? { text: `${n} ${n === 1 ? 'texto' : 'textos'}` } : null
    },
  },
  {
    id: 'constancia',
    title: 'Constancia',
    desc: 'Tu racha de días',
    icon: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
    Component: Constancia,
    stat: (store) => (store.progress.constancia?.start ? { text: `${constanciaDays(store.progress.constancia)} días` } : null),
  },
]
