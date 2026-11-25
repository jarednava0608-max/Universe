// Guardar en IndexedDB en un teléfono que ya usaba la app, con la rutina bíblica de hoy.
// Caso real (iPhone, 25 nov 2026): con la hoja de la rutina abierta, el navegador cerró por su cuenta la conexión
// que la app tenía abierta y «Guardar» falló con "Failed to execute 'transaction' on 'IDBDatabase': The database
// connection is closing."; no se guardó nada. La base aquí es IndexedDB completa (fake-indexeddb sigue la
// especificación), no la de memoria de db.js, y la escribe primero la versión anterior de la app.
import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory, forceCloseDatabase } from 'fake-indexeddb'
import { makeRutina, rutinaId, tidyRutina, validateRutina } from '../study/rutina.js'

const HOY = '2026-11-25'
const T = Date.parse('2026-11-20T12:00:00Z')

// Lo que se llenó en «Guardar rutina de hoy»: Salmo 83:18, gancho A en los 3 puntos.
const RUTINA_HOY = {
  fecha: HOY,
  cita: 'Salmo 83:18',
  tema: 'Elegidos como testigos de Jehová',
  recuerdo: 'Jehová me escogió como su testigo porque me conoce bien y confía en mí para defender su nombre.',
  puntos: [
    { titulo: 'Elegido por confianza', ganchos: { A: 'Tu papá te pide que tú respondas por la familia.', B: '', C: '' }, elegido: 'A' },
    { titulo: 'Tu reputación da peso', ganchos: { A: 'Recomendar a un amigo: tu reputación decide si te creen.', B: '', C: '' }, elegido: 'A' },
    { titulo: 'Defender su nombre con orgullo', ganchos: { A: 'Defender a tu mamá cuando sueltan un chisme falso.', B: '', C: '' }, elegido: 'A' },
  ],
  cierre: {
    accion: 'Cuidar a propósito el trato y la reputación como testigo',
    disparador: 'Si hoy alguien me hace esperar, me contesta seco o me intenta sacar de quicio, pauso 3 segundos y respondo con respeto',
    hecha: false,
  },
  oracion: 'Pedirle a Jehová fuerzas y deseo para cumplirlo',
}

// Lo que ya tenía el teléfono, guardado por la versión anterior.
const NODOS = [
  { id: 'n-fe', title: 'Fe', note: 'Confianza en Jehová.', galaxy: 'espiritual', createdAt: T, updatedAt: T },
  { id: 'n-oracion', title: 'Oración', note: '', galaxy: 'espiritual', createdAt: T, updatedAt: T },
]
const ARISTA = { id: 'e-1', source: 'n-fe', target: 'n-oracion', rel: 'SE_FORTALECE_CON', createdAt: T, updatedAt: T }
const NOTA = { id: 'reflexion-1', kind: 'reflexion', fields: { titulo: 'Rutina Bíblica · 25 nov 2026', texto: 'Notas del estudio.' }, createdAt: T, updatedAt: T }
const DIARIO = { id: 'diario-2026-11-24', kind: 'diario', fields: { fecha: '2026-11-24', texto: 'Texto diario.' }, createdAt: T, updatedAt: T }

const done = (r) => new Promise((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error) })
const txDone = (tx) => new Promise((ok, fail) => { tx.oncomplete = ok; tx.onabort = () => fail(tx.error) })

// La base tal como la dejó la versión anterior en el teléfono (escrita sin db.js). v1: antes de las entradas.
async function telefonoConDatos(factory, version = 2) {
  const open = factory.open('universe', version)
  open.onupgradeneeded = () => {
    const d = open.result
    d.createObjectStore('nodes', { keyPath: 'id' })
    d.createObjectStore('edges', { keyPath: 'id' })
    d.createObjectStore('meta')
    if (version >= 2) d.createObjectStore('entries', { keyPath: 'id' })
  }
  const d = await done(open)
  const tx = d.transaction(version >= 2 ? ['nodes', 'edges', 'meta', 'entries'] : ['nodes', 'edges', 'meta'], 'readwrite')
  for (const n of NODOS) tx.objectStore('nodes').put(n)
  tx.objectStore('edges').put(ARISTA)
  if (version >= 2) {
    tx.objectStore('entries').put(NOTA)
    tx.objectStore('entries').put(DIARIO)
    tx.objectStore('meta').put({ nodes: {}, edges: {}, entries: { 'reflexion-1': { t: T, del: false, v: 1 } } }, 'outbox') // falta subirla
  } else {
    tx.objectStore('meta').put({ nodes: { 'n-fe': { t: T, del: false, v: 1 } }, edges: {} }, 'outbox')
  }
  await txDone(tx)
  d.close()
}

// Abre la app sobre ese teléfono (db.js recién cargado, como al abrirla o recargarla) y anota las conexiones que
// abre, para poder cerrarlas como lo hace el navegador.
async function abrirApp(factory) {
  vi.resetModules()
  globalThis.indexedDB = factory
  const conexiones = []
  factory.open = (...args) => {
    const r = IDBFactory.prototype.open.apply(factory, args)
    r.addEventListener('success', () => conexiones.push(r.result))
    return r
  }
  return { db: await import('./db.js'), conexiones }
}

// Como «Guardar» en la hoja: revisa la rutina, arma la entrada y la guarda con su anotación para la nube
// (StudyTab.saveRutina → store.saveEntry → db.commit).
async function guardarRutina(db) {
  const f = tidyRutina(RUTINA_HOY)
  expect(validateRutina(f)).toBe('')
  await db.commit({ putEntries: [{ ...makeRutina(f), updatedAt: Date.now() }] })
}

