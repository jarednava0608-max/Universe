# Método Aha (estudiar y enseñar con preguntas)

Lo que el usuario fue afinando en su chat (oct 2026) para que un texto "llegue al corazón". Es lo que copia **"Estudiarlo con Claude"** (`dailyStudyPrompt` en `src/study/kinds.js`); si el método cambia, se cambian los dos. Los ejemplos de Gemini de abajo son el modelo: el tamaño, el tono y la forma deben quedar iguales.

## La receta
Un plan para enseñárselo al **señor Eduardo** (así le funciona mejor que si le hablan a él):
1. **Apertura**: "¡Perfecto! Vamos con…" y "Para tenerlo fresco, el texto dice: …".
2. **La idea falsa** en 2 oraciones: lo que alguien sincero cree sin decirlo ("no debo molestar a Dios", "orar es rezar de memoria", "obedecer es sumisión forzada", "para conocer a Dios hay que tener estudios"). "Vamos a usar la lógica humana para destruir esa mentira."
3. **El Gancho**: una escena de la vida diaria de él, con alguien que quiere, que se pueda imaginar ("Haz de cuenta que estás viendo…"). Respuesta tan obvia que da risa o un "¡uf!"; al lado, una opción absurda ("¿a un vecino que apenas conoce o a un amigo de mucha confianza?", "¿el papá se sentó a decirle: te tienes que reír así?").
4. **La Extracción**: "Por favor, lea…" y preguntas cuya respuesta se copia tal cual del texto. Decir qué tipo de palabra buscar sin darla ("Fíjese en la cantidad… ¿cuántas?" → "todas"). La última, "la prueba de fuego".
5. **El Golpe Lógico**: su respuesta del gancho frente a la palabra del texto ("¿se da cuenta del contraste?"); la razón la lee él ("según la última parte del texto"); él saca la conclusión.
6. **Tú concluyes**: "¡Exacto! … ¿verdad que…?", y termina en lo que Jehová o Jesús hace o siente por él: un regalo, no una tarea.
7. **Resumen para ti** (1-2 oraciones) y "¿Listo para…?".
- Formato: `Tú: "…"` y `(Él probablemente dirá: "…")`. Unas 300 palabras por aha; unas 450-500 el mensaje.

## Reglas que salieron de los errores
- **Escena cálida, nunca fría**: siempre alguien que lo quiere (amigo, papá, familia). Fallaron: celular con batería extra, la luz del porche, la sala de espera del pasaporte (trámite, objeto, nadie que lo quiera). Antes de mandarla: ¿hay alguien que lo quiere?, ¿contestaría con un sentimiento o una risa?, ¿le podría pasar esta semana?, ¿su respuesta repite una palabra del texto?, ¿tiene el mismo clima que el texto?
- **No copiar la imagen del texto** con otras cosas (lámpara = celular). Sí se vale la misma relación en otro terreno (contar secretos a un amigo = "estrecha amistad").
- **Relatos** (Abrahán): ponerlo a él en el lugar del protagonista ("imagínese que a usted…"), copiando lo que se pide, lo que no se sabe y lo que se promete.
- **Un aha a la vez**. Si el párrafo tiene dos ideas con focos distintos: Parte A y Parte B, cada una completa y separada, sin mezclar imágenes. Primero la que abre la puerta (¿puedo acudir?) y luego la que va más hondo (¿qué hace él cuando acudo?).
- **El enfoque lo elige Claude**: lo que contesta la pregunta del párrafo de La Atalaya citado. No preguntarle qué quiere enfocar.
- **La palabra rescatada**: si una palabra asusta (temor, obedecer), otra pregunta lógica ("si le tiene terror a alguien, ¿puede ser su amigo íntimo?").
- **Límite honesto**: "Quizás no quite el problema de inmediato, pero ¿qué sí promete?".
- **Aterrizar**: si la conclusión queda en el aire ("pasar tiempo con Jesús"), un aha extra que diga cómo.
- **Nada de**: huecos "___", preguntas de examen ("¿se durmieron o no?"), explicar antes de leer, terminar en "debes…", significado simbólico que las publicaciones ya no dan (el aceite de las vírgenes), citas inventadas. Si no se pudo abrir wol.jw.org, decir qué confirmar en la Biblia.

## Focos (la pregunta del corazón que contesta)
Posibilidad (¿se puede?), Permiso (¿puedo acudir?), Respuesta (¿qué hace él?), Motivo (¿por qué?), Límite (¿qué no promete?), Paso (¿qué me toca?).

