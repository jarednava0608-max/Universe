// Al guardar un texto bíblico (Mi Biblia) también entra a Memorizar textos, una sola vez por cita.
// Ya no se crea un nodo con el texto: el mapa es solo para conceptos con definiciones propias.
// Las publicaciones (pub:…) no: no son texto bíblico.
import { makeVerse } from '../games/logic.js'
import { cleanVerseText, refKey } from './verses.js'
import { isPubRef } from './pubs.js'
import { parseRef } from './bible.js'

export function planVerseSave(entry, entries = []) {
  const none = { memoria: null }
  if (entry?.kind !== 'biblia' || isPubRef(entry.fields.cita)) return none
  const key = refKey(entry.fields.cita)
  const texto = entry.fields.texto?.trim()
  if (!key || !texto) return none
  const hasMemoria = entries.some((e) => e.kind === 'memoria' && e.fields.cita && refKey(e.fields.cita) === key)
  return { memoria: hasMemoria ? null : makeVerse({ cita: entry.fields.cita, texto }) }
}

// Limpia las marcas + y * de los textos ya guardados (Mi Biblia y Memorizar). Devuelve solo los que cambian.
export function cleanSavedVerses(entries) {
  const out = []
  for (const e of entries) {
    if (e.kind !== 'biblia' && e.kind !== 'memoria') continue
    const texto = cleanVerseText(e.fields.texto)
    if (texto !== (e.fields.texto ?? '')) out.push({ ...e, fields: { ...e.fields, texto } })
  }
  return out
}

// "3 Juan 3" se leía como capítulo 3 (3 Juan tiene uno solo) y ahí quedó guardado por error el texto de
// 1 Corintios 3:5-9 ("¿Qué es Apolos?…"). Lo que hay que borrar: ese texto en Mi Biblia y Memorizar
// y el nodo que se creó con él.
export function wrongThirdJohn(nodes = [], entries = []) {
  const isIt = (cita, texto) => parseRef(cita ?? '')?.book === 64 && /Apolos/.test(texto ?? '')
  return {
    entryIds: entries.filter((e) => (e.kind === 'biblia' || e.kind === 'memoria') && isIt(e.fields.cita, e.fields.texto)).map((e) => e.id),
    nodeIds: nodes.filter((n) => isIt(n.title, n.note)).map((n) => n.id),
  }
}
