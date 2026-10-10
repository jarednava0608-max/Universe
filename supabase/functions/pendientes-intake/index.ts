// Pendientes desde ChatGPT u otra app (antes `centro-intake` de Centro). Mismo formato que Centro:
//   POST  header X-Intake-Key: <clave>
//   { "title", "dueAt" (ISO), "category", "priority", "type", "repeat", "reminderMinutes", "notes", "source" }
// La clave se compara por su SHA-256 con `universe_intake` (solo la ve el servidor) y ahí dice de qué usuario es.
// El pendiente se guarda como entrada `pendiente` y le llega al teléfono en la siguiente sincronización.
import { createClient } from 'npm:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-intake-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function sha256Hex(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const clean = (s: unknown) => String(s ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/\s+/g, ' ').trim()
const pick = (v: unknown, list: string[], def: string) => (typeof v === 'string' && list.includes(v) ? v : def)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const key = req.headers.get('x-intake-key') ?? ''
  if (key.length < 16) return json({ error: 'No autorizado' }, 401)
  const { data: owner } = await db.from('universe_intake').select('user_id').eq('key_hash', await sha256Hex(key)).maybeSingle()
  if (!owner) return json({ error: 'No autorizado' }, 401)

  const body = await req.json().catch(() => null)
  const title = clean(body?.title)
  const due = body?.dueAt ? new Date(body.dueAt) : null
  if (!title || !due || Number.isNaN(due.getTime())) return json({ error: 'title y dueAt son obligatorios' }, 400)

  const minutes = Number(body.reminderMinutes ?? 1440)
  const fields = {
    title,
    dueAt: due.toISOString(),
    category: typeof body.category === 'string' && body.category.trim() ? clean(body.category) : 'Personal',
    priority: pick(body.priority, ['Alta', 'Media', 'Baja'], 'Media'),
    type: pick(body.type, ['Tarea', 'Evento', 'Recordatorio'], 'Tarea'),
    repeat: pick(body.repeat, ['none', 'daily', 'weekly', 'monthly'], 'none'),
    reminderMinutes: Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : 1440,
    notes: String(body.notes ?? '').trim(),
    source: clean(body.source) || 'ChatGPT',
    done: false,
  }
  const now = Date.now()
  const id = `p-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const { error } = await db.from('universe_entries').insert({ user_id: owner.user_id, id, kind: 'pendiente', fields, created_at: now, updated_at: now })
  if (error) {
    console.error(error)
    return json({ error: 'No pude guardar la tarea', details: error.message }, 500)
  }
  return json({ ok: true, id, title, dueAt: fields.dueAt }, 201)
})
