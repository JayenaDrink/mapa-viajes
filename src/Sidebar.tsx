import { useMemo, useState } from 'react'
import type { Lugar } from './supabase'
import { bandera, nombrePais, TOTAL_PAISES } from './countries'

export type Filtros = { estado: 'todos' | 'visitado' | 'pendiente'; anio: string; viaje: string }

type Props = {
  lugares: Lugar[] // ya filtrados
  todos: Lugar[]
  filtros: Filtros
  setFiltros: (f: Filtros) => void
  colorear: boolean
  setColorear: (v: boolean) => void
  colorDe: (c: string) => string
  editable: boolean
  cargando: boolean
  onCambiarColor: (codigo: string, color: string) => void
  onIrLugar: (l: Lugar) => void
  onIrPais: (codigo: string) => void
  onExportar: (formato: 'csv' | 'json') => void
}

export default function Sidebar(p: Props) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})

  const anios = useMemo(
    () => [...new Set(p.todos.map((l) => l.fecha?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(),
    [p.todos],
  )
  const viajes = useMemo(
    () => [...new Set(p.todos.map((l) => l.viaje).filter(Boolean) as string[])].sort(),
    [p.todos],
  )

  const visitados = p.lugares.filter((l) => l.estado === 'visitado')
  const nPaises = new Set(visitados.map((l) => l.pais_codigo)).size
  const nLugares = visitados.filter((l) => l.tipo !== 'país').length
  const nPend = p.lugares.filter((l) => l.estado === 'pendiente').length
  const pct = Math.round((nPaises / TOTAL_PAISES) * 1000) / 10

  const grupos = useMemo(() => {
    const m = new Map<string, Lugar[]>()
    p.lugares.forEach((l) => m.set(l.pais_codigo, [...(m.get(l.pais_codigo) || []), l]))
    return [...m.entries()]
      .map(([codigo, ls]) => ({
        codigo,
        nombre: nombrePais(codigo, ls[0].pais),
        lugares: ls.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || a.nombre.localeCompare(b.nombre)),
        visitado: ls.some((l) => l.estado === 'visitado'),
      }))
      .sort((a, b) => Number(b.visitado) - Number(a.visitado) || b.lugares.length - a.lugares.length || a.nombre.localeCompare(b.nombre, 'es'))
  }, [p.lugares])

  return (
    <div className="panel__cuerpo">
      <section className="stats">
        <div className="stat">
          <b>{nPaises}</b>
          <span>países</span>
        </div>
        <div className="stat">
          <b>{nLugares}</b>
          <span>lugares</span>
        </div>
        <div className="stat">
          <b>{pct}%</b>
          <span>del mundo</span>
        </div>
        <div className="stat stat--pend">
          <b>{nPend}</b>
          <span>por visitar</span>
        </div>
        <div className="barra" aria-hidden>
          <i style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </section>

      <section className="filtros">
        <div className="segmentado segmentado--mini">
          {(['todos', 'visitado', 'pendiente'] as const).map((e) => (
            <button
              key={e}
              className={p.filtros.estado === e ? 'is-on' : ''}
              onClick={() => p.setFiltros({ ...p.filtros, estado: e })}
            >
              {e === 'todos' ? 'Todos' : e === 'visitado' ? 'Visitados' : 'Quiero ir'}
            </button>
          ))}
        </div>
        <div className="filtros__fila">
          <select value={p.filtros.anio} onChange={(e) => p.setFiltros({ ...p.filtros, anio: e.target.value })} aria-label="Año">
            <option value="todos">Todos los años</option>
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select value={p.filtros.viaje} onChange={(e) => p.setFiltros({ ...p.filtros, viaje: e.target.value })} aria-label="Viaje">
            <option value="todos">Todos los viajes</option>
            {viajes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <label className="interruptor">
          <input type="checkbox" checked={p.colorear} onChange={(e) => p.setColorear(e.target.checked)} />
          <span /> Colorear países visitados
        </label>
        {p.filtros.viaje !== 'todos' && <p className="pista">La línea discontinua une las paradas del viaje por fecha.</p>}
      </section>

      <section className="paises">
        {p.cargando && <p className="pista">Cargando tus lugares…</p>}
        {!p.cargando && grupos.length === 0 && (
          <div className="vacio">
            <p>
              <b>Tu mapa está en blanco.</b>
            </p>
            <p>
              {p.editable
                ? 'Busca arriba una ciudad o un país y añade tu primer pin.'
                : 'Pulsa «Editar» abajo e introduce tu código para empezar a añadir pines.'}
            </p>
          </div>
        )}
        {grupos.map((g) => {
          const abierto = abiertos[g.codigo]
          const color = p.colorDe(g.codigo)
          return (
            <div key={g.codigo} className={'pais' + (abierto ? ' is-abierto' : '')}>
              <div className="pais__fila">
                {p.editable ? (
                  <label className="pais__color" style={{ background: color }} title="Cambiar color del país">
                    <input type="color" value={color} onChange={(e) => p.onCambiarColor(g.codigo, e.target.value)} />
                  </label>
                ) : (
                  <span className="pais__color" style={{ background: color }} />
                )}
                <button
                  className="pais__nombre"
                  onClick={() => {
                    setAbiertos((a) => ({ ...a, [g.codigo]: !a[g.codigo] }))
                    p.onIrPais(g.codigo)
                  }}
                >
                  <span className="pais__flag">{bandera(g.codigo)}</span>
                  <span>{g.nombre}</span>
                  <span className="pais__n">{g.lugares.length}</span>
                  <span className="pais__chev" aria-hidden>
                    ›
                  </span>
                </button>
              </div>
              {abierto && (
                <ul className="pais__lugares">
                  {g.lugares.map((l) => (
                    <li key={l.id}>
                      <button onClick={() => p.onIrLugar(l)}>
                        <span className={'punto' + (l.estado === 'pendiente' ? ' punto--pend' : '')} style={{ ['--c' as string]: color }} />
                        <span className="pais__lugar">{l.nombre}</span>
                        <small>{l.fecha ? l.fecha.slice(0, 4) : l.tipo === 'país' ? 'país' : ''}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </section>

      {p.todos.length > 0 && (
        <section className="exportar">
          <span>Exportar:</span>
          <button className="btn btn--texto" onClick={() => p.onExportar('csv')}>
            CSV
          </button>
          <button className="btn btn--texto" onClick={() => p.onExportar('json')}>
            JSON
          </button>
        </section>
      )}
    </div>
  )
}
