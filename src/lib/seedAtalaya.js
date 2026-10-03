// La Atalaya "Ayudemos a otros a conocer bien a Jehová" (estudio del 3 de octubre de 2026), hecho
// solo con el artículo que pegó el usuario: la entrada de Reuniones y preguntas
// de Trivia (la respuesta correcta es la primera opción; el juego las revuelve).

export const ATALAYA_CONOCER_TITULO = 'Ayudemos a otros a conocer bien a Jehová'

export const ATALAYA_CONOCER_REUNION = {
  id: 'reunion-2026-10-03-conocer-a-jehova',
  kind: 'reunion',
  fields: {
    tipo: 'atalaya',
    fecha: '2026-10-03',
    titulo: ATALAYA_CONOCER_TITULO,
    idea: 'El objetivo principal al dar clases de la Biblia es ayudar a la persona a conocer y amar a Jehová (Juan 17:3). Ese amor la impulsa a obedecerlo y a tomar buenas decisiones.',
    parrafos: [
      { num: '1', nota: 'Nos alegra ver el progreso del estudiante, pero el mérito es de Jehová (1 Corintios 3:5-9).' },
      { num: '2', nota: 'Jehová quiere que todos tengan conocimiento exacto (1 Timoteo 2:3, 4): un conocimiento que influye por completo en la persona y la lleva a cambiar.' },
      { num: '3', nota: 'Preguntas: por qué conocer bien a Jehová, cómo enseñarles cómo es y cómo ayudarles a aplicarlo.' },
      { num: '4', nota: 'Objetivo principal: que conozca y ame a Jehová (Marcos 12:30). Que se bautice porque quiere dedicarle su vida, no por amistad con nosotros ni solo por la organización.' },
      { num: '5', nota: 'El amor y la obediencia van de la mano; el amor a Jehová es lo que más lo motiva a obedecer (Juan 14:31; 1 Juan 5:3).' },
      { num: '6', nota: 'Como el piloto que necesita horas de vuelo: se conoce a Jehová viendo en la práctica los beneficios de obedecerlo.' },
      { num: '7', nota: 'José rechazó a la esposa de Potifar porque sabía lo que le agradaba a Jehová (Génesis 39:7-9).' },
      { num: '8', nota: 'Enseñar con preguntas, como Jehová con Job (más de 50). Usar las preguntas del libro Disfrute de la vida.' },
      { num: '9', nota: 'Al leer la Biblia, preguntarse qué muestra el relato sobre Jehová. Santiago destacó su cariño y misericordia (Santiago 5:11).' },
      { num: '10', nota: 'Daniel en el foso: qué le agrada a Jehová (lo salvó) y qué le desagrada (lo que les pasó a sus acusadores) (Daniel 6).' },
      { num: '11', nota: 'Si el estudiante nos da las gracias, recordarle que quien le enseña es Jehová, el Gran Instructor (Isaías 30:20, 21).' },
      { num: '12', nota: 'Si no entiende un relato, ayudarle a usar lo que ya sabe de Jehová.' },
      { num: '13', nota: 'Jehová valora la vida, nos salvó siendo pecadores, no castiga a inocentes ni deja sin castigo al que lo merece. Siempre hace lo correcto aunque no sepamos todos los detalles.' },
      { num: '14', nota: 'Si le cuesta llevarse bien con alguien: pensar en cómo ve Jehová a los hermanos y cuánto valora la unidad (Salmo 133:1). Fijarse en las virtudes.' },
      { num: '15', nota: 'En una decisión importante, imitar a Jesús: "Siempre hago lo que a él le agrada" (Juan 8:29). Preguntarse qué decisión le agradaría a Jehová.' },
      { num: '16', nota: 'Marianne no le dijo qué hacer; la ayudó a pensar en Jehová. La estudiante rechazó el trabajo y Jehová la cuidó.' },
      { num: '17', nota: 'Más que las enseñanzas y la organización, lo más importante es que conozcan bien a Jehová.' },
      { num: '18', nota: 'Bendiciones: vida plena hoy, vida eterna (1 Juan 5:20) y ser amigos de Jehová (1 Corintios 8:3).' },
    ],
    notas: '¿Qué responderías?\n- Por qué conocer bien a Jehová: para amarlo, y el amor los impulsa a obedecerlo y a tomar buenas decisiones.\n- Cómo enseñarles cómo es: con preguntas y leyendo la Biblia preguntándose qué enseña de él.\n- Cómo ayudarles a usarlo: ante un relato difícil, un problema con un hermano o una decisión importante, pensar en lo que ya saben de Jehová.',
  },
}

const Q = (n, pregunta, opciones, explicacion, cita) => ({ id: `trivia-w-conocer-${String(n).padStart(2, '0')}`, fields: { pregunta, opciones, respuesta: 0, explicacion, cita } })

