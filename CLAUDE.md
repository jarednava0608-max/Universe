# Universe — todo mi estudio bíblico en un solo lugar

App personal para el estudio bíblico de un Testigo de Jehová. El usuario la usa **solo desde iPhone (Safari / PWA en la pantalla de inicio)** y se publica en **Vercel** (proyecto `universe`, se despliega solo con cada push). Toda la interfaz está en español.

Tiene **3 pestañas abajo**: **Mapa**, **Estudio** y **Juegos**.

## Regla de oro
- **Nada de servicios de paga ni IA dentro de la app.** El análisis lo hace el usuario en su chat con Claude y pega el resultado (JSON) en la app. Todo lo "inteligente" de la app es código local sin costo.
- Supabase en plan gratis es el único servicio externo.

## Principios de diseño (no romper)
- **Primero iPhone**: respetar notch y barra inferior (`env(safe-area-inset-*)`), áreas táctiles ≥ 44px, inputs con `font-size: 16px` (evita el zoom de iOS), gestos fluidos. La barra de pestañas ocupa `--tabbar`; lo flotante va por encima.
- Diseño **original negro** (fondo `#09090b`, vidrio esmerilado en barras, tipografía del sistema, botón principal blanco, tarjetas con borde sutil) con versión **blanca** (fondo `#fafafa`, botón principal negro). Se cambia en el menú del mapa (Apariencia: Negro / Blanco) o con la luna/sol arriba a la derecha en Estudio y Juegos; se guarda en el teléfono (`src/lib/theme.js`, `data-theme` en `<html>`, negro por defecto). Todos los colores son variables en `:root` (negro) y `:root[data-theme='light']` (blanco) de `src/styles.css`; el mapa (canvas) lee las variables `--graph-*`. Jehová sigue siendo el único nodo dorado.
- **Simple antes que ingenioso.** Nada de funciones que el usuario no pidió.

## 1) Pestaña Mapa
- Mapa tipo Obsidian: cada idea es un nodo. Un nodo es solo **título + definición**. La interfaz NO muestra tipo, origen, fuentes, la palabra "raíz" ni etiquetas "JW / mi razonamiento", y el editor no tiene secciones de fuentes ni conexiones. Los campos `type`, `origin`, `sources` y las conexiones importadas se conservan en los datos por si el usuario los pide después.
- **Conectar ideas** = enlazar otro nodo en el texto con `[[Título]]` (botón "Enlazar otro nodo"). Se dibujan como líneas rectas sin flecha. Las conexiones con relación (`ENSEÑA`…) solo llegan por "Pegar conocimiento".
- Los bloques antiguos `> [!jw]` / `> [!yo]` se muestran como texto normal y se limpian al editar (`unwrapCallouts`).
- **Nota estilo Obsidian, como hoja de iOS con dos alturas** (como Apple Maps): solo título y texto, sin botones ni pastillas. Abre a la mitad (el mapa centra el nodo arriba); arrastrar hacia arriba la muestra completa (ahí el texto hace scroll); arrastrar hacia abajo pasa de completa a la mitad y de la mitad la cierra; tocar fuera también cierra. Deslizar a la derecha vuelve a la nota anterior. Editar = lápiz pequeño arriba a la derecha. Los `[[enlaces]]` se abren con un toque.
- **Grafo**: líneas RECTAS (nunca curvas), zoom y arrastre con los dedos. Nodos gris neutro; Jehová (`id: "jehova"`) fijo en el centro, el ÚNICO dorado (`#f5d27a`, halo suave), no se puede borrar.
- Menú (☰): nuevo nodo, pegar conocimiento, cuenta y nube, exportar / importar respaldo.

