// Paquetes que el usuario pidió agregar o cambiar en su mapa. Cada uno se aplica una sola vez por
// teléfono (marca `seed:<id>` en meta), en orden:
// - data.nodes: se agregan; si el nodo ya existe solo se le añade la información (como "Pegar conocimiento").
// - replace: [{ title, note, ifNote, keepIfEdited }] cambia la nota solo si sigue igual a ifNote (el usuario
//   no la editó); si la editó, la nueva se agrega abajo sin borrar nada (o se deja igual con keepIfEdited).
// - remove: [{ title, ifNote }] borra el nodo solo si su nota sigue igual a ifNote.
import { planImport } from './importer.js'
import { makeNode, normKey } from './model.js'
import { anyRefKey, makeBibleEntry } from './verses.js'
import { TRIVIA_JEREMIAS_38_39 } from './seedTrivia.js'
import { JEREMIAS_38_39 } from './seedVerses.js'

// 1) Lo que estudiamos de Jeremías 38 y 39 (primera versión).
const V1 = [
    {
      title: 'Jeremías 38 y 39',
      note: 'La caída de Jerusalén vista como película. [[Jeremías]] dice la verdad aunque le cueste, [[Sedequías]] sabe lo correcto pero lo paraliza el miedo, y [[Ebed-melec]] actúa cuando nadie más lo hace. Termina con la destrucción de Jerusalén y el [[Exilio y los 70 años]].\n\nLecciones: [[Integridad]], [[Valor]], [[Gratitud]] y [[Carácter]].',
    },
    {
      title: 'Jeremías',
      note: 'Profeta que eligió la cisterna de lodo antes que cambiar el mensaje (Jeremías 38:1-6). Para los príncipes era un traidor que desanimaba a los soldados; para Jehová, un mensajero fiel.\n\nAha: tenía la salida fácil (decir lo que querían oír) y no la tomó. Eso es [[Integridad]].\n\nNo tenía dinero ni poder; su único "pago" para [[Ebed-melec]] fue el mensaje de Jehová (Jeremías 39:15-18).',
    },
    {
      title: 'Sedequías',
      note: 'Rey que sabía lo correcto y no lo hizo. Le pidió la verdad a [[Jeremías]] (Jeremías 38:14), pero le dio miedo lo que dirían los judíos que se habían pasado a Babilonia (Jeremías 38:19).\n\nAha: no le faltaron respuestas de Jehová, le faltó [[Valor]]. El miedo al qué dirán le costó sus hijos, sus ojos y su reino (Jeremías 39:6, 7).\n\nLección: cuando decides por miedo a que te juzguen, pierdes justo lo que querías proteger.',
    },
    {
      title: 'Ebed-melec',
      note: 'Funcionario etíope del palacio, un extranjero. Defendió a [[Jeremías]] delante del rey cuando todos se callaban (Jeremías 38:7-9).\n\nDetalle: le bajó trapos viejos para que las sogas no lo lastimaran (Jeremías 38:11-13). Justicia con tacto.\n\nJehová le prometió protegerlo "porque confiaste en mí" (Jeremías 39:15-18).\n\nAha: el único con la brújula moral intacta era el forastero.',
    },
    {
      title: 'Integridad',
      note: 'Ser leal a [[Jehová]] y a sus normas a cualquier costo, aunque estés solo y nadie te vea.\n\nSolo se prueba cuando hacer lo correcto te cuesta algo; si es fácil, es conveniencia.\n\nEjemplos: [[Jeremías]] y Job: "Hasta que muera, no renunciaré a mi integridad" (Job 27:5).\n\nReto diario: la excusa fácil ("hubo tráfico") o decir "me equivoqué".',
    },
    {
      title: 'Valor',
      note: 'No es no tener miedo, sino hacer lo correcto aunque tengas miedo, confiando en Jehová.\n\n[[Jeremías]] y [[Ebed-melec]] lo tuvieron; a [[Sedequías]] le faltó.',
    },
    {
      title: 'Gratitud',
      note: 'La gratitud es la memoria del corazón. No es decir "gracias" por costumbre, sino pensar en lo que le costó al otro ayudarte.\n\nColosenses 3:15: "demuestren ser agradecidos". La falta de gratitud es una señal de los últimos días (2 Timoteo 3:2).\n\nCuando alguien te ayude, pregúntate:\n- ¿Qué le costó (tiempo, descanso, energía)?\n- ¿Tenía obligación de hacerlo?\n- ¿Qué problema tendría yo si no lo hubiera hecho?\n\nEjemplo: [[Ebed-melec]] y [[Jeremías]].',
    },
    {
      title: 'Carácter',
      note: 'El carácter es lo que eres en la oscuridad; la reputación es lo que piensan de ti en la luz.\n\nSe construye poco a poco: pensamiento → acción → hábito → carácter → destino. Lo que uno siembra, eso cosecha (Gálatas 6:7). Por eso importa lo que dejas entrar a tu mente (Filipenses 4:8).\n\nSe nota en la [[Integridad]] y la [[Gratitud]].',
    },
    {
      title: 'Exilio y los 70 años',
      note: 'Babilonia se llevó a los judíos en varias etapas. Al final quemó Jerusalén y el templo (Jeremías 39:8).\n\nSegún las publicaciones, Jerusalén cayó en 607 a.e.c. y los 70 años de desolación (Jeremías 25:11) terminaron en 537 a.e.c. La tierra "pagó sus sábados" esos 70 años (2 Crónicas 36:21).\n\nMientras tanto, Daniel ya estaba en Babilonia y Ezequiel profetizaba allá: la misma historia vista desde distintos lugares.',
    },
]
const v1Note = (title) => V1.find((n) => n.title === title).note

