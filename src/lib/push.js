// Avisos de Constancia: suscripción web push guardada en `universe_push` (Supabase).
// En iPhone solo funciona con la app abierta desde la pantalla de inicio (iOS 16.4+).
import { supabase } from './supabase.js'

export const DEFAULT_TIMES = ['22:00', '22:30', '23:00']

export function pushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const standalone = window.navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches
    return standalone ? 'unsupported' : 'install'
  }
  return Notification.permission === 'denied' ? 'denied' : 'ok'
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function keyBytes(s) {
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function currentSub() {
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

// Horas guardadas para este teléfono (null si los avisos están apagados).
export async function loadPushTimes() {
  if (pushState() !== 'ok') return null
  const sub = await currentSub()
  if (!sub) return null
  const { data } = await supabase.from('universe_push').select('times').eq('endpoint', sub.endpoint).maybeSingle()
  return data?.times ?? null
}

// Activa los avisos (o solo cambia las horas). Hay que llamarla desde un toque.
export async function savePushTimes(times) {
  const { data: s } = await supabase.auth.getSession()
  if (!s.session) throw new Error('Entra a tu cuenta (botón de nube) para activar los avisos.')
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Permite las notificaciones en Ajustes del iPhone.')
  let sub = await currentSub()
  if (!sub) {
    const { data: key, error } = await supabase.rpc('push_public_key')
    if (error || !key) throw new Error('No se pudo conectar. Intenta de nuevo.')
    const reg = await navigator.serviceWorker.ready
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) })
  }
  const row = {
    endpoint: sub.endpoint,
    p256dh: b64(sub.getKey('p256dh')),
    auth: b64(sub.getKey('auth')),
    times: [...new Set(times)].sort(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('universe_push').upsert(row)
  if (error) throw new Error('No se pudo guardar. Intenta de nuevo.')
}

export async function disablePush() {
  const sub = await currentSub()
  if (!sub) return
  await supabase.from('universe_push').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
