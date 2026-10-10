# Pendientes (antes la app Centro)

Pestaña **Pendientes** (`src/tasks/TasksTab.jsx`, lógica en `src/tasks/tasks.js` con pruebas). Se juntó aquí la app Centro (tareas con avisos y hábitos) para tener todo en una sola app. Las decisiones están en `DECISIONES.md`.

## Qué tiene
- **Nuevo pendiente** hasta arriba (no un +, porque chocaba con la luna y la nube en el estilo Original).
- **Hábitos de hoy**: los hábitos a los que les toca hoy, por hora, para palomear (se guarda el día en `fields.log`, últimos 120 días; "N seguidos" si llevas racha). Se ocultan mientras filtras.
- **Filtros**: lupa (buscar sin acentos en título, notas y categoría; sale con más de 8 pendientes) y categorías (Universidad / Trabajo / Personal; tocar la activa quita el filtro).
- **Lista por fecha**: Atrasados (en rojo), Hoy, Mañana, Próximos 7 días, Después, Sin fecha y **Hechos** (cerrado, los 30 más recientes). En "Próximos 7 días" y "Después" los de tipo Recordatorio se juntan en un renglón "N recordatorios programados" que se abre al tocarlo, para que se vean los pendientes de verdad.
- **Un Recordatorio cuya hora ya pasó cuenta como hecho** (`isFinished`), sin cambiar el dato: ya cumplió su función (avisar). Las tareas y eventos atrasados sí se quedan en Atrasados.
- Cada renglón: palomita, título (2 renglones), fecha ("Hoy 3:00 pm", "vie 17 oct, 7:15 pm"), tipo si no es Tarea, categoría, "se repite" y "nota". Punto rojo = prioridad Alta. Deslizar a la izquierda = Eliminar (con Deshacer).
- **Editor** (hoja): qué, tipo (Tarea / Evento / Recordatorio), fecha y hora (o sin fecha), aviso (sin aviso, a la hora, 15/30 min, 1/2 h, 1 día, 1 semana antes; otros valores de Centro o ChatGPT se respetan), repetir (cada día / semana / mes: al palomearlo se crea el siguiente con fecha futura, como en Centro), categoría, prioridad, notas y quién lo agregó.
- **Más → Hábitos**: lista y editor (título, meta, horarios con días, hora, cada 2 semanas desde una fecha y texto del aviso, notas, activo o en pausa).
- **Más → Avisos**: 1) activar avisos en este iPhone (usa el mismo registro que Constancia, sin tocar sus horas), 2) Pendientes y hábitos: Apagados / Prendidos (entrada `pendientes-ajustes`, se sincroniza), 3) aviso de prueba.
- Puntito en la pestaña si hay algo atrasado o para hoy. El aviso abre la pestaña (`?tab=pendientes` o mensaje del service worker).
- Palomear pendientes o hábitos **no** cuenta como día de estudio (`isPlannerEntry` en `store.js`).

## Datos
Todo son entradas de `universe_entries` (se sincronizan igual que Estudio):
```js
pendiente = { kind: 'pendiente', fields: { title, dueAt /* ISO o null */, category, priority, type, repeat, reminderMinutes /* null = sin aviso */, notes, source, done, doneAt?, centroId? } }
habito    = { kind: 'habito', fields: { title, goal, notes, active, slots: [{ days /* 0 = domingo */, time: 'HH:MM', label, biweekly /* 'YYYY-MM-DD' o null */ }], log: { 'YYYY-MM-DD': true }, centroId? } }
ajustes   = { id: 'pendientes-ajustes', kind: 'ajustes', fields: { avisos } }
```

## Servidor (Supabase, proyecto "Memoria Bíblica")
SQL en `supabase/pendientes.sql` (con cómo deshacerlo).
- **Avisos**: `pg_cron` corre `pendientes_tick()` cada minuto; si alguien tiene `avisos: true`, llama a la función `pendientes-push` (`supabase/functions/pendientes-push`, reglas en `logic.js` con pruebas). Manda los pendientes cuya hora de aviso llegó y los hábitos a su hora local (zona del teléfono), con una ventana de 60 min (si se atrasó más, ya no se manda). Cada aviso se anota antes en `universe_push_log` (llave `p:<id>:<hora>` o `h:<id>:<día>:<hora>`), así nunca llega dos veces y si cambias la hora vuelve a sonar. Usa las llaves VAPID de vault (`push_keys`) y los teléfonos de `universe_push`, igual que Constancia.
- **Desde ChatGPT**: función `pendientes-intake`, mismo formato que el `centro-intake` de Centro (`POST`, header `X-Intake-Key`, `{ title, dueAt, category, priority, type, repeat, reminderMinutes, notes, source }`; `title` y `dueAt` obligatorios). La clave se compara por SHA-256 con `universe_intake` (que también dice de qué usuario es). Se quitan los emojis del título.
  URL: `https://jikonxuznepdyhcjyysh.supabase.co/functions/v1/pendientes-intake`
- **Desde Claude** (conector de Supabase): `select public.pendiente_nuevo('Título', '2026-10-20 18:00-06', 60, 'Universidad', 'Alta', 'Tarea', 'notas');` (minutos antes del aviso; `null` = sin aviso).

## Pasar de Centro a Universe
1. Copia hecha el 10 oct 2026 (66 pendientes y 5 hábitos, ids `centro-<id>` y `centro-habito-<id>`). Para traer lo que se agregue en Centro después, Claude puede repetirla con `supabase/centro-a-universe.py` (no duplica ni pisa lo editado; las palomitas puestas en Centro después de la copia no se pasan solas).
2. Cuando ya uses Universe: prender Avisos en Pendientes, cambiar la URL de ChatGPT a `pendientes-intake` y apagar Centro (ver "Qué falta" en `DECISIONES.md`).
