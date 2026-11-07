import { useEffect, useState } from 'react'

// avisos a cada 10% visível; com limiar 0 basta saber se entrou
const PASSOS = Array.from({ length: 11 }, (_, indice) => indice / 10)
const TEM_OBSERVADOR = typeof window !== 'undefined' && 'IntersectionObserver' in window

// se `limiar` do elemento está na tela (ou ocupa `limiar` da altura dela, em elementos mais altos que a tela);
// com `umaVez` fica true para sempre. Sem IntersectionObserver no navegador, conta como na tela
export function useNaTela(
  ref,
  { limiar = 0.3, margem = '0px', umaVez = true, inicial = false } = {},
) {
  const [naTela, setNaTela] = useState(() => inicial || !TEM_OBSERVADOR)
  const jaApareceu = umaVez && naTela

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || jaApareceu || !TEM_OBSERVADOR) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        const alturaDaTela = entrada.rootBounds?.height ?? window.innerHeight
        const visivel =
          entrada.isIntersecting &&
          (entrada.intersectionRatio >= limiar ||
            entrada.intersectionRect.height >= alturaDaTela * limiar)
        if (!umaVez) {
          setNaTela(visivel)
          return
        }
        if (!visivel) return
        setNaTela(true)
        observador.disconnect()
      },
      { threshold: limiar === 0 ? 0 : PASSOS, rootMargin: margem },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ref, limiar, margem, umaVez, jaApareceu])

  return naTela
}
