import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon, { ICONS } from '../components/Icon.jsx'
import { directionsUrl, geocode, isRevisita, revisitaInfo, searchText } from './revisitas.js'

// Mapa de revisitas (OpenStreetMap, gratis): un punto por cada nota "Revisita: …" con lugar.
// Las que aún no tienen lugar salen abajo para ubicarlas: buscando la dirección, "Estoy aquí"
// (en la puerta) o tocando el mapa. Tocar un punto muestra nombre, última visita y lo que sigue.
export default function RevisitasMap({ backLabel = 'Biblioteca', entries, onSaveEntry, onOpenEntry, onClose, toast }) {
  const items = useMemo(
    () => entries.filter(isRevisita).map((entry) => ({ entry, ...revisitaInfo(entry) })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [entries],
  )
  const placed = useMemo(() => items.filter((i) => i.lugar), [items])
  const missing = items.filter((i) => !i.lugar)
  const [selected, setSelected] = useState(null) // id de la revisita abierta
  const [placing, setPlacing] = useState(null) // id de la que se está ubicando
  const sel = items.find((i) => i.entry.id === selected)
  const plc = items.find((i) => i.entry.id === placing)

  const box = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const placingRef = useRef(null)
  placingRef.current = plc
  const placeRef = useRef(null)

  async function place(item, { lat, lng }) {
    await onSaveEntry({ ...item.entry, fields: { ...item.entry.fields, lugar: { lat, lng } } })
    setPlacing(null)
    setSelected(item.entry.id)
    map.current?.setView([lat, lng], Math.max(map.current.getZoom(), 17))
    toast(`${item.name} ya está en el mapa`)
  }
  placeRef.current = place

  // El mapa se crea una vez; con revisitas puestas se ven todas, si no, México.
  useEffect(() => {
    const m = L.map(box.current, { zoomControl: false, attributionControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m)
    m.attributionControl.setPrefix(false)
    if (placed.length) m.fitBounds(L.latLngBounds(placed.map((i) => [i.lugar.lat, i.lugar.lng])), { padding: [48, 48], maxZoom: 17 })
    else m.setView([23.6, -102.5], 5)
    m.on('click', (e) => {
      if (placingRef.current) placeRef.current(placingRef.current, e.latlng)
      else setSelected(null)
    })
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    const t = setTimeout(() => m.invalidateSize(), 300) // después de la animación de entrada
    return () => { clearTimeout(t); m.remove() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Un punto por revisita, con su nombre abajo.
  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    for (const i of placed) {
      const el = document.createElement('div')
      el.className = 'rv-pin' + (i.entry.id === selected ? ' on' : '')
      el.innerHTML = '<span class="rv-dot"></span><span class="rv-name"></span>'
      el.lastChild.textContent = i.name
      const icon = L.divIcon({ html: el, className: 'rv-icon', iconSize: [0, 0] })
      L.marker([i.lugar.lat, i.lugar.lng], { icon, keyboard: false })
        .on('click', () => { setPlacing(null); setSelected(i.entry.id) })
        .addTo(g)
    }
  }, [placed, selected])

  return (
    <div className="overlay rv">
      <header className="bar">
        <button className="bar-btn back" onClick={onClose}>
          <Icon d={ICONS.back} size={18} stroke={2} /> {backLabel}
        </button>
        <span className="bar-title">Revisitas</span>
        <span />
      </header>
      <div className="rv-map" ref={box} />
      <div className="rv-panel">
        {plc ? (
          <PlaceCard key={plc.entry.id} item={plc} near={placed.map((i) => i.lugar)} onPlace={(p) => place(plc, p)} onCancel={() => setPlacing(null)} toast={toast} />
        ) : sel ? (
          <div className="rv-card">
            <div className="rv-head">
              <h2 className="rv-title">{sel.name}</h2>
              <button className="sheet-close" aria-label="Cerrar" onClick={() => setSelected(null)}><Icon d={ICONS.borrar} size={16} stroke={2} /></button>
            </div>
            {sel.address && <p className="rv-line">{sel.address}</p>}
            <p className="rv-line">{sel.lastVisit ? `Última visita: ${sel.lastVisit}` : 'Sin visitas anotadas'}</p>
            {sel.said && <p className="rv-line">Dijo: {sel.said}</p>}
            {sel.next[0] && <p className="rv-line">Sigue: {sel.next[0]}</p>}
            <div className="rv-actions">
              <button className="secondary" onClick={() => onOpenEntry(sel.entry)}>Abrir nota</button>
              <a className="secondary rv-link" href={directionsUrl(sel.lugar)}>Cómo llegar</a>
            </div>
            <button className="rv-text-btn" onClick={() => { setSelected(null); setPlacing(sel.entry.id) }}>Cambiar el lugar</button>
          </div>
        ) : missing.length ? (
          <div className="rv-card">
            <h2 className="rv-title">Faltan en el mapa</h2>
            <ul className="rv-list">
              {missing.map((i) => (
                <li key={i.entry.id}>
                  <button className="entry-row" onClick={() => setPlacing(i.entry.id)}>
                    <span className="entry-main">
                      <span className="entry-title">{i.name}</span>
                      <span className="entry-sub">{i.address || 'Sin dirección'}</span>
                    </span>
                    <span className="rv-go">Ubicar</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : !items.length ? (
          <div className="rv-card">
            <p className="rv-line">Aún no hay revisitas. Dicta una y se guarda en Notas como "Revisita: Nombre"; luego aparece aquí.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Ubicar una revisita: buscar su dirección, "Estoy aquí" o tocar el mapa.
function PlaceCard({ item, near, onPlace, onCancel, toast }) {
  const [q, setQ] = useState(() => searchText(item.address))
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)

  async function search(e) {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      setResults(await geocode(q.trim(), near))
    } catch {
      toast('No se pudo buscar. Revisa la conexión.')
    } finally {
      setBusy(false)
    }
  }

  function here() {
    if (!navigator.geolocation) return toast('Este teléfono no da su ubicación.')
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); onPlace({ lat: p.coords.latitude, lng: p.coords.longitude }) },
      () => { setBusy(false); toast('No se pudo saber dónde estás. Revisa el permiso de ubicación.') },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <div className="rv-card">
      <div className="rv-head">
        <h2 className="rv-title">Ubicar: {item.name}</h2>
        <button className="sheet-close" aria-label="Cancelar" onClick={onCancel}><Icon d={ICONS.borrar} size={16} stroke={2} /></button>
      </div>
      {item.address && <p className="rv-line">{item.address}</p>}
      <form className="rv-search" onSubmit={search}>
        <input className="input" type="search" enterKeyHint="search" placeholder="Calle y número, colonia, ciudad" value={q} onChange={(e) => { setQ(e.target.value); setResults(null) }} />
        <button className="secondary" type="submit" disabled={busy}>Buscar</button>
      </form>
      {results && (results.length ? (
        <ul className="rv-list">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button className="entry-row" onClick={() => onPlace(r)}>
                <span className="entry-main"><span className="entry-sub rv-result">{r.label}</span></span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="rv-line">No la encontré. Agrega la colonia y la ciudad, o toca el mapa donde vive.</p>)}
      <button className="primary" onClick={here} disabled={busy}>Estoy aquí</button>
      <p className="rv-hint">O toca el mapa donde vive.</p>
    </div>
  )
}
