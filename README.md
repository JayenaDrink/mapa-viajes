# Mis viajes · mapa

Mapa personal de los países y ciudades visitados, con un pin por lugar. Los pines de un mismo país comparten color.

- **Frontend:** Vite + React + Leaflet (teselas CARTO/OpenStreetMap)
- **Búsqueda:** Photon (komoot) y Nominatim (OpenStreetMap), sin claves
- **Datos:** Supabase, tablas `mapa_lugares` y `mapa_paises` (proyecto `recogidas-benidorm`)
- **Despliegue:** Vercel (preset Vite, sin variables de entorno obligatorias)

## Usuarios

Cada persona entra con su correo y contraseña (Supabase Auth) y **solo ve y edita sus propios pines**:
cada fila de `mapa_lugares` y `mapa_paises` lleva `user_id` y las políticas RLS filtran por `auth.uid()`.
No hay lectura pública.

El registro está cerrado: un trigger en `auth.users` rechaza altas salvo que se active `mapa.permitir_alta`.
Para dar de alta a alguien nuevo (SQL Editor de Supabase), en una sola ejecución:

```sql
select set_config('mapa.permitir_alta', 'si', true);
-- insert en auth.users + auth.identities (ver historial de este repo)
```

## Desarrollo

```bash
npm install
npm run dev
```

Variables opcionales: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (por defecto usa el proyecto de arriba con su clave publicable).