## Ejemplos de Gemini (el modelo, tal como los escribió)

### Introducción: ¿de veras se puede ser amigo de Dios? (Sal. 25:14)
1. **El gancho (La confianza en la vida real)**
   - Tu pregunta: "Señor Eduardo, piense en esto: Si usted tiene un asunto muy personal, algo que es muy importante para usted o hasta un secreto... ¿a quién se lo cuenta? ¿A un vecino que apenas conoce o a un amigo de mucha confianza?"
   - (Él lógicamente dirá: "Pues a un amigo muy cercano, a alguien de confianza").
2. **La extracción (Lo que dice el Salmo)**
   - Tu pregunta: "Exacto, los asuntos importantes solo se le cuentan a los amigos de verdad. Ahora, por favor lea Salmo 25:14. Fíjese en las primeras palabras... ¿Qué clase de amistad dice ahí que podemos tener con Jehová? ¿Dice una amistad de lejitos, o cómo la llama?"
   - (Él leerá y dirá: "Dice que es una estrecha amistad").
3. **El golpe lógico (El 'Aha! moment')**
   - Tu pregunta: "¡Así es! Y note lo que dice al final: 'Él les da a conocer su pacto' (o sus propósitos). Señor Eduardo, si el Creador del universo está dispuesto a compartir con usted sus propósitos y sus pensamientos más profundos, exactamente igual a como usted le contaría algo importante a su mejor amigo... ¿Verdad que la respuesta a la pregunta del párrafo es un rotundo SÍ? ¡Claro que Dios quiere que seamos sus amigos!"
   - (Él concluirá: "Es cierto, nunca lo había visto así, nos tiene tanta confianza que nos cuenta sus planes").

**Un "Aha!" extra (por si se confunde con la palabra "temor")**: "Señor Eduardo, el texto dice que esta amistad es para los que 'le temen'. Pero por lógica, si usted le tiene terror o pánico a alguien, ¿podría ser su amigo íntimo? (Él dirá que no). Entonces, este 'temor' no es miedo a que Dios nos castigue. Piense en su mamá o en alguien que respeta mucho... ¿verdad que uno tiene 'miedo' de decepcionarlos o de lastimarlos porque los quiere mucho? ¡Ese es el tipo de respeto que Jehová busca en sus amigos!"

### Punto 2, Parte A: la carga pesada (1 Ped. 5:7)
A veces la gente siente que no debe molestar a Dios con sus problemas diarios porque "Él tiene cosas más importantes que atender en el universo". Vamos a usar la lógica humana para destruir esa mentira.
1. **El Gancho (La lógica humana)**
   - Tú: "Señor Eduardo, imagínese que usted está pasando por una racha de muchos problemas y le marca a un buen amigo para desahogarse. Ese amigo lo escucha. Pero, si usted le marca todos los días, a todas horas, para contarle puras preocupaciones... ¿qué cree que pasaría con ese amigo humano a la larga?"
   - (Él probablemente dirá con una sonrisa: "Pues se va a cansar, se va a fastidiar o ya no me va a contestar").
2. **La Extracción (Lo que dice la Biblia)**
   - Tú: "Es normal, los humanos nos cansamos. Pero ahora, por favor lea lo que dice 1 Pedro 5:7. Fíjese bien en la cantidad... ¿cuántas de nuestras inquietudes o preocupaciones dice ahí que podemos 'echar' sobre Dios?"
   - (Él leerá y dirá: "Dice que todas").
3. **El Golpe Lógico (El 'Aha! moment')**
   - Tú: "¡Todas! Señor Eduardo, ¿se da cuenta del contraste? Los amigos humanos se pueden cansar si les echamos encima todos nuestros problemas, pero Jehová le está diciendo: 'Échame todo a mí, no te guardes nada'. ¿Por qué cree que Él no se cansa ni se fastidia de escucharnos, según la última parte de ese mismo texto?"
   - (Él responderá: "Porque Él se preocupa por mí").
   - Tú concluyes: "¡Exacto! Saber que el Creador tiene el tiempo y la paciencia para escuchar hasta su preocupación más pequeña, ¿verdad que le quita un peso enorme de encima?"