export const TRIVIA_ATALAYA_CONOCER = [
  Q(1, 'Según Juan 17:3, ¿qué significa vida eterna?', ['Conocer al único Dios verdadero', 'Bautizarse', 'Asistir a todas las reuniones', 'Leer toda la Biblia'], '"Esto significa vida eterna: que lleguen a conocerte a ti, el único Dios verdadero".', 'Juan 17:3'),
  Q(2, '¿Cuál es la voluntad de Jehová según 1 Timoteo 2:3, 4?', ['Que toda clase de personas se salven y tengan conocimiento exacto de la verdad', 'Que solo algunos lleguen a conocerlo', 'Que todos se aprendan las enseñanzas de memoria', 'Que todos formen parte de una religión'], 'Jehová quiere que toda clase de personas lo conozcan lo mejor posible a él y sus propósitos.', '1 Timoteo 2:3, 4'),
  Q(3, '¿Qué es el "conocimiento exacto"?', ['Un conocimiento que influye por completo en la persona', 'Saberse muchos datos de la Biblia', 'Pasar un examen de doctrina', 'Conocer la historia de la organización'], 'No se refiere solo a aprender datos, sino a un conocimiento que lleva a la persona a hacer cambios.', '1 Timoteo 2:4'),
  Q(4, '¿Cuál es el objetivo principal al dar clases de la Biblia?', ['Ayudar a la persona a conocer y amar a Jehová', 'Que se aprenda todas las enseñanzas', 'Que asista a las reuniones', 'Que se haga nuestro amigo'], 'El mandamiento más importante es amar a Jehová con todo el corazón, y nadie puede amarlo si no lo conoce bien.', 'Marcos 12:30'),
  Q(5, '¿Por qué queremos que un estudiante se bautice?', ['Porque desea dedicarle su vida a Jehová', 'Porque quiere ser nuestro amigo', 'Porque quiere formar parte de la organización', 'Porque le gustan ciertas enseñanzas'], 'El bautismo debe ser por amor a Jehová, no por amistad con nosotros ni solo por la organización o algunas enseñanzas.', 'Marcos 12:30'),
  Q(6, '¿Qué es lo que más motivará a un estudiante a obedecer a Jehová y serle leal?', ['El amor que sienta por él', 'El miedo al castigo', 'Lo que piensen los hermanos', 'Las reglas que aprende'], 'El amor y la obediencia van de la mano.', '1 Juan 5:3'),
  Q(7, '¿Quién merece el mérito del progreso de un estudiante?', ['Jehová', 'El que le da la clase', 'Los ancianos', 'El propio estudiante'], 'Es Jehová quien ayuda a la persona a dar cada paso.', '1 Corintios 3:5-9'),
  Q(8, '¿Qué le dijo José a la esposa de Potifar?', ['"¿Cómo podría yo hacer algo tan malo y de hecho pecar contra Dios?"', '"Mi amo me va a castigar"', '"Nadie se va a enterar"', '"Déjame pensarlo"'], 'José conocía bien a Jehová y sabía lo que estaba bien y mal a sus ojos.', 'Génesis 39:9'),
  Q(9, '¿Cuántas preguntas le hizo Jehová a Job para que lo conociera mejor?', ['Más de 50', 'Solo 3', 'Unas 10', 'Ninguna, solo le habló'], 'Hacer preguntas es un método que usa el propio Jehová.', 'Job 38:1'),
  Q(10, 'Al hablar del relato de Job, ¿qué destacó Santiago además del aguante de Job?', ['El cariño y la misericordia de Jehová', 'La riqueza de Job', 'Los errores de sus amigos', 'La fuerza de Satanás'], 'Al leer un relato, conviene preguntarse qué muestra sobre cómo es Jehová.', 'Santiago 5:11'),
  Q(11, 'Si un estudiante nos felicita por cómo enseñamos, ¿qué debemos recordarle?', ['Que quien le enseña es Jehová, el Gran Instructor', 'Que somos los mejores maestros', 'Que no debe dar las gracias', 'Que siga estudiando con nosotros siempre'], 'Solo Jehová merece toda la alabanza.', 'Isaías 30:20, 21'),
  Q(12, 'Si la Biblia no da todos los detalles de una decisión de Jehová, ¿qué nos ayuda?', ['Lo que ya sabemos de Jehová: siempre hace lo correcto', 'Inventar una explicación', 'Dejar de leer ese relato', 'Pensar que fue injusto'], 'Jehová valora la vida, no castiga a inocentes ni deja sin castigo a quien lo merece.', 'Éxodo 34:6, 7'),
  Q(13, '¿Qué dijo Jesús sobre las decisiones que tomaba?', ['"Siempre hago lo que a él le agrada"', '"Hago lo que me conviene"', '"Decido según lo que dice la gente"', '"Nunca tengo que decidir nada"'], 'Ante una decisión importante, preguntarse qué decisión le agradaría a Jehová.', 'Juan 8:29'),
  Q(14, '¿Cómo ayudó Marianne a su estudiante con la oferta de trabajo?', ['La animó a pensar si Jehová estaría feliz o triste con su decisión', 'Le dijo que rechazara el trabajo', 'Le dijo que lo aceptara', 'Le pidió a un anciano que decidiera'], 'En lugar de decirle qué hacer, la motivó a meditar en lo que ya sabía de Jehová.', 'Juan 8:29'),
  Q(15, 'Según 1 Corintios 8:3, ¿qué pasa si alguien ama a Dios?', ['Dios lo conoce', 'Ya no tiene problemas', 'Se vuelve rico', 'No necesita estudiar más'], 'Jehová se fija en nosotros y nos considera sus amigos.', '1 Corintios 8:3'),
]
