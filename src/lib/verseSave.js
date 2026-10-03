// Al guardar un texto bíblico (Mi Biblia) también entra a Memorizar textos y se crea un nodo con su
// texto, una sola vez por cita. Las publicaciones (pub:…) no: no son texto bíblico.
import { makeNode, normKey } from './model.js'
import { makeVerse } from '../games/logic.js'
import { cleanVerseText, refKey } from './verses.js'
import { isPubRef } from './pubs.js'

export function planVerseSave(entry, nodes = [], entries = []) {
  const none = { memoria: null, node: null }
  if (entry?.kind !== 'biblia' || isPubRef(entry.fields.cita)) return none
  const key = refKey(entry.fields.cita)
  const texto = entry.fields.texto?.trim()
  if (!key || !texto) return none
  const hasMemoria = entries.some((e) => e.kind === 'memoria' && e.fields.cita && refKey(e.fields.cita) === key)
  const hasNode = nodes.some((n) => normKey(n.title) === normKey(entry.fields.cita))
  return {
    memoria: hasMemoria ? null : makeVerse({ cita: entry.fields.cita, texto }),
    node: hasNode ? null : makeNode({ title: entry.fields.cita.trim(), note: texto }),
  }
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
