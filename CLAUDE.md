# Universe — todo mi estudio bíblico en un solo lugar

App personal para el estudio bíblico de un Testigo de Jehová. El usuario la usa **solo desde iPhone (Safari / PWA en la pantalla de inicio)** y se publica en **Vercel** (proyecto `universe`, se despliega solo con cada push). Toda la interfaz está en español.

Tiene **3 pestañas abajo**: **Mapa**, **Estudio** y **Juegos**. **La app abre en Estudio**, con **"Hoy"** arriba (lo que toca hacer hoy), porque el usuario entraba y no sabía qué hacer.

## Regla de oro
- **Nada de servicios de paga ni IA dentro de la app.** El análisis lo hace el usuario en su chat con Claude y pega el resultado (JSON) en la app. Todo lo "inteligente" de la app es código local sin costo.
- Supabase en plan gratis es el único servicio externo.

## Principios de diseño (no romper)
- **Estudio y Juegos** usan `PageScroll` (`src/components/PageScroll.jsx`): al bajar aparece una barra de vidrio con el título chico para que nada se encime con los botones de arriba.
- **Primero iPhone**: respetar notch y barra inferior (`env(safe-area-inset-*)`), áreas táctiles ≥ 44px, inputs con `font-size: 16px` (evita el zoom de iOS), gestos fluidos. La barra de pestañas ocupa `--tabbar`; lo flotante va por encima.
- Diseño **original negro** (fondo `#09090b`, vidrio esmerilado en barras, tipografía del sistema, botón principal blanco, tarjetas con borde sutil) con versión **blanca** (fondo `#fafafa`, botón principal negro). Se cambia en el menú del mapa (Apariencia: Negro / Blanco) o con la luna/sol arriba a la derecha en Estudio y Juegos; se guarda en el teléfono (`src/lib/theme.js`, `data-theme` en `<html>`, negro por defecto). Todos los colores son variables en `:root` (negro) y `:root[data-theme='light']` (blanco) de `src/styles.css`; el mapa (canvas) lee las variables `--graph-*`. Jehová sigue siendo el único nodo dorado.
- **Estilo "Como JW"** (el usuario lo pidió para que todo se parezca a JW Library; viene prendido): `data-style='jw'` en `<html>` (`universe-style` en este teléfono, `useTheme` en `src/lib/theme.js` y el script de `index.html`), funciona con Negro y Blanco. Fondo negro puro o blanco, barras grises sólidas, acento lavanda (`--accent`, morado en blanco) en "Atrás", la pestaña activa (con su fondo redondeado, como en JW Library), los pasos y el botón principal; citas y números de versículo en azul (`--link`, `--verse-num`); letra de libro (`--font-book`) en todo lo que se lee (La Atalaya, entre semana, Mi Biblia, el versículo de Hoy). Detalles como en JW Library: Estudio y Juegos con barra gris fija y el título al centro (`page-bar` siempre visible; el título grande se oculta) y la luna y la nube como íconos lavanda en esa barra; los pasos (Programa / Partes / Listo, y los de La Atalaya) como pestañas en MAYÚSCULAS con raya lavanda; esquinas casi rectas; "Hoy" con la fecha en lavanda; los títulos de sección grandes en negritas. La de entre semana como la Guía de actividades: "5-11 DE OCTUBRE" grande en gris (`mw-week`), la lectura en azul y en mayúsculas, una línea, cada sección grande en su color con un cuadro, el título de cada parte numerado y en su color, "(10 mins.)" abajo (`mw-mins`) y las citas en azul dentro del texto. En las publicaciones la letra es normal; solo la Biblia lleva letra de libro. Pulido general en este estilo: en la lista de un apartado "‹ Estudio" y el + van en el mismo renglón (el título ya está en la barra); todas las tarjetas (también las de Juegos, Memoria Bíblica y resultados) con esquinas de 6px y fondo liso; íconos de apartados y juegos en lavanda sobre fondo lavanda tenue; al tocar una tarjeta se aclara (o se oscurece en blanco); campos con borde lavanda al escribir; en las tarjetas de juegos el avance ("125 preguntas") va debajo de la descripción para no aplastar el título. Se cambia en el menú del mapa: Apariencia → Estilo: Como JW / Original. No se copian el logo, los íconos ni el nombre de JW Library. Jehová sigue siendo el único nodo dorado.
- **Simple antes que ingenioso.** Nada de funciones que el usuario no pidió.
- **Nunca emojis**: ni en la app ni en el contenido que se le propone (definiciones, nodos, notas).

