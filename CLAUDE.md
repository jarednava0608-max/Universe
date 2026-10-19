# Universe — todo mi estudio bíblico en un solo lugar

App personal de estudio bíblico (Testigo de Jehová), **solo iPhone** (Safari / PWA de inicio), en español. **Vercel** (proyecto `universe`) despliega solo con cada push.

**3 pestañas** (más lo abrumaban; ver `DECISIONES.md`):
- **Hoy** (abre aquí): fecha, versículo y un botón con lo que sigue; sin botones arriba. Solo lo esencial y terminable (texto diario, reunión que sigue, asignación, lectura si tiene meta). Sin juegos, contadores, avisos que pidan cosas ni abrir sola lo siguiente. No agregar pasos.
- **Biblioteca** (id `estudio`): 4 cuadros grandes sin números (Leer la Biblia, Texto diario, Reuniones, Juegos); lo demás en "Más" (apartados de Estudio, **Mapa**). Con Mapa o Juegos abiertos se marca Biblioteca. Juegos solo sirve para recordar textos de la Biblia (los del Texto diario que estudia); sin juegos sueltos.
- **Pendientes**: la app Centro (tareas con avisos, hábitos).

## Regla de oro
**Nada de servicios de paga ni IA en la app.** El usuario analiza en su chat con Claude y pega JSON; lo "inteligente" es código local. Único servicio externo: Supabase gratis (excepción pedida: OpenStreetMap gratis solo en Revisitas en el mapa).

## Principios (no romper)
- **Estilo**: todo en `docs/estilo.md` (Negro/Blanco, "Como JW" por defecto). Colores solo como variables de `src/styles.css`; Jehová, único nodo dorado.
- **iPhone**: `env(safe-area-inset-*)`, toques ≥ 44px, inputs 16px. Pestañas ocupan `--tabbar`; lo flotante va encima.
- **Medidas**: letra solo 11/13/15/17/20/22/28/34 px (más, solo números de portada); espacios en múltiplos de 4 px.
- **Contraste**: letra ≥ 4.5:1; `--text-3` nunca más claro que #8e8e93 / #6a6a6f; texto largo en `--text-body`.
- **`PageScroll`** en Estudio, Pendientes y Juegos (barra con título chico al bajar). Listas de Estudio: "‹ Estudio" y + en la barra (`back`, `action`).
- **`navGesture.js`**: toda pantalla con `.bar-btn.back` entra/sale por la derecha y se cierra deslizando desde la orilla (no tocar cada pantalla). "Atrás" que no cierra: `data-inner`. Hojas (pegar, cuenta, elegir) suben desde abajo.
- **Enlace visible a wol.jw.org** donde se lee algo de jw.org. Enlaces externos salen a Safari (`x-safari-https://`, `src/lib/external.js`); citas bíblicas abren hoja dentro.
- **Simple**; nada que no se pidió. **Nunca emojis** (app ni contenido propuesto).

## Detalle por área (leer solo lo necesario)
- `docs/estilo.md`: leer antes de tocar estilos, CSS o interfaz.
- `docs/mapa.md`: Mapa, menú, Por escarbar.
- `docs/estudio.md`: Hoy y apartados de Estudio, Buscar en todo.
- `docs/juegos.md`: Juegos, repaso, avisos de Constancia.
- `docs/biblia.md`: citas tocables, Mi Biblia, lector, Publicaciones.
- `docs/paquetes.md`: paquetes `SEEDS`, regla del mapa.
- `docs/pendientes.md`: Pendientes, hábitos, avisos, entrada ChatGPT/Claude.

