// Avisos de Pendientes y hábitos (antes los mandaba Centro desde Render).
// - pg_cron la llama cada minuto (con el secreto `push_cron_secret`) solo si alguien prendió los avisos
//   (entrada `pendientes-ajustes` con `avisos: true`; ver `pendientes_tick` en supabase/pendientes.sql).
// - Desde la app, con la sesión del usuario y `{ test: true }`, manda un aviso de prueba a sus teléfonos.
// Cada aviso se anota en `universe_push_log` antes de mandarse, así nunca llega dos veces.
// Usa las mismas llaves VAPID y la misma tabla de teléfonos (`universe_push`) que Constancia.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { dueAlerts, payloadFor } from './logic.js'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Sub = { endpoint: string; p256dh: string; auth: string; tz: string | null; user_id: string }

async function send(sub: Sub, payload: Record<string, unknown>) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600 })
    return true
  } catch (e) {
    // Un teléfono que ya no existe (404/410) lo limpia constancia-push; aquí solo se salta.
    console.error('push', (e as { statusCode?: number }).statusCode, String(e))
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const { data: keys } = await db.rpc('push_keys')
  if (!keys?.public || !keys?.private) return json({ error: 'Faltan las llaves de avisos (se crean al activar Constancia).' }, 503)
  webpush.setVapidDetails('mailto:avisos@universe.app', keys.public, keys.private)

  // Aviso de prueba desde la app (con la sesión del usuario).
  const isCron = !!keys.cron && req.headers.get('x-cron-secret') === keys.cron
  if (!isCron) {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: u } = token ? await db.auth.getUser(token) : { data: null }
    if (!u?.user) return json({ error: 'no' }, 401)
    const body = await req.json().catch(() => ({}))
    if (!body?.test) return json({ error: 'no' }, 400)
    const { data: subs } = await db.from('universe_push').select('*').eq('user_id', u.user.id)
    let sent = 0
    for (const s of (subs ?? []) as Sub[]) if (await send(s, { title: 'Universe', body: 'Así te van a llegar los avisos de Pendientes.', tag: 'pendientes-prueba', tab: 'pendientes' })) sent++
    console.log('prueba', `${sent}/${subs?.length ?? 0}`)
    return json({ ok: true, sent })
  }

  // Corrida del cron: solo los usuarios con los avisos prendidos.
  const { data: settings } = await db.from('universe_entries').select('user_id, fields').eq('id', 'pendientes-ajustes').eq('deleted', false)
  const users = (settings ?? []).filter((s) => s.fields?.avisos === true).map((s) => s.user_id as string)
  const now = new Date()
  let sent = 0
  for (const userId of users) {
    const { data: subs } = await db.from('universe_push').select('*').eq('user_id', userId)
    if (!subs?.length) continue
    const tz = (subs as Sub[]).find((s) => s.tz)?.tz || 'America/Monterrey'
    const { data: entries } = await db.from('universe_entries').select('id, kind, fields').eq('user_id', userId).eq('deleted', false).in('kind', ['pendiente', 'habito'])
    const alerts = dueAlerts(entries ?? [], now, tz)
    if (!alerts.length) continue
    // Se apartan las llaves primero: si otra corrida ya las mandó, aquí no regresan.
    const { data: claimed, error } = await db
      .from('universe_push_log')
      .upsert(alerts.map((a) => ({ user_id: userId, key: a.key })), { onConflict: 'user_id,key', ignoreDuplicates: true })
      .select('key')
    if (error) { console.error('log', error.message); continue }
    const mine = new Set((claimed ?? []).map((r) => r.key))
    for (const a of alerts) {
      if (!mine.has(a.key)) continue
      const payload = payloadFor(a, now, tz)
      let ok = 0
      for (const s of subs as Sub[]) if (await send(s, payload)) ok++
      sent += ok
      console.log('aviso', a.key, `${ok}/${subs.length}`)
    }
  }
  return json({ ok: true, users: users.length, sent })
})
