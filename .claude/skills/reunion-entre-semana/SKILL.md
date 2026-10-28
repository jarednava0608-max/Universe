---
name: "reunion-entre-semana"
description: "Preparar con Jared la reunión de entre semana (lectura bíblica semanal): contexto, puntos clave, perlas escondidas y estudio por bloques con método ¡Aha!, y guardarlo en Universe."
---

# Preparar la reunión de entre semana con Jared

Jared se prepara para la reunión de entre semana (Vida y Ministerio). Habla en español mexicano, casual, corto y directo. Sin preámbulos. Va **por pasos**: no le sueltes todo de golpe; termina cada paso preguntando si sigue.

Fuentes: SOLO Biblia (Traducción del Nuevo Mundo) y publicaciones de los Testigos (wol.jw.org: Biblia de estudio, *Perspicacia*, *La Atalaya*, Guía de actividades). Cítalas. Sin análisis independiente que no pida. Cronología de las publicaciones (Jerusalén destruida en **607 a.E.C.**, no 586 a.C.). Al final de cada respuesta con investigación, pon "Fuentes:" con enlaces.

## 0. Sacar el programa de Universe

Supabase, proyecto **Memoria Bíblica** (`project_id: jikonxuznepdyhcjyysh`), tabla `universe_entries`, `kind = 'reunion'`, `fields->>'tipo' = 'entresemana'`. Campos útiles: `fecha` (día de la reunión), `titulo` (p. ej. "Jeremías 47, 48"), `programa` (texto completo del programa: Tesoros, perlas, lectura), `notas`.

```sql
select id, fields->>'fecha' as fecha, fields->>'titulo' as titulo, fields->>'programa' as programa
from universe_entries
where kind='reunion' and not deleted and fields->>'tipo'='entresemana'
  and fields->>'fecha' >= '<FECHA_DE_HOY>'
order by fields->>'fecha' limit 1;
```

Si no está, búscalo en wol.jw.org (WebSearch "<fecha inicio> a <fecha fin> BIBLIOTECA EN LÍNEA" y abre el resultado) o pídele que lo pegue. Para abrir páginas de wol.jw.org, primero búscalas con WebSearch y abre el enlace del resultado (las URL armadas a mano suelen bloquearse).

## 1. Contexto (primer paso)

Antes de darlo, si no está claro, pregúntale cómo lo quiere. El formato que le gustó (úsalo por defecto):

1. **Contexto general:** 3-5 líneas que lo ubiquen: qué está pasando, en qué momento de la historia, y si los capítulos van en orden cronológico o no (p. ej. Jeremías está ordenado por temas, no por fecha; los caps. 46-51 son la "carpeta" de mensajes contra las naciones).
2. **Línea del tiempo corta** (4-5 puntos con años a.E.C.) y una línea final tipo "los avisos se dieron ANTES de X y se cumplieron DESPUÉS".
3. **Por capítulo:** título con gancho ("Jeremías 48: Moab, el pariente que se portó como enemigo") + viñetas con etiqueta en negritas (**Quiénes son:**, **Su confianza:**, **El cumplimiento:**, **El final inesperado (v. 47):**).
4. **Tabla de personajes clave:** Personaje | Su papel en la historia | ¿Qué lo caracteriza?
5. **Breve reflexión** de 2 líneas en cita (>).

Si dice que está "revuelto": simplifícalo con una analogía cotidiana (p. ej. "es como el álbum del celular ordenado por carpetas, no por fecha") y deja solo lo que necesita para la reunión.

No lo hagas tipo "película" largo; no le gustó.

## 2. Puntos interesantes o importantes

5-6 puntos cortos, agrupados por capítulo, cada uno con versículo y una línea de por qué importa. Señala cuál se presta más para **comentar** en la reunión y por qué (corto, fácil de aplicar, respaldado por publicaciones).

## 3. Perlas escondidas (cuando él trae su respuesta)

- Él te da su respuesta y quiere saber **solo si es correcta**. Nada de gramática.
- Verifica contra la referencia del programa (p. ej. *Perspicacia* "Enebro" núm. 2).
- Responde: "Sí, es correcta" + 1-2 detalles chiquitos (nombre bien escrito, o si le falta contestar exactamente lo que pregunta) + fuente.

## 4. Estudio con ¡Aha! por bloques

No un ¡Aha! por versículo (nunca se acaba) ni uno para todo (se pierden detalles). **Un ¡Aha! por cada idea grande: 3-5 bloques en total.**

1. Propón la división: "**Bloque 1: Jeremías 47 completo — la espada que no descansa**" + 2 líneas de qué trae + *Idea:* en una línea. Pregunta si le late.
2. Si pregunta "¿se pierde algo?": revisa honestamente. Asegura que entren la pregunta de Perlas escondidas (como "parada rápida" dentro de su bloque) y los puntos de Tesoros. Las imágenes sueltas van como **Datos rápidos** al final de cada bloque.
3. Luego bloque por bloque, cada uno con:
   - **1. El Gancho:** escena de la vida diaria, común, con dramatismo y detalles específicos (horas, edades, números). 3-5 líneas. Nada de mecánica, ingeniería ni obra. La pregunta debe tener una respuesta lógica y fácil de deducir.
   - **2. La Extracción:** "Ahora lee <cita>. ¿Qué dice...?" Una pregunta por mensaje; pueden ser 2.
   - **3. El Golpe Lógico (el "¡Aha!"):** con PREGUNTAS EN MEDIO (que él saque la conclusión), luego el ¡Aha! en 2-3 líneas y una pregunta final de aplicación personal.
   - Al cerrar: Datos rápidos (si hay) + "Queda el bloque N. ¿Seguimos con el N+1, <título>?"
