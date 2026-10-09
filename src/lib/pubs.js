// Referencias a publicaciones ("Seamos valientes, cap. 3", «Título» lección 2, "w23.05 pág. 10").
// Se vuelven tocables como las citas bíblicas. Los enlaces directos de jw.org usan números internos
// que no se pueden adivinar, así que se abre la búsqueda de wol.jw.org con la publicación.

// Libros y folletos conocidos: [título, símbolos, nombres cortos].
// El título completo y el nombre corto se reconocen solos (con mayúscula, como se escriben);
// los símbolos solo con capítulo/página ("ia cap. 3"). Para otro libro, escribir el título entre comillas.
export const PUBLICATIONS = [
  ['Seamos valientes'],
  ['Disfrute de la vida para siempre', ['lff']],
  ['Imitemos su fe', ['ia']],
  ['Acerquémonos a Jehová', ['cl']],
  ['Lecciones que aprendemos de la Biblia', ['lfb']],
  ['Mi libro de historias bíblicas', ['my']],
  ['Jesús: el camino, la verdad y la vida', ['jy']],
  ['El Reino de Dios ya gobierna', ['kr']],
  ['Manténganse en el amor de Dios', ['lvs']],
  ['Organizados para hacer la voluntad de Jehová', ['od']],
  ['Perspicacia para comprender las Escrituras', ['it-1', 'it-2', 'it'], ['Perspicacia']],
  ['Razonamiento a partir de las Escrituras', ['rs'], ['Razonamiento']],
  ['Aprendamos del Gran Maestro', ['lr']],
  ['Mejore en la lectura y la enseñanza', ['th']],
  ['Guía de actividades', ['mwb']],
  ['La Atalaya'],
  ['¡Despertemos!'],
]
// Estos dos solo se vuelven enlace con número o página (si no, saldrían en cada mención).
const NOT_ALONE = new Set(['La Atalaya', '¡Despertemos!'])

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const alt = (list) => list.sort((a, b) => b.length - a.length).map(esc).join('|')
// "cap. 3", "capítulo 3", "lección 12", "pág. 10", "págs. 10-12", "párr. 3", "vol. 1"… y varios seguidos.
const MARK = '(?:cap(?:ítulo|\\.)|lecc?(?:ión|\\.)|págs?\\.|páginas?|p\\.|párrs?\\.|párrafos?|art(?:ículo|\\.)|parte|sección|vol(?:umen|\\.))\\s?\\d{1,3}(?:\\s?[-–,]\\s?\\d{1,3})*'
const MARKS = `${MARK}(?:,?\\s${MARK})*`
const WITH_MARKS = `(?:\\s?,|\\s)\\s?${MARKS}`
const allNames = alt(PUBLICATIONS.flatMap(([title, symbols = [], aliases = []]) => [title, ...symbols, ...aliases]))
const bareNames = alt(PUBLICATIONS.filter(([title]) => !NOT_ALONE.has(title)).flatMap(([title, , aliases = []]) => [title, ...aliases]))

// Con capítulo/página (sin importar mayúsculas): libros conocidos, símbolos, títulos entre comillas y La Atalaya.
export const PUB_SOURCE = [
  `(?:${allNames})${WITH_MARKS}`,
  `[«“"][^«»“”"\\n]{3,80}[»”"],?\\s${MARKS}`,
  `\\b[wg]\\d{2}\\.\\d{1,2}(?!\\d)(?:,?\\s${MARKS})?`,
].join('|')
// Solo el título o el nombre corto, escrito con mayúscula ("Perspicacia", "Imitemos su fe").
const BARE_SOURCE = `(?:${bareNames})(?![\\p{L}\\d])`

const pubRe = () => new RegExp(`(?<![\\p{L}\\d])(?:${PUB_SOURCE})`, 'giu')
const bareRe = () => new RegExp(`(?<![\\p{L}\\d])${BARE_SOURCE}`, 'gu')

// Todas las referencias de un texto, sin encimarse (gana la más larga: "Perspicacia, vol. 1" antes que "Perspicacia").
export function pubMatches(text) {
  const t = String(text ?? '')
  const all = [...t.matchAll(pubRe()), ...t.matchAll(bareRe())]
    .map((m) => ({ index: m.index, text: m[0] }))
    .sort((a, b) => a.index - b.index || b.text.length - a.text.length)
  const out = []
  for (const m of all) {
    const last = out.at(-1)
    if (last && m.index < last.index + last.text.length) continue
    out.push(m)
  }
  return out
}

// Todas las referencias a publicaciones dentro de un texto (sin repetir).
export function findPubs(...texts) {
  const out = []
  const seen = new Set()
  for (const t of texts) {
    for (const m of pubMatches(t)) {
      const ref = m.text.replace(/\s+/g, ' ').trim()
      const k = ref.toLowerCase()
      if (!seen.has(k)) {
        seen.add(k)
        out.push(ref)
      }
    }
  }
  return out
}

export function isPubRef(text) {
  const t = String(text).trim()
  return new RegExp(`^(?:${PUB_SOURCE})$`, 'iu').test(t) || new RegExp(`^${BARE_SOURCE}$`, 'u').test(t)
}

// La publicación sin capítulo ni página (lo que se busca en wol.jw.org).
export function pubTitle(ref) {
  const r = String(ref).trim()
  const sym = r.match(/^([wg])(\d{2})\.(\d{1,2})/i)
  if (sym) return `${sym[1].toLowerCase() === 'w' ? 'La Atalaya' : '¡Despertemos!'} ${sym[1]}${sym[2]}.${sym[3]}`
  const quoted = r.match(/^[«“"]([^«»“”"]+)[»”"]/)
  if (quoted) return quoted[1].trim()
  const known = PUBLICATIONS.find(([title, symbols = [], aliases = []]) =>
    [title, ...aliases].some((n) => r.toLowerCase().startsWith(n.toLowerCase())) || symbols.some((sym) => new RegExp(`^${esc(sym)}(?![\\p{L}\\d-])`, 'iu').test(r)),
  )
  return known ? known[0] : r.replace(new RegExp(`,?\\s${MARKS}$`, 'iu'), '')
}

export function pubUrl(ref) {
  return `https://wol.jw.org/es/wol/s/r4/lp-s?q=${encodeURIComponent(pubTitle(ref))}&p=par&r=occ`
}

// Markdown: convierte las referencias en enlaces (para las notas del mapa).
export function linkPubsMarkdown(text) {
  const t = String(text ?? '')
  let out = ''
  let at = 0
  for (const m of pubMatches(t)) {
    out += t.slice(at, m.index) + `[${m.text}](${pubUrl(m.text)})`
    at = m.index + m.text.length
  }
  return out + t.slice(at)
}
