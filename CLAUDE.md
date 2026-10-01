# Universe — todo mi estudio bíblico en un solo lugar

App personal para el estudio bíblico de un Testigo de Jehová. El usuario la usa **solo desde iPhone (Safari / PWA en la pantalla de inicio)** y se publica en **Vercel** (proyecto `universe`, se despliega solo con cada push). Toda la interfaz está en español.

Tiene **3 pestañas abajo**: **Mapa**, **Estudio** y **Juegos**.

## Regla de oro
- **Nada de servicios de paga ni IA dentro de la app.** El análisis lo hace el usuario en su chat con Claude y pega el resultado (JSON) en la app. Todo lo "inteligente" de la app es código local sin costo.
- Supabase en plan gratis es el único servicio externo.

## Principios de diseño (no romper)
- **Primero iPhone**: respetar notch y barra inferior (`env(safe-area-inset-*)`), áreas táctiles ≥ 44px, inputs con `font-size: 16px` (evita el zoom de iOS), gestos fluidos. La barra de pestañas ocupa `--tabbar`; lo flotante va por encima.
- Diseño oscuro, moderno y elegante (fondo `#09090b`, vidrio esmerilado en barras, tipografía del sistema, botón principal blanco, tarjetas con borde sutil). Tokens de color en `:root` de `src/styles.css`. Mismo diseño en las 3 pestañas.
- **Simple antes que ingenioso.** Nada de funciones que el usuario no pidió.

## 1) Pestaña Mapa
- Mapa tipo Obsidian: cada idea es un nodo. Un nodo es solo **título + definición**. La interfaz NO muestra tipo, origen, fuentes, la palabra "raíz" ni etiquetas "JW / mi razonamiento", y el editor no tiene secciones de fuentes ni conexiones. Los campos `type`, `origin`, `sources` y las conexiones importadas se conservan en los datos por si el usuario los pide después.
- **Conectar ideas** = enlazar otro nodo en el texto con `[[Título]]` (botón "Enlazar otro nodo"). Se dibujan como líneas rectas sin flecha. Las conexiones con relación (`ENSEÑA`…) solo llegan por "Pegar conocimiento".
- Los bloques antiguos `> [!jw]` / `> [!yo]` se muestran como texto normal y se limpian al editar (`unwrapCallouts`).
- **Nota estilo Obsidian, como hoja de iOS**: solo título y texto, sin botones ni pastillas. La hoja mide lo que mide la nota (mín. 48 % de la pantalla) y deja ver el mapa atrás. Se cierra deslizándola hacia abajo (desde arriba del texto) o tocando fuera; deslizar a la derecha vuelve a la nota anterior. Editar = lápiz pequeño y discreto arriba a la derecha. Los `[[enlaces]]` se abren con un toque.
- **Grafo**: líneas RECTAS (nunca curvas), zoom y arrastre con los dedos. Nodos gris neutro; Jehová (`id: "jehova"`) fijo en el centro, el ÚNICO dorado (`#f5d27a`, halo suave), no se puede borrar.
- Menú (☰): nuevo nodo, pegar conocimiento, cuenta y nube, exportar / importar respaldo.

## 2) Pestaña Estudio
Cuatro apartados, definidos en `src/study/kinds.js` (`KINDS`). Para agregar o cambiar un apartado basta con editar esa definición (campos, título en la lista, formato para Claude y cómo se resume al mapa).
- **Texto diario**: fecha, texto, contexto, principio bíblico, relato de apoyo, aplicación, resumen en 3-4 palabras y mis notas.
- **Reuniones**: La Atalaya o entre semana, fecha, título, idea principal, notas por párrafo y notas generales.
- **Preparar estudios (Método Aha)**: título, idea central, Gancho, Extracción, Golpe lógico, Aha extra (opcional) y Resumen.
- **Mis reflexiones**: título, nota libre y preguntas abiertas (una por línea).
- Cada entrada tiene **"Pegar de Claude"**: se pega un JSON y se llenan los campos (con alias de nombres); el usuario revisa y guarda. "Copiar formato para Claude" da la plantilla del apartado.
- **"Proponer al mapa"** (`proposeNode`): arma un nodo solo con lo clave (título, idea principal, principio, preguntas abiertas y las citas bíblicas detectadas). Se muestra la vista previa editable; el usuario aprueba o descarta. Si el título ya existe, se le **añade** la información sin borrar nada. La entrada guarda `mapNodeId`.

