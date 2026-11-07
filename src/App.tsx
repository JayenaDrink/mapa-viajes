import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Login from './Login'
import Mapa from './Mapa'

export default function App() {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setListo(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!listo) return <div className="login" aria-busy="true" />
  if (!sesion) return <Login />
  // key: al cambiar de usuario se vacía todo el estado del mapa anterior
  return <Mapa key={sesion.user.id} usuario={sesion.user} />
}
