// Banderas como imagen: Windows no dibuja los emojis de bandera
export default function Bandera({ codigo, alto = 14 }: { codigo: string; alto?: number }) {
  const c = codigo.toLowerCase()
  if (!/^[a-z]{2}$/.test(c)) return null
  return (
    <img
      className="bandera"
      src={`https://flagcdn.com/${c}.svg`}
      alt=""
      height={alto}
      width={Math.round(alto * 1.4)}
      loading="lazy"
      style={{ height: alto, width: Math.round(alto * 1.4) }}
    />
  )
}
