// Citas bíblicas en español → enlace directo a la Biblia en wol.jw.org (Traducción del Nuevo Mundo).
// Todo es local: solo arma la dirección; no consulta ningún servicio.

export const BOOKS = [
  'Génesis', 'Éxodo', 'Levítico', 'Números', 'Deuteronomio', 'Josué', 'Jueces', 'Rut', '1 Samuel', '2 Samuel',
  '1 Reyes', '2 Reyes', '1 Crónicas', '2 Crónicas', 'Esdras', 'Nehemías', 'Ester', 'Job', 'Salmos', 'Proverbios',
  'Eclesiastés', 'El Cantar de los Cantares', 'Isaías', 'Jeremías', 'Lamentaciones', 'Ezequiel', 'Daniel', 'Oseas', 'Joel', 'Amós',
  'Abdías', 'Jonás', 'Miqueas', 'Nahúm', 'Habacuc', 'Sofonías', 'Ageo', 'Zacarías', 'Malaquías', 'Mateo',
  'Marcos', 'Lucas', 'Juan', 'Hechos', 'Romanos', '1 Corintios', '2 Corintios', 'Gálatas', 'Efesios', 'Filipenses',
  'Colosenses', '1 Tesalonicenses', '2 Tesalonicenses', '1 Timoteo', '2 Timoteo', 'Tito', 'Filemón', 'Hebreos', 'Santiago', '1 Pedro',
  '2 Pedro', '1 Juan', '2 Juan', '3 Juan', 'Judas', 'Apocalipsis',
]

// Abreviaturas comunes (las de la TNM y otras usuales) que no se resuelven por prefijo único.
const ABBR = {
  ge: 1, gen: 1, ex: 2, le: 3, lev: 3, nu: 4, num: 4, dt: 5, deut: 5, jos: 6, jue: 7, ru: 8,
  sa: 9, sam: 9, re: 11, rey: 11, cr: 13, cro: 13, cron: 13, esd: 15, ne: 16, neh: 16, est: 17,
  job: 18, sl: 19, sal: 19, salmo: 19, pr: 20, prov: 20, ec: 21, ecl: 21, can: 22, cant: 22, cantar: 22,
  is: 23, isa: 23, jer: 24, lam: 25, eze: 26, ezeq: 26, da: 27, dan: 27, os: 28, joe: 29, am: 30,
  abd: 31, jon: 32, miq: 33, na: 34, nah: 34, hab: 35, sof: 36, ag: 37, zac: 38, mal: 39,
  mt: 40, mat: 40, mr: 41, mar: 41, mc: 41, lu: 42, luc: 42, lc: 42, jn: 43, hch: 44, hech: 44,
  ro: 45, rom: 45, co: 46, cor: 46, gal: 48, ef: 49, efe: 49, flp: 50, fil: 50, col: 51,
  te: 52, tes: 52, ti: 54, tim: 54, tit: 56, flm: 57, heb: 58, snt: 59, sant: 59, stg: 59,
  pe: 60, ped: 60, jud: 65, ap: 66, apoc: 66,
}
// Libros que existen con número (1/2/3 Juan, 1/2 Samuel…): la abreviatura base apunta al primero.
const NUMBERED_BASE = { 9: 2, 11: 2, 13: 2, 46: 2, 52: 2, 54: 2, 60: 2, 43: 3 }

const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\./g, '').trim()
const NAMES = BOOKS.map((b, i) => {
  const m = b.match(/^([1-3]) (.+)$/)
  return { n: i + 1, num: m ? Number(m[1]) : 0, name: plain(m ? m[2] : b.replace(/^El /, '')) }
})

// Número de libro (1-66) a partir de "1 Juan", "Sal.", "Apocalipsis"…; null si no lo reconoce.
export function bookNumber(raw) {
  const m = plain(raw).match(/^([1-3])?\s*(.+)$/)
  if (!m) return null
  const num = m[1] ? Number(m[1]) : 0
  const name = m[2].replace(/\s+/g, ' ')
  // 1/2/3 Juan son 62-64; "Juan" solo es el evangelio (43).
  if (num && name === 'juan') return 61 + num
  if (num && name === 'jn') return 61 + num
  const candidates = NAMES.filter((b) => b.num === num && (b.name === name || b.name.startsWith(name)))
  if (candidates.length === 1 && name.length >= 2) return candidates[0].n
  const exact = NAMES.find((b) => b.num === num && b.name === name)
  if (exact) return exact.n
  const ab = ABBR[name]
  if (!ab) return null
  if (NUMBERED_BASE[ab] && num) return ab + num - 1
  if (NUMBERED_BASE[ab] && !num && ab !== 43) return null // "Samuel" sin número es ambiguo
  return num && !NUMBERED_BASE[ab] ? null : ab
}

const BOOK_RE = '(?:[1-3]\\s?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+\\.?'
// "Juan 17:3", "1 Juan 4:8", "Sal. 83:18", "Mateo 6:9, 10", "Rom. 5:12-14"
export const REF_SOURCE = `${BOOK_RE}\\s\\d{1,3}:\\d{1,3}(?:\\s?[-–,]\\s?\\d{1,3})*`

// Separa una cita en libro, capítulo y versículo; null si el libro no existe.
export function parseRef(ref) {
  const m = String(ref).trim().match(/^(.+?)\s(\d{1,3}):(\d{1,3})/)
  if (!m) return null
  const book = bookNumber(m[1])
  if (!book) return null
  return { book, chapter: Number(m[2]), verse: Number(m[3]) }
}

// Dirección en wol.jw.org: el capítulo con el versículo marcado; si no reconoce el libro, una búsqueda.
export function refUrl(ref) {
  const r = parseRef(ref)
  if (!r) return `https://wol.jw.org/es/wol/s/r4/lp-s?q=${encodeURIComponent(ref)}`
  return `https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/${r.book}/${r.chapter}#study=discover&v=${r.book}:${r.chapter}:${r.verse}`
}

// Todas las citas reconocidas dentro de un texto (sin repetir).
export function findRefs(...texts) {
  const out = []
  const seen = new Set()
  const re = new RegExp(`\\b${REF_SOURCE}`, 'g')
  for (const t of texts) {
    for (const m of String(t ?? '').matchAll(re)) {
      const ref = m[0].replace(/\s+/g, ' ').trim()
      const k = ref.toLowerCase()
      if (!seen.has(k) && parseRef(ref)) {
        seen.add(k)
        out.push(ref)
      }
    }
  }
  return out
}

// Convierte las citas de un texto de markdown en enlaces a wol.jw.org.
// `skip` son fragmentos que no se tocan (por ejemplo, enlaces [[…]] ya convertidos).
export function linkRefsMarkdown(text) {
  const re = new RegExp(`\\b${REF_SOURCE}`, 'g')
  return String(text ?? '').replace(re, (ref) => (parseRef(ref) ? `[${ref}](${refUrl(ref)})` : ref))
}
