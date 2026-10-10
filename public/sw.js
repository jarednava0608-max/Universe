// Service worker simple: la app funciona sin conexión.
// HTML: red primero (para recibir versiones nuevas). Archivos con hash: caché primero.
const CACHE = 'universe-v8'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})

// Avisos de Constancia y de Pendientes (los mandan las funciones constancia-push y pendientes-push de Supabase).
// `tab`: la pestaña que abre el aviso al tocarlo (Pendientes manda 'pendientes').
self.addEventListener('push', (e) => {
  const d = e.data ? e.data.json() : {}
  e.waitUntil(self.registration.showNotification(d.title || 'Universe', { body: d.body || '', tag: d.tag, icon: '/icon-192.png', badge: '/icon-192.png', data: { tab: d.tab || null } }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const tab = e.notification.data?.tab
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list[0]) {
        if (tab) list[0].postMessage({ type: 'open-tab', tab })
        return list[0].focus()
      }
      return self.clients.openWindow(tab ? '/?tab=' + tab : '/')
    }),
  )
})
