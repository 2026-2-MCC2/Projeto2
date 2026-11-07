import { useEffect } from 'react'

// estica a barra (scaleX) conforme a rolagem, uma vez por quadro; refaz a conta também quando a
// altura da página muda sem rolar, como ao abrir uma resposta das dúvidas
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
    const observador = 'ResizeObserver' in window ? new ResizeObserver(agendar) : null
    observador?.observe(document.body)

    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
      observador?.disconnect()
    }
  }, [ref])
}
