// Búsqueda de lugares con servicios gratuitos de OpenStreetMap (sin claves)
// Photon (komoot) para autocompletar; Nominatim como respaldo y para el clic en el mapa.

export type Resultado = {
  nombre: string
  detalle: string | null
  pais: string | null
  pais_codigo: string
  lat: number
  lng: number
  tipo: string
  bbox?: [number, number, number, number] // [sur, oeste, norte, este]
}

function tipoDesde(valor?: string, clase?: string): string {
  const v = (valor || '').toLowerCase()
  if (v === 'country') return 'país'
  if (['state', 'region', 'province', 'county'].includes(v)) return 'región'
  if (['city', 'town', 'village', 'hamlet', 'municipality', 'suburb', 'district', 'locality'].includes(v))
    return 'ciudad'
  if (clase === 'boundary' || clase === 'place') return 'ciudad'
  return 'lugar'
}

function unir(...partes: (string | undefined | null)[]): string | null {
  const vistos = new Set<string>()
  const r = partes.filter((p): p is string => !!p && !vistos.has(p) && !!vistos.add(p))
  return r.length ? r.join(', ') : null
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    city?: string
    state?: string
    country?: string
    countrycode?: string
    osm_key?: string
    osm_value?: string
    type?: string
    extent?: [number, number, number, number]
  }
}

async function photon(q: string, signal?: AbortSignal): Promise<Resultado[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('photon ' + r.status)
  const data = (await r.json()) as { features: PhotonFeature[] }
  return data.features
    .filter((f) => f.properties.countrycode && f.properties.name)
    .map((f) => {
      const p = f.properties
      const tipo = p.type === 'country' ? 'país' : tipoDesde(p.type === 'city' ? 'city' : p.osm_value, p.osm_key)
      const e = p.extent
      return {
        nombre: p.name!,
        detalle: tipo === 'país' ? null : unir(tipo === 'ciudad' ? null : p.city, p.state, p.country),
        pais: p.country ?? null,
        pais_codigo: p.countrycode!.toUpperCase(),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        tipo,
        bbox: e ? [e[3], e[0], e[1], e[2]] : undefined,
      }
    })
}

type NominatimItem = {
  lat: string
  lon: string
  name?: string
  display_name: string
  addresstype?: string
  type?: string
  category?: string
  boundingbox?: [string, string, string, string]
  address?: Record<string, string>
}

function desdeNominatim(it: NominatimItem): Resultado | null {
  const a = it.address || {}
  const cc = a.country_code
  if (!cc) return null
  const tipo = tipoDesde(it.addresstype || it.type, it.category)
  const nombre =
    it.name || a.city || a.town || a.village || a.municipality || a.county || a.state || a.country
  if (!nombre) return null
  const b = it.boundingbox
  return {
    nombre,
    detalle: tipo === 'país' ? null : unir(a.state || a.province || a.county, a.country),
    pais: a.country ?? null,
    pais_codigo: cc.toUpperCase(),
    lat: parseFloat(it.lat),
    lng: parseFloat(it.lon),
    tipo,
    bbox: b ? [parseFloat(b[0]), parseFloat(b[2]), parseFloat(b[1]), parseFloat(b[3])] : undefined,
  }
}

async function nominatim(q: string, signal?: AbortSignal): Promise<Resultado[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=7&accept-language=es&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('nominatim ' + r.status)
  const data = (await r.json()) as NominatimItem[]
  return data.map(desdeNominatim).filter((x): x is Resultado => !!x)
}

const cerca = (a: Resultado, b: Resultado) =>
  a.pais_codigo === b.pais_codigo && Math.abs(a.lat - b.lat) < 0.15 && Math.abs(a.lng - b.lng) < 0.15

// Nominatim primero (ordena por importancia y da nombres en español: «Nápoles» → Italia),
// después lo que Photon añada sin repetir.
export async function buscar(q: string, signal?: AbortSignal): Promise<Resultado[]> {
  const [n, p] = await Promise.allSettled([nominatim(q, signal), photon(q, signal)])
  if (signal?.aborted) throw new DOMException('abortado', 'AbortError')
  const out: Resultado[] = n.status === 'fulfilled' ? [...n.value] : []
  if (p.status === 'fulfilled') for (const r of p.value) if (!out.some((x) => cerca(x, r))) out.push(r)
  return out.slice(0, 8)
}

// Lugar (a nivel de ciudad) en unas coordenadas — para añadir pines con un clic
export async function inverso(lat: number, lng: number): Promise<Resultado | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=10&accept-language=es&lat=${lat}&lon=${lng}`
  const r = await fetch(url)
  if (!r.ok) return null
  const it = (await r.json()) as NominatimItem & { error?: string }
  if (it.error) return null
  const res = desdeNominatim(it)
  if (!res) return null
  const a = it.address || {}
  const ciudad = a.city || a.town || a.village || a.municipality
  return { ...res, nombre: ciudad || res.nombre, tipo: ciudad ? 'ciudad' : res.tipo, lat, lng }
}
