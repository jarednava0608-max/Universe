// Revisitas en el mapa: son Notas tituladas "Revisita: Nombre" (formato en CLAUDE.md). De su texto
// se saca nombre, dirección, última visita y lo que sigue; el lugar se guarda en `fields.lugar`
// ({ lat, lng }), así viaja a la nube con la nota sin tablas nuevas.

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

// Lo que se busca en el mapa: la dirección sin "a 7 casas de la esquina…" (eso no lo entiende el buscador).
export function searchText(address) {
  return String(address ?? '')
    .split(/,|\s+a\s+\d+\s+casas?\b|\s+frente\s+a\b|\s+junto\s+a\b|\s+cerca\s+de\b/i)[0]
    .replace(/^\s*(?:número|num\.?|no\.?)\s+/i, '')
    .trim()
}

// Buscador gratuito de OpenStreetMap (Nominatim). Cerca de las revisitas ya puestas, si hay.
export function geocodeUrl(q, near = []) {
  const p = new URLSearchParams({ format: 'jsonv2', limit: '5', 'accept-language': 'es', q })
  if (near.length) {
    const lats = near.map((x) => x.lat)
    const lngs = near.map((x) => x.lng)
    const pad = 0.1
    p.set('viewbox', [Math.min(...lngs) - pad, Math.max(...lats) + pad, Math.max(...lngs) + pad, Math.min(...lats) - pad].join(','))
  }
  return 'https://nominatim.openstreetmap.org/search?' + p
}

export async function geocode(q, near) {
  const res = await fetch(geocodeUrl(q, near))
  if (!res.ok) throw new Error('No se pudo buscar.')
  const list = await res.json()
  return list.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name }))
}

// "Cómo llegar": abre Apple Maps (la app es solo para iPhone) con la ruta al punto.
export const directionsUrl = ({ lat, lng }) => `maps://?daddr=${lat},${lng}`
