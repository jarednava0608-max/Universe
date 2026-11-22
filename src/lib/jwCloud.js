// Lo importado de los EPUB de jw.org (Biblia, textos diarios, La Atalaya de estudio, Guía de actividades)
// también va a la cuenta del usuario, para que salga en cualquier dispositivo donde entre sin volver a
// elegir el archivo. Tabla privada `universe_meta` (RLS, supabase/universe_meta.sql); nunca al repositorio.
//
// Cada parte (un día, un número, una semana, un capítulo) es una fila `nombre/parte`, y lo demás (años,
// fecha de importación) va en la fila `nombre`. Así primero solo se piden los nombres de las partes, y se
// baja o se sube solo lo que falta de cada lado.
import { getMeta, setMeta } from './db.js'
import { _setBible, useBible } from './nwt.js'
import { _setDailyTexts, useDailyTexts } from './dailytexts.js'
import { _setWatchtower, useWatchtower } from './watchtower.js'
import { _setGuia, useGuia } from './guia.js'

const TABLE = 'universe_meta'
const CHUNK = 100

// name: fila en la nube y llave en `meta`; field: el mapa de partes; show: avisa a la app al bajar algo.
export const RESOURCES = [
  { name: 'dailytexts', field: 'days', show: (v) => _setDailyTexts(v.days, v.years ?? []) },
  { name: 'revistas', field: 'issues', show: (v) => _setWatchtower(v.issues) },
  { name: 'guias', field: 'weeks', show: (v) => _setGuia(v.weeks) },
  { name: 'bible', field: 'chapters', show: (v) => _setBible(v.chapters) },
]

// Las listas (años) se juntan; lo demás se queda como está aquí, o como viene si aquí no había nada.
export function mergeExtras(local = {}, remote = {}) {
  const out = { ...remote, ...local }
  for (const [k, v] of Object.entries(remote)) {
    if (Array.isArray(v) && Array.isArray(local[k])) out[k] = [...new Set([...local[k], ...v])].sort()
  }
  return out
}

async function remoteParts(client, userId, name) {
  const keys = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(TABLE).select('key').eq('user_id', userId).like('key', `${name}/%`).order('key').range(from, from + 999)
    if (error) throw error
    keys.push(...data.map((r) => r.key.slice(name.length + 1)))
    if (data.length < 1000) break
  }
  return keys
}

export async function syncResource(client, userId, { name, field, show }) {
  const local = (await getMeta(name)) ?? null
  const { [field]: localMap = {}, ...localExtras } = local ?? {}
  const remote = await remoteParts(client, userId, name)
  const there = new Set(remote)
  const missingHere = remote.filter((k) => !(k in localMap))
  const missingThere = Object.keys(localMap).filter((k) => !there.has(k))
  let extras = localExtras

  if (missingHere.length) {
    const got = {}
    for (let i = 0; i < missingHere.length; i += CHUNK) {
      const keys = missingHere.slice(i, i + CHUNK).map((k) => `${name}/${k}`)
      const { data, error } = await client.from(TABLE).select('key,value').eq('user_id', userId).in('key', keys)
      if (error) throw error
      for (const r of data) got[r.key.slice(name.length + 1)] = r.value
    }
    const head = await client.from(TABLE).select('value').eq('user_id', userId).eq('key', name).maybeSingle()
    if (head.error) throw head.error
    extras = mergeExtras(localExtras, head.data?.value ?? {})
    const merged = { ...extras, [field]: { ...got, ...localMap } }
    await setMeta(name, merged)
    show(merged)
  }

  if (missingThere.length) {
    const at = new Date().toISOString()
    for (let i = 0; i < missingThere.length; i += CHUNK) {
      const rows = missingThere.slice(i, i + CHUNK).map((k) => ({ user_id: userId, key: `${name}/${k}`, value: localMap[k], updated_at: at }))
      const { error } = await client.from(TABLE).upsert(rows, { onConflict: 'user_id,key' })
      if (error) throw error
    }
    const { error } = await client.from(TABLE).upsert({ user_id: userId, key: name, value: extras, updated_at: at }, { onConflict: 'user_id,key' })
    if (error) throw error
  }
  return { down: missingHere.length, up: missingThere.length }
}

// Cuándo ya se revisó (por usuario y versión local de lo importado): no volver a pedir si nada cambió.
let checked = null

export async function syncJwFiles(client, userId, version) {
  const mark = `${userId}:${version}`
  if (checked === mark) return
  for (const r of RESOURCES) {
    try {
      await syncResource(client, userId, r)
    } catch (e) {
      console.warn('No se pudo sincronizar', r.name, e)
    }
  }
  // Lo que se bajó cambia la versión local: habrá una revisión más (barata) que ya no encuentra nada.
  checked = mark
}

// Suma de las versiones de los cuatro: cambia al cargar, importar o bajar cualquiera.
export function useJwVersion() {
  return useBible() + useDailyTexts() + useWatchtower() + useGuia()
}
