import { useEffect, useState } from 'react'

// Días de tus reuniones ({ semana, fin }, 0 = domingo): preferencia de este teléfono.
// Los usan "Hoy" y la reunión de entre semana (para poner la fecha de la reunión).
const KEY = 'universe-meetings'
const EVENT = 'universe-meetings'

// Si en este teléfono aún no los eliges, los de tu calendario: jueves y sábado.
export const DEFAULT_MEETINGS = { semana: 4, fin: 6 }
export function readMeetings() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? DEFAULT_MEETINGS } catch { return DEFAULT_MEETINGS }
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
