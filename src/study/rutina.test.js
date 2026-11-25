import { describe, it, expect } from 'vitest'
import { parseRutina, validateRutina, tidyRutina, isPrayer, emptyRutina, makeRutina, findRutina, lastOracion, rutinaId, rutinaText, rutinaTitle, rutinaSub, RUTINA, RUTINA_FORMAT } from './rutina.js'

const HOY = '2026-11-25'
// La rutina real del 25 nov 2026 (Salmo 83:18). Las opciones B y C de cada punto no se guardaron: van de relleno.
const BLOQUE = {
  fecha: HOY,
  texto: 'Salmo 83:18',
  tema: 'Elegidos como testigos de Jehová',
  recuerdo_activo: 'Jehová me escogió como su testigo porque me conoce bien y confía en mí para defender su nombre, como cuando uno elige a alguien de buena reputación para que lo defienda en un juicio.',
  mapa: [
    { titulo: 'Elegido por confianza', ganchos: { A: 'Tu papá te llama aparte en una reunión familiar y te dice que tú respondas por la familia.', B: 'Opción B de relleno', C: 'Opción C de relleno' }, gancho_elegido: 'A' },
    { titulo: 'Tu reputación da peso', ganchos: { A: 'Recomendar a tu amigo con la chica que le gusta: tu reputación decide si te creen.', B: 'Opción B de relleno', C: 'Opción C de relleno' }, gancho_elegido: 'A' },
    { titulo: 'Defender su nombre con orgullo', ganchos: { A: 'Defender a tu mamá en la cena cuando sueltan un chisme falso sobre ella.', B: 'Opción B de relleno', C: 'Opción C de relleno' }, gancho_elegido: 'A' },
  ],
  cierre: {
    opcion: 'A',
    accion: 'Cuidar a propósito el trato y la reputación como testigo.',
    disparador: 'Si hoy alguien me hace esperar, me contesta seco o me intenta sacar de quicio, pauso 3 segundos y respondo con respeto.',
  },
  oracion_fija: 'Pedirle a Jehová fuerzas y deseo para cumplirlo.',
}
// Como lo entrega Gemini: la rutina en texto y al final el bloque.
const pegado = (o) => `Rutina bíblica · 25 nov 2026\n1) Oración y recuerdo activo…\n\n\`\`\`json\n${JSON.stringify(o, null, 2)}\n\`\`\``
const sin = (path) => {
  const o = structuredClone(BLOQUE)
  const keys = path.split('.')
  const last = keys.pop()
  delete keys.reduce((x, k) => x[k], o)[last]
  return o
}

