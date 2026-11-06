import { useCallback, useEffect, useMemo, useState } from 'react'
import L, { type Map as LMap } from 'leaflet'
import { crearCliente, type Borrador, type Lugar } from './supabase'
import { colorPais, nombrePais } from './countries'
import { inverso, type Resultado } from './geo'
import MapView from './MapView'
import Sidebar, { type Filtros } from './Sidebar'
import SearchBox from './SearchBox'
import PlaceForm from './PlaceForm'
import CodeDialog from './CodeDialog'

const LS_CODIGO = 'mapa-viajes:codigo'
function leerCodigo(): string | null {
  try {
    return localStorage.getItem(LS_CODIGO)
  } catch {
    return null
  }
}
function guardarCodigo(c: string | null) {
  try {
    if (c) localStorage.setItem(LS_CODIGO, c)
    else localStorage.removeItem(LS_CODIGO)
  } catch {
    /* almacenamiento no disponible */
  }
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export default function App() {
  const [codigo, setCodigo] = useState<string | null>(leerCodigo)
  const cliente = useMemo(() => crearCliente(codigo ?? undefined), [codigo])
  const editable = !!codigo

  const [lugares, setLugares] = useState<Lugar[]>([])
  const [coloresCustom, setColoresCustom] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [filtros, setFiltros] = useState<Filtros>({ estado: 'todos', anio: 'todos', viaje: 'todos' })
  const [colorear, setColorear] = useState(true)
  const [mapa, setMapa] = useState<LMap | null>(null)
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [pedirCodigo, setPedirCodigo] = useState(false)
  const [modoClic, setModoClic] = useState(false)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [abrirId, setAbrirId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null)

  const avisar = useCallback((texto: string, error = false) => setAviso({ texto, error }), [])
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3800)
    return () => clearTimeout(t)
  }, [aviso])

  // Carga inicial
  useEffect(() => {
    const c = crearCliente()
    Promise.all([
      c.from('mapa_lugares').select('*').order('fecha', { ascending: true, nullsFirst: false }).order('created_at'),
      c.from('mapa_paises').select('*'),
    ]).then(([l, p]) => {
      if (l.error) avisar('No se pudieron cargar los lugares', true)
      else setLugares(l.data as Lugar[])
      if (!p.error) setColoresCustom(Object.fromEntries((p.data as { pais_codigo: string; color: string }[]).map((x) => [x.pais_codigo, x.color])))
      setCargando(false)
    })
  }, [avisar])

  // Si había un código guardado, comprobar que sigue siendo válido
  useEffect(() => {
    if (!codigo) return
    cliente.rpc('mapa_codigo_valido').then(({ data, error }) => {
      if (!error && data !== true) {
        guardarCodigo(null)
        setCodigo(null)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const colorDe = useCallback((c: string) => coloresCustom[c] ?? colorPais(c), [coloresCustom])

  const filtrados = useMemo(
    () =>
      lugares.filter(
        (l) =>
          (filtros.estado === 'todos' || l.estado === filtros.estado) &&
          (filtros.anio === 'todos' || l.fecha?.startsWith(filtros.anio)) &&
          (filtros.viaje === 'todos' || l.viaje === filtros.viaje),
      ),
    [lugares, filtros],
  )

  const ruta = useMemo(() => {
    if (filtros.viaje === 'todos') return null
    return [...filtrados].sort(
      (a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || a.created_at.localeCompare(b.created_at),
    )
  }, [filtros.viaje, filtrados])

  const viajes = useMemo(() => [...new Set(lugares.map((l) => l.viaje).filter(Boolean) as string[])].sort(), [lugares])

  // Encajar el mapa al cambiar a un viaje
  useEffect(() => {
    if (!mapa || !ruta || ruta.length === 0) return
    if (ruta.length === 1) mapa.flyTo([ruta[0].lat, ruta[0].lng], 8)
    else mapa.flyToBounds(L.latLngBounds(ruta.map((l) => [l.lat, l.lng])), { padding: [60, 60], maxZoom: 9 })
  }, [ruta, mapa])

  const errorEscritura = (msg?: string) => {
    if (msg && /row-level security|permission/i.test(msg)) {
      guardarCodigo(null)
      setCodigo(null)
      avisar('El código de edición ya no es válido', true)
    } else avisar('No se pudo guardar: ' + (msg || 'error desconocido'), true)
  }

  const guardar = async (b: Borrador) => {
    setGuardando(true)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, ...datos } = b as Borrador & { created_at?: string }
    const q = id
      ? cliente.from('mapa_lugares').update(datos).eq('id', id).select().single()
      : cliente.from('mapa_lugares').insert(datos).select().single()
    const { data, error } = await q
    setGuardando(false)
    if (error) return errorEscritura(error.message)
    const l = data as Lugar
    setLugares((ls) => (id ? ls.map((x) => (x.id === id ? l : x)) : [...ls, l]))
    setBorrador(null)
    avisar(id ? 'Pin actualizado' : `📍 ${l.nombre} añadido`)
    if (!id) setAbrirId(l.id)
  }

  const borrar = async (id: string) => {
    const { error } = await cliente.from('mapa_lugares').delete().eq('id', id)
    if (error) return errorEscritura(error.message)
    setLugares((ls) => ls.filter((x) => x.id !== id))
    setBorrador(null)
    mapa?.closePopup()
    avisar('Pin borrado')
  }

  const cambiarColor = async (pais: string, color: string) => {
    setColoresCustom((c) => ({ ...c, [pais]: color }))
    const { error } = await cliente.from('mapa_paises').upsert({ pais_codigo: pais, color })
    if (error) errorEscritura(error.message)
  }

  const irA = (r: Resultado) => {
    if (!mapa) return
    if (r.bbox) {
      const [s, w, n, e] = r.bbox
      mapa.flyToBounds([[s, w], [n, e]], { maxZoom: r.tipo === 'país' ? 6 : 11, duration: 1.2 })
    } else mapa.flyTo([r.lat, r.lng], r.tipo === 'país' ? 5 : 10, { duration: 1.2 })
  }

  const nuevoDesde = (r: Resultado): Borrador => ({
    nombre: r.nombre,
    detalle: r.detalle,
    pais: nombrePais(r.pais_codigo, r.pais),
    pais_codigo: r.pais_codigo,
    lat: r.lat,
    lng: r.lng,
    tipo: r.tipo,
    estado: filtros.estado === 'pendiente' ? 'pendiente' : 'visitado',
    fecha: null,
    viaje: filtros.viaje !== 'todos' ? filtros.viaje : null,
    nota: null,
  })

  const alElegirResultado = (r: Resultado) => {
    irA(r)
    if (editable) setBorrador(nuevoDesde(r))
    else avisar('Pulsa «Editar» e introduce tu código para añadir pines')
  }

  const alClicMapa = async (lat: number, lng: number) => {
    avisar('Buscando qué lugar es…')
    const r = await inverso(lat, lng).catch(() => null)
    if (!r) return avisar('No encontré ninguna ciudad ahí (¿mar?)', true)
    setAviso(null)
    setModoClic(false)
    setBorrador(nuevoDesde(r))
  }

  const irPais = (codigo: string) => {
    if (!mapa) return
    const ls = filtrados.filter((l) => l.pais_codigo === codigo)
    if (ls.length === 0) return
    if (ls.length === 1) mapa.flyTo([ls[0].lat, ls[0].lng], ls[0].tipo === 'país' ? 5 : 7)
    else mapa.flyToBounds(L.latLngBounds(ls.map((l) => [l.lat, l.lng])), { padding: [60, 60], maxZoom: 8 })
  }

  const exportar = (formato: 'csv' | 'json') => {
    const campos = ['nombre', 'detalle', 'pais', 'pais_codigo', 'lat', 'lng', 'tipo', 'estado', 'fecha', 'viaje', 'nota'] as const
    let contenido: string
    if (formato === 'json') contenido = JSON.stringify(lugares.map((l) => Object.fromEntries(campos.map((c) => [c, l[c]]))), null, 2)
    else {
      const esc = (v: unknown) => (v == null ? '' : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
      contenido = '﻿' + [campos.join(','), ...lugares.map((l) => campos.map((c) => esc(l[c])).join(','))].join('\n')
    }
    const url = URL.createObjectURL(new Blob([contenido], { type: formato === 'json' ? 'application/json' : 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `mis-viajes.${formato}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const compartir = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      avisar('Enlace copiado: cualquiera con él puede ver el mapa (sin editar)')
    } catch {
      avisar(window.location.origin)
    }
  }

  const duplicado =
    borrador && !borrador.id
      ? lugares.find((l) => l.pais_codigo === borrador.pais_codigo && normalizar(l.nombre) === normalizar(borrador.nombre)) ?? null
      : null

  return (
    <div className="app">
      <aside className={'panel' + (panelAbierto ? ' is-abierto' : '')}>
        <header className="panel__cab">
          <div>
            <h1>Mis viajes</h1>
            <p>{editable ? 'Modo edición' : 'Mapa de lugares visitados'}</p>
          </div>
          <button className="cerrar solo-movil" onClick={() => setPanelAbierto(false)} aria-label="Cerrar lista">
            ×
          </button>
        </header>
        <Sidebar
          lugares={filtrados}
          todos={lugares}
          filtros={filtros}
          setFiltros={setFiltros}
          colorear={colorear}
          setColorear={setColorear}
          colorDe={colorDe}
          editable={editable}
          cargando={cargando}
          onCambiarColor={cambiarColor}
          onIrLugar={(l) => {
            setAbrirId(l.id)
            setPanelAbierto(false)
          }}
          onIrPais={irPais}
          onExportar={exportar}
        />
        <footer className="panel__pie">
          {editable ? (
            <>
              <button className={'btn' + (modoClic ? ' btn--primario' : '')} onClick={() => setModoClic((m) => !m)}>
                {modoClic ? 'Toca el mapa…' : '＋ Pin con un clic'}
              </button>
              <button
                className="btn btn--texto"
                onClick={() => {
                  guardarCodigo(null)
                  setCodigo(null)
                  setModoClic(false)
                }}
                title="Salir del modo edición"
              >
                🔓 Salir
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => setPedirCodigo(true)}>
              🔒 Editar
            </button>
          )}
          <span className="espacio" />
          <button className="btn btn--texto" onClick={compartir} title="Copiar enlace de solo lectura">
            Compartir
          </button>
        </footer>
      </aside>

      <main className="escenario">
        <MapView
          lugares={filtrados}
          colorDe={colorDe}
          colorear={colorear}
          ruta={ruta}
          editable={editable}
          modoClic={modoClic}
          abrirId={abrirId}
          onAbierto={() => setAbrirId(null)}
          onMapa={setMapa}
          onClicMapa={alClicMapa}
          onEditar={(l) => setBorrador({ ...l })}
        />
        <SearchBox lugares={lugares} editable={editable} onResultado={alElegirResultado} onLugar={(l) => setAbrirId(l.id)} />
        <button className="fab solo-movil" onClick={() => setPanelAbierto(true)}>
          ☰ Lista
        </button>
        {modoClic && (
          <div className="banda">
            Toca el mapa donde estuviste <button onClick={() => setModoClic(false)}>Cancelar</button>
          </div>
        )}
        {aviso && <div className={'toast' + (aviso.error ? ' toast--error' : '')}>{aviso.texto}</div>}
      </main>

      {borrador && (
        <PlaceForm
          key={borrador.id ?? `${borrador.lat},${borrador.lng}`}
          inicial={borrador}
          viajes={viajes}
          duplicado={duplicado}
          guardando={guardando}
          onGuardar={guardar}
          onBorrar={borrar}
          onCerrar={() => setBorrador(null)}
        />
      )}
      {pedirCodigo && (
        <CodeDialog
          onCerrar={() => setPedirCodigo(false)}
          onOk={(c) => {
            guardarCodigo(c)
            setCodigo(c)
            setPedirCodigo(false)
            avisar('Modo edición activado')
          }}
        />
      )}
    </div>
  )
}
