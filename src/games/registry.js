// Lista de juegos de la pestaña Juegos.
// Para agregar o cambiar un juego basta con editar esta lista:
//   id, título, descripción, ícono (path SVG), componente y `stat(store)` (tu avance, opcional).
// Cada componente recibe { store, toast, onExit }.
import MemoriaBiblica from './MemoriaBiblica.jsx'
import Trivia from './Trivia.jsx'
import Memorize from './Memorize.jsx'
import StudyGames from './StudyGames.jsx'
import Books from './Books.jsx'
import { CHARACTERS } from './memoria/characters.js'
import { KEY } from './memoria/logic.js'
import { buildCards, verseSources } from './logic.js'
import { dueCount } from './progress.js'

const srsOf = (store) => store.progress.srs ?? {}
const bestOf = (store, k) => store.progress.best?.[k] ?? 0

export const GAMES = [
  {
    id: 'memoria-biblica',
    title: 'Memoria Bíblica',
    desc: '128 personajes, 8 mundos y retos',
    icon: 'M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01z',
    Component: MemoriaBiblica,
    stat: (store) => {
      const known = CHARACTERS.filter((c) => (srsOf(store)[KEY(c)]?.box ?? 0) >= 1).length
      return known ? { text: `${known}/${CHARACTERS.length}` } : null
    },
  },
  {
    id: 'trivia',
    title: 'Trivia de preguntas',
    desc: 'Preguntas que pegas desde Claude',
    icon: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    Component: Trivia,
    stat: (store) => {
      const n = store.entries.filter((e) => e.kind === 'trivia').length
      return n ? { text: `${n} ${n === 1 ? 'pregunta' : 'preguntas'}` } : null
    },
  },
  {
    id: 'memorizar',
    title: 'Memorizar textos',
    desc: 'Ocultar, iniciales, escribir y ordenar',
    icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 7h7M9 11h5',
    Component: Memorize,
    stat: (store) => {
      const v = verseSources(store.entries)
      const m = v.filter((x) => (x.fields.nivel ?? 0) >= 3).length
      return v.length ? { text: `${m}/${v.length}` } : null
    },
  },
  {
    id: 'mi-estudio',
    title: 'Con lo que estudio',
    desc: 'Juegos con tus nodos y notas',
    icon: 'M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M5 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M19 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6.5 6.5l3.7 3.7M17.3 7.2l-3.4 3.2',
    Component: StudyGames,
    stat: (store) => {
      const keys = buildCards(store.nodes, store.entries).map((c) => 'c:' + c.id)
      const due = dueCount(keys, srsOf(store))
      return due ? { text: `${due} hoy`, due: true } : null
    },
  },
  {
    id: 'libros',
    title: 'Libros de la Biblia',
    desc: 'Los 66 libros en orden y por sección',
    icon: 'M4 5a2 2 0 0 1 2-2h3v18H6a2 2 0 0 1-2-2zM9 3h4v18H9zM14.5 4.2l3.4-.9 3 16.4-3.4.9z',
    Component: Books,
    stat: (store) => (bestOf(store, 'libros') ? { text: `${bestOf(store, 'libros')} %` } : null),
  },
]
