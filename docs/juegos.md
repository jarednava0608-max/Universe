## 3) Pestaña Juegos

### Portada
- **Una sola cosa: Repasar** (pedido del usuario: "tengo mil juegos, quiero uno"; su objetivo es aprenderse textos de la Biblia). Se quitaron Memoria Bíblica, Trivia, Con lo que estudio, Libros, Reto del día, Juego de hoy, Logros, los modos de Memorizar (Ocultar, Iniciales, Ordenar…), el Memorama y el Repasar hoy de sus respuestas: no regresarlos ni agregar juegos sueltos.
- Arriba: "Repasar · N preguntas" y el botón; sin nada pendiente, "Listo por hoy"; sin textos, cómo agregar (Aprenderlo). Abajo (`registry.js`): Mis textos y Constancia. Sin racha, récords ni cifras arriba.
- `memoria/characters.js` sigue solo para reconocer personajes en el Texto diario (`dailyPeople`).

### Aprenderlo (el usuario elige; nada entra solo)
- Botón "Aprenderlo" en la hoja de cualquier cita (`RefSheet`, versículo o tramo con texto; no capítulos ni publicaciones) y "Aprender este texto" en el Texto diario. `planLearn` (`verseSave.js`): marca `fields.aprender` en la entrada `kind: 'memoria'` de esa cita o crea una. Guardar un texto en Mi Biblia ya no lo manda a Memorizar.
- Meta sugerida al usuario: unos 2 textos nuevos por semana (se puede subir).

### Repasar (`repaso.js` con pruebas, `Repaso.jsx`)
- Rondas de 5 (`SIZE`), una pregunta a la vez; "Otras 5" si queda algo (sin repetir en la sesión, `skip`).
- `repasoRound`: primero los textos que tocan (`isDue`), luego hasta 2 nuevos (`NEW_PER_ROUND`); y una de La Atalaya si toca o de vez en cuando.
- Textos (`learnSources`): la pregunta sube con la caja (`verseMode`): nuevo = Apréndetelo (`WriteIt` con `learn`: leer cita y texto, luego escribirlos completos; pedido del usuario, "solo así me los aprendo") → ¿Dónde está? (el texto y 4 citas completas de libros distintos, `whereOptions`) → ¿Qué dice? (la cita y 4 textos cortos, `sayOptions`) → Escríbelo de memoria con todo y cita (pista: cómo empieza). Se revisa con `compareWords` (sin acentos ni signos, lo que faltó en rojo) y `sameCite` ("Lucas 14 13 14" vale); sabido con cita bien y ≥ 90 %; "Seguir escribiendo" (conserva lo escrito) o "Borrar y empezar" (limpia y vuelve a leerlo).
- La Atalaya (solo las que estudió, todo de jw.org, nunca sus respuestas): ¿Qué texto lo prueba? (`proofCards`: la idea antes de cada "(Lea …)", solo textos que se leen; opciones = otros "Lea" o sus textos) y, a veces, ¿De qué Atalaya es? (`atalayaSourceCards`, con 3 artículos o más).
- **Nunca preguntar algo que no leyó** (citas entre paréntesis sin "Lea", por ejemplo). Si falla: la opción se marca, pista si hay ("Empieza: …") y vuelve a intentar; cuenta como no sabida.
- Entre semana: por ahora solo sus textos vía Aprenderlo (sin preguntas de contenido).

### Mis textos (`Memorize.jsx`)
- Solo la lista de lo que eligió aprender, con cómo va (Nuevo, Ubicándolo, Reconociéndolo, De memoria); tocar abre Apréndetelo (cuenta para el repaso); deslizar lo quita de Repasar (`aprender: false`, con Deshacer). "Agregar" y "Agregar textos de Claude" (`VERSES_FORMAT`) entran ya para aprender.

### Constancia (`Constancia.jsx`)
- También hasta arriba de Estudio. Racha de una meta personal: **nunca dice cuál**. Días, mejor racha, frase diaria con cita, "Volver a empezar" (confirma; la mejor queda). En 0 días: "Hoy empieza".
- `progreso.fields.constancia = { start, best, at }` (`constanciaDays`, `restartConstancia`, `mergeConstancia`; gana `at` más reciente, `best` el mayor).
- Push nocturno (por defecto 22:00, 22:30, 23:00): `src/lib/push.js` → `universe_push` (RLS; sesión y PWA, iOS 16.4+); `public/sw.js`; `supabase/functions/constancia-push` (`pg_cron` cada 5 min, `push_cron_secret` y VAPID en vault), una vez por hora y día. "Apagar avisos" solo borra horas de Constancia (`clearPushTimes`); el iPhone sigue registrado para Pendientes.

### Repaso inteligente (`progress.js`)
- Leitner 0/1/2/4/7/15/30/60 días, `review(item, knew)`. Sube solo si ya tocaba; fallo = hoy y −2 cajas; `'help'` = misma caja, mañana. `first` cuenta nuevas; `dueCount` solo lo visto.
- Una entrada `id: 'progreso'` (`fields: { days, srs, repaso, ... }`); `mergeProgress` combina (`best` y `-tiempo` quedan de antes). Claves: `v:<texto>`, `p:<artículo>:<párrafo>:<cita>`, `s:<trozo>`.