// 2) Jeremías como biografía; lo estudiado pasa a un nodo por capítulo.
const BIO_JEREMIAS = `Profeta de Jehová y escritor de los libros de Jeremías y Lamentaciones; según las publicaciones, también escribió 1 y 2 Reyes. Era hijo de Hilquías, un sacerdote de Anatot, una ciudad de sacerdotes en el territorio de Benjamín, a menos de 5 kilómetros de Jerusalén (Jeremías 1:1).

## Su nombramiento
Jehová lo nombró profeta en 647 a.e.c., el año 13 del rey Josías (Jeremías 1:2). Le dijo que ya lo conocía desde antes de formarlo en el vientre de su madre (Jeremías 1:5). Jeremías se sentía incapaz: dijo que no sabía hablar porque solo era un muchacho (Jeremías 1:6). Pero Jehová le prometió estar con él y puso sus palabras en su boca (Jeremías 1:8, 9).

## Los reyes de su tiempo
Profetizó durante el reinado de los últimos reyes de Judá: Josías, Jehoacaz, Jehoiaquim, Joaquín y [[Sedequías]] (Jeremías 1:2, 3). Jehová le pidió que no se casara ni tuviera hijos, por la destrucción que venía sobre el país (Jeremías 16:2).

## Su mensaje
Advirtió que, por la idolatría y la maldad del pueblo, Babilonia destruiría Jerusalén y el templo, y que el país quedaría desolado 70 años (Jeremías 25:11). También anunció esperanza: después de esos 70 años, el pueblo volvería (Jeremías 29:10), y Jehová haría un nuevo pacto (Jeremías 31:31-34). Ver [[Exilio y los 70 años]].

Muchas veces enseñó con ejemplos que la gente podía ver: un cinturón de lino echado a perder (Jeremías 13:1-11), el alfarero con el barro (Jeremías 18:1-6), una jarra rota (Jeremías 19:10, 11) y un yugo en su cuello (Jeremías 27:2).

## La oposición
- Los hombres de su propio pueblo, Anatot, quisieron matarlo (Jeremías 11:21).
- El sacerdote Pasjur lo golpeó y lo puso en el cepo (Jeremías 20:2).
- Lo quisieron matar por predicar en el templo, y Ahicam lo protegió (Jeremías 26:8, 24).
- El rey Jehoiaquim quemó el rollo de sus profecías; Jeremías se las volvió a dictar a su secretario Baruc (Jeremías 36:23, 32).
- Lo encarcelaron acusándolo de pasarse a los babilonios (Jeremías 37:13-15).
- Lo echaron en una cisterna de lodo para que muriera, y [[Ebed-melec]] lo rescató. Ver [[Jeremías 38]].

## Sus sentimientos
Era un hombre sensible. Lloraba por su pueblo (Jeremías 9:1), y a veces se desanimó tanto que quiso dejar de hablar en nombre de Jehová. Pero no pudo: sentía la palabra de Jehová como un fuego encerrado en sus huesos (Jeremías 20:9). Por eso es un ejemplo de [[Valor]] e [[Integridad]].

## La caída de Jerusalén
Durante el asedio, compró un campo en Anatot como señal de que el pueblo volvería a su tierra (Jeremías 32:7-15). En 607 a.e.c. Babilonia destruyó Jerusalén. Nabucodonosor ordenó que lo trataran bien, y Jeremías se quedó con el gobernador Gedalías (Jeremías 40:6). Ver [[Jeremías 39]].

## En Egipto
Mataron a Gedalías, y los judíos que quedaban decidieron huir a Egipto aunque Jeremías les dijo de parte de Jehová que no lo hicieran (Jeremías 42:19). Se lo llevaron a él y a Baruc (Jeremías 43:6, 7). En Tahpanhés siguió profetizando que Nabucodonosor llegaría hasta allá (Jeremías 43:8-10). La Biblia no dice cuándo ni dónde murió; su libro llega hasta alrededor de 580 a.e.c.

## Lo que aprendo de él
Jehová puede usar a alguien que se siente incapaz. Hacer lo correcto puede costar, pero Jehová no abandona a los que le son fieles: Jeremías sobrevivió a la destrucción de Jerusalén, cuando los que lo persiguieron no.`