describe('Rutina bíblica: el bloque de Gemini', () => {
  it('lee la rutina de hoy (Salmo 83:18) completa', () => {
    const r = parseRutina(pegado(BLOQUE), HOY)
    expect(r.ok).toBe(true)
    const f = r.fields
    expect(f.fecha).toBe(HOY)
    expect(f.cita).toBe('Salmo 83:18')
    expect(f.tema).toBe('Elegidos como testigos de Jehová')
    expect(f.recuerdo).toMatch(/^Jehová me escogió como su testigo/)
    expect(f.puntos.map((p) => p.titulo)).toEqual(['Elegido por confianza', 'Tu reputación da peso', 'Defender su nombre con orgullo'])
    expect(f.puntos.map((p) => p.elegido)).toEqual(['A', 'A', 'A'])
    expect(f.puntos[2].ganchos.A).toMatch(/^Defender a tu mamá en la cena/)
    expect(f.cierre).toEqual({ accion: BLOQUE.cierre.accion, disparador: BLOQUE.cierre.disparador, opcion: 'A', hecha: false })
    expect(f.oracion).toBe('Pedirle a Jehová fuerzas y deseo para cumplirlo.')
  })

  it('lo lee aunque venga sin ```json, con comillas tipográficas o con una coma de más', () => {
    const json = JSON.stringify(BLOQUE)
    expect(parseRutina(`Aquí va tu bloque:\n${json}\n¡Buen día!`, HOY).ok).toBe(true)
    expect(parseRutina(json.replace(/"/g, '”'), HOY).ok).toBe(true)
    expect(parseRutina(json.replace(/}$/, ',}'), HOY).ok).toBe(true)
  })

  it('acepta nombres con acentos o mayúsculas, ganchos en lista y la letra como "Gancho B"', () => {
    const o = {
      Fecha: HOY,
      Cita: 'Sal. 83:18',
      'Recuerdo Activo': 'Con mis palabras.',
      Mapa: BLOQUE.mapa.map((p) => ({ Título: p.titulo, Ganchos: [p.ganchos.A, p.ganchos.B, p.ganchos.C], 'Gancho elegido': 'Gancho B' })),
      Cierre: { Acción: 'Saludar a todos por su nombre.', Disparador: 'Al llegar al trabajo.' },
      'Oración fija': 'Pedir fuerzas.',
    }
    const r = parseRutina(JSON.stringify(o), HOY)
    expect(r.ok).toBe(true)
    expect(r.fields.puntos.map((p) => p.elegido)).toEqual(['B', 'B', 'B'])
    expect(r.fields.cita).toBe('Sal. 83:18')
    expect(r.fields.cierre.accion).toBe('Saludar a todos por su nombre.')
  })

  it('sin fecha usa la de hoy; con la fecha mal escrita avisa', () => {
    expect(parseRutina(JSON.stringify(sin('fecha')), HOY).fields.fecha).toBe(HOY)
    expect(parseRutina(JSON.stringify({ ...BLOQUE, fecha: '25/11/2026' }), HOY).error).toMatch(/AAAA-MM-DD/)
    expect(parseRutina(JSON.stringify({ ...BLOQUE, fecha: '2026-02-30' }), HOY).error).toMatch(/AAAA-MM-DD/)
  })

  it('si falta un campo dice cuál y no devuelve nada que guardar', () => {
    const casos = [
      [sin('texto'), /«texto»/],
      [sin('recuerdo_activo'), /«recuerdo_activo»/],
      [sin('mapa'), /«mapa»/],
      [{ ...BLOQUE, mapa: BLOQUE.mapa.slice(0, 2) }, /3 puntos \(trae 2\)/],
      [sin('mapa.1.titulo'), /Punto 2: falta el título/],
      [sin('mapa.2.gancho_elegido'), /Punto 3: falta el gancho elegido/],
      [{ ...BLOQUE, mapa: BLOQUE.mapa.map((p, i) => (i ? p : { ...p, gancho_elegido: 'B', ganchos: { ...p.ganchos, B: '' } })) }, /Punto 1: el gancho elegido \(B\) está vacío/],
      [sin('cierre.accion'), /«cierre\.accion»/],
      [sin('cierre.disparador'), /«cierre\.disparador»/],
      [sin('oracion_fija'), /«oracion_fija»/],
    ]
    for (const [o, msg] of casos) {
      const r = parseRutina(JSON.stringify(o), HOY)
      expect(r.ok).toBe(false)
      expect(r.fields).toBeUndefined()
      expect(r.error).toMatch(msg)
    }
  })

  it('JSON roto o sin bloque: avisa y no guarda nada', () => {
    const roto = parseRutina('{ "fecha": "2026-11-25", "texto": "Salmo 83:18", "mapa": [', HOY)
    expect(roto).toEqual({ ok: false, error: expect.stringMatching(/roto/) })
    expect(parseRutina('{ "fecha": "2026-11-25", "texto": }', HOY).error).toMatch(/roto/)
    expect(parseRutina('Solo texto, sin bloque.', HOY).error).toMatch(/No encontré/)
    expect(parseRutina('   ', HOY).error).toMatch(/No hay nada pegado/)
    expect(parseRutina('[1, 2, 3]', HOY).error).toMatch(/No encontré/)
  })
})

describe('Rutina bíblica: la oración va fija, la acción nunca es orar', () => {
  it('reconoce cuando una acción es orar', () => {
    for (const t of ['Orar antes de salir', 'Hacer una oración por mis compañeros', 'Pedirle a Jehová paciencia', 'Rezar el rosario', 'Hablar con Jehová en el camino']) expect(isPrayer(t)).toBe(true)
    for (const t of ['Ahora sí, cuidar el trato', 'Decorar la sala', 'Órale: saludar al vecino', 'Llamar a mi abuela', BLOQUE.cierre.accion]) expect(isPrayer(t)).toBe(false)
  })

  it('la acción del cierre no puede ser orar, ni ninguna de sus opciones A, B o C', () => {
    const orar = { ...BLOQUE, cierre: { ...BLOQUE.cierre, accion: 'Orar por mis compañeros de trabajo.' } }
    expect(parseRutina(JSON.stringify(orar), HOY).error).toMatch(/no puede ser orar/)
    const opciones = { ...BLOQUE, cierre: { ...BLOQUE.cierre, opciones: { A: BLOQUE.cierre.accion, B: 'Hacer una oración breve al mediodía.', C: 'Saludar con respeto.' } } }
    expect(parseRutina(JSON.stringify(opciones), HOY).error).toMatch(/opción B del cierre es orar/)
  })

  it('si viene la opción elegida y sus opciones, la acción es la elegida', () => {
    const o = { ...BLOQUE, cierre: { opcion: 'C', opciones: { A: 'Uno.', B: 'Dos.', C: 'Saludar con respeto.' }, disparador: 'Al llegar.' } }
    expect(parseRutina(JSON.stringify(o), HOY).fields.cierre).toEqual({ accion: 'Saludar con respeto.', disparador: 'Al llegar.', opcion: 'C', hecha: false })
  })
})

describe('Rutina bíblica: una por fecha', () => {
  it('el id es la fecha y al reemplazarla conserva cuándo se creó', () => {
    const f = parseRutina(pegado(BLOQUE), HOY).fields
    const e = makeRutina(f, null, 1000)
    expect(e).toEqual({ id: 'rutina-2026-11-25', kind: RUTINA, fields: f, createdAt: 1000, updatedAt: 1000 })
    expect(rutinaId(HOY)).toBe('rutina-2026-11-25')
    expect(makeRutina(f, e, 2000)).toMatchObject({ id: e.id, createdAt: 1000, updatedAt: 2000 })
    expect(findRutina([{ id: 'x', kind: 'diario', fields: { fecha: HOY } }, e], HOY)).toBe(e)
    expect(findRutina([e], '2026-11-24')).toBeNull()
  })

  it('lo escrito a mano se valida igual y la oración fija se toma de la última rutina', () => {
    const vacia = emptyRutina(HOY, 'Pedirle fuerzas.')
    expect(vacia.puntos).toHaveLength(3)
    expect(validateRutina(vacia)).toMatch(/«texto»/)
    const llena = { ...parseRutina(pegado(BLOQUE), HOY).fields }
    expect(validateRutina(llena)).toBe('')
    const entries = [makeRutina({ ...llena, fecha: '2026-11-20', oracion: 'Vieja.' }), makeRutina(llena)]
    expect(lastOracion(entries)).toBe('Pedirle a Jehová fuerzas y deseo para cumplirlo.')
    expect(lastOracion([])).toBe('')
  })

  it('lo escrito a mano se limpia como lo pegado y conserva si la acción ya estaba hecha', () => {
    const f = parseRutina(pegado(BLOQUE), HOY).fields
    const sucia = { ...f, cita: '  Salmo 83:18 ', puntos: f.puntos.map((p) => ({ ...p, titulo: ` ${p.titulo}  ` })), cierre: { ...f.cierre, accion: ` ${f.cierre.accion}\n`, hecha: true } }
    const t = tidyRutina(sucia)
    expect(t.cita).toBe('Salmo 83:18')
    expect(t.puntos[0].titulo).toBe('Elegido por confianza')
    expect(t.cierre).toEqual({ ...f.cierre, hecha: true })
    expect(validateRutina(t)).toBe('')
    expect(tidyRutina(emptyRutina(HOY)).puntos.map((p) => p.elegido)).toEqual(['', '', ''])
  })

  it('título, resumen y texto para buscar en el historial', () => {
    const f = parseRutina(pegado(BLOQUE), HOY).fields
    expect(rutinaTitle(f)).toBe('Elegidos como testigos de Jehová')
    expect(rutinaSub(f)).toBe('Salmo 83:18 · Acción pendiente')
    expect(rutinaSub({ ...f, cierre: { ...f.cierre, hecha: true } })).toBe('Salmo 83:18 · Acción hecha')
    expect(rutinaText(f)).toContain('chisme falso')
    expect(rutinaText(f)).toContain('pauso 3 segundos')
  })

  it('el formato que se le da a Gemini trae todos los campos y la app lo puede leer', () => {
    for (const k of ['"recuerdo_activo"', '"mapa"', '"gancho_elegido"', '"cierre"', '"disparador"', '"oracion_fija"', 'nunca orar']) expect(RUTINA_FORMAT).toContain(k)
    expect(parseRutina(RUTINA_FORMAT.replace('AAAA-MM-DD', HOY), HOY).ok).toBe(true)
  })
})
