// Sesión de Supabase + sincronización automática.
// Se sincroniza al entrar, al volver a la app, al recuperar internet y poco después de cada cambio.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { forgetUser, pendingCount, syncOnce } from './sync.js'

export function useSync(store) {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState({ state: 'off', lastSync: null, pending: 0, error: '' })
  const running = useRef(false)
  const again = useRef(false)
  const userId = session?.user?.id
  const { mergeRemote, ready, rev } = store

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const run = useCallback(async () => {
    if (!userId || !ready) return
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    try {
      do {
        again.current = false
        if (!navigator.onLine) {
          setStatus((s) => ({ ...s, state: 'offline' }))
          break
        }
        setStatus((s) => ({ ...s, state: 'syncing' }))
        const { change, pulled } = await syncOnce(supabase, userId)
        if (pulled) mergeRemote(change)
        setStatus({ state: 'ok', lastSync: Date.now(), pending: await pendingCount(), error: '' })
      } while (again.current)
    } catch (e) {
      setStatus({ state: 'error', lastSync: null, pending: await pendingCount().catch(() => 0), error: e?.message || String(e) })
    } finally {
      running.current = false
    }
  }, [userId, ready, mergeRemote])

  // Al iniciar sesión / abrir la app.
  useEffect(() => {
    if (userId && ready) run()
    else if (!userId) setStatus({ state: 'off', lastSync: null, pending: 0, error: '' })
  }, [userId, ready, run])

  // Poco después de cada cambio local.
  useEffect(() => {
    if (!rev || !userId) return
    const t = setTimeout(run, 1500)
    return () => clearTimeout(t)
  }, [rev, userId, run])

  // Al volver a la app o recuperar internet.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', run)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', run)
    }
  }, [run])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
  const signOut = async () => {
    if (userId) await forgetUser(userId)
    await supabase.auth.signOut()
  }

  return { session, status, syncNow: run, signIn, signUp, signOut }
}