// Recarga la app y lee lo que quedó en el teléfono.
async function alRecargar(factory) {
  const { db } = await abrirApp(factory)
  return { ...(await db.loadAll()), outbox: await db.getOutbox() }
}

const errorDe = (fn) => {
  try {
    fn()
  } catch (e) {
    return e
  }
  return null
}

describe('Rutina bíblica: guardar en un teléfono que ya tenía datos', () => {
  it('abre la base que dejó la versión anterior y guarda la rutina sin perder nada', async () => {
    const factory = new IDBFactory()
    await telefonoConDatos(factory)
    const { db } = await abrirApp(factory)
    expect((await db.loadAll()).entries.map((e) => e.id)).toEqual(['diario-2026-11-24', 'reflexion-1'])

    await guardarRutina(db)

    const luego = await alRecargar(factory)
    expect(luego.entries.find((e) => e.id === rutinaId(HOY))).toMatchObject({ kind: 'rutina', fields: tidyRutina(RUTINA_HOY) })
    expect(luego.entries.find((e) => e.id === 'reflexion-1')).toEqual(NOTA) // la nota «Rutina Bíblica · 25 nov 2026», igual
    expect(luego.entries).toHaveLength(3)
    expect(luego.nodes).toEqual(NODOS)
    expect(luego.edges).toEqual([ARISTA])
    // Queda para subir a la nube, junto con lo que ya esperaba.
    expect(Object.keys(luego.outbox.entries).sort()).toEqual(['reflexion-1', rutinaId(HOY)])
  })

  it('una base más vieja (v1, sin entradas) se actualiza y la rutina se guarda en la conexión ya actualizada', async () => {
    const factory = new IDBFactory()
    await telefonoConDatos(factory, 1)
    const { db } = await abrirApp(factory)
    expect((await db.loadAll()).nodes).toEqual(NODOS)

    await guardarRutina(db)

    const luego = await alRecargar(factory)
    expect(luego.entries.map((e) => e.id)).toEqual([rutinaId(HOY)])
    expect(luego.nodes).toEqual(NODOS)
    expect(Object.keys(luego.outbox.nodes)).toEqual(['n-fe'])
    expect(Object.keys(luego.outbox.entries)).toEqual([rutinaId(HOY)])
  })
})

describe('Rutina bíblica: guardar cuando el navegador cerró la conexión', () => {
  // Safari en iPhone la cierra por su cuenta (p. ej. al volver la app del fondo) y lo avisa con «close».
  it('cierre forzado, con aviso: abre otra conexión y la rutina se guarda', async () => {
    const factory = new IDBFactory()
    await telefonoConDatos(factory)
    const { db, conexiones } = await abrirApp(factory)
    await db.loadAll() // la app abrió y leyó todo; luego se llena la hoja
    forceCloseDatabase(conexiones[0])

    await guardarRutina(db)

    expect(conexiones).toHaveLength(2)
    const luego = await alRecargar(factory)
    expect(luego.entries.map((e) => e.id)).toContain(rutinaId(HOY))
    expect(luego.entries).toHaveLength(3)
  })

  // Si se guarda antes de que llegue el aviso (o no llega), transaction() falla con "The database connection is
  // closing" (InvalidStateError): el error que salió en vivo.
  it('cerrada sin aviso («The database connection is closing»): reintenta con otra conexión y se guarda', async () => {
    const factory = new IDBFactory()
    await telefonoConDatos(factory)
    const { db, conexiones } = await abrirApp(factory)
    await db.loadAll()
    conexiones[0].close()
    expect(errorDe(() => conexiones[0].transaction('entries', 'readwrite'))?.name).toBe('InvalidStateError')

    await guardarRutina(db)

    expect(conexiones).toHaveLength(2)
    const luego = await alRecargar(factory)
    expect(luego.entries.find((e) => e.id === rutinaId(HOY))?.fields).toEqual(tidyRutina(RUTINA_HOY))
    expect(Object.keys(luego.outbox.entries).sort()).toEqual(['reflexion-1', rutinaId(HOY)])
  })

  it('lo demás (subir a la nube, textos de jw.org, ajustes) también vuelve a leer y escribir', async () => {
    const factory = new IDBFactory()
    await telefonoConDatos(factory)
    const { db, conexiones } = await abrirApp(factory)
    await db.loadAll()
    conexiones[0].close()
    expect(Object.keys((await db.getOutbox()).entries)).toEqual(['reflexion-1'])

    forceCloseDatabase(conexiones[1])
    await db.setMeta('prueba', { ok: true })
    expect(await db.getMeta('prueba')).toEqual({ ok: true })
    expect(await db.get('entries', 'reflexion-1')).toEqual(NOTA)
  })
})

describe('Otra pestaña o una versión nueva de la app pide actualizar la base', () => {
  it('suelta su conexión para no bloquearla y, si ya no puede abrirla, avisa en vez de guardar solo en memoria', async () => {
    const factory = new IDBFactory()
    await telefonoConDatos(factory)
    const { db } = await abrirApp(factory)
    await db.loadAll()

    const nueva = IDBFactory.prototype.open.call(factory, 'universe', 3)
    const resultado = await new Promise((ok) => {
      nueva.onblocked = () => ok('bloqueada')
      nueva.onsuccess = () => {
        nueva.result.close()
        ok('abierta')
      }
    })
    expect(resultado).toBe('abierta')

    // Esta versión ya no puede abrir la base nueva: el guardado falla con aviso, no se pierde en memoria.
    await expect(guardarRutina(db)).rejects.toMatchObject({ name: 'VersionError' })
    await expect(db.loadAll()).rejects.toMatchObject({ name: 'VersionError' })
  })
})
