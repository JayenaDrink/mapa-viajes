import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import L, { type Map as LMap } from 'leaflet'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { Lugar } from './supabase'
import { bandera, nombrePais, numericoAAlfa2 } from './countries'

type Props = {
  lugares: Lugar[]
  colorDe: (codigo: string) => string
  colorear: boolean
  ruta: Lugar[] | null
  editable: boolean
  modoClic: boolean
  abrirId: string | null
  onAbierto: () => void
  onMapa: (m: LMap) => void
  onClicMapa: (lat: number, lng: number) => void
  onEditar: (l: Lugar) => void
}

const iconos = new Map<string, L.DivIcon>()
function icono(color: string, pendiente: boolean): L.DivIcon {
  const k = color + (pendiente ? '-p' : '')
  let i = iconos.get(k)
  if (!i) {
    const relleno = pendiente ? '#ffffff' : color
    const borde = pendiente ? color : '#ffffff'
    const centro = pendiente ? color : '#ffffff'
    const dash = pendiente ? 'stroke-dasharray="3 2"' : ''
    i = L.divIcon({
      className: 'pin',
      html: `<svg width="28" height="38" viewBox="0 0 28 38" aria-hidden="true"><path d="M14 1.5C7.1 1.5 1.8 6.8 1.8 13.5c0 9 12.2 23 12.2 23s12.2-14 12.2-23C26.2 6.8 20.9 1.5 14 1.5z" fill="${relleno}" stroke="${borde}" stroke-width="2.4" ${dash}/><circle cx="14" cy="13.5" r="4.6" fill="${centro}"/></svg>`,
      iconSize: [28, 38],
      iconAnchor: [14, 37],
      popupAnchor: [0, -32],
    })
    iconos.set(k, i)
  }
  return i
}

type PaisFeature = Feature<Geometry, { name: string; codigo: string | null }>

function Clics({ activo, onClic }: { activo: boolean; onClic: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (activo) onClic(e.latlng.lat, L.Util.wrapNum(e.latlng.lng, [-180, 180], true))
    },
  })
  return null
}

function fechaBonita(f: string | null) {
  if (!f) return null
  const d = new Date(f + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MapView(p: Props) {
  const [paises, setPaises] = useState<PaisFeature[]>([])
  const marcadores = useRef<Record<string, L.Marker>>({})
  const mapaRef = useRef<LMap | null>(null)

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json')
      .then((r) => r.json())
      .then((topo) => {
        const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>
        setPaises(
          fc.features.map((f) => ({
            ...f,
            properties: { name: f.properties.name, codigo: numericoAAlfa2(f.id as string, f.properties.name) },
          })),
        )
      })
      .catch(() => setPaises([]))
  }, [])

  // Abrir el popup de un lugar elegido desde la lista
  useEffect(() => {
    if (!p.abrirId || !mapaRef.current) return
    const l = p.lugares.find((x) => x.id === p.abrirId)
    const m = mapaRef.current
    if (!l) return
    m.flyTo([l.lat, l.lng], Math.max(m.getZoom(), l.tipo === 'país' ? 5 : 9), { duration: 1.2 })
    m.once('moveend', () => marcadores.current[l.id]?.openPopup())
    p.onAbierto()
  }, [p.abrirId]) // eslint-disable-line react-hooks/exhaustive-deps

  const visitados = useMemo(() => {
    const s = new Set<string>()
    p.lugares.forEach((l) => l.estado === 'visitado' && s.add(l.pais_codigo))
    return s
  }, [p.lugares])

  const capaPaises = useMemo(() => {
    if (!p.colorear) return null
    const fs = paises.filter((f) => f.properties.codigo && visitados.has(f.properties.codigo))
    return { type: 'FeatureCollection', features: fs } as FeatureCollection<Geometry, { codigo: string | null }>
  }, [paises, visitados, p.colorear])

  const claveCapa = useMemo(
    () => [...visitados].sort().map((c) => c + p.colorDe(c)).join('|'),
    [visitados, p.colorDe],
  )

  return (
    <MapContainer
      center={[38, 0]}
      zoom={3}
      minZoom={2}
      worldCopyJump
      zoomControl={false}
      className={'mapa' + (p.modoClic ? ' mapa--clic' : '')}
      ref={(m) => {
        if (m && mapaRef.current !== m) {
          mapaRef.current = m
          L.control.zoom({ position: 'bottomright' }).addTo(m)
          p.onMapa(m)
        }
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      {capaPaises && capaPaises.features.length > 0 && (
        <GeoJSON
          key={claveCapa}
          data={capaPaises}
          interactive={false}
          style={(f) => {
            const c = p.colorDe((f?.properties as { codigo: string }).codigo)
            return { fillColor: c, fillOpacity: 0.28, color: c, weight: 1.2, opacity: 0.7 }
          }}
        />
      )}

      {p.ruta && p.ruta.length > 1 && (
        <Polyline
          positions={p.ruta.map((l) => [l.lat, l.lng] as [number, number])}
          pathOptions={{ color: '#1f2a37', weight: 2.5, dashArray: '6 6', opacity: 0.75 }}
        />
      )}

      {p.lugares.map((l) => (
        <Marker
          key={l.id}
          position={[l.lat, l.lng]}
          icon={icono(p.colorDe(l.pais_codigo), l.estado === 'pendiente')}
          ref={(m) => {
            if (m) marcadores.current[l.id] = m
            else delete marcadores.current[l.id]
          }}
        >
          <Popup>
            <div className="popup">
              <div className="popup__titulo">
                {bandera(l.pais_codigo)} <strong>{l.nombre}</strong>
              </div>
              <div className="popup__sub">
                {l.detalle || nombrePais(l.pais_codigo, l.pais)}
                {l.estado === 'pendiente' && <span className="etiqueta etiqueta--pend">Quiero ir</span>}
              </div>
              {(l.fecha || l.viaje) && (
                <div className="popup__meta">
                  {fechaBonita(l.fecha)}
                  {l.fecha && l.viaje && ' · '}
                  {l.viaje && <em>{l.viaje}</em>}
                </div>
              )}
              {l.nota && <p className="popup__nota">{l.nota}</p>}
              {p.editable && (
                <button className="btn btn--mini" onClick={() => p.onEditar(l)}>
                  Editar
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      <Clics activo={p.modoClic} onClic={p.onClicMapa} />
    </MapContainer>
  )
}
