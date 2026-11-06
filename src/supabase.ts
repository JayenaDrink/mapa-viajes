import { createClient } from '@supabase/supabase-js'

// La clave publicable es segura en el navegador: la escritura está protegida
// en la base de datos (RLS) por el código de edición.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://ktulqqeufzzrlkyuljog.supabase.co'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_DcMkff-_-d2Qu3AkFJEmZQ_hIq9Frz0'

export type Estado = 'visitado' | 'pendiente'

export type Lugar = {
  id: string
  nombre: string
  detalle: string | null
  pais: string | null
  pais_codigo: string
  lat: number
  lng: number
  tipo: string
  estado: Estado
  fecha: string | null
  viaje: string | null
  nota: string | null
  created_at: string
}

export type Borrador = Omit<Lugar, 'id' | 'created_at'> & { id?: string }

export function crearCliente(codigo?: string) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: codigo ? { 'x-edit-code': codigo } : {} },
  })
}