## 2) Pestaña Estudio
Cuatro apartados, definidos en `src/study/kinds.js` (`KINDS`; `notes: true` usa el editor tipo Notas). Para agregar o cambiar un apartado basta con editar esa definición (campos, título en la lista, formato para Claude y cómo se resume al mapa).
- **Texto diario**: fecha, texto, contexto, principio bíblico, relato de apoyo, aplicación, resumen en 3-4 palabras y mis notas.
- **Reuniones**: La Atalaya o entre semana, fecha, título, idea principal, notas por párrafo y notas generales.
- **Preparar estudios (Método Aha)**: título, idea central, Gancho, Extracción, Golpe lógico, Aha extra (opcional) y Resumen.
- **Notas** (antes "Mis reflexiones"; el `kind` sigue siendo `'reflexion'` para no perder datos): funciona como la app Notas del iPhone. Se toca + y se escribe (título + texto con formato, sin etiquetas). Editor `src/study/RichNote.jsx` (TipTap, local y gratis; se carga aparte y `main.jsx` lo precarga para que funcione sin conexión) con barra siempre visible abajo que sube con el teclado (se pega a `visualViewport`, porque en iOS el teclado no achica la página): **Aa** (Título / Subtítulo / Encabezado / Cuerpo, negrita, cursiva, subrayado, tachado, 5 colores de letra y 5 de resaltado), lista de tareas, lista, lista numerada, **tabla** (dentro de una tabla la barra cambia a + fila / + columna / quitar / borrar), enlazar nodo, cita, línea, deshacer y listo. **Enlaces a nodos**: botón de enlace o escribir `[[` abre la lista de nodos; se guarda como `<a data-node>` y en el texto simple como `[[Título]]` (`NodeLink` en `src/study/noteExtensions.js`). **Citas tocables dentro del texto** (decoración `BibleRefs`, no cambia lo guardado). Si no estás escribiendo, tocar una cita abre wol.jw.org y tocar un enlace abre el nodo en el mapa (antes se guarda la nota); si estás escribiendo, solo mueve el cursor. **Compartir** en el menú ⋯ (hoja de compartir del iPhone, o copia si no hay; texto legible con `docToText` en `src/study/noteText.js`). Se guarda en `fields.html`; `fields.texto` es el texto simple (buscar, "Proponer al mapa", citas). Las notas viejas y lo pegado de Claude se convierten de Markdown (`markdownToHtml`, con tablas y `- [ ]` tareas); se guarda sola al dejar de escribir, al salir y si la app pasa a segundo plano; una nota vacía se borra. La lista va por última edición, con buscador y fecha corta (hora / Ayer / día). El botón ⋯ tiene "Pegar de Claude", "Proponer al mapa" y "Eliminar nota". Las reflexiones viejas con preguntas abiertas aparte se juntan en el texto al abrirlas (`noteBody`).
- Cada entrada tiene **"Pegar de Claude"**: se pega un JSON y se llenan los campos (con alias de nombres); el usuario revisa y guarda. "Copiar formato para Claude" da la plantilla del apartado.
- **"Proponer al mapa"** (`proposeNode`): arma un nodo solo con lo clave (título, idea principal, principio, preguntas abiertas y las citas bíblicas detectadas). Se muestra la vista previa editable; el usuario aprueba o descarta. Si el título ya existe, se le **añade** la información sin borrar nada. La entrada guarda `mapNodeId`.

## 3) Pestaña Juegos
- Menú con: **Memoria Bíblica**, **Trivia de preguntas**, **Memorizar textos**, **Juegos con lo que estudio** (usan los nodos y las notas del usuario) y **Libros de la Biblia**.
- **Memoria Bíblica** ya existe aparte (171 personajes, 8 mundos, 4 modos, línea del tiempo, mapa y repaso diario), desplegada en Vercel sin GitHub. Su espacio queda listo; el código se integra después.
- Los juegos se registran en `src/games/registry.js`: agregar o cambiar un juego = una entrada en esa lista (cada componente recibe `{ store, toast, onExit }`). La lógica sin interfaz va en `src/games/logic.js` (con pruebas) y las piezas comunes en `src/games/ui.jsx`: `GameScreen`, `Quiz` (con `seconds` es contra reloj; racha de aciertos, lista "Para repasar" al final y confeti si sale bien), `OrderPuzzle` (tocar trozos en orden), `Confetti`, `ModeCard` y `PasteJson`.
- **Trivia**: preguntas que el usuario pega desde Claude (`{ "preguntas": [{ pregunta, opciones, respuesta, explicacion, cita }] }`), guardadas como entradas `kind: 'trivia'`. Rondas de 10, modo **Normal** o **Contra reloj** (15 s por pregunta, 100 pts + hasta 100 por rapidez, récord en `best['trivia-reloj']`). "Ver mis preguntas" permite borrarlas una por una.
- **Memorizar textos**: tres formas de practicar: **Ocultar** (4 niveles, Fácil → De memoria, que ocultan 25/50/75/100 % de las palabras; tocar un espacio muestra la palabra), **Iniciales** (solo la primera letra de cada palabra) y **Ordenar** (tocar los trozos del texto en orden). "Lo sé" sube de nivel (`saveVerseResult`). Textos propios (`kind: 'memoria'`, también pegables desde Claude) + los del Texto diario.
- **Con lo que estudio**: "¿Qué es?" (definición → elegir el nodo), "Parejas" (título ↔ definición, con tiempo), "Tarjetas" (nodos y textos diarios) y "¿Dónde está?" (texto → elegir su cita; usa los textos de Memorizar y del Texto diario).
- **Libros de la Biblia** (`Books.jsx`): preguntas (qué libro va antes / después, en qué sección está; récord en `best.libros`), ordenar 6 libros seguidos y la lista de los 66 por sección (`SECTIONS` en `logic.js`, `BOOKS` en `bible.js`).
- **Repasar hoy** (`Review.jsx`, botón en la tarjeta de racha): una sola sesión de hasta 20 cosas que tocan hoy (tarjetas, textos con iniciales y preguntas), alternadas (`dailyMix`).
- **Logros** (botón con medalla junto a "Repasar hoy"): se calculan con el progreso (`achievements` en `progress.js`), no se guardan aparte.
- **Racha y progreso** (arriba en Juegos): días seguidos estudiando (cualquier guardado cuenta; se marca en `store.apply`), la semana, lo que toca repasar hoy, textos memorizados y mejor trivia.
- **Repaso inteligente** (`src/games/progress.js`, tipo Leitner, intervalos 0/1/2/4/7/15/30/60 días): Tarjetas muestra solo lo que toca hoy; Trivia elige primero las preguntas falladas o vencidas; Memorizar ordena y marca "Hoy". Lo que sabes se espacia; lo que fallas vuelve hoy.
- Todo el progreso vive en una sola entrada `id: 'progreso'` (`fields: { days, srs, triviaBest, best }`); al sincronizar se **combina** entre dispositivos (`mergeProgress`, los récords de `best` se quedan con el mayor), no se pisa.

