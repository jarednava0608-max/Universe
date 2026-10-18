## 3) Pestaña Juegos

### Portada (no volver a llenarla)
- Solo "Juego de hoy": Memorama de personajes (6 parejas nombre ↔ quién fue) de un mundo abierto que rota a diario (`todayWorld`, `GamesTab.jsx`); "Jugar" / "Listo por hoy" (`progreso.fields.juegoHoy = { day }`, gana el más reciente; `best['memorama-tiempo']`; parejas van al repaso). Abajo un enlace "Todos los juegos": Repasar hoy + Logros (`ProgressCard`), Reto del día y la lista.
- Sin racha, récords ni cifras arriba (abrumaba); los días se guardan igual (`store.apply`) para logros. Sin puntito en la pestaña (solo Pendientes, `TabBar` `dots`). Fondo liso, sin animaciones de fondo.
- Lista: Memoria Bíblica, Trivia, Memorizar textos, Con lo que estudio, Libros de la Biblia, Constancia (última).

### Arquitectura
- `registry.js`: un juego = una entrada (recibe `{ store, toast, onExit }`; `stat(store)` opcional = avance). Lógica en `logic.js` (con pruebas).
- `ui.jsx`: `GameScreen` (cierra deslizando; `back` = a dónde vuelve), `Quiz` (`seconds` = reloj; `best` = récord previo), `Result` (anillo %, "Nuevo récord" solo al superar, confeti ≥ 70 %), `Sprint` (60 s, error −2 s), `Survival` (hasta el primer error), `SwipeCard` (derecha = me la sé, izquierda = repasar), `OrderPuzzle` (tras 2 errores marca el siguiente), `Confetti`, `ModeCard` (`badge`), `PasteJson`, `PairsGame` = Memorama (`build()`; récord por tiempo, clave `-tiempo`; en Juego de hoy, Memoria Bíblica, Libros, Trivia, Memorizar, Con lo que estudio). Todo empieza arriba (`toTop`).

### Memoria Bíblica
- Hecha aquí (la versión vieja de Vercel no se usa). `memoria/characters.js`: 128 personajes en orden histórico en `LIST` (`n`, `t` quién fue, `c` cita, `p` 2 pistas en 1.ª persona, `d` lo que hizo sin el nombre), 8 mundos (`WORLDS`). Si dos hicieron lo mismo (Adán/Eva) → `CONFUSABLE` en `logic.js`. Pruebas: citas reconocidas, ninguna pista dice el nombre.
- Modos: ¿Quién soy? (3 pistas, 3/2/1 pts; con las 3 = `'help'`), ¿Qué hizo?, ¿Dónde está? (→ cita; "No sé, ver la respuesta" la muestra y cuenta como fallada, `Quiz giveUp`), ¿Cierto o falso? (`trueFalseRound`), Línea del tiempo (`best['mb-linea']`), Memorama (`pairsRound`, `best['mb-w<n>-parejas-tiempo']`), Reto 60 s (`sprintQuestion`, `best['mb-reto']`).
- Época: `eras.jsx`, `GameScreen era`, `data-era` → `--era-rgb`; paisaje tenue por mundo.
- Siguiente mundo con 70 % en cualquier modo (`best['mb-w<n>']`, `best['mb-w<n>-<modo>']`); `stars` 70/85/100 %.
- Personajes: buscador, filtro Todos / Conocidos / Por aprender (`isKnown`/`KNOWN_BOX`: acertado en 2 días), fichas con cita tocable. Repaso con clave `mb:<id>`.

### Trivia
- Pegado desde Claude: `{ "preguntas": [{ pregunta, opciones, respuesta, explicacion, cita }] }` → `kind: 'trivia'`. Rondas de 10, falladas/vencidas primero.
- Modos: Normal, Contra reloj (15 s, 100 + hasta 100 por rapidez, `best['trivia-reloj']`), Sin fallar (`best['trivia-racha']`), Solo las que fallé, Memorama (≥ 3, `trivia-pairs.js`, `best['trivia-parejas-tiempo']`). Borrar deslizando (Deshacer) o todas.

### Memorizar textos
- Solo textos que agrega el usuario (`kind: 'memoria'`, pegables; borrar deslizando). El Texto diario no entra (`memorizeSources`; `verseSources` junta ambos solo para Mi Biblia).
- Orden: Ocultar (Fácil → De memoria, 25/50/75/100 %; tocar muestra la palabra; en De memoria se oculta la cita) → Iniciales → Ordenar → Escribir (primera letra, sin acentos; a los 3 intentos se muestra; `typeWords`) → Cita (libro/capítulo/versículo, 4 opciones; `citeSteps`; solo con versículo). En Cita y De memoria el título dice "Texto". Tras "Lo sé", "Seguir con <siguiente>".
- Sugerencia "Lo sé" (Escribir ≥ 90 %, Ordenar ≤ 1 error, Cita sin errores), decide el usuario; `saveVerseResult` sube nivel con aviso. "Editar" (arriba a la derecha) corrige cita/texto sin perder nivel. Arriba de la lista, cuántos sabes. Memorama con ≥ 3 (`verse-pairs.js`, `best['textos-parejas-tiempo']`).

