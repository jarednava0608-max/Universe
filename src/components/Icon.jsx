// Ícono de línea (trazo) a partir de un path SVG.
export default function Icon({ d, size = 20, stroke = 1.7 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const ICONS = {
  mapa: 'M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M5 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M19 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M18 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6.5 6.5l3.7 3.7M17.3 7.2l-3.4 3.2M7.4 17.6l2.8-3.8M16.4 16.6l-2.6-2.8',
  estudio: 'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z',
  juegos: 'M6 11h4M8 9v4M15 12h.01M18 10h.01M17.32 5H6.68a4 4 0 0 0-3.98 3.59l-.9 7.76A2.5 2.5 0 0 0 4.29 19a2.5 2.5 0 0 0 1.77-.73L8.5 15.8h7l2.44 2.47A2.5 2.5 0 0 0 19.71 19a2.5 2.5 0 0 0 2.49-2.65l-.9-7.76A4 4 0 0 0 17.32 5z',
  chev: 'm9 6 6 6-6 6',
  back: 'm15 18-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  pegar: 'M9 4h6v3H9zM8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16M9 12h6M9 16h4',
  nodo: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 3v6M12 15v6M3 12h6M15 12h6',
}
