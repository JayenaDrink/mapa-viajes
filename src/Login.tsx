import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  return (
    <div className="login">
      <form
        className="tarjeta form login__tarjeta"
        onSubmit={async (e) => {
          e.preventDefault()
          setEntrando(true)
          setError(null)
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave })
          setEntrando(false)
          if (error) {
            setError(
              /invalid/i.test(error.message)
                ? 'Correo o contraseña incorrectos.'
                : 'No se pudo entrar. Revisa la conexión e inténtalo de nuevo.',
            )
          }
        }}
      >
        <div className="login__marca" aria-hidden>
          <svg width="44" height="58" viewBox="0 0 28 38">
            <path d="M14 1.5C7.1 1.5 1.8 6.8 1.8 13.5c0 9 12.2 23 12.2 23s12.2-14 12.2-23C26.2 6.8 20.9 1.5 14 1.5z" fill="#d9480f" stroke="#fff" strokeWidth="2.4" />
            <circle cx="14" cy="13.5" r="4.6" fill="#fff" />
          </svg>
        </div>
        <h1 className="login__titulo">Mis viajes</h1>
        <p className="login__sub">Tu mapa de los lugares donde has estado.</p>

        <label>
          Correo
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
        </label>
        {error && <p className="aviso aviso--error">{error}</p>}
        <button type="submit" className="btn btn--primario btn--ancho" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
