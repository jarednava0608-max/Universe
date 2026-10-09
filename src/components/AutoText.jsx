import { useLayoutEffect, useRef } from 'react'

// Cuadro de texto que crece con lo que escribes.
export default function AutoText({ value, placeholder, onChange, minRows = 2, inputRef }) {
  const own = useRef()
  const ref = inputRef ?? own
  useLayoutEffect(() => {
    const ta = ref.current
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 2 + 'px'
  }, [value])
  return <textarea ref={ref} className="input auto" rows={minRows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}
