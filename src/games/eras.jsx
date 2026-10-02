// Ambiente de cada época (mundos de Memoria Bíblica): un color suave arriba y un paisaje
// tenue abajo. Solo decoración; el color sale de `data-era` en styles.css.
const SCENES = {
  // Los comienzos: el jardín al amanecer
  1: (
    <>
      <circle cx="300" cy="72" r="22" />
      <path d="M0 140V104Q60 78 130 98T260 92T390 88V140Z" />
      <rect x="66" y="74" width="4" height="26" /><circle cx="68" cy="70" r="14" />
      <rect x="98" y="82" width="3" height="18" /><circle cx="99.5" cy="78" r="10" />
      <rect x="352" y="70" width="4" height="22" /><circle cx="354" cy="66" r="12" />
    </>
  ),
  // Los patriarcas: tiendas en el desierto bajo las estrellas
  2: (
    <>
      <circle cx="40" cy="22" r="1.6" /><circle cx="120" cy="12" r="1.2" /><circle cx="210" cy="28" r="1.8" />
      <circle cx="270" cy="10" r="1.2" /><circle cx="340" cy="30" r="1.5" /><circle cx="170" cy="46" r="1" /><circle cx="76" cy="50" r="1" />
      <path d="M0 140V112Q80 88 170 108T390 100V140Z" />
      <path d="M70 112L100 72L130 112Z" /><path d="M126 110L150 80L174 110Z" />
      <path d="M300 104q4-30 2-46" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M302 58q-20-6-32 6q16-2 32-6q-8-16-26-16q18 4 26 16q8-16 26-16q-18 4-26 16q18-4 32 6q-14-10-32-6Z" />
    </>
  ),
  // Éxodo y desierto: el monte Sinaí y el mar
  3: (
    <>
      <path d="M120 140L215 62L300 140Z" /><path d="M200 140L292 36L390 140Z" />
      <path d="M0 140V118Q20 110 40 118T80 118T120 118T160 118V140Z" />
      <path d="M0 108q20-8 40 0t40 0t40 0" fill="none" stroke="currentColor" strokeWidth="3" />
    </>
  ),
  // Conquista y jueces: una ciudad amurallada en la colina
  4: (
    <>
      <path d="M0 140V112Q90 92 200 104T390 108V140Z" />
      <path d="M150 104V80h12v-6h6v6h10v-6h6v6h10v-6h6v6h10v-6h6v6h10v-6h6v6h12v24Z" />
      <path d="M140 104V64h6v-6h6v6h6v-6h6v6h6v40Z" /><path d="M248 104V64h6v-6h6v6h6v-6h6v6h6v40Z" />
      <rect x="40" y="86" width="3" height="20" /><circle cx="41.5" cy="82" r="9" />
    </>
  ),
  // El reino unido: el templo con sus dos columnas
  5: (
    <>
      <path d="M0 140V122H390V140Z" />
      <path d="M150 122V114H240V122Z" /><path d="M160 114V62H230V114Z" />
      <path d="M154 62H236V54H154Z" />
      <rect x="138" y="70" width="8" height="44" /><rect x="244" y="70" width="8" height="44" />
      <rect x="134" y="64" width="16" height="6" /><rect x="240" y="64" width="16" height="6" />
    </>
  ),
  // El reino dividido: dos reinos en dos colinas
  6: (
    <>
      <path d="M0 140V100Q70 70 160 104Q230 120 280 96Q340 72 390 90V140Z" />
      <path d="M50 88V74h8v-5h5v5h8v-5h5v5h8v-5h5v5h8v14Z" />
      <path d="M300 86V72h8v-5h5v5h8v-5h5v5h8v-5h5v5h8v14Z" />
      <circle cx="200" cy="40" r="14" />
    </>
  ),
  // Exilio y regreso: la torre escalonada de Babilonia junto al río
  7: (
    <>
      <path d="M140 124V110H300V124Z" /><path d="M160 110V96H280V110Z" /><path d="M180 96V82H260V96Z" /><path d="M200 82V68H240V82Z" />
      <path d="M0 140V124H390V140Z" />
      <path d="M0 132q16-6 32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <path d="M70 124q3-26 1-40" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M71 84q-16-4-26 5q13-2 26-5q-6-13-21-13q15 3 21 13q6-13 21-13q-15 3-21 13q15-3 26 5q-11-9-26-5Z" />
    </>
  ),
  // Jesús y la congregación: una barca en el mar de Galilea
  8: (
    <>
      <path d="M0 112Q80 84 170 104T390 96V112Z" />
      <path d="M0 140V112H390V140Z" opacity="0.5" />
      <path d="M150 108H250L236 124H166Z" />
      <rect x="198" y="52" width="3" height="56" />
      <path d="M202 56L238 100H202Z" />
      <path d="M40 126q14-5 28 0t28 0" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M290 130q14-5 28 0t28 0" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
}

export function EraScene({ era }) {
  const scene = SCENES[era]
  if (!scene) return null
  return (
    <svg className="era-scene" viewBox="0 0 390 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true" fill="currentColor">
      {scene}
    </svg>
  )
}