### Con lo que estudio
- ¿Qué es? (`best['que-es']`); ¿Con qué texto lo pruebas? (`buildProofQuestions`, `best.prueba`; falsas = textos de otras ideas; sin nodos-texto ni los que citan > 4; muestra el texto si está en Mi Biblia); Parejas (`best['parejas-tiempo']`, `withBestTime`).
- Quitados por repetidos (no volver): Tarjetas, Completa el texto, ¿Dónde está?. `buildFillQuestions`/`buildCiteQuestions` (`bibleSources`) quedan para el Reto del día.

### Libros (`Books.jsx`)
- Antes/después y sección (`best.libros`), Reto 60 s (`best['libros-reto']`), ordenar (`sectionRun`, `best['libros-orden']`), Memorama libro ↔ sección (`books-pairs.js`, `best['libros-parejas-tiempo']`), lista (`SECTIONS` en `logic.js`, `BOOKS` en `bible.js`).

### Constancia (`Constancia.jsx`)
- También hasta arriba de Estudio. Racha de una meta personal: **nunca dice cuál**. Días, mejor racha, frase diaria con cita, "Volver a empezar" (confirma; la mejor queda). En 0 días: "Hoy empieza".
- `progreso.fields.constancia = { start, best, at }` (`constanciaDays`, `restartConstancia`, `mergeConstancia`; gana `at` más reciente, `best` el mayor).
- Push nocturno (por defecto 22:00, 22:30, 23:00): `src/lib/push.js` → `universe_push` (RLS; sesión y PWA, iOS 16.4+); `public/sw.js`; `supabase/functions/constancia-push` (`pg_cron` cada 5 min, `push_cron_secret` y VAPID en vault), una vez por hora y día. "Apagar avisos" solo borra horas de Constancia (`clearPushTimes`); el iPhone sigue registrado para Pendientes.

### Reto del día (`daily.js`)
- 5 preguntas fijas por día (semilla = fecha): personajes, libros, una Trivia, tus textos, tu mapa. `progreso.fields.daily = { day, score }`.

### Repasar hoy (`Review.jsx`)
- Lo principal de Juegos. Solo lo estudiado (pedido del usuario): reuniones (Atalaya y entre semana), textos diarios analizados, conceptos del mapa; Personajes/Trivia/Memorizar no (salvo los ya vistos; con 3 pistas = `'help'`). Rondas de 8 (`SESSION`, ≤ 4 nuevas `NEW_PER_SESSION`; cifras de `roundSize`); "Terminar" grande, "Otra ronda (N)" chico. Guarda `progreso.fields.repaso` (día) y Hoy lo palomea.
- `dailyMix`: primero lo que toca (más atrasado, alternando tipos), luego nuevas turnadas por tipo, máx. 10/día (`NEW_PER_DAY`, `newToday`, "· Nueva"). El texto diario entra desde mañana.
- Tarjetas: texto diario (`dailyCards`, `c:<entrada>`, `dailyCheck`: elegir tu principio entre 4 o armar la cita); Atalaya (`atalayaCards`, `a:<entrada>:<pregunta>`, solo respondidas, `atalayaCheck`: tu respuesta entre 4, primero del mismo artículo; "¿De qué Atalaya es?" ya no entra, `atalayaSourceCards` sin usar).
- **Sin trampa** (`cardCheck`): título con versículo → armar la cita; si no, elegir título desde la definición (`guessPrompt` sin frases que repitan el título o se repitan en muchos nodos). `SwipeCard` solo sin otras tarjetas y tras "Ver la respuesta". Cita sabida solo sin errores.

### Logros
- `achievements` en `progress.js` (`have`/`need`), calculados, no guardados; aviso "Logro nuevo" (`useNewMedals`).

### Repaso inteligente (`progress.js`)
- Leitner 0/1/2/4/7/15/30/60 días, `review(item, knew)`. Sube solo si ya tocaba; fallo = hoy y −2 cajas; `'help'` = misma caja, mañana. `first` cuenta nuevas; `dueCount` solo lo visto.
- Una entrada `id: 'progreso'` (`fields: { days, srs, triviaBest, best, ... }`); `mergeProgress` combina: `best` el mayor, `-tiempo` el menor.
