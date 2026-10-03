// Avisa al cielo de Estudio y Juegos que brille unos segundos (racha nueva, Reto del día hecho).
export const CELEBRATE = 'universe:celebrate'
export function celebrateSky() {
  try {
    window.dispatchEvent(new Event(CELEBRATE))
  } catch {
    /* sin ventana (pruebas) */
  }
}
