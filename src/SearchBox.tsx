import { useEffect, useRef, useState } from 'react'
import { buscar, type Resultado } from './geo'
import type { Lugar } from './supabase'
import { nombrePais } from './countries'
import Bandera from './Bandera'

type Props = {
  lugares: Lugar[]
  editable: boolean
  onResultado: (r: Resultado) => void
  onLugar: (l: Lugar) => void
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function SearchBox({ lugares, editable, onResultado, onLugar }: Props) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Resultado[]>([])
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const caja = useRef<HTMLDivElement>(null)

  const nq = normalizar(q.trim())
  const propios = nq.length >= 2 ? lugares.filter((l) => normalizar(l.nombre).includes(nq)).slice(0, 4) : []

  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) {
      setRes([])
      return
    }
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      setCargando(true)
      try {
        setRes(await buscar(t, ctrl.signal))
        setActivo(0)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setRes([])
      } finally {
        setCargando(false)
      }
    }, 450)
    return () => {
      clearTimeout(id)
      ctrl.abort()
    }
  }, [q])

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const total = propios.length + res.length
  const elegir = (i: number) => {
    if (i < propios.length) onLugar(propios[i])
    else if (res[i - propios.length]) onResultado(res[i - propios.length])
    else return
    setAbierto(false)
    setQ('')
  }

  return (
    <div className="buscador" ref={caja}>
      <div className="buscador__caja">
        <span className="buscador__lupa" aria-hidden>
          ⌕
        </span>
        <input
          value={q}
          placeholder={editable ? 'Busca una ciudad o país para añadir un pin…' : 'Busca un lugar…'}
          onChange={(e) => {
            setQ(e.target.value)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActivo((a) => Math.min(a + 1, total - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActivo((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              elegir(activo)
            } else if (e.key === 'Escape') {
              setAbierto(false)
            }
          }}
          aria-label="Buscar lugar"
        />
        {cargando && <span className="buscador__spin" aria-hidden />}
      </div>

      {abierto && q.trim().length >= 2 && (
        <ul className="buscador__lista" role="listbox">
          {propios.length > 0 && <li className="buscador__grupo">En tu mapa</li>}
          {propios.map((l, i) => (
            <li
              key={l.id}
              className={'buscador__item' + (activo === i ? ' is-activo' : '')}
              onMouseEnter={() => setActivo(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(i)
              }}
            >
              <span className="buscador__flag"><Bandera codigo={l.pais_codigo} alto={16} /></span>
              <span className="buscador__txt">
                <strong>{l.nombre}</strong>
                <small>{l.detalle || nombrePais(l.pais_codigo, l.pais)}</small>
              </span>
              <span className="etiqueta">ya tienes</span>
            </li>
          ))}
          {res.length > 0 && propios.length > 0 && <li className="buscador__grupo">Lugares</li>}
          {res.map((r, j) => {
            const i = propios.length + j
            return (
              <li
                key={`${r.lat},${r.lng},${j}`}
                className={'buscador__item' + (activo === i ? ' is-activo' : '')}
                onMouseEnter={() => setActivo(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  elegir(i)
                }}
              >
                <span className="buscador__flag"><Bandera codigo={r.pais_codigo} alto={16} /></span>
                <span className="buscador__txt">
                  <strong>{r.nombre}</strong>
                  <small>{r.detalle || nombrePais(r.pais_codigo, r.pais)}</small>
                </span>
                <span className="etiqueta">{r.tipo}</span>
              </li>
            )
          })}
          {!cargando && total === 0 && <li className="buscador__vacio">Sin resultados</li>}
        </ul>
      )}
    </div>
  )
}