### Punto 2, Parte B: la red de seguridad (Sal. 94:18, 19)
Muchos piensan que orar es solo rezar de memoria y ya. Vamos a ayudarle a ver que la oración es una plática de consuelo real.
1. **El Gancho (La experiencia de vida)**
   - Tú: "A todos nos ha pasado que a veces la mente no nos deja en paz, ¿verdad? Esos días donde uno trae la cabeza llena de preocupaciones, estrés o tristeza y siente que ya no puede más. Cuando alguien se siente así, a punto de caerse, ¿qué es lo que más necesita de un amigo?"
   - (Él dirá: "Que lo escuchen, que lo apoyen, que le den ánimos").
2. **La Extracción (Lo que dice el Salmo)**
   - Tú: "Pues mire cómo reacciona Jehová cuando nos sentimos así. Leamos Salmo 94:18, 19. Fíjese en el versículo 19, cuando el escritor dice que estaba abrumado por las preocupaciones (o inquietudes)... ¿qué hizo Dios en ese momento exacto?"
   - (Él leerá y dirá: "Dice 'tú me consolaste y me tranquilizaste'").
3. **El Golpe Lógico (El 'Aha! moment')**
   - Tú: "Señor Eduardo, si un niño se está cayendo, su papá lo agarra rápido, ¿verdad? El versículo 18 dice justamente eso: 'tu amor leal me sostuvo'. Esto significa que la amistad con Dios actúa como una red de seguridad. Quizás Jehová no quite el problema de inmediato por arte de magia, pero ¿qué le promete aquí que sí va a hacer con su mente y su corazón si usted acude a Él?"
   - (Él concluirá: "Me va a dar tranquilidad y consuelo").

**Resumen para ti**: Con este punto, lograste que el señor Eduardo vea a Jehová, no como un ser distante que castiga, sino como el único amigo que tiene la capacidad de aguantar todas nuestras quejas sin hartarse, y que tiene el poder real de darle paz mental cuando el estrés lo esté ahogando.

### Punto 4: Abrahán era amigo de Jehová (Gén. 12:1-4)
La historia de Abrahán es famosísima, pero muchas veces la leemos solo como un evento histórico y no como una prueba de amistad. Vamos a usar la lógica para que el señor Eduardo sienta el peso de lo que Abrahán hizo y entienda que la obediencia nace de la confianza.
1. **El Gancho (La prueba de confianza)**
   - Tú: "Señor Eduardo, imagínese que un amigo muy cercano y con mucho éxito viene hoy y le dice: 'Eduardo, deja tu trabajo, empaca tus cosas, despídete de tus familiares y vente conmigo. No te voy a decir exactamente a dónde vamos a vivir todavía, pero confía en mí, te prometo que te va a ir increíble'. Siendo muy sinceros, ¿qué nivel de confianza en ese amigo necesitaría usted para dejar toda su vida atrás y hacerle caso?"
   - (Él probablemente dirá: "¡Uf! Pues tendría que confiar ciegamente en él, sería una decisión muy difícil").
2. **La Extracción (Lo que dice la Biblia)**
   - Tú: "¡Exacto, se necesita una confianza absoluta! Bueno, pues ahora vamos a ver cómo se ve esa misma confianza, pero entre un humano y Dios. Por favor, lea Génesis 12:1-4. Basado en lo que acaba de leer, vamos a responder las preguntas de la lección: Primero, ¿qué le pidió Jehová a Abrahán que dejara atrás?"
   - (Él responderá: "Su tierra, sus parientes y la casa de su padre").
   - Tú: "¿Y qué le prometió Jehová a cambio?" (Él responderá: "Hacer de él una gran nación y bendecirlo").
   - Tú: "Y por último, la prueba de fuego: ¿Qué hizo Abrahán a sus 75 años después de escuchar eso?" (Él responderá: "Se fue, tal como Jehová le había dicho").
3. **El Golpe Lógico (El 'Aha! moment')**
   - Tú: "¡Así es! Abrahán ya era un hombre mayor, tenía su vida resuelta y cómoda. Señor Eduardo, si él obedeció y dejó su 'zona de confort', lógicamente no fue porque Dios lo obligara o por miedo, sino porque confiaba al 100% en que su Amigo le iba a cumplir lo prometido. Entonces, ¿verdad que ser amigos de Dios no se trata de obedecer reglas a ciegas, sino de desarrollar tanta confianza en Él que sepamos que cualquier cambio que nos pida siempre será para nuestro bien?"

**Resumen para ti**: Con este razonamiento, el señor Eduardo entiende que cuando la Biblia nos pide "obedecer", en realidad nos está pidiendo "confiar". Le quitas la connotación de sumisión forzada y la cambias por una respuesta lógica basada en la amistad.