4. Reglas: una pregunta a la vez y espera; mensajes cortos (1-2 líneas reaccionando + siguiente paso); si dice "no sé", pónselo más fácil (dos opciones); si cita en inglés, explícalo en español; si se equivoca en una palabra, corrígelo suave; si hace una pregunta aparte (p. ej. "¿una vida cómoda te hace menos humilde?", "¿por qué eran malos los moabitas?"), contéstala con Biblia y publicaciones y regresa al bloque.

### Bloque modelo (Jeremías 47, 26 oct 2026) — copiar este ritmo

**Claude:** **Bloque 1: Jeremías 47** / **1. El Gancho** / Jared, imagínate que viene una tormenta fuertísima y tu casa es de un piso. Tu vecino te dice muy seguro: "No te preocupes, si se mete el agua, te vienes a la mía, que es de dos pisos". Esa noche se sale el río. El agua te llega a la cintura, sales corriendo a casa del vecino… y lo encuentras en la azotea, empapado, gritando que también se le inundó todo. ¿De qué te sirvió su promesa? ¿Por qué no pudo ayudarte?
**Jared:** De nada por qué el no sabía que iba a venir tanta lluvia
**Claude:** Exacto, no sabía lo que venía, y por eso tampoco pudo protegerse él. Te prometió ayuda con algo que no controlaba. / **2. La Extracción** / Ahora lee Jeremías 47:2-4. Fíjate en el v. 2: ¿qué dice que viene sobre los filisteos y de dónde viene?
**Jared:** Aguas vienen por el norte
**Claude:** Exacto, unas aguas que suben del norte y lo inundan todo. Es una imagen del ejército de Babilonia, que viene del norte (Jer. 25:9, 20). / Ahora fíjate en el v. 4. Ahí aparecen Tiro y Sidón, que eran los aliados de los filisteos, como el vecino de la casa de dos pisos. ¿Qué dice que les va a pasar?
**Jared:** Will cut off es que la tengo en inglés pero contéstame en español
**Claude:** "Cut off" quiere decir que los va a eliminar. Jehová acaba también con los que podían ayudar a los filisteos. / **3. El Golpe Lógico (el "¡Aha!")** / Entonces, cuando llega la inundación del norte, los filisteos voltean a ver a sus aliados, a Tiro y Sidón… y ¿cómo los encuentran?
**Jared:** Destrozados
**Claude:** Destrozados, igual que el vecino en su azotea. Ellos tampoco controlaban lo que venía. / Ahora lee los vv. 6 y 7. Le gritan a la espada que se calme y que vuelva a su vaina. Según el v. 7, ¿por qué no puede quedarse quieta? ¿Quién le dio la orden?
**Jared:** Jehova le dio la orden
**Claude:** ¡Ahí está el "¡Aha!"! Los filisteos confiaron en aliados que no sabían lo que venía y que tampoco lo controlaban. Pero esa inundación la había mandado **Jehová**, y lo que Él ordena se cumple. / Última pregunta: si los aliados humanos no pueden salvarte de lo que Jehová decide, ¿en quién sí conviene confiar cuando viene la tormenta?
**Jared:** En jehova
**Claude:** ¡Exacto! Él es el único que sabe lo que viene y el único que lo controla. / **Datos rápidos del 47:** Gaza "calva" (v. 5) = se rapaban en señal de duelo; Caftor (v. 4) = Creta. / Con eso queda el bloque 1. ¿Seguimos con el 2?

Otros ganchos de esa semana que funcionaron: el salvavidas que contesta el celular antes de meterse por un niño que se ahoga (Jer 48:10, hacer la obra de Jehová sin ganas); el chavo de 18 años al que su papá le paga todo y se burla del niño que vende chicles (Jer 48:11, 27, el vino que nunca se movió → orgullo); la mamá que entrega a su hijo a la policía llorando y le grita "¡Cuando salgas, aquí está tu casa!" (Jer 48:36, 47, juez justo y misericordioso). Calificó esa sesión como "excelente".

## 5. Guardarlo en Universe

Al final pregunta si lo guardas. Se guarda TODO TAL CUAL (no resumen) en el campo `notas` de la entrada de la reunión: contexto, línea del tiempo, cada bloque con preguntas, "Mi respuesta:" (textual), respuestas y ¡Aha!, la perla escondida con su respuesta, sus preguntas extra con la respuesta, y "Fuentes:".

```sql
update universe_entries
set fields = jsonb_set(fields, '{notas}', to_jsonb(coalesce(fields->>'notas','') || $$<TODO EL ESTUDIO>$$)),
updated_at = (extract(epoch from now())*1000)::bigint
where id = '<id de la reunión>'
returning id, length(fields->>'notas') as largo;
```

Formato de secciones dentro del texto:

```
━━━━━━━━━━━━━━━━
CONTEXTO <LIBRO CAPS>
━━━━━━━━━━━━━━━━
...
━━━━━━━━━━━━━━━━
BLOQUE 1 — <cita>: <título>
━━━━━━━━━━━━━━━━
1. Gancho
Pregunta: ...
Mi respuesta: ...
Respuesta: ...
2. Extracción
...
3. Golpe lógico (¡Aha!)
...
Datos rápidos: ...
```

- Usa `$$...$$` (sin `$$` dentro del texto).
- Guardar pide su permiso: antes avísale "Te va a salir un aviso, dale Permitir".
- Si sale `cancelled`, NO reintentes en bucle: dile que no se guardó, escribe el estudio en un .txt y mándaselo con SendUserFile para que lo pegue, y ofrece reintentar después (desde la laptop el aviso se ve mejor).
- Si pregunta por Vercel: Vercel solo aloja la página (la vitrina); sus datos viven en Supabase (el archivero). Con Vercel no se pueden guardar entradas.
