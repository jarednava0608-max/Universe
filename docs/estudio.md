## 2) Pestaña Estudio
Apartados en `src/study/kinds.js` (`KINDS`; `notes: true` = editor tipo Notas): ahí se definen campos, título en lista, formato para Claude y resumen al mapa.

### Hoy (`src/study/TodayPlan.jsx`, lógica `src/study/today.js`, con pruebas)
- `TodayPlan` en `StudyTab` con `view='hoy'`: día, fecha grande, Constancia (`plan-streak`), versículo de hoy si está (`hoy-verse`, letra de libro) y **un botón con lo que sigue** ("Empieza: Texto diario" / "Sigue: …" si ya empezado; `nextStep`). Sin `top-actions`, lista de pasos, contador ni momentos del día.
- El botón pasa al siguiente paso pero **no lo abre solo**. Todo hecho: "Listo por hoy. Lo demás es cuando tú quieras." (`plan-done`) + "Tu frase de hoy" (`fields.resumen` del diario).
- Pasos: Texto diario (`dailyAnalyzed`) → La Atalaya / Entre semana → Tu asignación → Lectura (solo con meta; vencida no sale). Repasar hoy y Reto del día no van aquí (Juegos).
  - Se prepara la reunión que sigue (tras el jueves, La Atalaya; tras el sábado, entre semana); la otra solo si ya empezada. La Atalaya desde 3 días antes ("El domingo · 8 de 20 respondidas"; abre la de esa semana o crea una), entre semana desde 2 (hecha con todo respondido). **Hecha por hoy si hoy ya le avanzaste** (`touchedToday`; "Hoy ya le avanzaste · 7 de 18").
  - Día de la reunión con algo contestado (`meetingToday`): hecha, y "La Atalaya es hoy · Mis respuestas" abre en Modo reunión (`editing.meeting` → `startInMeeting`; al cerrar vuelve a Hoy).
  - Asignación desde 7 días antes; hecha si practicada hoy ("Practicada hoy (3:56)"). Lectura: capítulos de hoy, abre el primero; hecha al leerlos.
- Sin texto de hoy, el botón lee `navigator.clipboard`; si trae cita (`looksLikeDailyText`) lo guarda con fecha de hoy y abre la entrada (sin permiso, la abre para pegar). Texto de otro día: avisa y no guarda (`otherDayText`, también dentro del diario). Antes de pegar: el de ayer con "¿Qué te enseñó? Ver" (`yesterdayLesson`) y enlace a JW Library (`dailyTextAppUrl`). Ya hecho: "Tu plan de hoy" a la vista. Con EPUB: `dailyText` en `todayPlan`, `onPasteDaily(texto, entrada, true)` sin aviso.
- Días de reunión: `DEFAULT_MEETINGS` jueves y sábado, `useMeetings` en `src/study/meetings.js`, `universe-meetings` (también `.hora`). La primera vez pregunta (entre semana lun-vie; fin sáb/dom). `MeetingDaysRow`: "Reuniones: jueves y sábado · Cambiar".

### Biblioteca (`view='biblioteca'`, id `estudio`)
- `continue-card` "Seguir donde te quedaste": lo último editado (entrada o nodo, `recent`) en 7 días si no sale ya en Hoy.
- `lib-grid` con 4 `LibTile` sin números: Leer la Biblia, Texto diario, Reuniones, Juegos. "Más" (`lib-more`, `universe-lib-more`) abre `lib-list`: `LIB_MORE` (asignaciones, Notas, Ideas, Preparar estudios y apartados nuevos), Mapa, Revisitas en el mapa (ver CLAUDE.md), Tus nodos y `MeetingDaysRow`. Mapa/Juegos abren `tab = 'mapa' | 'juegos'` (`TabBar` marca Biblioteca). No hay "Recientes".
- **Tus nodos** (`section = 'nodos'`): Jehová primero, luego alfabético, con primera oración de la definición. Se abre como nota (`NodeNote`, editor de Notas); guarda solo si cambió, en Markdown (`docToNodeMarkdown`: subtítulos, listas, `[[enlaces]]`; sin colores ni subrayado). Título de Jehová fijo. "Ver en el mapa".
- "‹ Atrás" dice a dónde vuelve (`backLabel`). Listas vacías: `EMPTY_ACTIONS`. Deslizar a la izquierda elimina con Deshacer. Fechas: "Hoy, 9:05", "Ayer, 18:30", "lunes 28 sept", "3 jun" (año si es otro).

