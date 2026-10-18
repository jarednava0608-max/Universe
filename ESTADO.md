# Estado (reescribir al cerrar; máx. 40 líneas)
Actualizado: 18 oct 2026.

## En producción
- `claude/zen-mendel-l8h9lw` en `b062817` (PR #7, Revisitas en el mapa), Vercel READY.
- En PR, sin fusionar: `claude/estado-ci` (este archivo, CI, "Cómo trabajar" en CLAUDE.md).

## Decisiones vigentes (las de siempre están en CLAUDE.md)
- Revisitas: se queda el mapa con OpenStreetMap; no Apple Maps (18 oct).
- Importar JSON en Pendientes: en pausa. Formato hablado con ChatGPT: `{ schemaVersion: 1, kind: "pendientes", items: [...] }`, vista previa, duplicados por título + instante.
- `pendientes-intake` conserva su contrato actual.

## Ramas sin fusionar
- `claude/revisitas-maps` (`b76131b`): quitar el mapa por Apple Maps. Descartada; se puede borrar.
- `claude/broadcasting-notes-5wl365` (`b86879f`, 10 oct): apartado JW Broadcasting. Sin decidir.

## Pendiente (hallazgos del 18 oct, por orden)
1. `pendientes-intake`: sin `reminderMinutes` usa 1440; lo que vence en menos de ~23 h nunca avisa (ventana de 60 min en `pendientes-push`). Poner 0, como la app.
2. `public/sw.js`: la caché `universe-v8` acumula los `/assets/` de cada versión; borrar los que el index actual no usa.
3. Esquema base de Supabase (`universe_*`, RLS, `server_updated_at`) no está en el repo: guardarlo en `supabase/esquema.sql`.
4. Sospecha: la PWA de iOS sigue en versión vieja hasta recargar; no hay versión visible (mostrar commit en "Cuenta y nube").
5. Menor: `sync.js` pagina con `server_updated_at >`; más de 1000 filas con la misma marca se saltarían.
6. Menor: JS de 1.2 MB en un solo archivo (aviso de `npm run build`).

## Por confirmar con Jared
- De `DECISIONES.md` "Qué falta": ¿Avisos prendidos?, ¿URL de ChatGPT cambiada a `pendientes-intake`?, apagar/borrar Centro, borrar pruebas.
- `DECISIONES.md` dice hábitos a hora America/Monterrey; el código usa la zona del teléfono.
