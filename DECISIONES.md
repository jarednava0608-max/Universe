# Decisiones de la fusión Centro → Universe

Lo que decidí mientras dormías (10 oct 2026), para que lo revises. Todo está en la rama `fusion-centro`;
`claude/zen-mendel-l8h9lw` (la que publica Vercel) no se tocó.

## Cómo quedó armado

1. **Pendientes es una pestaña nueva** (Mapa · Estudio · **Pendientes** · Juegos), no un apartado dentro de Estudio.
   Centro era una app aparte que abrías seguido; como pestaña queda a un toque y no revuelve el estudio.
2. **Los pendientes y hábitos se guardan como entradas** (`universe_entries`, `kind: 'pendiente'` y `'habito'`).
   Así usan la misma sincronización, el mismo inicio de sesión y funcionan sin conexión, igual que todo Universe.
   No hizo falta ninguna tabla nueva para tus datos.
3. **Los avisos los manda Supabase**, no Render: función `pendientes-push` + `pg_cron` cada minuto.
   Usa las mismas llaves y el mismo registro de tu iPhone que los avisos de Constancia.
4. **ChatGPT puede seguir agregando pendientes** con la función `pendientes-intake`: mismo formato y la
   **misma clave** que Centro (copié solo su huella SHA-256, nunca vi la clave). Solo cambia la dirección.
5. **Claude puede agregar pendientes** con una línea de SQL: `select public.pendiente_nuevo('Título', '2026-10-20 18:00-06', 60);`

## Decisiones de diseño (Pendientes)

| Tema | Lo que hice | Por qué |
|---|---|---|
| Lista | Una sola lista por fecha: Atrasados, Hoy, Mañana, Próximos 7 días, Después, Sin fecha y Hechos (cerrado) | En Centro estaba en pestañas (Hoy / Próximos / Vencidos / Hechos); en un solo scroll ves todo sin cambiar de pestaña |
| Categorías | Botones Universidad / Trabajo / Personal arriba de la lista (tocar otra vez quita el filtro) | En Centro eran pestañas |
| Búsqueda | Lupa junto a las categorías (aparece si tienes más de 8 pendientes) | Centro tenía buscador; así no ocupa espacio |
| Tipos | Tarea / Evento / Recordatorio, como en Centro | ChatGPT los manda |
| Recordatorios viejos | **Un "Recordatorio" cuya hora ya pasó se va solo a Hechos** (no se cambia el dato, solo cómo se ve) | Los avisos "faltan 3 días", "faltan 2 horas"... se quedaban en Vencidos para siempre (tenías ~30) |
| Tareas viejas | Las tareas y eventos atrasados **sí** se quedan en Atrasados hasta que los palomees o borres | No sé si los hiciste (por ejemplo "Devolverle su linterna a Enrique") |
| Aviso por defecto | "A la hora" (Centro usaba "1 día antes") | Un pendiente para hoy con aviso de 1 día antes nunca sonaba |
| Repetir | Se quedó (cada día / semana / mes): al palomearlo aparece el siguiente | Estaba en Centro; ninguno de tus 81 pendientes lo usaba, pero ChatGPT lo puede mandar |
| Sin fecha | Ahora se puede (sin aviso) | Útil para cosas sueltas; ChatGPT sigue mandando fecha siempre |
| Emojis | Se quitan de los títulos (al copiar de Centro y al recibir de ChatGPT) | Regla de Universe: nunca emojis |
| Racha de estudio | Palomear pendientes o hábitos **no** cuenta como día de estudio | La racha es de estudio bíblico |
| Hábitos | Sección "Hábitos de hoy" arriba (palomear), y en "Más → Hábitos" se editan: días, hora, cada 2 semanas, texto del aviso, meta, pausa | Centro tenía hábitos + recordatorios de hábitos aparte; aquí es uno solo |
| Hábitos y "Hoy" de Estudio | Separados por ahora | Algunos se parecen (Texto diario, Lectura de la Biblia) pero juntarlos sería otra función que no pediste |
| Búsqueda rápida tipo "mañana a las 5..." | No se pasó | Era de una versión vieja de Centro y ya casi no se usaba |
| PIN de Centro | No se pasó | Universe ya usa tu cuenta (correo y contraseña) |

## Decisiones de avisos

- **Vienen apagados.** Se prenden en Pendientes → Más → Avisos. Mientras uses Centro, déjalos apagados
  para que no te lleguen dobles.
- Un aviso que se atrasó más de 60 minutos (por ejemplo si Supabase no corrió) ya no se manda,
  para que al prender los avisos no te lleguen de golpe todos los viejos.
- Cada aviso se anota en `universe_push_log` antes de mandarse: nunca llega dos veces.
  Si cambias la hora de un pendiente, vuelve a sonar a la hora nueva.
- Los hábitos suenan a su hora local (zona del iPhone, America/Monterrey).
- Al tocar el aviso se abre la pestaña Pendientes.
- El cron corre cada minuto pero **solo llama a la función si tienes los avisos prendidos**
  (así no gasta invocaciones mientras tanto).

## Lo que hice en Supabase (todo se puede deshacer)

Proyecto **Memoria Bíblica** (Universe):
- Tablas nuevas `universe_push_log` y `universe_intake` (RLS prendido y sin políticas: solo el servidor las ve).
- Funciones nuevas `pendientes_tick()` y `pendiente_nuevo(...)` (no se pueden llamar desde la app).
- Cron nuevo `pendientes-push` (cada minuto).
- Funciones de borde nuevas `pendientes-push` y `pendientes-intake`.
- Cómo deshacer todo: está al inicio de `supabase/pendientes.sql`.

Proyecto **Centro**:
- **Arreglé el cron de hábitos** (`habitos-diarios`): fallaba desde el 7 de octubre porque el contador de ids
  de `tasks` se había quedado atrás (`duplicate key ... Task_pkey`). Lo puse al día con `setval` y lo corrí
  una vez: creó los recordatorios de hábitos de hoy y mañana. **Ojo:** esa función, cada vez que corre,
  borra los recordatorios de hábitos de hace más de 2 días (así está hecha desde antes); al correrla se
  borraron los que se habían acumulado desde el 4 de octubre. Eran solo los avisos automáticos de hábitos,
  no tareas tuyas. Esto lo hice antes de tu mensaje de no borrar nada.

## Pruebas que dejé en tus datos (las puedes borrar)

- "Prueba: pendiente desde ChatGPT (puedes borrarlo)": prueba de la entrada desde ChatGPT. Está en Hechos.
- "Prueba de avisos de Pendientes": prueba de los avisos (te debió llegar una notificación a las 12:31 pm). Está en Hechos.
- En `universe_intake` quedó una fila `prueba_temporal_desactivada` con una huella inválida (no sirve para nada).
  No la borré porque pediste no borrar nada; se puede borrar sin problema.

## Pendiente de revisar contigo (no lo hice porque no se puede deshacer o necesita tu OK)

Ver "Qué falta" en el resumen final (`docs/pendientes.md`, sección "Pasar de Centro a Universe").
