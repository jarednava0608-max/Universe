// Revisitas: son Notas tituladas "Revisita: Nombre" (formato en CLAUDE.md). En la nota, un punto
// arriba abre Apple Maps donde vive: en `fields.lugar` ({ lat, lng }) si ya tiene, si no, buscando
// su dirección ("Dirección: …" del texto) cerca de las demás revisitas.

export const isRevisita = (e) => e?.kind === 'reflexion' && !e.deleted && /^\s*revisita\b/i.test(e.fields?.titulo ?? '')

// El texto puede venir en Markdown (dictado, Claude) o plano (ya editado en Notas: sin #, ** ni "- ").
const clean = (line) => line.replace(/^\s*#+\s*/, '').replace(/^\s*[-*]\s+/, '').replace(/^\[[ xX]?\]\s*/, '').replace(/\*\*/g, '').trim()
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
  return {
    name: value(lines, 'Nombre') || titleName || 'Revisita',
    address: value(lines, 'Dirección'),
    lugar: validPlace(f.lugar),
  }
}

export const validPlace = (p) => (p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat, lng: p.lng } : null)

// Lo que entiende Maps: "calle Marie Curie, a 7 casas de la esquina con Sendero" → "Marie Curie y Sendero".
export function mapsQuery(address) {
  const a = String(address ?? '').trim()
  const street = a.split(',')[0].replace(/^\s*calle\s+/i, '').trim()
  const corner = /esquina\s+con\s+(?:la\s+calle\s+|calle\s+)?([^,.]+)/i.exec(a)
  return corner && street ? `${street} y ${corner[1].trim()}` : street
}

// Apple Maps (la app es solo para iPhone). `others`: las demás revisitas, para buscar cerca de ellas.
export function mapsUrl(entry, others = []) {
  const { name, address, lugar } = revisitaInfo(entry)
  if (lugar) return `maps://?ll=${lugar.lat},${lugar.lng}&q=${encodeURIComponent(name)}`
  const q = mapsQuery(address)
  if (!q) return null
  const near = others.map((e) => validPlace(e.fields?.lugar)).filter(Boolean)
  const p = new URLSearchParams({ q })
  if (near.length) {
    const avg = (k) => (near.reduce((s, x) => s + x[k], 0) / near.length).toFixed(5)
    p.set('sll', `${avg('lat')},${avg('lng')}`)
  }
  return 'maps://?' + p
}
