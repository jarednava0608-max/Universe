// Conceptos para el mapa: al terminar de estudiar (Texto diario, La Atalaya, entre semana) se sacan
// pocas ideas firmes en vez de pasar el estudio entero. Cada concepto es un título corto (1 a 3 palabras),
// qué es con tus palabras y el texto bíblico en que se apoya. Viven en `fields.conceptos`
// [{ id, titulo, def, cita, nodeId? }] y "Poner en el mapa" crea un nodo por concepto.
import { findRefs } from '../lib/bible.js'
import { normKey } from '../lib/model.js'
import { parseArticle, answerOf, reviewAnswer, keyPhrases } from './atalaya.js'
import { midweekAnswers } from './midweek.js'
import { formatDate } from './kinds.js'

export const MAX_TITLE = 32

// Un aviso si el título está muy largo para un nodo ('' si está bien).
export function titleTip(titulo = '') {
  const t = titulo.trim()
  if (!t) return ''
  if (t.length > MAX_TITLE || t.split(/\s+/).length > 4) return 'Muy largo: déjalo en 1 a 3 palabras. Lo demás va en "¿Qué es?".'
  return ''
}

// Listo para el mapa: título corto y definición escrita.
export const conceptReady = (c) => !!c?.titulo?.trim() && !titleTip(c.titulo) && !!c.def?.trim()

// De dónde salió ("Vida y Ministerio, Jeremías 40, 41").
export function entrySource(entry) {
  const f = entry?.fields ?? {}
  if (entry?.kind === 'diario') return ['Texto diario', f.fecha && formatDate(f.fecha)].filter(Boolean).join(' del ')
  if (f.tipo === 'entresemana') return ['Vida y Ministerio', f.titulo].filter(Boolean).join(', ')
  return ['La Atalaya', f.titulo && `«${f.titulo}»`].filter(Boolean).join(', ')
}

// La nota del nodo: la definición, el texto en que se apoya y de dónde salió.
export function conceptNote(c, source = '') {
  return [c.def.trim(), c.cita?.trim() && `Se apoya en ${c.cita.trim().replace(/\.$/, '')}.`, source && `Lo vi en: ${source}.`].filter(Boolean).join('\n\n')
}

// Lo que escribiste tú en esa entrada (respuestas, aplicación, notas).
export function ownText(entry) {
  const f = entry?.fields ?? {}
  const out = [f.principio, f.relato, f.aplicacion, f.contexto, f.resumen, f.idea, f.notas]
  if (entry?.kind === 'reunion' && f.tipo === 'entresemana') {
    for (const { rows, nota } of midweekAnswers(f)) out.push(nota, ...rows.map((r) => r.respuesta))
  } else if (entry?.kind === 'reunion') {
    const art = parseArticle(f.articulo)
    for (const b of art.bloques) out.push(answerOf(f, b.key))
    for (const q of art.repaso) out.push(reviewAnswer(f, q))
  }
  return out.filter((x) => String(x ?? '').trim()).join('\n')
}

// Palabras que suelen ser conceptos del estudio bíblico (para sugerir títulos sin IA).
const WORDS = [
  'valor', 'fe', 'amor', 'humildad', 'orgullo', 'integridad', 'lealtad', 'obediencia', 'gratitud', 'confianza',
  'paciencia', 'perdón', 'oración', 'envidia', 'egoísmo', 'miedo', 'temor de Jehová', 'protección', 'promesas',
  'bondad', 'misericordia', 'justicia', 'sabiduría', 'honradez', 'esperanza', 'alegría', 'paz', 'unidad',
  'generosidad', 'compasión', 'aguante', 'celos', 'modestia', 'mansedumbre', 'autodominio', 'calumnia', 'chisme',
  'conocimiento exacto', 'arrepentimiento', 'reino', 'rescate', 'resurrección', 'predicación', 'congregación',
  'viudas', 'huérfanos', 'ancianos', 'familia', 'amistad', 'idolatría', 'plagas', 'pacto', 'profecía',
]
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Ideas para conceptos: primero las palabras clave que subrayaste (cortas), luego las palabras de
// estudio que más aparecen en lo que escribiste. Sin repetir las que ya son concepto.
export function conceptIdeas(entry, have = [], limit = 8) {
  const f = entry?.fields ?? {}
  const taken = new Set(have.map((t) => normKey(t)))
  const out = []
  const add = (t) => {
    const s = cap(t.trim().replace(/[.,;:¿?¡!«»“”"()]/g, '').trim())
    if (!s || s.length > MAX_TITLE || s.split(/\s+/).length > 3 || taken.has(normKey(s))) return
    taken.add(normKey(s))
    out.push(s)
  }
  if (entry?.kind === 'reunion' && f.tipo !== 'entresemana') {
    for (const b of parseArticle(f.articulo).bloques) for (const p of keyPhrases(b, f.marcas?.[b.key] ?? [])) add(p)
  }
  const text = ' ' + fold(ownText(entry)).replace(/[^a-zñ ]+/g, ' ') + ' '
  const count = (w) => text.split(' ' + fold(w) + ' ').length - 1
  WORDS.map((w) => [w, count(w)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).forEach(([w]) => add(w))
  return out.slice(0, limit)
}

// Textos bíblicos de la entrada para elegir en qué se apoya (los del programa o artículo y los tuyos).
export function conceptRefs(entry, limit = 10) {
  const f = entry?.fields ?? {}
  const seen = new Set()
  return findRefs(f.texto, f.programa, f.estudio, f.articulo, ownText(entry)).filter((r) => {
    const k = fold(r).replace(/\s+/g, '')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, limit)
}
