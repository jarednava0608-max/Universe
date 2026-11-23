// Entrada única para Muse, Gemini y Claude.
//   POST  header x-muse-ingest-secret: <secreto>
//   { kind, fields, id?, galaxy?, source: 'muse'|'gemini'|'claude', target?: 'nodes'|'entries' }
// Escribe con service_role en la cuenta de JARED_USER_ID. Variables de entorno (nunca en el código):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MUSE_INGEST_SECRET, JARED_USER_ID
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-muse-ingest-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const bad = (error: string, field: string) => json({ error, field }, 400)

const SOURCES = ['muse', 'gemini', 'claude']
const TARGETS = ['nodes', 'entries']
const GALAXIES = ['english', 'escuela', 'espiritual']
// Campos obligatorios por kind.
const REQUIRED: Record<string, string[]> = {
  diario: ['fecha', 'texto'],
  pendiente: ['titulo'],
  idea: ['titulo'],
  estudio: ['titulo'],
  persona: ['nombre'],
  empresa: ['nombre'],
  trivia: ['pregunta'],
  memoria: ['pregunta'],
  nota: ['texto'],
  biblia: ['referencia', 'texto'],
}
// La app guarda las entradas con sus propios kinds: lo que no tiene uno propio va como Nota ('reflexion').
const ENTRY_KIND: Record<string, string> = { nota: 'reflexion', persona: 'reflexion', empresa: 'reflexion' }

// Comparación en tiempo constante (se comparan los SHA-256 para que el largo no importe).
async function safeEqual(a: string, b: string) {
  const enc = new TextEncoder()
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))])
  const x = new Uint8Array(ha)
  const y = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function titleOf(kind: string, f: Record<string, unknown>) {
  const t = str(f.titulo) || str(f.nombre) || str(f.pregunta) || str(f.referencia) || (kind === 'diario' ? `Diario ${str(f.fecha)}` : str(f.texto).slice(0, 60))
  return t.slice(0, 200) || kind
}

// Nota en Markdown a partir de los campos (la tabla de nodos no tiene columna `fields`).
function noteOf(f: Record<string, unknown>) {
  const out: string[] = []
  for (const [k, v] of Object.entries(f)) {
    if (k.startsWith('_') || k === 'repaso' || v == null || v === '') continue
    out.push(`**${k}:** ${typeof v === 'string' ? v : JSON.stringify(v)}`)
  }
  const repaso = f.repaso
  if (Array.isArray(repaso) && repaso.length) {
    out.push('', '## Repaso', ...repaso.map((r) => `- **${(r as { pregunta: string }).pregunta}** ${(r as { nota: string }).nota}`))
  }
  return out.join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const secret = Deno.env.get('MUSE_INGEST_SECRET') ?? ''
  const given = req.headers.get('x-muse-ingest-secret') ?? ''
  if (!secret || !(await safeEqual(given, secret))) return json({ error: 'No autorizado' }, 401)

  const userId = Deno.env.get('JARED_USER_ID')
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!userId || !url || !key) return json({ error: 'Falta configuración del servidor' }, 500)

  const body = await req.json().catch(() => null)
  if (!isObj(body)) return bad('El cuerpo debe ser un JSON', 'body')

  const kind = str(body.kind)
  if (!(kind in REQUIRED)) return bad(`kind debe ser uno de: ${Object.keys(REQUIRED).join(', ')}`, 'kind')
  const source = str(body.source)
  if (!SOURCES.includes(source)) return bad('source debe ser muse, gemini o claude', 'source')
  const target = body.target === undefined ? 'nodes' : str(body.target)
  if (!TARGETS.includes(target)) return bad('target debe ser nodes o entries', 'target')
  if (!isObj(body.fields)) return bad('fields debe ser un objeto', 'fields')
  const fields = body.fields
  if (body.id !== undefined && !str(body.id)) return bad('id debe ser texto no vacío', 'id')
  if (body.galaxy !== undefined && !GALAXIES.includes(str(body.galaxy))) return bad(`galaxy debe ser: ${GALAXIES.join(', ')}`, 'galaxy')

  for (const name of REQUIRED[kind]) {
    if (!str(fields[name])) return bad(`${name} es obligatorio para ${kind}`, `fields.${name}`)
  }
  if (kind === 'diario' && !/^\d{4}-\d{2}-\d{2}$/.test(str(fields.fecha))) return bad('fecha debe ser YYYY-MM-DD', 'fields.fecha')
  if (fields.repaso !== undefined) {
    const ok = Array.isArray(fields.repaso) && fields.repaso.every((r) => isObj(r) && str(r.pregunta) && typeof r.nota === 'string')
    if (!ok) return bad('repaso debe ser un array de {pregunta, nota}', 'fields.repaso')
  }

  const db = createClient(url, key, { auth: { persistSession: false } })
  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const nodeId = str(body.id) || crypto.randomUUID()
  const stamped = { ...fields, _source: source, _ingested_at: nowIso }

  // La tabla real usa created_at/updated_at en milisegundos (bigint) y no tiene `fields`: los campos van en `note`
  // y el origen en `sources`; server_updated_at (timestamptz) va en ISO.
  const { error: nodeErr } = await db.from('universe_nodes').upsert(
    {
      user_id: userId,
      id: nodeId,
      title: titleOf(kind, fields),
      type: kind,
      origin: source,
      note: noteOf(fields),
      sources: [{ label: `${source} · ${nowIso}` }],
      galaxy: str(body.galaxy) || 'escuela',
      created_at: nowMs,
      updated_at: nowMs,
      deleted: false,
      server_updated_at: nowIso,
    },
    { onConflict: 'user_id,id' },
  )
  if (nodeErr) {
    console.error('node', nodeErr.message)
    return json({ error: 'No pude guardar el nodo', details: nodeErr.message }, 500)
  }

  let entryId: string | null = null
  let warning: string | undefined
  if (target === 'entries') {
    const id = crypto.randomUUID()
    const { error: entryErr } = await db.from('universe_entries').insert({
      user_id: userId,
      id,
      kind: ENTRY_KIND[kind] ?? kind,
      fields: { ...stamped, _kind: kind },
      map_node_id: nodeId,
      created_at: nowMs,
      updated_at: nowMs,
      deleted: false,
      server_updated_at: nowIso,
    })
    if (entryErr) {
      console.error('entry', entryErr.message)
      warning = 'entry_failed'
    } else entryId = id
  }

  return json({ ok: true, node_id: nodeId, entry_id: entryId, kind, source, ...(warning ? { warning } : {}) })
})
