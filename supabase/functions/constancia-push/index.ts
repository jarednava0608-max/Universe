// Avisos de Constancia. La llama pg_cron cada 5 minutos (con el secreto `push_cron_secret`).
// Para cada teléfono suscrito, si su hora local llegó a una de sus horas y hoy no se ha mandado, manda el aviso.
// El texto nunca dice de qué es la meta.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const LINES = [
  'Sigue firme esta noche.',
  'Un día más cuenta mucho.',
  'Jehová te da las fuerzas que necesitas.',
  'Piensa en lo que es limpio y digno de alabanza.',
  'Hoy también puedes lograrlo.',
  'No te rindas haciendo lo que está bien.',
]

function localNow(tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map((x) => [x.type, x.value]),
  )
  return { day: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) }
}
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function daysSince(start: string, day: string) {
  const [a, b] = [start, day].map((s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) })
  return Math.max(0, Math.round((b - a) / 86400000))
}

Deno.serve(async (req) => {
  const { data: keys } = await db.rpc('push_keys')
  if (!keys?.cron || req.headers.get('x-cron-secret') !== keys.cron) return new Response('no', { status: 401 })

  let pub = keys.public, priv = keys.private
  if (!pub) {
    const k = webpush.generateVAPIDKeys()
    await db.rpc('push_save_keys', { pub: k.publicKey, priv: k.privateKey })
    const { data } = await db.rpc('push_keys')
    pub = data.public; priv = data.private
  }
  webpush.setVapidDetails('mailto:avisos@universe.app', pub, priv)

  const { data: rows } = await db.from('universe_push').select('*')
  let sent = 0
  for (const r of rows ?? []) {
    const now = localNow(r.tz || 'America/Mexico_City')
    const times: string[] = [...(r.times ?? [])].sort()
    const due = times.filter((t) => { const m = toMin(t); return now.min >= m && now.min < m + 15 && r.sent?.[t] !== now.day })
    if (!due.length) continue
    const { data: prog } = await db.from('universe_entries').select('fields').eq('user_id', r.user_id).eq('id', 'progreso').maybeSingle()
    const c = prog?.fields?.constancia
    if (!c?.start) continue
    const days = daysSince(c.start, now.day)
    const t = due[due.length - 1]
    const line = LINES[(times.indexOf(t) + Number(now.day.slice(-2))) % LINES.length]
    const payload = JSON.stringify({ title: 'Constancia', body: `${days} ${days === 1 ? 'día' : 'días'}. ${line}`, tag: `constancia-${t}` })
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload, { TTL: 3600 })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) { await db.from('universe_push').delete().eq('endpoint', r.endpoint); continue }
      console.error('push', code, String(e))
    }
    const mark = { ...(r.sent ?? {}) }
    for (const x of due) mark[x] = now.day
    await db.from('universe_push').update({ sent: mark }).eq('endpoint', r.endpoint)
  }
  return Response.json({ ok: true, sent, ready: !!pub })
})
