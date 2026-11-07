import { useState } from 'react'
import { supabase } from './supabase'

type Props = { onOk: () => void; onCerrar: () => void }

export default function CambiarClave({ onOk, onCerrar }: Props) {
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  return (
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form
        className="tarjeta form form--estrecho"
        onSubmit={async (e) => {
          e.preventDefault()
          if (clave.length < 8) return setError('Usa al menos 8 caracteres.')
          if (clave !== repetir) return setError('Las contraseñas no coinciden.')
          setGuardando(true)
          setError(null)
          const { error } = await supabase.auth.updateUser({ password: clave })
          setGuardando(false)
          if (error) setError(/weak|short|pwned|leaked/i.test(error.message) ? 'Esa contraseña es demasiado débil. Prueba otra.' : 'No se pudo cambiar: ' + error.message)
          else onOk()
        }}
      >
        <header className="form__cab">
          <div>
            <h2>Cambiar contraseña</h2>
            <p>La nueva contraseña sirve en todos tus dispositivos.</p>
          </div>
          <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>
        <label>
          Nueva contraseña
          <input type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus required />
        </label>
        <label>
          Repítela
          <input type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} required />
        </label>
        {error && <p className="aviso aviso--error">{error}</p>}
        <footer className="form__pie">
          <span className="espacio" />
          <button type="button" className="btn btn--texto" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </footer>
      </form>
    </div>
  )
}
