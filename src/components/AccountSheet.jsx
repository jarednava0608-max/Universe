import { useState } from 'react'

// Cuenta y sincronización con la nube.
export default function AccountSheet({ sync, onClose }) {
  const { session, status } = sync
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function go(kind) {
    setError('')
    setMsg('')
    if (!email.trim() || password.length < 6) return setError('Escribe tu correo y una contraseña de al menos 6 caracteres.')
    setBusy(true)
    const { data, error } = await (kind === 'in' ? sync.signIn(email.trim(), password) : sync.signUp(email.trim(), password))
    setBusy(false)
    if (error) return setError(translate(error.message))
    if (kind === 'up' && !data.session) setMsg('Te envié un correo para confirmar tu cuenta. Ábrelo, confirma y luego vuelve aquí y toca “Entrar”.')
  }

  return (
    <div className="overlay">
      <header className="bar">
        <button className="bar-btn" onClick={onClose}>Cerrar</button>
        <span className="bar-title">Cuenta y nube</span>
        <span className="bar-spacer" />
      </header>
      <div className="editor-body">
        {session ? (
          <>
            <p className="hint">Conectado como</p>
            <p className="account-email">{session.user.email}</p>
            <p className="sync-line">
              <span className={'sync-dot ' + status.state} />
              {describe(status)}
            </p>
            {status.error && <p className="error">{status.error}</p>}
            <p className="hint">
              Todo tu estudio (mapa, entradas de Estudio y juegos) se guarda en el teléfono y se copia a la nube automáticamente. Si entras con esta cuenta en otro dispositivo, verás lo mismo.
            </p>
            <button className="secondary" disabled={status.state === 'syncing'} onClick={sync.syncNow}>Sincronizar ahora</button>
            <button className="delete-btn" onClick={() => confirm('¿Cerrar sesión? Tus datos se quedan en este teléfono y en la nube.') && sync.signOut()}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <p className="hint">
              Entra para guardar todo tu estudio en la nube. Mientras no entres, todo se guarda solo en este teléfono.
            </p>
            {error && <p className="error">{error}</p>}
            {msg && <p className="notice">{msg}</p>}
            <label className="field">
              <span>Correo</span>
              <input className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button className="primary" disabled={busy} onClick={() => go('in')}>Entrar</button>
            <button className="secondary" disabled={busy} onClick={() => go('up')}>Crear cuenta</button>
          </>
        )}
      </div>
    </div>
  )
}

export function describe(status) {
  switch (status.state) {
    case 'syncing': return 'Sincronizando…'
    case 'ok': return status.pending ? `${status.pending} cambios por subir` : `Todo guardado en la nube · ${new Date(status.lastSync).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    case 'offline': return 'Sin internet: se subirá al reconectar'
    case 'error': return 'Error al sincronizar'
    default: return 'Solo en este teléfono'
  }
}

function translate(m) {
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/email not confirmed/i.test(m)) return 'Primero confirma tu correo (revisa tu bandeja de entrada).'
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Toca “Entrar”.'
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera unos minutos.'
  return m
}
