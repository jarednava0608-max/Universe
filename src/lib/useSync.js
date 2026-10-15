// Sesión de Supabase + sincronización automática.
// Se sincroniza al entrar, al volver a la app, al recuperar internet y poco después de cada cambio.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { forgetUser, pendingCount, syncOnce } from './sync.js'

const isNetworkError = (e) => /load failed|failed to fetch|networkerror|network request failed|network connection was lost/i.test(e?.message || String(e))

export function useSync(store) {
  const [session, setSession] = useState(null)
  const [checked, setChecked] = useState(false) // ya se sabe si hay sesión o no
  const [status, setStatus] = useState({ state: 'off', lastSync: null, pending: 0, error: '' })
  const running = useRef(false)
  const again = useRef(false)
  const retry = useRef(null)
  const runRef = useRef(null)
  const userId = session?.user?.id
  const { mergeRemote, ready, rev } = store

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecked(true)
    }).catch(() => setChecked(true))
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
      // "Load failed" (Safari) / "Failed to fetch": el teléfono no alcanzó la nube (señal débil, cambio de red).
      // No es un error de tus datos: se dice claro y se vuelve a intentar solo en un rato.
      const net = isNetworkError(e)
      setStatus({
        state: 'error',
        lastSync: null,
        pending: await pendingCount().catch(() => 0),
        error: net ? 'No se pudo conectar con la nube (señal débil o sin internet). Todo sigue guardado en el teléfono; lo intento otra vez solo.' : e?.message || String(e),
      })
      if (net) {
        clearTimeout(retry.current)
        retry.current = setTimeout(() => runRef.current?.(), 30_000)
      }
    } finally {
      running.current = false
    }
  }, [userId, ready, mergeRemote])
  runRef.current = run
  useEffect(() => () => clearTimeout(retry.current), [])

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
  const changePassword = (password) => supabase.auth.updateUser({ password })
  const signOut = async () => {
    if (userId) await forgetUser(userId)
    await supabase.auth.signOut()
  }

  return { session, checked, status, syncNow: run, signIn, signUp, signOut, changePassword }
}
