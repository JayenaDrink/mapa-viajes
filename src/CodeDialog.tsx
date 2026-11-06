import { useState } from 'react'
import { crearCliente } from './supabase'

type Props = { onOk: (codigo: string) => void; onCerrar: () => void }

export default function CodeDialog({ onOk, onCerrar }: Props) {
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [probando, setProbando] = useState(false)

  return (
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form
        className="tarjeta form form--estrecho"
        onSubmit={async (e) => {
          e.preventDefault()
          const c = codigo.trim()
          if (!c) return
          setProbando(true)
          setError(null)
          const { data, error } = await crearCliente(c).rpc('mapa_codigo_valido')
          setProbando(false)
          if (error) setError('No se pudo comprobar el código. Inténtalo de nuevo.')
          else if (data === true) onOk(c)
          else setError('Código incorrecto.')
        }}
      >
        <header className="form__cab">
          <span className="form__flag">🔑</span>
          <div>
            <h2>Modo edición</h2>
            <p>Introduce tu código para añadir y editar pines.</p>
          </div>
          <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>
        <label>
          Código de edición
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            autoFocus
            autoComplete="current-password"
            type="password"
          />
        </label>
        {error && <p className="aviso aviso--error">{error}</p>}
        <footer className="form__pie">
          <span className="espacio" />
          <button type="submit" className="btn btn--primario" disabled={probando}>
            {probando ? 'Comprobando…' : 'Entrar'}
          </button>
        </footer>
      </form>
    </div>
  )
}
