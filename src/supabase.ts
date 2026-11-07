import { createClient } from '@supabase/supabase-js'

// La clave publicable es segura en el navegador: cada usuario solo puede
// leer y modificar sus propios pines (RLS por user_id en la base de datos).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://ktulqqeufzzrlkyuljog.supabase.co'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_DcMkff-_-d2Qu3AkFJEmZQ_hIq9Frz0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mapa-viajes:sesion' },
})

export type Estado = 'visitado' | 'pendiente'

export type Lugar = {
  id: string
  user_id: string
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

export type Borrador = Omit<Lugar, 'id' | 'created_at' | 'user_id'> & { id?: string }
