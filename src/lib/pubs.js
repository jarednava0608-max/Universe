// Referencias a publicaciones ("Seamos valientes, cap. 3", «Título» lección 2, "w23.05 pág. 10").
// Se vuelven tocables como las citas bíblicas. Los enlaces directos de jw.org usan números internos
// que no se pueden adivinar, así que se abre la búsqueda de wol.jw.org con la publicación.

// Libros y folletos conocidos (nombre o símbolo). Para cualquier otro, escribir el título entre comillas.
export const PUBLICATIONS = [
  ['Seamos valientes'],
  ['Disfrute de la vida para siempre', 'lff'],
  ['Imitemos su fe', 'ia'],
  ['Acerquémonos a Jehová', 'cl'],
  ['Lecciones que aprendemos de la Biblia', 'lfb'],
  ['Mi libro de historias bíblicas', 'my'],
  ['Jesús: el camino, la verdad y la vida', 'jy'],
  ['El Reino de Dios ya gobierna', 'kr'],
  ['Manténganse en el amor de Dios', 'lvs'],
  ['Organizados para hacer la voluntad de Jehová', 'od'],
  ['Perspicacia para comprender las Escrituras', 'it'],
  ['Razonamiento a partir de las Escrituras', 'rs'],
  ['Aprendamos del Gran Maestro', 'lr'],
  ['Mejore en la lectura y la enseñanza', 'th'],
  ['Guía de actividades', 'mwb'],
  ['La Atalaya'],
  ['¡Despertemos!'],
]

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// "cap. 3", "capítulo 3", "lección 12", "pág. 10", "págs. 10-12", "párr. 3", "párrs. 3, 4"… y varios seguidos.
const MARK = '(?:cap(?:ítulo|\\.)|lecc?(?:ión|\\.)|págs?\\.|páginas?|p\\.|párrs?\\.|párrafos?|art(?:ículo|\\.)|parte|sección)\\s?\\d{1,3}(?:\\s?[-–,]\\s?\\d{1,3})*'
const MARKS = `${MARK}(?:,?\\s${MARK})*`
const names = PUBLICATIONS.flatMap(([title, symbol]) => [title, ...(symbol ? [symbol] : [])])
  .sort((a, b) => b.length - a.length)
  .map(esc)
  .join('|')

export const PUB_SOURCE = [
  // Libro conocido o símbolo + capítulo/lección/página
  `(?:${names})(?:,|\\s)\\s?${MARKS}`,
  // Cualquier título entre comillas + capítulo/lección/página
  `[«“"][^«»“”"\\n]{3,80}[»”"],?\\s${MARKS}`,
  // La Atalaya / ¡Despertemos! por símbolo: w23.05, g23.1, w23.05 pág. 10
  `\\b[wg]\\d{2}\\.\\d{1,2}(?!\\d)(?:,?\\s${MARKS})?`,
].join('|')

const pubRe = () => new RegExp(`(?<![\\p{L}\\d])(?:${PUB_SOURCE})`, 'giu')

// Todas las referencias a publicaciones dentro de un texto (sin repetir).
export function findPubs(...texts) {
  const out = []
  const seen = new Set()
  for (const t of texts) {
    for (const m of String(t ?? '').matchAll(pubRe())) {
      const ref = m[0].replace(/\s+/g, ' ').trim()
      const k = ref.toLowerCase()
      if (!seen.has(k)) {
        seen.add(k)
        out.push(ref)
      }
    }
  }
  return out
}

// Posiciones de las referencias (para marcarlas dentro del editor).
export function pubMatches(text) {
  return [...String(text ?? '').matchAll(pubRe())].map((m) => ({ index: m.index, text: m[0] }))
}

export function isPubRef(text) {
  return new RegExp(`^(?:${PUB_SOURCE})$`, 'iu').test(String(text).trim())
}

// La publicación sin capítulo ni página (lo que se busca en wol.jw.org).
export function pubTitle(ref) {
  const r = String(ref).trim()
  const sym = r.match(/^([wg])(\d{2})\.(\d{1,2})/i)
  if (sym) return `${sym[1].toLowerCase() === 'w' ? 'La Atalaya' : '¡Despertemos!'} ${sym[1]}${sym[2]}.${sym[3]}`
  const quoted = r.match(/^[«“"]([^«»“”"]+)[»”"]/)
  if (quoted) return quoted[1].trim()
  const known = PUBLICATIONS.find(([title, symbol]) => r.toLowerCase().startsWith(title.toLowerCase()) || (symbol && new RegExp(`^${esc(symbol)}\\b`, 'i').test(r)))
  return known ? known[0] : r.replace(new RegExp(`,?\\s${MARKS}$`, 'iu'), '')
}

export function pubUrl(ref) {
  return `https://wol.jw.org/es/wol/s/r4/lp-s?q=${encodeURIComponent(pubTitle(ref))}`
}

// Markdown: convierte las referencias en enlaces (para las notas del mapa).
export function linkPubsMarkdown(text) {
  return String(text ?? '').replace(pubRe(), (ref) => `[${ref}](${pubUrl(ref)})`)
}
