// El texto bíblico como en JW Library: corrido, con letra de libro, el número del capítulo grande
// en lugar del versículo 1 y los demás números en azul. Los versículos con renglones (poesía:
// Salmos, Isaías…) van uno por renglón con sangría, como en JW Library.
// verses: [{ v, texto }]; current: el versículo que se está leyendo en voz alta.
export default function BibleText({ verses, chapter, current, target, refFor }) {
  return (
    <div className="bible-text">
      {verses.map(({ v, texto }) => {
        const lines = String(texto).split('\n').map((l) => l.trim()).filter(Boolean)
        const num = v === 1 && chapter ? <span className="bible-chap">{chapter}</span> : v ? <span className="bible-v">{v}</span> : null
        const cls = (lines.length > 1 ? 'bible-verse poem' : 'bible-verse') + (current === v ? ' speaking' : target === v ? ' target' : '')
        return (
          <span key={v ?? 0} className={cls} ref={refFor ? refFor(v) : undefined}>
            {num}
            {lines.length > 1
              ? lines.map((l, i) => (i === 0 ? <span key={i}>{l} </span> : <span key={i} className="bible-line">{l}</span>))
              : <>{lines[0]} </>}
          </span>
        )
      })}
    </div>
  )
}
