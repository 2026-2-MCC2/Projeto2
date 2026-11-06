import { useLayoutEffect, useRef, useState } from 'react'

// Diz quanto uma ilustração desenhada com `largura` px precisa encolher para caber na caixa
// do ref (nunca aumenta). Usado com transform: scale(), para tudo encolher junto, texto incluso.
export function useEscalaParaCaber(largura) {
  const caixa = useRef(null)
  const [escala, setEscala] = useState(1)

  useLayoutEffect(() => {
    const elemento = caixa.current
    if (!elemento) return

    const ajustar = (larguraDaCaixa) => setEscala(Math.min(1, larguraDaCaixa / largura))
    // mede antes da primeira pintura para a ilustração não aparecer grande e depois encolher
    ajustar(elemento.getBoundingClientRect().width)
    const observador = new ResizeObserver(([medida]) => ajustar(medida.contentRect.width))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [largura])

  return [caixa, escala]
}