### Texto diario (`src/study/DailyStudy.jsx`, pasos `DAILY_STEPS`)
- **EPUB del año** (`src/lib/dailytexts.js`, `dailytexts.test.js`): "Examinemos las Escrituras todos los días" (es26 = 2026), una vez al año en la lista o el paso Leer (`DailyTextsImport`). `readDailyEpub`: por día `h2` = fecha, `themeScrp` = versículo, `bodyTxt` = comentario; año de `content.opf`; lo previo a la fecha ("FECHA DE LA CONMEMORACIÓN") va al final. Solo en el teléfono (`meta.dailytexts`; nunca nube ni repo; años se juntan). Formato igual al copiado de JW Library. `dailyTextFor(fields.fecha)` llena otras fechas. Sin EPUB, se pega.
- Pasos (no volver al método largo ni a dos cajas):
  - **Leer**: sin texto, "Abrir en JW Library" (`dailyTextAppUrl`), wol (`dailyTextUrl`), "Pegar el texto" o cuadro. Con texto: fecha grande (`dt-date`), versículo, comentario, wol, "Ya lo leí", "Estudiarlo con Claude" (`dailyStudyPrompt`: copia el texto con las reglas del método del usuario —una pregunta a la vez, huecos de una palabra, escena "Imagínate, Jared" antes del significado, "vuelve a leer", contexto del versículo—; el estudio se hace en su chat, no en la app); "Cambiar la fecha o el texto".
  - **Jehová** (`fields.jehova`) → **Lección** (`fields.principio`; la usa Repasar hoy) → **Hoy** (`fields.aplicacion`, "Cuando…, voy a…") → **Recordar** (resumen, "Tu frase del día" 3-5 palabras en `fields.resumen`; Listo, Copiar para Claude, wol).
  - Cada pregunta: línea guía, versículo, "Leer el comentario" y wol arriba, y frases para empezar que se insertan en el cursor (Lección según `guessDailyType`/`DAILY_TYPES`); desaparecen al usarlas o tras ~40 letras propias.
  - Mínimo Lección + Hoy (`dailyMinimum`, `DAILY_MIN`); en Recordar el botón lleva a lo que falta o dice Listo.
  - Guarda sola y sigue en `fields.paso` (nueva o vacía: Leer). Campos viejos (contexto, relato, notas, conceptos) se conservan sin pedirse. Citas tocables (`Refs`).
- Lista: fecha como hoja de calendario, título = versículo con cita (`dailyVerse`, cursiva serifa), resumen; si no: "Falta analizarlo". `dailyBody` salta el renglón de fecha copiado.

### Reuniones (comunes)
- Campos: tipo (La Atalaya / entre semana), fecha, título, artículo completo, respuestas, idea principal, cómo lo aplico, notas. Lista: fecha como hoja (`meetingDay`), título, tipo, avance (`answeredCount` / `midweekCount`) y "· Vas a comentar".
- Sin texto, primer botón "Pegar el artículo copiado" / "Pegar la semana copiada"; si trae preguntas/partes, pasa solo al Vistazo / portada.
- `src/study/JwLinks.jsx` (en Artículo y Programa): jw.org, En línea (`meetingsUrl` = `/wol/meetings/r4/lp-s/{año}/{semana ISO}`) y App (`jwlibrary://`). "Ver la reunión en wol.jw.org" en cada parte.
- Tocar palabras las marca (`--hl`, `fields.marcas`), cada frase como una pieza (`<mark class="at-run">`, `runsOf`); `==texto==` = `<mark>` en mapa y notas.
- Pasos y números sticky en el texto (`at-bars`); al bajar se deslizan arriba sin cambiar el alto de la página (si no, iOS los vuelve a sacar); vuelven al subir ~70 px o arriba.
- Guardan paso y pregunta/parte (`fields.paso`, `fields.bloque` / `fields.parte`). Sin textos de ayuda repetidos por párrafo.

