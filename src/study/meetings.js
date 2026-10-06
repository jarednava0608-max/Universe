import { useEffect, useState } from 'react'

// Días de tus reuniones ({ semana, fin }, 0 = domingo): preferencia de este teléfono.
// Los usan "Hoy" y la reunión de entre semana (para poner la fecha de la reunión).
const KEY = 'universe-meetings'
const EVENT = 'universe-meetings'

export function readMeetings() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function useMeetings() {
  const [value, setValue] = useState(readMeetings)
  useEffect(() => {
    const on = () => setValue(readMeetings())
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  const save = (next) => {
    setValue(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new Event(EVENT))
  }
  return [value, save]
}