## 3) Pestaña Juegos
- Menú con: **Memoria Bíblica**, **Trivia de preguntas**, **Memorizar textos** y **Juegos con lo que estudio** (usan los nodos y las notas del usuario).
- **Memoria Bíblica** ya existe aparte (171 personajes, 8 mundos, 4 modos, línea del tiempo, mapa y repaso diario), desplegada en Vercel sin GitHub. Su espacio queda listo; el código se integra después.
- Los juegos se registran en `src/games/registry.js`: agregar o cambiar un juego = una entrada en esa lista (cada componente recibe `{ store, toast, onExit }`). La lógica sin interfaz va en `src/games/logic.js` (con pruebas) y las piezas comunes (`GameScreen`, `Quiz`, `PasteJson`) en `src/games/ui.jsx`.
- **Trivia**: preguntas que el usuario pega desde Claude (`{ "preguntas": [{ pregunta, opciones, respuesta, explicacion, cita }] }`), guardadas como entradas `kind: 'trivia'`. Rondas de 10.
- **Memorizar textos**: 4 niveles (Fácil → De memoria) que ocultan 25/50/75/100 % de las palabras; tocar un espacio muestra la palabra; "Lo sé" sube de nivel. Textos propios (`kind: 'memoria'`, también pegables desde Claude) + los del Texto diario.
- **Con lo que estudio**: "¿Qué es?" (definición → elegir el nodo), "Parejas" (título ↔ definición) y "Tarjetas" (nodos y textos diarios).

## Guardado
- Local primero: IndexedDB (`src/lib/db.js`, stores `nodes`, `edges`, `entries`, `meta`) con `navigator.storage.persist()`. Funciona sin conexión.
- Nube: Supabase plan gratis (proyecto "Memoria Bíblica", `jikonxuznepdyhcjyysh`), tablas `universe_nodes`, `universe_edges` y `universe_entries` (Estudio y juegos, `fields` en jsonb), todas con RLS por `user_id`. Inicio de sesión con correo + contraseña desde "Cuenta y nube" (menú del mapa o el botón de nube arriba a la derecha en Estudio y Juegos). Mientras no haya sesión, todo se queda en el teléfono; al entrar por primera vez se sube todo lo local.
- Respaldo: exportar / importar JSON (`buildExport` incluye nodos, conexiones y entradas de Estudio).

## Estructura
- `src/App.jsx`: pestañas, notas abiertas del mapa, hojas y avisos.
- `src/components/`: `TabBar`, `Icon`, `Graph` (react-force-graph-2d en canvas), `NoteView`, `NodeEditor`, `NodePicker`, `PasteSheet`, `Search`, `Menu`, `AccountSheet`.
- `src/study/`: `kinds.js` (definición de apartados, "Pegar de Claude", "Proponer al mapa", detector de citas) y `StudyTab.jsx`.
- `src/games/`: `registry.js` (lista de juegos), `GamesTab.jsx`, `logic.js`, `ui.jsx`, `Trivia.jsx`, `Memorize.jsx`, `StudyGames.jsx`, `MemoriaBiblica.jsx` (espacio reservado).
- `src/lib/model.js`: modelo de nodos y conexiones. `src/lib/store.js`: hook `useStore` (nodos, conexiones, entradas). `src/lib/markdown.js`: render y `[[enlaces]]`. `src/lib/importer.js`: "Pegar conocimiento" (`planImport` con vista previa) y respaldos.
- `src/lib/db.js`: cada cambio local se anota en el outbox (`meta.outbox`) en la misma transacción; los cambios de la nube usan `commit(change, { track: false })`.
- `src/lib/sync.js`: ciclo bajar (`server_updated_at` > última vez) → subir outbox; gana el `updatedAt` más reciente; borrados como lápidas (`deleted = true`). `src/lib/useSync.js`: sesión y disparadores. `src/lib/supabase.js`: cliente (clave publicable; la seguridad la da RLS).
- `public/sw.js`: service worker (offline). Si cambian archivos sin hash en `public/`, subir `CACHE`.

## Modelo de datos
```js
Node  = { id, title, note /* markdown */, type, origin, sources, createdAt, updatedAt }
Edge  = { id, source, target, rel /* MAYÚSCULAS */, createdAt, updatedAt }
Entry = { id, kind: 'diario'|'reunion'|'estudio'|'reflexion' | 'trivia'|'memoria', fields: { ... }, mapNodeId?, createdAt, updatedAt }
```
- Los títulos de nodos son únicos (sin distinguir mayúsculas ni acentos).

## Formato de "Pegar conocimiento" (mapa)
`{ "nodes": [{ title, note }], "edges": [{ from, to, rel }] }`. Si un nodo ya existe se le añade la información. Un respaldo (`app: "universe"`) puede restaurarse reemplazando todo. Siempre hay vista previa y confirmación.

## Comandos
- `npm run dev`: servidor local (`--host` para abrirlo desde el iPhone en la misma red).
- `npm test`: pruebas (vitest) del importador, enlaces, Estudio y sincronización.
- `npm run build`: compila a `dist/`.
