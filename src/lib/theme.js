// Negro o blanco. La elección se guarda en este teléfono (es una preferencia de pantalla).
import { useEffect, useState } from 'react'

const KEY = 'universe-theme' // 'dark' | 'light'
const COLORS = { light: '#fafafa', dark: '#09090b' }

function readMode() {
  try {
    return localStorage.getItem(KEY) || 'dark'
  } catch {
    return 'dark'
  }
}

const media = () => window.matchMedia?.('(prefers-color-scheme: dark)')
const resolve = (mode) => (mode === 'auto' ? (media()?.matches ? 'dark' : 'light') : mode)

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
}

export function useTheme() {
  const [mode, setModeState] = useState(readMode)
  const [theme, setTheme] = useState(() => resolve(readMode()))

  useEffect(() => {
    const update = () => setTheme(resolve(mode))
    update()
    const m = media()
    m?.addEventListener?.('change', update)
    return () => m?.removeEventListener?.('change', update)
  }, [mode])

  useEffect(() => applyTheme(theme), [theme])

  const setMode = (m) => {
    try {
      localStorage.setItem(KEY, m)
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
    setModeState(m)
  }
  return { mode, theme, setMode }
}
