// Leer en voz alta con la voz del propio iPhone (gratis y sin internet). Se lee trozo por trozo
// (un versículo o un párrafo a la vez) para saber cuál va y poder marcarlo.
// La voz y la velocidad se eligen en el lector ("Voz") y se guardan en este teléfono; si no has
// elegido, se usa la mejor voz en español que tenga el iPhone (las "Mejoradas" y "Premium" suenan
// mucho más naturales que las básicas).
import { useEffect, useRef, useState } from 'react'

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

const VOICE_KEY = 'universe-voice'
const RATE_KEY = 'universe-voice-rate'
export const RATES = [['0.85', 'Despacio'], ['0.95', 'Normal'], ['1.08', 'Rápido']]

const read = (k, d) => { try { return localStorage.getItem(k) || d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

// Qué tan buena suena una voz: primero Premium y Mejorada, luego español de México.
export function voiceScore(v) {
  let s = 0
  if (/premium/i.test(v.name)) s += 40
  if (/enhanced|mejorad/i.test(v.name)) s += 30
  if (/^es[-_]MX/i.test(v.lang)) s += 6
  else if (/^es[-_](US|419)/i.test(v.lang)) s += 4
  else if (/^es[-_]ES/i.test(v.lang)) s += 2
  if (/paulina|m[oó]nica|marisol|jorge|juan|diego|ang[eé]lica/i.test(v.name)) s += 3
  if (/eloquence|grandma|grandpa|abuel|shelley|sandy|flo|reed|rocko|eddy|bahh|bells|boing|bubbles|cellos|wobble|whisper|zarvox|trinoids|organ|albert|jester|superstar|bad news|good news/i.test(v.name)) s -= 50
  return s
}

export function spanishVoices() {
  if (!canSpeak) return []
  return window.speechSynthesis.getVoices().filter((v) => /^es/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name))
}

function chosenVoice() {
  const list = spanishVoices()
  const name = read(VOICE_KEY, '')
  return list.find((v) => v.name === name) ?? list[0] ?? null
}

// Las voces llegan después de abrir la app: se vuelve a pedir la lista cuando cambian.
export function useVoices() {
  const [list, setList] = useState(spanishVoices)
  const [voice, setVoiceState] = useState(() => read(VOICE_KEY, ''))
  const [rate, setRateState] = useState(() => read(RATE_KEY, '0.95'))
  useEffect(() => {
    if (!canSpeak) return
    const on = () => setList(spanishVoices())
    window.speechSynthesis.addEventListener?.('voiceschanged', on)
    on()
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', on)
  }, [])
  const setVoice = (name) => { write(VOICE_KEY, name); setVoiceState(name) }
  const setRate = (r) => { write(RATE_KEY, r); setRateState(r) }
  return { list, voice: voice || list[0]?.name || '', setVoice, rate, setRate }
}

function utter(text) {
  const voice = chosenVoice()
  const u = new SpeechSynthesisUtterance(String(text).replace(/\s*\n\s*/g, ' '))
  u.lang = voice?.lang ?? 'es-MX'
  if (voice) u.voice = voice
  u.rate = Number(read(RATE_KEY, '0.95'))
  return u
}

// Una frase de prueba con la voz elegida.
export function tryVoice() {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utter('Jehová es mi pastor. Nada me faltará.'))
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
    const say = (i) => {
      if (id !== run.current) return
      if (i >= texts.length) return setIndex(-1)
      setIndex(i)
      const u = utter(texts[i])
      u.onend = () => say(i + 1)
      u.onerror = () => id === run.current && setIndex(-1)
      window.speechSynthesis.speak(u)
    }
    say(from)
  }
  useEffect(() => () => { run.current++; if (canSpeak) window.speechSynthesis.cancel() }, [])
  return { speaking: index >= 0, index, start, stop }
}
