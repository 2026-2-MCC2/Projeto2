import { useEffect, useState } from 'react'

const consulta = '(max-width: 900px)'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(consulta).matches)

  useEffect(() => {
    const media = window.matchMedia(consulta)
    const aoMudar = (evento) => setIsMobile(evento.matches)

    media.addEventListener('change', aoMudar)
    return () => media.removeEventListener('change', aoMudar)
  }, [])

  return isMobile
}
