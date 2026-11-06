import { useState } from 'react'
import type { Borrador, Lugar } from './supabase'
import { nombrePais } from './countries'
import Bandera from './Bandera'

type Props = {
  inicial: Borrador
  viajes: string[]
  duplicado: Lugar | null
  guardando: boolean
  onGuardar: (b: Borrador) => void
  onBorrar: (id: string) => void
  onCerrar: () => void
}

export default function PlaceForm({ inicial, viajes, duplicado, guardando, onGuardar, onBorrar, onCerrar }: Props) {
  const [b, setB] = useState<Borrador>(inicial)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }))
  const esNuevo = !b.id

  return (
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form
        className="tarjeta form"
        onSubmit={(e) => {
          e.preventDefault()
          if (b.nombre.trim()) onGuardar({ ...b, nombre: b.nombre.trim() })
        }}
      >
        <header className="form__cab">
          <span className="form__flag"><Bandera codigo={b.pais_codigo} alto={26} /></span>
          <div>
            <h2>{esNuevo ? 'Nuevo pin' : 'Editar pin'}</h2>
            <p>{nombrePais(b.pais_codigo, b.pais)}</p>
          </div>
          <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>

        {esNuevo && duplicado && (
          <p className="aviso">Ya tienes «{duplicado.nombre}» en el mapa. Puedes añadirlo otra vez si es otra visita.</p>
        )}

        <label>
          Nombre
          <input value={b.nombre} onChange={(e) => set('nombre', e.target.value)} required autoFocus />
        </label>

        <div className="segmentado" role="radiogroup" aria-label="Estado">
          <button
            type="button"
            className={b.estado === 'visitado' ? 'is-on' : ''}
            onClick={() => set('estado', 'visitado')}
          >
            ✓ Estuve aquí
          </button>
          <button
            type="button"
            className={b.estado === 'pendiente' ? 'is-on' : ''}
            onClick={() => set('estado', 'pendiente')}
          >
            ☆ Quiero ir
          </button>
        </div>

        <div className="form__fila">
          <label>
            Tipo
            <select value={b.tipo} onChange={(e) => set('tipo', e.target.value)}>
              <option value="ciudad">Ciudad / pueblo</option>
              <option value="región">Región</option>
              <option value="país">País</option>
              <option value="lugar">Lugar</option>
            </select>
          </label>
          <label>
            Fecha
            <input type="date" value={b.fecha ?? ''} onChange={(e) => set('fecha', e.target.value || null)} />
          </label>
        </div>

        <label>
          Viaje <small>(para agrupar y ver la ruta)</small>
          <input
            list="lista-viajes"
            value={b.viaje ?? ''}
            placeholder="p. ej. Italia Semana Santa 2027"
            onChange={(e) => set('viaje', e.target.value || null)}
          />
          <datalist id="lista-viajes">
            {viajes.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>

        <label>
          Nota
          <textarea
            rows={3}
            value={b.nota ?? ''}
            placeholder="Dónde comimos, con quién fuimos, qué no hay que perderse…"
            onChange={(e) => set('nota', e.target.value || null)}
          />
        </label>

        <footer className="form__pie">
          {!esNuevo &&
            (confirmarBorrado ? (
              <button type="button" className="btn btn--peligro" onClick={() => onBorrar(b.id!)}>
                Sí, borrar
              </button>
            ) : (
              <button type="button" className="btn btn--texto" onClick={() => setConfirmarBorrado(true)}>
                Borrar
              </button>
            ))}
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
