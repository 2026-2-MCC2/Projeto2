import { useEffect, useState } from 'react'

// avisos a cada 10% visível, para conferir as duas condições abaixo
const PASSOS = Array.from({ length: 11 }, (_, indice) => indice / 10)

// Diz se `limiar` (0 a 1) do elemento do ref está na tela. Num elemento mais alto que a tela
// (a seção no celular) a fração visível talvez nunca chegue ao limiar, então também vale quando a
// parte visível ocupa `limiar` da altura da tela. `margem` é o rootMargin do IntersectionObserver
// (ex.: '50% 0px' conta como na tela meia tela antes de ele aparecer).
// Com `umaVez` (padrão), fica true na primeira vez e não volta mais a false; sem, acompanha a
// entrada e a saída. Sem IntersectionObserver no navegador, considera que está na tela.
export function useNaTela(ref, { limiar = 0.3, margem = '0px', umaVez = true } = {}) {
  const [naTela, setNaTela] = useState(() => !('IntersectionObserver' in window))
  const jaApareceu = umaVez && naTela

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || jaApareceu) return

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
      { threshold: PASSOS, rootMargin: margem },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ref, limiar, margem, umaVez, jaApareceu])

  return naTela
}
