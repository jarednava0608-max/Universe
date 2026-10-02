import { useLayoutEffect, useRef } from 'react'

// Título que se ve completo: crece en varios renglones (como en Notas del iPhone),
// pero no acepta saltos de línea; Enter llama a onEnter (por ejemplo, pasar al texto).
export default function TitleArea({ value, onChange, onEnter, className = '', ...rest }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const ta = ref.current
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      className={'title-input title-wrap ' + className}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, ' '))}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.() } }}
      {...rest}
    />
  )
}
