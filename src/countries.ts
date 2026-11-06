import numerico from './numerico.json'

// Paleta de colores bien distinguibles sobre un mapa claro.
// Varios países pueden compartir color; dentro de un país siempre es el mismo.
export const PALETA = [
  '#e63946', '#2a9d8f', '#4361ee', '#f77f00', '#7b2cbf', '#0096c7',
  '#d63384', '#8d5524', '#2b9348', '#c9184a', '#3a0ca3', '#e76f51',
  '#00798c', '#9d4edd', '#bc6c25', '#1d3557', '#ef476f', '#06a77d',
  '#b5179e', '#5f0f40', '#fb8500', '#118ab2', '#6a994e', '#9c6644',
]

export function colorPais(codigo: string): string {
  const c = codigo.toUpperCase()
  let h = 7
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i) * 17) % 9973
  return PALETA[h % PALETA.length]
}

let nombres: Intl.DisplayNames | null = null
try {
  nombres = new Intl.DisplayNames(['es'], { type: 'region' })
} catch {
  nombres = null
}

export function nombrePais(codigo: string, fallback?: string | null): string {
  try {
    const n = nombres?.of(codigo.toUpperCase())
    if (n && n !== codigo.toUpperCase()) return n
  } catch {
    /* código no reconocido */
  }
  return fallback || codigo.toUpperCase()
}

export function bandera(codigo: string): string {
  const c = codigo.toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return '🏳️'
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

// world-atlas usa códigos numéricos ISO 3166; los pasamos a alfa-2
export function numericoAAlfa2(id: string | number | undefined, nombre?: string): string | null {
  if (nombre === 'Kosovo') return 'XK'
  if (id === undefined || id === null || id === '') return null
  return (numerico as Record<string, string>)[String(id).padStart(3, '0')] ?? null
}

export const TOTAL_PAISES = 195
