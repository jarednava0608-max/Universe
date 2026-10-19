## Citas tocables (`src/lib/bible.js`)
- Reconoce "Juan 17:3", "Sal. 83:18", solo capítulo, abreviaturas TNM, listas ("3 Juan 3, 4"). `REF_START` en vez de `\b` (la É de Éxodo). Libros de un capítulo: "3 Juan 3" = versículo (`ONE_CHAPTER`, `canonRef`). Toda búsqueda usa `scanRefs`.
- Enlace `/es/wol/b/r4/lp-s/nwtsty/{libro}/{capítulo}`; libro desconocido → búsqueda en wol.
- Tocables en notas del mapa (sin tocar `[[enlaces]]`), fila "Textos bíblicos" de Estudio, Notas, Trivia, Memorizar.

## Mi Biblia (`verses.js`, `RefSheet.jsx`)
- Tocar cita → hoja en la app (clics en enlaces wol y evento `openRef`); solo capítulo → `ChapterReader` (`openAny`, `App.jsx`).
- Texto de `kind: 'biblia'` `{ cita, texto }`, Memorizar o Texto diario, por `refKey`; si no hay, se pega y guarda. `cleanVerseText` quita `+`/`*`. Guardar ya no lo manda a Memorizar: el usuario elige con "Aprenderlo" (`planLearn`, ver `docs/juegos.md`); **no crea nodo** (el mapa es solo para conceptos).
- Rango ("Jeremías 38:7-9") o capítulo se arma de versículos guardados con su número; rango solo si están todos. Botones `jwLibraryUrl` y wol con `data-direct`.
- Limpiezas únicas por teléfono: `clean:verses-1` (quita `+`/`*` de lo guardado), `clean:3juan-1` (`wrongThirdJohn`: borró 1 Corintios 3 guardado como "3 Juan 3" y su nodo).

### Pegar capítulo
- `splitChapter(texto, capítulo, libro)` separa el capítulo pegado de JW Library (el número de capítulo ocupa el v. 1) y guarda `Daniel 2:1`… solo en Mi Biblia (sin Memorizar ni nodos). `verseCounts.js`: `VERSE_COUNTS` (numeración TNM, 3 Juan con 14), `OMITTED` (Mateo 17:21, Marcos 16:9-20, Juan 7:53-8:11, Hechos 8:37…), `chapterVerses`; espera los números correctos (Juan 8 empieza en 12), ante "los 10 hombres" prefiere el número que sigue a mayúscula y salta versículos faltantes.
- `chapterCheck` ("Falta el 7": Revisar / Guardar así); `chapterSaved` ("Tienes 9 de 16"; entre semana: Guardado / 9 de 16 / Pegar).

### Cómo se ve
- `VerseText`: `--font-book`, `bible-chap` (capítulo grande azul) y `bible-v` (`--verse-num`).
- `BibleText.jsx`: la poesía conserva renglones (`savedChapterVerses`; `joinVerses` solo para citar), sangría tras el primero.

### Lector (`ChapterReader.jsx`)
- "Leer el capítulo completo" abre en ese versículo. Barra: Atrás, capítulo, Mi Biblia, audífonos.
- `useSpeech` (`speech.js`): voz del iPhone offline, marca el versículo, `voiceScore` prefiere Premium/Mejorada; `VoiceSheet` (Despacio/Normal/Rápido, voces en español que se prueban al tocar, cómo bajar una: Ajustes → Accesibilidad → Contenido leído → Voces); `universe-voice`, `universe-voice-rate`.
- `neighborChapter` (botones y deslizar, cruza libros). Sin capítulo → "Pegar el capítulo" (abre la hoja y vuelve al lector). Siempre visibles, lado a lado sobre los botones de capítulo: "En línea" (`refUrl`) y "JW Library" (`jwLibraryUrl`, jw.org/finder).

### EPUB (`nwt.js`)
- La TNM **nunca** va al repositorio, la app publicada ni la nube.
- En Leer la Biblia, "Elegir el archivo EPUB" (`nwt_S.epub` de jw.org): `1001061105.xhtml` … `1001061170`, `-splitN`, `chapterC_verseV`; párrafos `sb`, `sl`, `sz`; quita números, notas `*`, títulos de salmos `sw`, letras hebreas `ss`. Probado: 31 062 versículos, 1189 capítulos = `verseCounts.js`.
- `fflate`; `meta.bible` solo en el teléfono (sin sync ni respaldo; en otro teléfono se elige de nuevo). Toda cita/rango/capítulo sin pegar (`findSavedVerse` `source: 'tnm'`, `savedChapterVerses`, `chapterSaved`); lo guardado a mano va primero.

## Publicaciones (`pubs.js`)
- `PUBLICATIONS` = `[título, símbolos, nombres cortos]` con cap./lección/pág./párr./vol. ("lff lección 12", "it-1 pág. 345"); título solo o nombre corto con mayúscula ("Perspicacia"); libro nuevo sin comillas → agregarlo ahí; títulos entre comillas; Atalaya/¡Despertemos! con número o símbolo ("w23.05 pág. 10").
- Hoja guarda el párrafo (`kind: 'biblia'`, `anyRefKey` = `pub:…`); `pubUrl` hace búsqueda en wol (jw.org usa números internos). Tocables donde las citas. "Ordenar" → `findAllRefs`.
