# Universe — mapa de conocimiento para estudio bíblico

Mapa personal tipo Obsidian para el estudio bíblico de un Testigo de Jehová. Cada idea es un nodo conectado con otros, para no perder preguntas ni respuestas. El usuario lo usa **solo desde iPhone (Safari / PWA en la pantalla de inicio)** y se publica en **Vercel**. Toda la interfaz está en español.

## Principios (no romper)
- **Primero iPhone**: respetar notch y barra inferior (`env(safe-area-inset-*)`), áreas táctiles ≥ 44px, inputs con `font-size: 16px` (evita el zoom de iOS), gestos fluidos.
- **Simple ante todo** (pedido del usuario): un nodo es solo **título + definición**. La interfaz NO muestra tipo, origen, fuentes, la palabra "raíz" ni etiquetas "JW / mi razonamiento", y el editor no tiene secciones de fuentes ni conexiones. Los campos `type`, `origin`, `sources` y las conexiones importadas se conservan en los datos (y en el formato de importación) por si el usuario los pide después; no los vuelvas a mostrar sin que lo pida.
- **Conectar ideas** = enlazar otro nodo dentro del texto con `[[Título]]` (botón "Enlazar otro nodo" en el editor). Esos enlaces se dibujan en el mapa como líneas normales (sin flecha). Las conexiones con relación (`ENSEÑA`…) solo llegan por "Pegar conocimiento".
- Los bloques antiguos `> [!jw]` / `> [!yo]` se muestran como texto normal y se limpian al editar (`unwrapCallouts` en `markdown.js`).
- **Nota estilo Obsidian**: título grande y la definición con scroll, sin botones ni pastillas encima. Se cierra deslizando a la derecha; al final solo hay "Editar" y "Cerrar", discretos. Con el mapa vacío (solo Jehová) se muestra un mensaje de bienvenida.
- **Grafo**: líneas RECTAS (nunca curvas), zoom y arrastre con los dedos. Todos los nodos son gris neutro; Jehová (`id: "jehova"`) está fijo en el centro, es el ÚNICO dorado (`#f5d27a`, con un halo suave) y no se puede borrar.
- Diseño oscuro, moderno y elegante (fondo `#09090b`, vidrio esmerilado en barras, tipografía del sistema, botón principal blanco). Tokens de color en `:root` de `src/styles.css`. Búsqueda en barra rectangular estilo Vercel. Menú solo con lo esencial (hoja inferior con grupos e íconos).
- Simple antes que ingenioso. Nada de funciones que el usuario no pidió.

## Etapas
1. **Hecha**: React + Vite, datos en IndexedDB (con `navigator.storage.persist()`), exportar/importar JSON, PWA.
2. **Hecha**: sincronización con Supabase (proyecto "Memoria Bíblica", `jikonxuznepdyhcjyysh`, tablas `universe_nodes` / `universe_edges` con RLS por `user_id`). Cuenta con correo + contraseña. IndexedDB sigue siendo la fuente local (funciona sin conexión).
3. **Descartada por ahora**: crear nodos automáticamente desde jw.org requiere una API de IA de pago y el usuario no quiere ese gasto. Él agrega los nodos a mano o pegando el JSON que le genera Claude en el chat ("Pegar conocimiento").

## Estructura
- `src/lib/model.js`: tipos de nodo, orígenes, relaciones sugeridas, `nodeColor` (neutro / dorado), `makeNode` / `makeEdge`.
- `src/lib/db.js`: IndexedDB (stores `nodes`, `edges`, `meta`). Cada cambio local se anota en el outbox (`meta.outbox`) dentro de la misma transacción; los cambios que vienen de la nube usan `commit(change, { track: false })`.
- `src/lib/sync.js`: un ciclo = bajar (`server_updated_at` > última vez) → subir outbox. Gana el `updatedAt` más reciente; los borrados viajan como lápidas (`deleted = true`). La primera vez que se vincula una cuenta se marca todo lo local como pendiente. La raíz nueva nace con `updatedAt: 0` para no pisar la de la nube.
- `src/lib/useSync.js`: sesión de Supabase y disparadores (al abrir, al volver a la app, al reconectar, 1.5 s después de cada cambio). `src/lib/supabase.js`: cliente (clave publicable; la seguridad la da RLS).
- `src/lib/store.js`: hook `useStore` (estado en memoria + escritura). Al renombrar un nodo se actualizan los `[[enlaces]]`.
- `src/lib/markdown.js`: render de notas (`marked` + `DOMPurify`), enlaces `[[Título]]` / `[[Título|texto]]`, bloques `[!jw]` / `[!yo]`.
- `src/lib/importer.js`: "Pegar conocimiento" → `planImport` (vista previa) y `CLAUDE_FORMAT` (instrucciones para Claude).
- `src/components/`: `Graph` (react-force-graph-2d en canvas), `NoteView`, `NodeEditor`, `NodePicker`, `PasteSheet`, `Search`, `Menu`, `AccountSheet` (cuenta y estado de la nube).
- `public/sw.js`: service worker (offline). Si cambian archivos sin hash en `public/`, subir `CACHE`.

## Modelo de datos
```js
Node = { id, title, type: 'concepto'|'texto'|'pregunta'|'ejemplo'|'publicacion',
         origin: 'jw'|'propio'|'mixto', note /* markdown */,
         sources: [{ label, url? }], createdAt, updatedAt }
Edge = { id, source, target, rel /* MAYÚSCULAS, p. ej. ENSEÑA */, createdAt }
```
- Los títulos son únicos (sin distinguir mayúsculas ni acentos).
- Los `[[enlaces]]` de una nota también se dibujan en el grafo como conexión (línea recta sin flecha).

## Formato de importación
`{ "nodes": [{ title, type, origin, note, sources }], "edges": [{ from, to, rel }] }`. `from` / `to` aceptan título o id. Si un nodo ya existe (mismo título o id), se le **añade** la nota y las fuentes nuevas sin borrar nada. Un respaldo exportado (`app: "universe"`) puede restaurarse reemplazando todo. Siempre hay vista previa y confirmación antes de guardar.

## Comandos
- `npm run dev`: servidor local (con `--host` para abrirlo desde el iPhone en la misma red).
- `npm test`: pruebas (vitest) del importador, los enlaces y la sincronización (dos teléfonos simulados con fake-indexeddb y una nube en memoria).
- `npm run build`: compila a `dist/` (Vercel lo detecta solo; ver `vercel.json`).
