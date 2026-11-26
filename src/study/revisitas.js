// Revisitas: son Notas tituladas "Revisita: Nombre" (formato en CLAUDE.md). De su texto se saca nombre,
// dirección, última visita y lo que sigue; el lugar está en `fields.lugar` ({ lat, lng }), así viaja a la
// nube con la nota sin tablas nuevas. En Biblioteca → Revisitas, la que tiene lugar abre Apple Maps.

export const isRevisita = (e) => e?.kind === 'reflexion' && !e.deleted && /^\s*revisita\b/i.test(e.fields?.titulo ?? '')

// El texto puede venir en Markdown (dictado, Claude) o plano (ya editado en Notas: sin #, ** ni "- [ ]").
const clean = (line) => line.replace(/^\s*#+\s*/, '').replace(/^\s*[-*]\s+/, '').replace(/^\[[ xX]?\]\s*/, '').replace(/\*\*/g, '').trim()
const VISIT = /^\d{1,2}\s+(?:de\s+)?[a-záéíóú]{3,}\.?(?:\s+(?:de\s+)?\d{4})?\b/i
const value = (lines, label) => {
  const re = new RegExp(`^${label}:\\s*(.*)$`, 'i')
  for (const l of lines) {
    const m = re.exec(l)
    if (m) return m[1].trim()
  }
  return ''
}

export function revisitaInfo(entry) {
  const f = entry.fields ?? {}
  const lines = String(f.texto ?? '').split('\n').map(clean).filter(Boolean)
  const titleName = String(f.titulo ?? '').replace(/^\s*revisita\s*:?\s*/i, '').trim()
  const visitsAt = lines.findIndex((l) => /^visitas$/i.test(l))
  const nextAt = lines.findIndex((l) => /^próxima visita$/i.test(l))
  const visitLines = visitsAt < 0 ? [] : lines.slice(visitsAt + 1, nextAt > visitsAt ? nextAt : undefined)
  const heads = visitLines.map((l, i) => (VISIT.test(l) ? i : -1)).filter((i) => i >= 0)
  const last = heads.length ? heads[heads.length - 1] : -1
  const lastLines = last < 0 ? [] : visitLines.slice(last + 1)
  return {
    name: value(lines, 'Nombre') || titleName || 'Sin nombre',
    address: value(lines, 'Dirección'),
    lastVisit: last < 0 ? '' : visitLines[last],
    said: value(lastLines, 'Qué dijo'),
    next: nextAt < 0 ? [] : lines.slice(nextAt + 1).filter((l) => !/:$/.test(l)).slice(0, 3),
    lugar: validPlace(f.lugar),
  }
}

export const validPlace = (p) => (p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat, lng: p.lng } : null)

// Apple Maps con el pin de la revisita y su nombre como etiqueta. Solo con un lugar válido; si no, null y
// la fila va sin enlace (nunca un enlace roto).
export function mapsUrl(entry) {
  const { name, lugar } = revisitaInfo(entry)
  if (!lugar || Math.abs(lugar.lat) > 90 || Math.abs(lugar.lng) > 180) return null
  return `https://maps.apple.com/?ll=${lugar.lat},${lugar.lng}&q=${encodeURIComponent(name)}`
}
