# Estilo e interfaz

Leer antes de tocar estilos, CSS o cualquier pantalla. Lo básico (iPhone primero, medidas, contraste) está resumido en `CLAUDE.md`; aquí va el detalle completo.

## Temas: Negro y Blanco
- Diseño **original negro** (fondo `#09090b`, vidrio esmerilado en barras, tipografía del sistema, botón principal blanco, tarjetas con borde sutil) con versión **blanca** (fondo `#fafafa`, botón principal negro).
- Se cambia en el menú del mapa (Apariencia: Negro / Blanco) o con la luna/sol arriba a la derecha en Estudio y Juegos; se guarda en el teléfono (`src/lib/theme.js`, `data-theme` en `<html>`, negro por defecto).
- Todos los colores son variables en `:root` (negro) y `:root[data-theme='light']` (blanco) de `src/styles.css`; el mapa (canvas) lee las variables `--graph-*`.
- Jehová sigue siendo el único nodo dorado.

## Estilo "Como JW" (prendido por defecto)
El usuario lo pidió para que todo se parezca a JW Library.
- `data-style='jw'` en `<html>` (`universe-style` en este teléfono, `useTheme` en `src/lib/theme.js` y el script de `index.html`); funciona con Negro y Blanco. Se cambia en el menú del mapa: Apariencia → Estilo: Como JW / Original.
- Fondo negro puro o blanco, barras grises sólidas, acento lavanda (`--accent`, morado en blanco) en "Atrás", la pestaña activa (con su fondo redondeado, como en JW Library), los pasos y el botón principal.
- Citas y números de versículo en azul (`--link`, `--verse-num`). En Como JW el azul es **solo para citas bíblicas**; los demás enlaces y acciones van en lavanda.
- Letra de libro (`--font-book`) solo en la Biblia y versículos (Mi Biblia, lector, versículo de Hoy y del Texto diario, Constancia). Las publicaciones (La Atalaya, entre semana) van en letra normal.
- Estudio y Juegos con barra gris fija y el título al centro (`page-bar` siempre visible; el título grande se oculta) y la luna y la nube como íconos lavanda en esa barra.
- Los pasos (Programa / Partes / Listo, y los de La Atalaya) como pestañas en MAYÚSCULAS con raya lavanda.
- Esquinas casi rectas: todas las cajas (tarjetas, botones, etiquetas, avisos) llevan `var(--r)`; solo lo que es círculo sigue redondo. Las tarjetas se distinguen por su fondo, sin borde, y no se mete una caja dentro de otra.
- "Hoy" con la fecha en blanco (o negro) y solo el botón con lo que sigue, sin lista de pasos ni momentos del día ("solo quiero meterme y hacer lo que tengo que hacer"). "Hoy" va directo sobre el fondo y su botón "Empieza" es la única caja.
- Las etiquetas de las respuestas ("Mi respuesta", "Para meditar") en letra normal, sin MAYÚSCULAS; los títulos de sección grandes en negritas.
- **Entre semana** como la Guía de actividades: "5-11 DE OCTUBRE" grande en gris (`mw-week`), la lectura en azul y en mayúsculas, una línea; cada sección en su color con un cuadro chico; el título de cada parte en blanco (o negro) con solo el número en el color de su sección; abajo un solo renglón gris "10 min · 7:45 a 7:55 · nombre" (`mw-info`); la pregunta en letra normal sin la etiqueta "Pregunta" (solo "Para meditar" o "Pregunta 3" cuando hace falta); los círculos de las partes sin contorno de color y las citas en azul dentro del texto.
- Regla: el color se usa poco (lavanda para lo que se toca, el de la sección solo en su encabezado y el número), y las negritas solo en títulos.
- Pulido: en la lista de un apartado "‹ Estudio" y el + van en el mismo renglón (el título ya está en la barra); todas las tarjetas (también las de Juegos, Memoria Bíblica y resultados) con esquinas de 6px y fondo liso; íconos de apartados y juegos en lavanda sobre fondo lavanda tenue; al tocar una tarjeta se aclara (o se oscurece en blanco); campos con borde lavanda al escribir; en las tarjetas de juegos el avance ("125 preguntas") va debajo de la descripción para no aplastar el título.
- Juegos usa la misma paleta (lavanda en vez de naranja, dorado y verde).
- No se copian el logo, los íconos ni el nombre de JW Library. Jehová sigue siendo el único nodo dorado.

## Contraste y lectura (detalle)
- Toda letra con contraste ≥ 4.5:1 sobre su fondo (WCAG AA), medido, no a ojo.
- El gris más tenue (`--text-3`) es #8e8e93 en negro y #6a6a6f en blanco (Como JW), nunca más claro (también sobre tarjetas y barras: las pestañas de abajo van en `--text-2`).
- Los círculos para palomear con borde que se ve (3:1).
- Las etiquetas ("Mi respuesta") en `--text-2`, más fuertes que el texto de ejemplo (`--text-3`).
- Lo que se lee largo (artículos, Biblia, versículos) va en `--text-body`, no en blanco o negro puro (deslumbra menos); las palabras marcadas sí en `--title`.
- Todo lo que se toca mide ≥ 44 px aunque se vea más chico (márgenes negativos o un `::after` invisible para que no se mueva nada; las pestañas de abajo ocupan todo el alto y solo la pastilla lavanda es chica).
- Párrafos y títulos con `text-wrap-style` (pretty / balance) para no dejar una palabra sola en el último renglón.

## Movimiento
- Con "Reducir movimiento" del iPhone nada se sacude ni se desliza solo (las pantallas aparecen con un fundido) y el deslizar desde la orilla sigue funcionando.
- En los juegos, después de contestar, "Siguiente" queda siempre en el mismo lugar abajo.
