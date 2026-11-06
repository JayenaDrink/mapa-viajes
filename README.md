# Mis viajes · mapa

Mapa personal de los países y ciudades visitados, con un pin por lugar. Los pines de un mismo país comparten color.

- **Frontend:** Vite + React + Leaflet (teselas CARTO/OpenStreetMap)
- **Búsqueda:** Photon (komoot) y Nominatim (OpenStreetMap), sin claves
- **Datos:** Supabase, tablas `mapa_lugares` y `mapa_paises` (proyecto `recogidas-benidorm`)
- **Despliegue:** Vercel (preset Vite, sin variables de entorno obligatorias)

## Modo edición

Cualquiera con el enlace puede **ver** el mapa. Para **añadir, editar o borrar** pines hace falta el código de edición
(se envía en la cabecera `x-edit-code` y lo comprueba la base de datos con RLS).

Cambiar el código (SQL Editor de Supabase):

```sql
update private.mapa_config
set codigo_hash = extensions.crypt('NUEVO-CODIGO', extensions.gen_salt('bf'))
where id = 1;
```

## Desarrollo

```bash
npm install
npm run dev
```

Variables opcionales: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (por defecto usa el proyecto de arriba con su clave publicable).
