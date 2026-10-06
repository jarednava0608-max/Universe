// Leer en voz alta con la voz del propio iPhone (gratis y sin internet). Se lee trozo por trozo
// (un versículo o un párrafo a la vez) para saber cuál va y poder marcarlo.
import { useEffect, useRef, useState } from 'react'

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

function spanishVoice() {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => /^es[-_](MX|US|419)/i.test(v.lang)) ?? voices.find((v) => /^es/i.test(v.lang)) ?? null
}

// { speaking, index, start(texts, from = 0), stop }
export function useSpeech() {
  const [index, setIndex] = useState(-1)
  const run = useRef(0)
  const stop = () => {
    run.current++
    if (canSpeak) window.speechSynthesis.cancel()
    setIndex(-1)
  }
  const start = (texts, from = 0) => {
    if (!canSpeak) return
    stop()
    const id = run.current
    const voice = spanishVoice()
    const say = (i) => {
      if (id !== run.current) return
      if (i >= texts.length) return setIndex(-1)
      setIndex(i)
      const u = new SpeechSynthesisUtterance(texts[i].replace(/\s*\n\s*/g, ' '))
      u.lang = voice?.lang ?? 'es-MX'
      if (voice) u.voice = voice
      u.rate = 0.95
      u.onend = () => say(i + 1)
      u.onerror = () => id === run.current && setIndex(-1)
      window.speechSynthesis.speak(u)
    }
    say(from)
  }
  useEffect(() => () => { run.current++; if (canSpeak) window.speechSynthesis.cancel() }, [])
  return { speaking: index >= 0, index, start, stop }
}
