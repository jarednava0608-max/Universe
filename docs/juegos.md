## 3) Pestaña Juegos

### Portada
- **El único objetivo de Juegos es recordar textos de la Biblia** (pedido del usuario). Se quitaron Memoria Bíblica, Trivia, Con lo que estudio, Libros de la Biblia, Reto del día, Juego de hoy (Memorama de personajes) y Logros: no regresarlos ni agregar juegos sueltos.
- Arriba, "Para memorizar": el primer texto de `memorizeSources` que es nuevo o toca hoy (`isDue`), con cita, versículo (letra de libro, `today-game-verse`) y "Practicar" (abre `Memorize` con `start`; al volver, sale a Juegos). Sin textos: explica que entra el del Texto diario. Todo practicado: "Listo por hoy".
- Abajo (`game-list`): Repasar hoy, Mis textos y Constancia (`registry.js`). Sin racha, récords ni cifras arriba. Sin puntito en la pestaña.
- `memoria/characters.js` sigue solo para reconocer personajes en el Texto diario (`dailyPeople`).

### Arquitectura
- `registry.js`: Mis textos y Constancia (recibe `{ store, toast, onExit }`; `stat(store)` opcional). Lógica en `logic.js` (con pruebas).
- `ui.jsx`: `GameScreen` (cierra deslizando; `back` = a dónde vuelve), `Result`, `SwipeCard`, `OrderPuzzle`, `Confetti`, `PasteJson`, `Empty`, `PairsGame` (Memorama de cita ↔ texto en Mis textos; récord `-tiempo`).

### Mis textos (Memorizar, `Memorize.jsx`)
- Entran solos los que va estudiando: el versículo (`dailyVerse`, cita aparte) de cada Texto diario con "Ya lo estudié" (`fields.estudiado`), del más reciente al más viejo (`fromDaily`; al practicarlo la primera vez se copia a `kind: 'memoria'` sin repetirse), y los que agrega el usuario (pegables; borrar deslizando). Las copias viejas del texto diario completo no entran (`memorizeSources`; `verseSources` es solo para Mi Biblia).
- Orden: Ocultar (Fácil → De memoria, 25/50/75/100 %; tocar muestra la palabra; en De memoria se oculta la cita) → Iniciales → Ordenar → Escribir (primera letra, sin acentos; a los 3 intentos se muestra; `typeWords`) → Cita (libro/capítulo/versículo, 4 opciones; `citeSteps`; solo con versículo). En Cita y De memoria el título dice "Texto". Tras "Lo sé", "Seguir con <siguiente>".
- Sugerencia "Lo sé" (Escribir ≥ 90 %, Ordenar ≤ 1 error, Cita sin errores), decide el usuario; `saveVerseResult` sube nivel con aviso. "Editar" (arriba a la derecha) corrige cita/texto sin perder nivel. Arriba de la lista, cuántos sabes. Memorama con ≥ 3 (`verse-pairs.js`, `best['textos-parejas-tiempo']`).

### Constancia (`Constancia.jsx`)
- También hasta arriba de Estudio. Racha de una meta personal: **nunca dice cuál**. Días, mejor racha, frase diaria con cita, "Volver a empezar" (confirma; la mejor queda). En 0 días: "Hoy empieza".
- `progreso.fields.constancia = { start, best, at }` (`constanciaDays`, `restartConstancia`, `mergeConstancia`; gana `at` más reciente, `best` el mayor).
- Push nocturno (por defecto 22:00, 22:30, 23:00): `src/lib/push.js` → `universe_push` (RLS; sesión y PWA, iOS 16.4+); `public/sw.js`; `supabase/functions/constancia-push` (`pg_cron` cada 5 min, `push_cron_secret` y VAPID en vault), una vez por hora y día. "Apagar avisos" solo borra horas de Constancia (`clearPushTimes`); el iPhone sigue registrado para Pendientes.

### Repasar hoy (`Review.jsx`)
- **Pendiente de cambiar** (pedido del usuario): no le gusta repasar sus respuestas; quiere repasar el contenido de La Atalaya tal cual y en qué Atalaya se dijo (`atalayaSourceCards` se guardó para eso). Hoy: solo lo estudiado (pedido del usuario): reuniones (Atalaya y entre semana), textos diarios analizados, conceptos del mapa; Personajes/Trivia/Memorizar no (salvo los ya vistos; con 3 pistas = `'help'`). Rondas de 8 (`SESSION`, ≤ 4 nuevas `NEW_PER_SESSION`; cifras de `roundSize`); "Terminar" grande, "Otra ronda (N)" chico. Guarda `progreso.fields.repaso` (día) y Hoy lo palomea.
- `dailyMix`: primero lo que toca (más atrasado, alternando tipos), luego nuevas turnadas por tipo, máx. 10/día (`NEW_PER_DAY`, `newToday`, "· Nueva"). El texto diario entra desde mañana.
- Tarjetas: texto diario (`dailyCards`, `c:<entrada>`, `dailyCheck`: elegir tu principio entre 4 o armar la cita); Atalaya (`atalayaCards`, `a:<entrada>:<pregunta>`, solo respondidas, `atalayaCheck`: tu respuesta entre 4, primero del mismo artículo; "¿De qué Atalaya es?" ya no entra, `atalayaSourceCards` sin usar).
- **Sin trampa** (`cardCheck`): título con versículo → armar la cita; si no, elegir título desde la definición (`guessPrompt` sin frases que repitan el título o se repitan en muchos nodos). `SwipeCard` solo sin otras tarjetas y tras "Ver la respuesta". Cita sabida solo sin errores.

### Repaso inteligente (`progress.js`)
- Leitner 0/1/2/4/7/15/30/60 días, `review(item, knew)`. Sube solo si ya tocaba; fallo = hoy y −2 cajas; `'help'` = misma caja, mañana. `first` cuenta nuevas; `dueCount` solo lo visto.
- Una entrada `id: 'progreso'` (`fields: { days, srs, triviaBest, best, ... }`); `mergeProgress` combina: `best` el mayor, `-tiempo` el menor.
