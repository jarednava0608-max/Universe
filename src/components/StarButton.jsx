// Estrellita para marcar una respuesta que piensas comentar en la reunión.
export default function StarButton({ on, onClick }) {
  return (
    <button type="button" className={'star-btn' + (on ? ' on' : '')} aria-pressed={on} aria-label={on ? 'Ya no la voy a comentar' : 'La voy a comentar'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
      {on ? 'Voy a comentar' : 'Comentar'}
    </button>
  )
}