#### La Atalaya (`src/study/AtalayaStudy.jsx`, parser `src/study/atalaya.js`, con pruebas)
- Nueva = fecha de la próxima reunión de fin de semana (`newEntry` en `StudyTab.jsx`).
- **Revista en EPUB** (`src/lib/watchtower.js`, con pruebas; `WatchtowerImport`): La Atalaya de estudio de jw.org (`w_S_AAAAMM.epub`; probado con agosto 2026: 4 artículos), en la lista de Reuniones o en el paso Artículo. Artículo = página con preguntas `qu`; semana del `contextTtl` de arriba ("26 DE OCTUBRE-1 DE NOVIEMBRE DE 2026"; si no, del índice junto a "Artículo de estudio N", `weekOf`). `toLines` lo deja como el texto copiado: `data-pnum` → "1 ", sin cuadros "Respuesta" (`gen-field`), notas (`groupFootnote`) ni citas (`groupExt`); el cuadro `blockTeach` siempre es "## ¿Qué responderías?" (`reviewBox`; renglones que no son pregunta llevan el título). Solo en el teléfono (`meta.revistas`, clave = título del número; nunca nube ni repo). Atalaya sin artículo: se pone sola la de su semana (`watchtowerFor`); si no hay, lista para elegir.
- **Artículo**: fecha, título (primer renglón tipo título, saltando "Artículo de estudio N" y canción), pegar, `fields.enlace`. Oculto ya pegado; se cambia al final de Vistazo.
- **Vistazo**: portada "La Atalaya · fecha", número y canción, título, texto temático en cursiva, subtítulos y preguntas de repaso.
- **Párrafos**: una pregunta con su párrafo; `at-jump` (abierta resaltada, respondidas rellenas); `at-sub`; `at-answer` → `fields.parrafos` `{ num, nota }`; citas tocables (`wordRefs`); imágenes y recuadros aparte; "Escuchar" (voz alta con su pregunta). `paragraphUrl`: con `fields.enlace`, `#:~:text=` (≤6 palabras, sin cruzar comillas, exacto); sin él, busca en wol.
- **Repaso**: `fields.repaso` `[{ pregunta, nota }]`, aplicación, notas; "Idea principal" solo si tiene algo.
- **Listo**: "Lo que llevas", faltantes, Copiar para Claude, "Conceptos para el mapa".
- Parser: preguntas con número y punto ("1. ¿…?", "4, 5. a) …", "6. Explica…"), párrafos sin punto ("2 La…"), `## subtítulos` (con texto antes de la siguiente pregunta = recuadro), "## ¿Qué responderías?"; ignora CANCIÓN, "## Notas" y "Respuesta".

#### Entre semana (`src/study/MidweekStudy.jsx`, lógica `src/study/midweek.js`, con pruebas)
- **Programa**: pegar la semana de la Guía en `fields.programa`; título = lectura ("Jeremías 40, 41"). Ya pegado: portada "Vida y Ministerio · 5-11 de octubre", partes por sección (número, minutos, lugar en maestros); editar en "Cambiar fecha, título o programa".
  - `programDate`: semana del programa ("5-11 DE OCTUBRE", "28 de septiembre a 4 de octubre"; año más cercano) + tu día de reunión (si falta, lo pregunta). Cambio manual → `fields.fechaManual`.
  - Lectura capítulo por capítulo (`readingChapters`), abre Mi Biblia y marca leído (`fields.leidos`, lo mismo que Leer la Biblia).
