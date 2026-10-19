// "Aprenderlo": el usuario elige qué textos aprender (nada entra solo a Repasar). Marca el de Memorizar
// con esa cita (fields.aprender) o crea uno. null si ya lo está aprendiendo, no es texto bíblico o no hay texto.
import { makeVerse } from '../games/logic.js'
import { cleanVerseText, refKey } from './verses.js'
import { isPubRef } from './pubs.js'
import { parseRef } from './bible.js'

export function planLearn(entries = [], { cita = '', texto = '' } = {}) {
  const key = cita && !isPubRef(cita) ? refKey(cita) : ''
  const t = cleanVerseText(texto ?? '').trim()
  if (!key) return null
  const old = entries.find((e) => e.kind === 'memoria' && e.fields.cita && refKey(e.fields.cita) === key)
  if (old) return old.fields.aprender ? null : { ...old, fields: { ...old.fields, aprender: true, ...(!String(old.fields.texto ?? '').trim() && t ? { texto: t } : {}) } }
  if (!t) return null
  const v = makeVerse({ cita, texto: t })
  return { ...v, fields: { ...v.fields, aprender: true } }
}

export const isLearning = (entries = [], cita = '') => {
  const key = cita ? refKey(cita) : ''
  return !!key && entries.some((e) => e.kind === 'memoria' && e.fields.aprender && e.fields.cita && refKey(e.fields.cita) === key)
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
