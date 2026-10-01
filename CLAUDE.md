# Universe — mapa de conocimiento para estudio bíblico

Mapa personal tipo Obsidian para el estudio bíblico de un Testigo de Jehová. Cada idea es un nodo conectado con otros, para no perder preguntas ni respuestas. El usuario lo usa **solo desde iPhone (Safari / PWA en la pantalla de inicio)** y se publica en **Vercel**. Toda la interfaz está en español.

## Principios (no romper)
- **Primero iPhone**: respetar notch y barra inferior (`env(safe-area-inset-*)`), áreas táctiles ≥ 44px, inputs con `font-size: 16px` (evita el zoom de iOS), gestos fluidos.
- **Distinguir siempre qué dice JW y qué pienso yo**: cada nodo tiene `origin` (`jw` | `propio` | `mixto`) y dentro de la nota se usan los bloques `> [!jw]` y `> [!yo]`. En el grafo: JW = círculo relleno, propio = anillo, mixto = medio relleno.
- **Fuentes solo de jw.org / wol.jw.org** (textos bíblicos y publicaciones).
- **Nota estilo Obsidian**: título grande y texto con scroll, sin botones ni pastillas encima. Se cierra deslizando a la derecha; las acciones van al final del texto.
- **Grafo**: líneas RECTAS (nunca curvas), zoom y arrastre con los dedos. Jehová es el nodo raíz (`id: "jehova"`), fijo en el centro, y el ÚNICO dorado (`#f5d27a`). No se puede borrar.
- Diseño oscuro, minimalista, tipografía del sistema. Búsqueda en barra rectangular estilo Vercel. Menú solo con lo esencial.
- Simple antes que ingenioso. Nada de funciones que el usuario no pidió.

## Etapas
1. **Hecha**: React + Vite, datos en IndexedDB (con `navigator.storage.persist()`), exportar/importar JSON, PWA.
2. **Pendiente**: sincronizar con Supabase. Punto de entrada: `src/lib/db.js` (`commit`, `loadAll`). Mantener IndexedDB como caché offline.
3. **Pendiente**: buscar solo en jw.org y wol.jw.org y crear nodos automáticamente citando la fuente (pasar por la misma vista previa de `planImport` antes de guardar).

## Estructura
- `src/lib/model.js`: tipos de nodo, colores, orígenes, relaciones sugeridas, `makeNode` / `makeEdge`.
- `src/lib/db.js`: IndexedDB (stores `nodes`, `edges`, `meta`).
- `src/lib/store.js`: hook `useStore` (estado en memoria + escritura). Al renombrar un nodo se actualizan los `[[enlaces]]`.
- `src/lib/markdown.js`: render de notas (`marked` + `DOMPurify`), enlaces `[[Título]]` / `[[Título|texto]]`, bloques `[!jw]` / `[!yo]`.
- `src/lib/importer.js`: "Pegar conocimiento" → `planImport` (vista previa) y `CLAUDE_FORMAT` (instrucciones para Claude).
- `src/components/`: `Graph` (react-force-graph-2d en canvas), `NoteView`, `NodeEditor`, `NodePicker`, `PasteSheet`, `Search`, `Menu`.
- `public/sw.js`: service worker (offline). Si cambian archivos sin hash en `public/`, subir `CACHE`.

## Modelo de datos
```js
Node = { id, title, type: 'concepto'|'texto'|'pregunta'|'ejemplo'|'publicacion',
         origin: 'jw'|'propio'|'mixto', note /* markdown */,
         sources: [{ label, url? }], createdAt, updatedAt }
Edge = { id, source, target, rel /* MAYÚSCULAS, p. ej. ENSEÑA */, createdAt }
```
- Los títulos son únicos (sin distinguir mayúsculas ni acentos).
- Los `[[enlaces]]` de una nota también se dibujan en el grafo como línea punteada tenue.

## Formato de importación
`{ "nodes": [{ title, type, origin, note, sources }], "edges": [{ from, to, rel }] }`. `from` / `to` aceptan título o id. Si un nodo ya existe (mismo título o id), se le **añade** la nota y las fuentes nuevas sin borrar nada. Un respaldo exportado (`app: "universe"`) puede restaurarse reemplazando todo. Siempre hay vista previa y confirmación antes de guardar.

## Comandos
- `npm run dev`: servidor local (con `--host` para abrirlo desde el iPhone en la misma red).
- `npm test`: pruebas (vitest) del importador y los enlaces.
- `npm run build`: compila a `dist/` (Vercel lo detecta solo; ver `vercel.json`).