const CAP_38 = `Babilonia tiene sitiada Jerusalén. [[Jeremías]] le dice al pueblo que el que se rinda a los babilonios vivirá (Jeremías 38:2).

## La acusación
Los príncipes dicen que eso desanima a los soldados y piden que lo maten (Jeremías 38:4). Para ellos, Jeremías no era un profeta sino un traidor en plena guerra.

Aha: desde la ley militar, lo que decía parecía alta traición. Por eso la tensión estalla.

## La cisterna
El rey [[Sedequías]] no lo defiende y lo deja en manos de los príncipes (Jeremías 38:5). Lo echan en una cisterna sin agua, llena de lodo, para que muera de hambre (Jeremías 38:6).

## El rescate
[[Ebed-melec]], un etíope que trabajaba en el palacio, acusa delante del rey a los que lo hicieron (Jeremías 38:7-9). Con 30 hombres saca a Jeremías, y le baja trapos viejos para que las sogas no le lastimen las axilas (Jeremías 38:10-13).

Aha: el único con la brújula moral intacta era un extranjero. Y no solo lo salvó: pensó en su dolor. Justicia con tacto.

## La última reunión con Sedequías
El rey lo manda llamar en secreto y le pide que no le oculte nada (Jeremías 38:14). Jeremías le dice: si te rindes, vivirás tú y la ciudad no será quemada (Jeremías 38:17). Sedequías confiesa que le da miedo que los judíos que se pasaron a Babilonia se burlen de él (Jeremías 38:19).

Aha: no le faltaron respuestas de Jehová, le faltó [[Valor]]. El miedo al qué dirán pesó más que salvar a su familia.

## Lecciones
- Jeremías: la verdad no se negocia por comodidad. Eligió el lodo antes que cambiar el mensaje. Ver [[Integridad]].
- Sedequías: cuando decides por miedo a que te juzguen, pierdes justo lo que querías proteger.
- Ebed-melec: lo correcto es correcto aunque seas el único que lo hace.
- El carácter es lo que eres cuando nadie te ve. Ver [[Carácter]].`

const CAP_39 = `## Cae Jerusalén
En 607 a.e.c., después de un asedio de 18 meses, Babilonia rompe la muralla de Jerusalén (Jeremías 39:1, 2).

## El final de Sedequías
[[Sedequías]] huye de noche, pero lo alcanzan en las llanuras de Jericó. Ve cómo matan a sus hijos, le sacan los ojos y lo llevan encadenado a Babilonia (Jeremías 39:4-7).

Aha: por no hacer caso del último consejo de [[Jeremías]], perdió exactamente lo que quería proteger.

## La ciudad destruida
Queman la casa del rey y las casas del pueblo, y derriban los muros (Jeremías 39:8); también queman el templo (Jeremías 52:13). Llevan cautivo al pueblo a Babilonia y solo dejan a algunos de los más pobres, con viñas y campos (Jeremías 39:9, 10).

## Jeremías protegido
Nabucodonosor ordena que cuiden a Jeremías y le den lo que pida (Jeremías 39:11, 12). Lo sacan del Patio de la Guardia y lo dejan con Gedalías (Jeremías 39:14).

## La promesa a Ebed-melec
Jehová le manda decir a [[Ebed-melec]] que lo va a rescatar y que no morirá a espada, porque confió en él (Jeremías 39:15-18).

Aha: Jeremías no tenía nada con qué pagarle a quien lo sacó del pozo, pero Jehová sí. El pago fue que Jehová lo protegió en medio de la destrucción. Ver [[Gratitud]].

## El exilio
Comienzan los 70 años de desolación. Daniel ya estaba en Babilonia desde antes y Ezequiel profetizaba allá: la misma historia vista desde distintos lugares. Ver [[Exilio y los 70 años]].`