- **Partes**: una a la vez; números; colores `--mw-tesoros`/`--mw-maestros`/`--mw-vida`; paréntesis tenues con citas (`splitAsides`, `splitRefs`); pregunta y respuesta en una tarjeta; imágenes/videos en cursiva tenue; renglón seguido de "Respuesta" o "PARA MEDITAR:" = pregunta; sin preguntas = "Mis notas". `fields.respuestas` `{ '2-1': …, '3': … }`; marcas en `fields.marcas['<parte>-<renglón>']` (fuera de paréntesis).
- **Listo**: avance, aplicación, notas, Copiar para Claude. `midweekNode`: "Vida y Ministerio, 5-11 de octubre de 2026" con lectura, respuestas (`## título`), aplicación y notas (sin programa).
- **Horario** (`partTimes`, con pruebas): desde `universe-meetings.hora` (19:30): canción y oración 4, introducción 1, +1 de consejo tras cada asignación de estudiante (no video ni análisis con auditorio), canción de en medio 4, conclusión 3, canción final. Bajo cada parte `mw-info` "10 min · 7:45 a 7:55 · nombre" ("Sala B: …" abajo); portada con horas y fin.
- **Asignaciones de la congregación**: `kind: 'asignaciones'`, id `asig-AAAA-MM-DD`, `fields: { fecha, presidente, oracion, filas: [{ sec, min, titulo, nombres }], salaB: { consejero, filas } }`. **Solo en su Supabase** (nunca en código ni semillas: repo público, nombres de otros); fuera de `KINDS`. `weekSchedule` (semana), `matchSchedule` (misma sección, más palabras iniciales iguales), `outline`: nombres por parte, "Sala B" en lectura y maestros, `apertura` (7:30 a 7:35) con presidente y consejero; filas extra = partes de la congregación (`withExtras`, clave `x-<palabras>`, con "+"); minutos de la congregación ("15 min (la Guía dice 30)"). Ignora canciones y conclusión.
- **Estudio bíblico** (`isStudyPart`): capítulo en `fields.estudio`; `studyChapter` elige `parseArticle` (respuestas `e:<párrafo>`, "Leer el párrafo") o `parseStory` (libros de relatos: "Lea el relato bíblico", "¿Qué diría?", "Investigue un poco más", "Piense en las lecciones", "Vea el cuadro completo"; ignora imágenes, créditos y "Para saber más"; respuestas `e:c<n>`). `studyBlocks`, `keysOf`.
- Respondidas (`midweekAnswers`) van a Repasar hoy con las de La Atalaya (`atalayaCards`, clave `<entrada>:<pregunta>`).

#### Modo reunión y "Comentar"
- `src/study/MeetingMode.jsx` (botón en portada y Listo con algo contestado): tus respuestas en letra grande, pregunta chica y sección; sin respuesta muestra tus subrayados (`keys`); repaso al final. Fila de números (`jump` de `meetingItems` en `atalaya.js`/`midweek.js`) con puntito en las de comentar; último número en `universe-mm-<id>`. `navigator.wakeLock` (se repide al volver).
- `StarButton` (`fields.comentar`, `isStarred`/`withStar`): marcadas primero bajo "Vas a comentar".

### Conceptos para el mapa (`src/study/ConceptsStep.jsx`, `src/study/concepts.js`, con pruebas)
- Paso antes de Listo en diario y reuniones; en reuniones oculto (`hidden: true` en `STEPS`), se abre desde Listo.
- Título corto (1-3 palabras; "Muy largo" con >4 o >32 letras, `titleTip`) + "¿Qué es? con tus palabras" + "Se apoya en" (`conceptRefs`). Ideas sin IA (`conceptIdeas`, `WORDS`).
- "Poner en el mapa": un nodo por concepto, galaxia Espiritual (`conceptsToMap` en `App.jsx`; `conceptNote`/`entrySource`: definición + "Se apoya en" + "Lo vi en"); título existente = se añade. `fields.conceptos` `[{ id, titulo, def, cita, nodeId }]`.

### Otros apartados
- **Preparar estudios (Método Aha)**: título, idea central, Gancho, Extracción, Golpe lógico, Aha extra (opcional), Resumen.
- **Ideas que me ayudan** (`kind: 'idea'`): la idea, para qué sirve, cómo la imagino, qué cambia, notas. `noMap`; `claudeNote` sin jw.org.
- **Mis asignaciones** (`kind: 'asignacion'`, `PARTS`; `choice` largo = lista): fecha (próxima entre semana), parte, minutos (vacío = `partMinutes`), tema, texto, lección, ayudante, lo que diré, notas. `noMap`. `PracticeTimer` (`StudyTab.jsx`): cuenta arriba, naranja últimos 30 s, roja al pasarse ("Te pasaste 0:12"), wake lock; "Guardar práctica" → `fields.ensayos` `[{ t, secs }]`. Lista: "4 min · Practicada 2 veces".
- Con apartados impares, la última tarjeta ocupa el ancho.