## Detalle por área (leer solo lo que la tarea necesite)
El detalle completo de cada parte vive en `docs/`. Antes de tocar una de estas áreas, lee su archivo:
- `docs/mapa.md`: pestaña Mapa (galaxias, grafo, notas del mapa, anillos, menú, Por escarbar).
- `docs/estudio.md`: pestaña Estudio (Hoy, Texto diario, Reuniones, Conceptos, Notas, Ideas, Asignaciones, Leer la Biblia, Buscar en todo).
- `docs/juegos.md`: pestaña Juegos (Memoria Bíblica, Trivia, Memorizar, Con lo que estudio, Libros, Reto del día, Repasar hoy, Logros, repaso inteligente).
- `docs/biblia.md`: textos bíblicos tocables, Mi Biblia, lector de capítulo y Publicaciones.
- `docs/paquetes.md`: paquetes (`SEEDS`) que cambian el mapa; la regla del mapa.

## Guardado
- Local primero: IndexedDB (`src/lib/db.js`, stores `nodes`, `edges`, `entries`, `meta`) con `navigator.storage.persist()`. Funciona sin conexión.
- Nube: Supabase plan gratis (proyecto "Memoria Bíblica", `jikonxuznepdyhcjyysh`), tablas `universe_nodes`, `universe_edges` y `universe_entries` (Estudio y juegos, `fields` en jsonb), todas con RLS por `user_id`. Inicio de sesión con correo + contraseña desde "Cuenta y nube" (menú del mapa o el botón de nube arriba a la derecha en Estudio y Juegos). Mientras no haya sesión, todo se queda en el teléfono; al entrar por primera vez se sube todo lo local.
- Respaldo: exportar / importar JSON (`buildExport` incluye nodos, conexiones y entradas de Estudio).

## Estructura
- `src/App.jsx`: pestañas, notas abiertas del mapa, hojas y avisos.
- `src/components/`: `TitleArea` (título que crece en varios renglones, sin saltos; Notas, nodos, editor del mapa y Proponer al mapa), `TabBar`, `Icon`, `Graph` (react-force-graph-2d en canvas), `NoteView`, `NodeEditor`, `NodePicker`, `PasteSheet`, `Search`, `Menu`, `AccountSheet`, `DigList` (Por escarbar).
- `src/study/`: `kinds.js` (definición de apartados, "Pegar de Claude", "Proponer al mapa", detector de citas) y `StudyTab.jsx`.
- `src/games/`: `registry.js` (lista de juegos), `GamesTab.jsx`, `logic.js`, `ui.jsx`, `Trivia.jsx`, `Memorize.jsx`, `StudyGames.jsx`, `Books.jsx`, `Review.jsx`, `MemoriaBiblica.jsx` + `memoria/` (personajes y lógica).
- `src/lib/model.js`: modelo de nodos y conexiones. `src/lib/store.js`: hook `useStore` (nodos, conexiones, entradas). `src/lib/markdown.js`: render y `[[enlaces]]`. `src/lib/support.js`: en qué se apoya cada idea (niveles, camino hasta un texto, quién la usa, conexiones). `src/lib/importer.js`: "Pegar conocimiento" (`planImport` con vista previa) y respaldos.
- `src/lib/db.js`: cada cambio local se anota en el outbox (`meta.outbox`) en la misma transacción; los cambios de la nube usan `commit(change, { track: false })`.
- `src/lib/sync.js`: ciclo bajar (`server_updated_at` > última vez) → subir outbox; gana el `updatedAt` más reciente; borrados como lápidas (`deleted = true`). `src/lib/useSync.js`: sesión y disparadores. `src/lib/supabase.js`: cliente (clave publicable; la seguridad la da RLS).
- `public/sw.js`: service worker (offline). Si cambian archivos sin hash en `public/`, subir `CACHE`.

## Modelo de datos
```js
Node  = { id, title, note /* markdown */, type, origin, sources, galaxy /* 'english'|'escuela'|'espiritual' */, createdAt, updatedAt }
Edge  = { id, source, target, rel /* MAYÚSCULAS */, createdAt, updatedAt }
Entry = { id, kind: 'diario'|'reunion'|'estudio'|'reflexion' /* Notas */ | 'idea' | 'asignacion' | 'trivia'|'memoria'|'progreso' | 'biblia', fields: { ... }, mapNodeId?, createdAt, updatedAt }
```
- Los títulos de nodos son únicos (sin distinguir mayúsculas ni acentos).

## Formato de "Pegar conocimiento" (mapa)
`{ "nodes": [{ title, note }], "edges": [{ from, to, rel }] }`. Si un nodo ya existe se le añade la información. Un respaldo (`app: "universe"`) puede restaurarse reemplazando todo. Siempre hay vista previa y confirmación.

## Comandos
- `npm run dev`: servidor local (`--host` para abrirlo desde el iPhone en la misma red).
- `npm test`: pruebas (vitest) del importador, enlaces, Estudio y sincronización.
- `npm run build`: compila a `dist/`.