**Para confirmar** (lo que salió al revisarlos): Sal. 25:14 dice "pacto", no "propósitos". En Gén. 12 todavía se llama Abrán (Gén. 17:5); Jehová lo llamó primero en Ur (Hech. 7:2-4) y la "vida cómoda" va con Ur. Más exacto que "obedecer es confiar": "Abrán obedeció porque confiaba en Jehová; su obediencia demostró su fe" (Heb. 11:8; Sant. 2:22). "No por miedo" choca con Gén. 22:12; mejor "no por obligación ni por terror". "Te va a ir increíble" suena a prosperidad: vivió en tiendas (Heb. 11:9, 10).

## Ejemplo hecho con el método (texto diario del 21 oct 2026, Apoc. 7:9)
Le gustó (8.7 de 10). Dos partes con focos distintos.

**Parte A: la gran fiesta (Apoc. 7:9).** Idea falsa: "soy uno más; a Dios le da lo mismo si estoy o no".
- Gancho: "Señor Eduardo, imagínese que un amigo lo invita a la fiesta de aniversario de sus papás. Usted llega y se sorprende: hay gente de Oaxaca, de Guatemala, de Brasil, de Corea… todos platicando y riéndose como si fueran familia. Y el papá de su amigo lo recibe en la puerta y le dice: 'Qué bueno que vino, lo estábamos esperando'. Siendo muy sinceros, ¿qué pensaría usted del que organizó esa fiesta?" (Él: "Que es alguien muy querido… y que de veras quería que yo fuera").
- Extracción: Apoc. 7:9, ¿de dónde era la gente? ("de todas las naciones"); ¿pudo contarlos? ("nadie podía contarlos"); la prueba de fuego: según el texto, ¿quién está reuniendo a esa gran muchedumbre? ("Jehová").
- Golpe: Juan lo vio hace casi 1,900 años y hoy millones estudian la Biblia como usted; si el que organiza una fiesta así de veras quería que usted fuera, ¿qué le dice que Jehová lo haya traído a estudiar? ("Que no estoy aquí por casualidad").
- Tú concluyes: "Saber que el que está reuniendo a esa gran muchedumbre lo está invitando a usted, con nombre y apellido, ¿verdad que le cambia la forma de ver este estudio?"

**Parte B: lo que se pega (Hech. 4:13).** Idea falsa: "para conocer a Dios y hablar de él hay que tener estudios o facilidad de palabra".
- Gancho (con la mejora del usuario): "Señor Eduardo, seguro conoce a alguien que es igualito a su papá. Lo ve y es como si estuviera viendo al papá: se ríe igual, se sienta igual, camina igual, hasta dice los mismos chistes. Dígame, ¿el papá se sentó un día a decirle: 'Mira, hijo, te tienes que reír así, te tienes que sentar así y tienes que caminar así'?" (Él, riéndose: "¡No, verdad! Se le pegó de tanto estar con él").
- Extracción: Hech. 4:13, ¿cómo describe a Pedro y a Juan? ("hombres comunes y sin estudios" [confirmar en la TNM]); y aun así, ¿de qué se dieron cuenta? ("de que habían estado con Jesús").
- Golpe: eran pescadores; los gobernantes no se fijaron en sus estudios sino en con quién habían estado. ¿Qué necesita uno para conocer a Dios y hablar de él con valor: un título, o pasar tiempo con Jesús?
- Tú concluyes: "Eso es justo lo que usted está haciendo cada semana en este estudio. Saber que Jesús le enseña a usted igual que les enseñó a unos pescadores, ¿verdad que le quita el miedo de 'no dar el ancho'?"
- Aha extra para aterrizar ("¿cómo se pasa tiempo con Jesús?"): "Si usted quisiera conocer a un bisabuelo que vivió hace muchos años, ¿qué haría?" (Él: "Preguntarles a los que lo conocieron, o leer lo que escribieron de él"). "Eso son los Evangelios: lo que escribieron los que caminaron con Jesús."

**Cómo se pasa tiempo con Jesús**: leer los Evangelios (y el libro *Jesús: el camino, la verdad y la vida*), detenerse a pensar en lo que se lee, imitarlo (1 Ped. 2:21) y predicar, porque él prometió estar con sus discípulos (Mat. 28:19, 20). [Confirmar la redacción en la TNM.]
