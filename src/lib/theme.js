// Negro o blanco, y el estilo: el original o uno parecido a JW Library (acento lavanda, letra de
// libro para leer). Las dos cosas se guardan en este teléfono (son preferencias de pantalla).
import { useEffect, useState } from 'react'

const KEY = 'universe-theme' // 'dark' | 'light'
const STYLE_KEY = 'universe-style' // 'jw' | 'original'
const COLORS = { light: '#fafafa', dark: '#09090b' }
const JW_COLORS = { light: '#f8f8fa', dark: '#1c1c1e' }

function readStyle() {
  try {
    return localStorage.getItem(STYLE_KEY) || 'jw'
  } catch {
    return 'jw'
  }
}

function readMode() {
  try {
    return localStorage.getItem(KEY) || 'dark'
  } catch {
    return 'dark'
  }
}

const media = () => window.matchMedia?.('(prefers-color-scheme: dark)')
const resolve = (mode) => (mode === 'auto' ? (media()?.matches ? 'dark' : 'light') : mode)

export function applyTheme(theme, style = readStyle()) {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.style = style
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', (style === 'jw' ? JW_COLORS : COLORS)[theme])
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

  const [style, setStyleState] = useState(readStyle)
  useEffect(() => applyTheme(theme, style), [theme, style])
  const setStyle = (v) => {
    try {
      localStorage.setItem(STYLE_KEY, v)
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
    setStyleState(v)
  }

  const setMode = (m) => {
    try {
      localStorage.setItem(KEY, m)
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
    setModeState(m)
  }
  return { mode, theme, setMode, style, setStyle }
}
