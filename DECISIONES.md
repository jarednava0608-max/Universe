# Decisiones de la fusión Centro → Universe
10 oct 2026, rama `fusion-centro` (sin tocar `claude/zen-mendel-l8h9lw`, la de Vercel, hasta publicar).

## Armado
1. Pendientes = pestaña propia (entonces Mapa · Estudio · Pendientes · Juegos), no apartado de Estudio: a un toque, sin revolver el estudio.
2. Pendientes y hábitos = entradas (`universe_entries`, `kind: 'pendiente'` / `'habito'`): misma sync, sesión y offline; sin tablas nuevas.
3. Avisos por Supabase, no Render: `pendientes-push` + `pg_cron` cada minuto, llaves y registro de Constancia.
4. ChatGPT: `pendientes-intake`, mismo formato y clave que Centro (solo se copió la huella SHA-256); cambia la URL.
5. Claude: `select public.pendiente_nuevo('Título', '2026-10-20 18:00-06', 60);`

## Diseño (qué → por qué)
- Una lista por fecha (Hechos cerrado) → Centro usaba pestañas; un scroll lo muestra todo.
- Categorías Universidad / Trabajo / Personal como botones (tocar otra vez quita) → eran pestañas.
- Lupa solo con más de 8 → no ocupa espacio.
- Tipos Tarea / Evento / Recordatorio → ChatGPT los manda.
- Recordatorio vencido va a Hechos (solo vista) → los "faltan 3 días" se acumulaban (~30).
- Tareas y eventos atrasados se quedan → no se sabe si se hicieron ("Devolverle su linterna a Enrique").
- Aviso por defecto "A la hora" (Centro: 1 día antes) → uno de hoy nunca sonaba.
- Repetir día / semana / mes → nadie lo usaba (81 pendientes), pero ChatGPT lo manda.
- Sin fecha permitido (sin aviso) → cosas sueltas.
- Sin emojis en títulos (copia y ChatGPT) → regla de Universe.
- No cuenta como día de estudio → la racha es de estudio bíblico.
- Hábitos: palomear en "Hábitos de hoy", editar en Más → Hábitos → Centro separaba hábitos y sus recordatorios.
- Hábitos aparte de "Hoy" de Estudio → juntarlos no se pidió.
- Sin búsqueda rápida "mañana a las 5..." (vieja, sin uso) ni PIN (Universe usa la cuenta).

## Avisos
- Apagados de inicio (Pendientes → Más → Avisos); apagados mientras se use Centro, si no llegan dobles.
- Más de 60 min atrasado no se manda → al prender no llegan los viejos de golpe.
- `universe_push_log` antes de mandar: nunca doble; hora nueva vuelve a sonar.
- Hábitos a hora local (America/Monterrey). Tocar el aviso abre Pendientes.
- El cron solo llama a la función con avisos prendidos (no gasta invocaciones).

## Supabase (reversible)
- **Memoria Bíblica**: tablas `universe_push_log`, `universe_intake` (RLS sin políticas: solo servidor); funciones `pendientes_tick()`, `pendiente_nuevo(...)` (no desde la app); cron `pendientes-push`; funciones de borde `pendientes-push`, `pendientes-intake`. Deshacer: inicio de `supabase/pendientes.sql`.
- **Centro**: arreglado el cron `habitos-diarios` (fallaba desde el 7 oct, ids de `tasks` atrasados, `duplicate key ... Task_pkey`; `setval` y una corrida). Esa función borra recordatorios de hábitos de más de 2 días: se fueron los acumulados desde el 4 oct (solo avisos automáticos). Fue antes de "no borres nada".

## Pruebas en los datos (borrables)
- "Prueba: pendiente desde ChatGPT (puedes borrarlo)" y "Prueba de avisos de Pendientes" (sábado 12:31 pm, sin confirmar en el iPhone), en Hechos.
- Fila `prueba_temporal_desactivada` en `universe_intake`, huella inválida (no borrada por la regla).

## Copia de Centro
- 66 pendientes y 5 hábitos (11 horarios), `centro-<id>` / `centro-habito-<id>`, verificados con MD5 en ambos lados. Centro intacto.
- Sin los recordatorios automáticos de hábitos: aquí el hábito avisa solo.
- Lo nuevo de Centro no pasa solo: "pasa lo nuevo de Centro" lo vuelve a correr (no duplica).

## Constancia
- "Apagar avisos" solo borra sus horas, ya no quita el iPhone (apagaba también Pendientes).

## Qué falta (OK del usuario o difícil de deshacer)
1. ~~Publicar~~: hecho 10 oct 1:58 pm (`fusion-centro` → `claude/zen-mendel-l8h9lw`); regresar en Vercel a `bcc4089` si falla.
2. Prender avisos y apagar Centro a la vez: usuario en Pendientes → Más → Avisos → "Activar avisos en este iPhone" → "Prendidos" → "Mandar un aviso de prueba"; Claude pausa los cron de Centro (`centro_due_pushes`, `habitos-diarios`) y si quiere suspende Render ("apaga Centro").
3. ChatGPT: cambiar `https://fvbcptmbexvlyzgglvav.supabase.co/functions/v1/centro-intake` por `https://jikonxuznepdyhcjyysh.supabase.co/functions/v1/pendientes-intake` (misma clave). Si usa Render `/api/inbox`, revisarlo.
4. Borrar para siempre (cuando esté seguro): Supabase "Centro", Vercel `centro-pendientes`, Render, ícono de Centro.
5. Borrar las 2 pruebas y `prueba_temporal_desactivada`.

## Otras notas
- "Mapa en blanco y conceptos de la reunión del 8 de octubre" (`seeds.test.js`) ya fallaba antes; no se tocó.
- Sin `npm install` (red bloqueada): pruebas con Bun, vista en navegador tamaño iPhone (todos los temas, datos reales); compiló bien en Vercel.

## Revisitas en el mapa (18 oct 2026)
- Pedido como función de Centro (tabla `tasks`, Render). Centro ya es Pendientes en Universe y las revisitas son Notas, así que va en Universe y no toca Pendientes.
- El usuario eligió OpenStreetMap (gratis) sobre Google Maps (clave y tarjeta): única excepción a "solo Supabase". Nominatim solo al tocar "Buscar" (su regla: 1 búsqueda por segundo).
- Lugar en `fields.lugar` de la nota, no columnas nuevas: viaja con la nota a la nube y al respaldo.
