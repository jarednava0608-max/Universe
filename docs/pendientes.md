# Pendientes (antes la app Centro)
`src/tasks/TasksTab.jsx`, lógica en `src/tasks/tasks.js` (con pruebas). Decisiones en `DECISIONES.md`.

## Pantalla
- Hábitos ocultos (`SHOW_HABITS = false`, no los usa; datos guardados). Con Avisos prendidos el servidor aún mandaría los de hábitos activos.
- Solo lo de hoy (la lista entera lo abrumaba): "Lo que sigue" grande con **Hecho** (atrasados, luego hábitos y pendientes de hoy por hora; `todayItems`), "También hoy", enlace "Agregar pendiente". El resto (mañana a hechos, filtros, Hábitos, Avisos) cerrado bajo "Todo lo demás" (estado local).
- "Nuevo pendiente" arriba (un + chocaba con luna y nube en Original); "Listo" del teclado cierra el título y muestra fecha, aviso, Guardar.
- Hábitos de hoy: palomear por hora (`fields.log`, 120 días; "N seguidos"). Ocultos al filtrar.
- Filtros: lupa (sin acentos, título/notas/categoría; con más de 8) y Universidad / Trabajo / Personal (tocar la activa la quita).
- Grupos: Atrasados (rojo), Hoy, Mañana, Próximos 7 días, Después, Sin fecha, Hechos (cerrado, 30 recientes). En Próximos 7 días y Después, Recordatorios juntos en "N recordatorios programados". Encabezados sin número salvo "Hechos · 12".
- Recordatorio con hora pasada = hecho (`isFinished`, solo vista). Tareas y eventos atrasados siguen en Atrasados.
- Renglón: palomita, título (2 renglones), fecha ("Hoy 3:00 pm", "vie 17 oct, 7:15 pm"), tipo si no es Tarea, categoría, "se repite", "nota". Alta = "Importante" en gris (rojo solo para atrasado). Deslizar a la izquierda = Eliminar con Deshacer.
- Editor (hoja): qué, tipo (Tarea / Evento / Recordatorio), fecha y hora o sin fecha, aviso (no, a la hora, 15/30 min, 1/2 h, 1 día, 1 semana; otros valores se respetan), repetir (día / semana / mes: al palomear crea el siguiente con fecha futura), categoría, prioridad, notas, quién lo agregó.
- Más → Hábitos: título, meta, horarios (días, hora, cada 2 semanas desde fecha, texto del aviso), notas, activo/pausa.
- Más → Avisos: activar en este iPhone (registro de Constancia, sin tocar sus horas); Apagados / Prendidos (`pendientes-ajustes`, sincroniza); aviso de prueba.
- Puntito en la pestaña solo por lo de hoy (`dueCount`; con atrasados quedaba prendido siempre). Hábito palomeado hoy no vuelve a sonar (`dueAlerts` mira `fields.log`). El aviso abre la pestaña (`?tab=pendientes` o mensaje del service worker).
- No cuenta como día de estudio (`isPlannerEntry` en `store.js`).

## Datos (entradas de `universe_entries`)
```js
pendiente = { kind: 'pendiente', fields: { title, dueAt /* ISO o null */, category, priority, type, repeat, reminderMinutes /* null = sin aviso */, notes, source, done, doneAt?, centroId? } }
habito    = { kind: 'habito', fields: { title, goal, notes, active, slots: [{ days /* 0 = domingo */, time: 'HH:MM', label, biweekly /* 'YYYY-MM-DD' o null */ }], log: { 'YYYY-MM-DD': true }, centroId? } }
ajustes   = { id: 'pendientes-ajustes', kind: 'ajustes', fields: { avisos } }
```

## Servidor (Supabase "Memoria Bíblica"; SQL y deshacer en `supabase/pendientes.sql`)
- Avisos: `pg_cron` → `pendientes_tick()` cada minuto → si alguien tiene `avisos: true`, `pendientes-push` (`supabase/functions/pendientes-push`, reglas en `logic.js` con pruebas). Pendientes en su hora de aviso y hábitos a su hora local, ventana 60 min. Anota antes en `universe_push_log` (`p:<id>:<hora>` / `h:<id>:<día>:<hora>`): nunca doble; hora nueva vuelve a sonar. VAPID de vault (`push_keys`) y `universe_push`, como Constancia.
- ChatGPT: `pendientes-intake`, formato de `centro-intake` (`POST`, header `X-Intake-Key`, `{ title, dueAt, category, priority, type, repeat, reminderMinutes, notes, source }`, obligatorios `title` y `dueAt`). Clave por SHA-256 contra `universe_intake` (da el usuario). Quita emojis. `https://jikonxuznepdyhcjyysh.supabase.co/functions/v1/pendientes-intake`
- Claude: `select public.pendiente_nuevo('Título', '2026-10-20 18:00-06', 60, 'Universidad', 'Alta', 'Tarea', 'notas');` (minutos antes; `null` = sin aviso).

## Centro → Universe
- Copia del 10 oct 2026: 66 pendientes, 5 hábitos (`centro-<id>`, `centro-habito-<id>`). Repetir con `supabase/centro-a-universe.py` (no duplica ni pisa; palomitas posteriores en Centro no pasan).
- Falta: prender Avisos, URL de ChatGPT a `pendientes-intake`, apagar Centro ("Qué falta" en `DECISIONES.md`).
