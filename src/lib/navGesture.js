// Movimiento entre pantallas como en el iPhone (y en JW Library): una pantalla con "‹ Atrás" en su
// barra entra desde la derecha (CSS), sale hacia la derecha al tocar "Atrás" y se regresa
// deslizando el dedo desde la orilla izquierda. Funciona con todas las pantallas sin tocarlas:
// al salir se anima primero y luego se toca su propio botón "Atrás" (que guarda y cierra como
// siempre). Si la pantalla no se cerró (por ejemplo, "Atrás" solo regresó a la lista de libros),
// vuelve a su lugar. Un botón "Atrás" con data-inner no anima (no cierra la pantalla).

const EDGE = 24 // px desde la orilla izquierda donde empieza el gesto
const OUT_MS = 260

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// El botón "Atrás" de la barra de esa pantalla (no el de otra pantalla metida dentro).
function backOf(ov) {
  const btn = ov?.querySelector(':scope > .bar .bar-btn.back')
  return btn && !btn.dataset.inner ? btn : null
}

function slideOut(ov) {
  return new Promise((done) => {
    ov.classList.add('leaving')
    ov.style.transition = `transform ${OUT_MS}ms cubic-bezier(0.2, 0.7, 0.3, 1)`
    ov.style.transform = 'translateX(100%)'
    setTimeout(done, OUT_MS)
  })
}

function restore(ov) {
  if (!ov.isConnected) return
  ov.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.7, 0.3, 1)'
  ov.style.transform = ''
  setTimeout(() => {
    ov.classList.remove('leaving', 'dragging')
    ov.style.transition = ''
  }, 260)
}

let passing = false
async function leave(ov, btn) {
  await slideOut(ov)
  passing = true
  try {
    btn.click()
  } finally {
    passing = false
  }
  // Si guardar y cerrar tarda un poco, se espera; si no se cerró, regresa.
  setTimeout(() => restore(ov), 500)
}

export function installNavGestures() {
  // Tocar "Atrás": primero sale la pantalla y luego se cierra.
  document.addEventListener('click', (e) => {
    if (passing || reduced()) return
    const btn = e.target.closest?.('.bar-btn.back')
    const ov = btn?.closest('.overlay')
    if (!ov || backOf(ov) !== btn || ov.classList.contains('leaving')) return
    e.preventDefault()
    e.stopPropagation()
    leave(ov, btn)
  }, true)

  // Deslizar desde la orilla izquierda para regresar.
  let drag = null
  document.addEventListener('touchstart', (e) => {
    drag = null
    const t = e.touches[0]
    // Con "Reducir movimiento" también: lo mueve tu dedo, como en el iPhone.
    if (e.touches.length !== 1 || t.clientX > EDGE) return
    const ov = e.target.closest?.('.overlay')
    // Los juegos ya tienen su propio deslizar para salir.
    if (!ov || ov.classList.contains('game') || ov.classList.contains('leaving')) return
    const btn = backOf(ov)
    if (!btn) return
    drag = { ov, btn, x0: t.clientX, y0: t.clientY, t0: Date.now(), dx: 0, on: false }
  }, { passive: true })

  document.addEventListener('touchmove', (e) => {
    if (!drag) return
    const t = e.touches[0]
    const dx = t.clientX - drag.x0
    const dy = t.clientY - drag.y0
    if (!drag.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > dx) { drag = null; return } // era scroll
      if (dx < 8) return
      drag.on = true
      drag.ov.classList.add('dragging')
      drag.ov.style.transition = 'none'
    }
    e.preventDefault()
    drag.dx = Math.max(0, dx)
    drag.ov.style.transform = `translateX(${drag.dx}px)`
  }, { passive: false })

  const end = () => {
    if (!drag) return
    const { ov, btn, dx, on, t0 } = drag
    drag = null
    if (!on) return
    const fast = dx / Math.max(1, Date.now() - t0) > 0.5 && dx > 40
    if (dx > window.innerWidth * 0.35 || fast) leave(ov, btn)
    else restore(ov)
  }
  document.addEventListener('touchend', end, { passive: true })
  document.addEventListener('touchcancel', end, { passive: true })
}
