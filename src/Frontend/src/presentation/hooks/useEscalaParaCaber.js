import { useLayoutEffect, useRef, useState } from 'react'

// Diz quanto uma ilustração desenhada com `largura` px precisa encolher para caber na caixa
// do ref (nunca aumenta). Usado com transform: scale(), para tudo encolher junto, texto incluso.
export function useEscalaParaCaber(largura) {
  const caixa = useRef(null)
  const [escala, setEscala] = useState(1)

  useLayoutEffect(() => {
    const elemento = caixa.current
    if (!elemento) return

    const observador = new ResizeObserver(([medida]) => {
      setEscala(Math.min(1, medida.contentRect.width / largura))
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [largura])

  return [caixa, escala]
}
