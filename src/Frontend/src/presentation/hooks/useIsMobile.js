import { useEffect, useState } from 'react'

// Diz se a tela está no tamanho mobile e acompanha o redimensionamento.
// Serve para casos em que o layout muda de verdade entre mobile e desktop,

export function useIsMobile(larguraMaxima = 900) {
  const consulta = `(max-width: ${larguraMaxima}px)`
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(consulta).matches)

  useEffect(() => {
    const media = window.matchMedia(consulta)
    const aoMudar = (evento) => setIsMobile(evento.matches)

    media.addEventListener('change', aoMudar)
    return () => media.removeEventListener('change', aoMudar)
  }, [consulta])

  return isMobile
}