## Guardado
- Local primero: IndexedDB (`db.js`: `nodes`, `edges`, `entries`, `meta`), `storage.persist()`, sin conexión.
- Supabase ("Memoria Bíblica", `jikonxuznepdyhcjyysh`): `universe_nodes`, `universe_edges`, `universe_entries` (`fields` jsonb), RLS por `user_id`. Correo + contraseña en "Cuenta y nube"; sin sesión todo queda local; al entrar se sube lo local.
- Avisos: `universe_push` (llaves), `universe_push_log` (evita repetidos); funciones `constancia-push` y `pendientes-push` (pg_cron); entrada de ChatGPT con `pendientes-intake` (clave en `universe_intake`); SQL en `supabase/pendientes.sql`. Detalle en `docs/juegos.md` y `docs/pendientes.md`.
- **Nunca a la nube ni al repo** (son de jw.org): Biblia del EPUB (`meta.bible`, `nwt.js`), textos diarios (`meta.dailytexts`, `dailytexts.js`) y La Atalaya de estudio (`meta.revistas`, `watchtower.js`).
- Respaldo JSON (`buildExport`: nodos, conexiones, entradas).

## Estructura
- `src/App.jsx`: pestañas, hojas, avisos. `src/study/` (`kinds.js`: apartados, Pegar de Claude, Proponer al mapa, citas), `src/tasks/`, `src/games/` (`registry.js`, un `.jsx` por juego, `memoria/`).
- `src/components/`: `TitleArea` (título multirrenglón), `Graph` (react-force-graph-2d), `PageScroll`, `TabBar`, hojas y editores.
- `src/lib/`: `model.js`, `store.js` (`useStore`), `markdown.js` (`[[enlaces]]`), `support.js`, `importer.js` (`planImport`), `theme.js`.
- `db.js`: cada cambio local va al outbox (`meta.outbox`) en la misma transacción; los de la nube con `commit(change, { track: false })`.
- `sync.js`: bajar (`server_updated_at` > última vez) → subir outbox; gana el `updatedAt` más reciente; borrados = lápidas (`deleted`). `useSync.js`: sesión. Clave publicable; seguridad por RLS.
- `public/sw.js`: si cambian archivos sin hash en `public/`, subir `CACHE`.

## Modelo de datos
```js
Node  = { id, title, note /* markdown */, type, origin, sources, galaxy /* 'english'|'escuela'|'espiritual' */, createdAt, updatedAt }
Edge  = { id, source, target, rel /* MAYÚSCULAS */, createdAt, updatedAt }
Entry = { id, kind: 'diario'|'reunion'|'estudio'|'reflexion' /* Notas */ | 'idea' | 'asignacion' | 'trivia'|'memoria'|'progreso' | 'biblia' | 'pendiente'|'habito'|'ajustes' /* Pendientes */, fields: { ... }, mapNodeId?, createdAt, updatedAt }
```
- Títulos de nodos únicos (sin distinguir mayúsculas ni acentos).

## Revisitas (en Notas, sin apartado propio)
Cuando el usuario dicta una revisita, se guarda como Nota (`kind: 'reflexion'`) titulada "Revisita: Nombre", con este texto; si la persona ya tiene nota, se agrega la visita bajo "Visitas" y se actualiza "Próxima visita":
```
## La persona
- **Nombre:** · **Dirección:** · **Cómo es:** (edad, de dónde es, qué cree) · **Mejor día y hora:**
## Visitas
### 17 oct 2026 · con Compañero
- **Qué usé:** · **Qué dijo:** · **Pregunta para la próxima:**
## Próxima visita
- [ ] Volver pronto · - [ ] Contestar la pregunta pendiente con un texto · - [ ] Ofrecerle el curso de la Biblia
```
**Revisitas en el mapa** (Biblioteca → Más; `src/study/RevisitasMap.jsx`, `revisitas.js` con pruebas): un punto por nota "Revisita: …" con `fields.lugar` `{ lat, lng }` (sin tablas nuevas). Nombre, dirección, última visita y lo que sigue se leen del texto (Markdown o plano). Ubicar: buscar la dirección (Nominatim), "Estoy aquí" o tocar el mapa. Leaflet + teselas de OpenStreetMap, gratis y sin cuenta.

## Pegar conocimiento (mapa)
`{ "nodes": [{ title, note }], "edges": [{ from, to, rel }] }`; si el nodo existe se le añade. Respaldo (`app: "universe"`) puede reemplazar todo. Siempre vista previa y confirmación.

## Comandos
`npm run dev` (`--host` para el iPhone) · `npm test` (vitest) · `npm run build` (`dist/`).