### Notas (`kind: 'reflexion'`, no cambiarlo)
- Como Notas del iPhone (título + texto con formato). `src/study/RichNote.jsx` (TipTap, carga aparte, `main.jsx` lo precarga para offline).
- iOS: `useVisibleBox` (`visualViewport`) ajusta la nota a lo visible; barra dentro (portal a `.toolbar-slot`) sobre el teclado; `scrollMargin`. Rendimiento: `shouldRerenderOnTransaction: false`, `useEditorState`, HTML solo al guardar.
- Barra: Aa (Título/Subtítulo/Encabezado/Cuerpo; negrita, cursiva, subrayado, tachado, 5 colores y 5 resaltados), tareas, lista, numerada, tabla (+ fila / + columna / quitar / borrar), enlazar nodo, cita, línea, deshacer, listo.
- Sugerencias (`src/lib/suggest.js`): nodos desde 2 letras (como enlace), luego libros y `PUBLICATIONS` desde 3 (2 con número: "1 co"); no con palabras comunes. Completa con espacio; coma/punto lo quita.
- Enlaces: botón o `[[` → `<a data-node>` / `[[Título]]` (`NodeLink`, `src/study/noteExtensions.js`). Citas por decoración `BibleRefs`. Sin escribir: cita abre hoja, enlace abre `src/components/NodePeek.jsx` (enlaces dentro abren ahí; "Abrir en el mapa" guarda y va); escribiendo solo mueve el cursor.
- Ordenar (`tidyDoc` en `src/study/noteText.js`): limpia espacios/renglones, mayúsculas (`capRefs`), "- ", "1.", "[ ]" a listas/tareas, renglón corto con ":" a subtítulo; no toca formato. `enrichDoc`: enlaza primera mención de cada nodo (menos Jehová), agrega "Textos de esta nota" y "De tu mapa" (se reemplazan al reordenar). "Nota ordenada · Deshacer".
- Relacionado: entradas con citas o enlaces comunes (`relatedIds`).
- ⋯: Ordenar con Claude (`docToMarkdown` + `claudeTidyPrompt`), Compartir (`docToText`), Pegar de Claude, Proponer al mapa, Eliminar.
- `fields.html` + `fields.texto` (buscar, mapa, citas). Markdown viejo/de Claude → `markdownToHtml` (tablas, `- [ ]`). Guarda al parar, salir y segundo plano; vacía se borra. `noteBody` junta preguntas viejas.
- Lista por última edición, buscador; `SwipeRow` (botón solo existe al deslizar, tarjetas translúcidas); `UndoBar` + `useUndoDelete` 5 s.

### Leer la Biblia (`src/components/BibleHome.jsx`, `src/lib/reading.js`, con pruebas)
- "45 de 1189 capítulos"; 66 libros (`BOOK_ABBR`, más claros con avance); capítulos leídos en lavanda, punto si están en Mi Biblia; lector con "Marcar como leído".
- `LeftOff`/`lastRead`: último marcado, "Sigue: Jeremías 42", "Lo marcaste como leído ayer"; `bh-ch.last`.
- Meta (`ReadingGoal`; `makePlan`, `readingToday`, `chaptersLabel`): 6 meses, 1 o 2 años; cada día los primeros sin leer, repartidos en los días restantes. `progreso.fields.plan` `{ start, end, t }` / `{ off: true, t }`, `mergePlan`. Vencida: pide otra.
- `progreso.fields.leidos` `{ 'libro:capítulo': { on, t } }` (`withRead`; `mergeLeidos` en `mergeProgress`).

### Buscar en todo (`src/study/SearchAll.jsx`, `searchAll` en `src/study/search.js`, con pruebas)
- Lupa solo en el inicio de Estudio. ≥2 letras, sin acentos/mayúsculas, todas las palabras. Grupos Mapa, Estudio (todo el texto, respuestas incluidas; no HTML ni marcas) y Mi Biblia, con fragmento marcado. Queda abierto debajo.

### Claude y mapa
- Copiar para Claude (`entryForClaude`): campos con contenido y sus nombres.
- Pegar de Claude: JSON con alias; se revisa y guarda. "Copiar formato para Claude" = plantilla.
- Proponer al mapa (`proposeNode`): título, idea principal, principio, preguntas abiertas, citas; vista previa editable; título existente = se añade. Guarda `mapNodeId`. Aún trata reuniones (La Atalaya tal cual con `highlightArticle`, entre semana con `midweekNode`), pero diario y reuniones ya no muestran el botón (usan Conceptos); tampoco `noMap`.
