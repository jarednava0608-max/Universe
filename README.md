# Universe

Mapa de conocimiento personal para estudio bíblico, tipo Obsidian, pensado para iPhone.

- Grafo con zoom y arrastre, líneas rectas, colores por tipo y Jehová como raíz dorada.
- Notas en markdown con enlaces `[[Título]]` y bloques `> [!jw]` / `> [!yo]` para separar lo que dicen las publicaciones de tu propio razonamiento.
- Búsqueda en títulos y contenido.
- "Pegar conocimiento" (JSON generado por Claude) con vista previa antes de guardar.
- Exportar e importar respaldo en JSON. Datos guardados en el navegador (IndexedDB).
- Pendientes (antes la app Centro): tareas con fecha y avisos, hábitos y entrada desde ChatGPT. Ver `docs/pendientes.md`.
- Instalable en la pantalla de inicio (PWA).

```bash
npm install
npm run dev     # desarrollo
npm test        # pruebas
npm run build   # producción (dist/)
```

Despliegue: importa el repo en Vercel. Detecta Vite automáticamente.

Para las próximas sesiones con Claude, la visión y las reglas están en `CLAUDE.md`.
