import { useEffect } from 'react'

// Estica o elemento do ref (transform: scaleX) conforme a página é rolada, escrevendo direto no
// estilo, uma vez por quadro. Refaz a conta quando a altura da página muda sem scroll, como ao abrir
// uma resposta do FAQ ou trocar a fonte, além de quando a janela muda de tamanho.
export function useProgressoDeLeitura(ref) {
  useEffect(() => {
    const barra = ref.current
    if (!barra) return

    let quadro = 0
    const desenhar = () => {
      quadro = 0
      const total = document.documentElement.scrollHeight - window.innerHeight
      const progresso = total > 0 ? Math.min(1, window.scrollY / total) : 0
      barra.style.transform = `scaleX(${progresso})`
    }
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(desenhar)
    }

    agendar()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar, { passive: true })
    const observador = new ResizeObserver(agendar)
    observador.observe(document.body)

    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
      observador.disconnect()
    }
  }, [ref])
}