// El paquete 2 ya no se aplica en teléfonos nuevos: el usuario pidió quitarlo porque no quiere en su
// mapa cosas que no haya leído. Se guarda solo para reconocerlo y deshacerlo (paquete 3).
export const SEED_BIO = {
  id: 'jeremias-biografia-y-capitulos',
  replace: [{ title: 'Jeremías', ifNote: v1Note('Jeremías'), note: BIO_JEREMIAS }],
  remove: [{ title: 'Jeremías 38 y 39', ifNote: v1Note('Jeremías 38 y 39') }],
  data: { nodes: [{ title: 'Jeremías 38', note: CAP_38 }, { title: 'Jeremías 39', note: CAP_39 }] },
}

// 4) Un nodo por capítulo, solo con el texto que el usuario pegó y lo que estudiamos (aprobado en el chat),
//    y el texto de los dos capítulos guardado en su "Mi Biblia".
const CAPITULO_38 = `## Lo que pasa
- Los príncipes oyen a [[Jeremías]] decir que el que se quede en la ciudad morirá y el que se rinda ante los caldeos seguirá viviendo (Jeremías 38:1-3).
- Le piden al rey que lo maten, "porque con las cosas que dice está desmoralizando a los soldados" (Jeremías 38:4). [[Sedequías]] responde: "Miren, ahí lo tienen, está en sus manos" (Jeremías 38:5).
- Lo arrojan en la cisterna de Malkiya, en el Patio de la Guardia. No había agua, solo fango, y empezó a hundirse (Jeremías 38:6).
- [[Ebed-melec]] el etíope le dice al rey que lo que le hicieron "es muy cruel" (Jeremías 38:7-9). El rey le ordena llevarse a 30 hombres (Jeremías 38:10). Le bajan trapos viejos para que se los ponga entre las axilas y las sogas, y lo sacan (Jeremías 38:11-13).
- Sedequías lo manda traer en secreto: "Tengo que preguntarte algo. No me ocultes nada" (Jeremías 38:14). Jeremías le dice que si se rinde seguirá con vida y la ciudad no será quemada (Jeremías 38:17). Sedequías responde: "Les tengo miedo a los judíos que se han pasado al bando de los caldeos" (Jeremías 38:19).
- Sedequías le pide que no cuente nada de la conversación. Jeremías se queda en el Patio de la Guardia hasta que conquistan Jerusalén (Jeremías 38:24-28).

## Lo que estudiamos
- Para los príncipes, Jeremías no era un profeta sino alguien que desanimaba a los soldados en plena guerra. Por eso la tensión estalla.
- Jeremías tenía la salida fácil, decir lo que querían oír, y no la tomó. Eligió el lodo antes que cambiar el mensaje. Ver [[Integridad]].
- Ebed-melec: el único con la brújula moral intacta era el forastero. Y lo de los trapos fue justicia con tacto.
- Sedequías: no le faltaron respuestas de Jehová, le faltó [[Valor]]. El miedo al qué dirán pesó más.`

const CAPITULO_39 = `## Lo que pasa
- En el noveno año de Sedequías, Nabucodonosor rodea Jerusalén (Jeremías 39:1). En el año 11 atraviesan la muralla (Jeremías 39:2).
- [[Sedequías]] huye de noche, pero lo alcanzan en las llanuras desérticas de Jericó. En Riblá matan a sus hijos ante sus ojos, lo ciegan y lo llevan con grilletes a Babilonia (Jeremías 39:4-7).
- Queman la casa del rey y las casas del pueblo, y demuelen las murallas (Jeremías 39:8). Nebuzaradán lleva al destierro al resto de la gente y deja en Judá a algunos de los más pobres, con viñas y campos (Jeremías 39:9, 10).
- Nabucodonosor ordena sobre [[Jeremías]]: "Ve a buscarlo y cuida de él; no le hagas daño y dale todo lo que te pida" (Jeremías 39:11, 12). Lo sacan del Patio de la Guardia y lo entregan a Guedalías (Jeremías 39:14).
- Jehová le manda decir a [[Ebed-melec]]: "Yo te rescataré ese día", "no caerás a espada", "porque confiaste en mí" (Jeremías 39:15-18).

## Lo que estudiamos
- Sedequías perdió exactamente lo que quería proteger: lo último que vio fue cómo mataban a sus hijos.
- Jeremías no tenía cómo pagarle a Ebed-melec, pero su Dios sí: lo protegió en medio de la destrucción. Ver [[Gratitud]].
- Así empieza el exilio. Ver [[Exilio y los 70 años]].`