## Textos bíblicos tocables
- `src/lib/bible.js`: reconoce citas en español ("Juan 17:3", "1 Juan 4:8", "Sal. 83:18", solo el capítulo como "Jeremías 38", abreviaturas de la TNM) y arma el enlace directo a la Biblia en wol.jw.org (`/es/wol/b/r4/lp-s/nwtsty/{libro}/{capítulo}`); si no reconoce el libro, una búsqueda en wol. Sin servicios externos.
- Se vuelven tocables en las notas del mapa (sin tocar los `[[enlaces]]`), en el editor de Estudio (fila "Textos bíblicos"), en Trivia y en Memorizar.

## Guardado
- Local primero: IndexedDB (`src/lib/db.js`, stores `nodes`, `edges`, `entries`, `meta`) con `navigator.storage.persist()`. Funciona sin conexión.
- Nube: Supabase plan gratis (proyecto "Memoria Bíblica", `jikonxuznepdyhcjyysh`), tablas `universe_nodes`, `universe_edges` y `universe_entries` (Estudio y juegos, `fields` en jsonb), todas con RLS por `user_id`. Inicio de sesión con correo + contraseña desde "Cuenta y nube" (menú del mapa o el botón de nube arriba a la derecha en Estudio y Juegos). Mientras no haya sesión, todo se queda en el teléfono; al entrar por primera vez se sube todo lo local.
- Respaldo: exportar / importar JSON (`buildExport` incluye nodos, conexiones y entradas de Estudio).

## Estructura
- `src/App.jsx`: pestañas, notas abiertas del mapa, hojas y avisos.
- `src/components/`: `TabBar`, `Icon`, `Graph` (react-force-graph-2d en canvas), `NoteView`, `NodeEditor`, `NodePicker`, `PasteSheet`, `Search`, `Menu`, `AccountSheet`.
- `src/study/`: `kinds.js` (definición de apartados, "Pegar de Claude", "Proponer al mapa", detector de citas) y `StudyTab.jsx`.
- `src/games/`: `registry.js` (lista de juegos), `GamesTab.jsx`, `logic.js`, `ui.jsx`, `Trivia.jsx`, `Memorize.jsx`, `StudyGames.jsx`, `Books.jsx`, `Review.jsx`, `MemoriaBiblica.jsx` (espacio reservado; el código original está en el proyecto de Vercel `memoria-biblica`, archivos `index.html` y `data.js`).
- `src/lib/model.js`: modelo de nodos y conexiones. `src/lib/store.js`: hook `useStore` (nodos, conexiones, entradas). `src/lib/markdown.js`: render y `[[enlaces]]`. `src/lib/importer.js`: "Pegar conocimiento" (`planImport` con vista previa) y respaldos.
- `src/lib/db.js`: cada cambio local se anota en el outbox (`meta.outbox`) en la misma transacción; los cambios de la nube usan `commit(change, { track: false })`.
- `src/lib/sync.js`: ciclo bajar (`server_updated_at` > última vez) → subir outbox; gana el `updatedAt` más reciente; borrados como lápidas (`deleted = true`). `src/lib/useSync.js`: sesión y disparadores. `src/lib/supabase.js`: cliente (clave publicable; la seguridad la da RLS).
- `public/sw.js`: service worker (offline). Si cambian archivos sin hash en `public/`, subir `CACHE`.

## Modelo de datos
```js
Node  = { id, title, note /* markdown */, type, origin, sources, createdAt, updatedAt }
Edge  = { id, source, target, rel /* MAYÚSCULAS */, createdAt, updatedAt }
Entry = { id, kind: 'diario'|'reunion'|'estudio'|'reflexion' /* Notas */ | 'trivia'|'memoria'|'progreso', fields: { ... }, mapNodeId?, createdAt, updatedAt }
```
- Los títulos de nodos son únicos (sin distinguir mayúsculas ni acentos).

## Formato de "Pegar conocimiento" (mapa)
`{ "nodes": [{ title, note }], "edges": [{ from, to, rel }] }`. Si un nodo ya existe se le añade la información. Un respaldo (`app: "universe"`) puede restaurarse reemplazando todo. Siempre hay vista previa y confirmación.

## Comandos
- `npm run dev`: servidor local (`--host` para abrirlo desde el iPhone en la misma red).
- `npm test`: pruebas (vitest) del importador, enlaces, Estudio y sincronización.
- `npm run build`: compila a `dist/`.
