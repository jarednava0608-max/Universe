// En la app de la pantalla de inicio (iPhone), iOS abre los enlaces de fuera en una hoja
// encima de la app. Con "x-safari-https://" (iOS 17 o más) se abren en Safari, como otra app.
export function safariUrl(href, ua = '') {
  if (!/^https?:\/\//i.test(href ?? '')) return null
  const v = /OS (\d+)_\d+(?:_\d+)? like Mac OS X/.exec(ua)
  if (!v || Number(v[1]) < 17) return null
  return 'x-safari-' + href
}

export function isStandalone() {
  return Boolean(window.navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches)
}
