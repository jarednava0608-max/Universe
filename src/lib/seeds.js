// Paquetes que el usuario pidió agregar a su mapa. Cada uno se aplica una sola vez por teléfono
// (marca `seed:<id>` en meta): si después borra esos nodos, no vuelven. Si un nodo ya existe,
// solo se le añade la información (como "Pegar conocimiento"), sin repetirla.
export const SEEDS = [
  {
    id: 'jeremias-38-39',
    data: {
      nodes: [
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
      ],
    },
  },
]
