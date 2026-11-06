import { useEffect, useState } from 'react'

// avisos a cada 10% visível, para conferir as duas condições abaixo
const PASSOS = Array.from({ length: 11 }, (_, indice) => indice / 10)

// Fica true na primeira vez que `limiar` (0 a 1) do elemento do ref aparece na tela, e não volta
// mais a false. Num elemento mais alto que a tela (a seção no celular) a fração visível talvez
// nunca chegue ao limiar, então também vale quando a parte visível ocupa `limiar` da altura da tela.
// Sem IntersectionObserver no navegador, considera que já apareceu.
export function useNaTela(ref, { limiar = 0.3 } = {}) {
  const [apareceu, setApareceu] = useState(() => !('IntersectionObserver' in window))

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || apareceu) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        const alturaDaTela = entrada.rootBounds?.height ?? window.innerHeight
        const visivel =
          entrada.isIntersecting &&
          (entrada.intersectionRatio >= limiar ||
            entrada.intersectionRect.height >= alturaDaTela * limiar)
        if (!visivel) return
        setApareceu(true)
        observador.disconnect()
      },
      { threshold: PASSOS },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ref, limiar, apareceu])

  return apareceu
}
