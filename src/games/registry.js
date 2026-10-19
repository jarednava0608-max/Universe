// Lista de abajo en Repasar (antes Juegos). Su objetivo es recordar textos de
// la Biblia (pedido del usuario: se quitaron Memoria Bíblica, Trivia, Con lo que estudio, Libros, Reto del
// día, Logros, los modos de Memorizar y el Memorama; no regresarlos).
//   id, título, descripción, ícono (path SVG), componente y `stat(store)` (tu avance, opcional).
// Cada componente recibe { store, toast, onExit }.
import Memorize from './Memorize.jsx'
import { learnSources } from './repaso.js'

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
]