export const SEEDS = [
  { id: 'jeremias-38-39', data: { nodes: V1 } },
  // 3) Volver a como estaba (solo lo que el usuario no editó).
  {
    id: 'jeremias-volver-a-v1',
    replace: [{ title: 'Jeremías', ifNote: BIO_JEREMIAS, note: v1Note('Jeremías'), keepIfEdited: true }],
    remove: [
      { title: 'Jeremías 38', ifNote: CAP_38 },
      { title: 'Jeremías 39', ifNote: CAP_39 },
    ],
    restore: [V1.find((n) => n.title === 'Jeremías 38 y 39')],
  },
  {
    id: 'jeremias-38-y-39-por-capitulo',
    data: { nodes: [{ title: 'Jeremías 38', note: CAPITULO_38 }, { title: 'Jeremías 39', note: CAPITULO_39 }] },
    verses: JEREMIAS_38_39,
  },
  // 5) Preguntas de Trivia sobre Jeremías 38 y 39 (solo del texto bíblico que pegó el usuario).
  { id: 'trivia-jeremias-38-39', trivia: TRIVIA_JEREMIAS_38_39 },
]

const same = (a, b) => String(a ?? '').replace(/\s+/g, ' ').trim() === String(b ?? '').replace(/\s+/g, ' ').trim()

// Lo que hay que guardar y borrar para aplicar un paquete sobre los nodos actuales.
// verses: [[cita, texto]] se guardan en "Mi Biblia" si esa cita aún no tiene texto guardado.
// trivia: [{ id, fields }] se agregan a Trivia si esa pregunta (id) no existe.
export function planSeed(seed, nodes, edges = [], entries = []) {
  const byKey = new Map(nodes.map((n) => [normKey(n.title), n]))
  const put = []
  const del = []
  for (const r of seed.replace ?? []) {
    const cur = byKey.get(normKey(r.title))
    if (!cur) {
      if (!r.keepIfEdited) put.push(makeNode({ title: r.title, note: r.note }))
    } else if (same(cur.note, r.note)) continue
    else if (same(cur.note, r.ifNote) || !cur.note.trim()) put.push({ ...cur, note: r.note })
    else if (!r.keepIfEdited && !cur.note.includes(r.note.trim())) put.push({ ...cur, note: `${cur.note.trim()}\n\n---\n\n${r.note}` })
  }
  // restore: vuelve a crear un nodo que se había quitado, solo si no existe.
  for (const n of seed.restore ?? []) {
    if (!byKey.has(normKey(n.title))) put.push(makeNode({ title: n.title, note: n.note }))
  }
  for (const r of seed.remove ?? []) {
    const cur = byKey.get(normKey(r.title))
    if (cur && same(cur.note, r.ifNote)) del.push(cur.id)
  }
  const after = [...nodes.filter((n) => !del.includes(n.id) && !put.some((p) => p.id === n.id)), ...put]
  const plan = seed.data ? planImport(seed.data, { nodes: after, edges }) : null
  if (plan) {
    for (const n of [...plan.newNodes, ...plan.updatedNodes.map((u) => u.after)]) {
      const i = put.findIndex((p) => p.id === n.id)
      if (i >= 0) put[i] = n
      else put.push(n)
    }
  }
  const saved = new Set(entries.filter((e) => e.kind === 'biblia' && e.fields.texto?.trim()).map((e) => anyRefKey(e.fields.cita)))
  const verses = (seed.verses ?? []).filter(([cita]) => !saved.has(anyRefKey(cita))).map(([cita, texto]) => makeBibleEntry(cita, texto))
  const have = new Set(entries.map((e) => e.id))
  const now = Date.now()
  const trivia = (seed.trivia ?? []).filter((q) => !have.has(q.id)).map((q) => ({ id: q.id, kind: 'trivia', fields: q.fields, createdAt: now, updatedAt: now }))
  return { put, del, verses, trivia }
}
