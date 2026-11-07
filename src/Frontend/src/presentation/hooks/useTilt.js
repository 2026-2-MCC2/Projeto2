import { useEffect } from 'react'
import { semMovimento } from '../movimento.js'

const INCLINACAO_MAXIMA = 10 // graus, para cada lado

// só em aparelho com mouse (no toque o "hover" ficaria preso) e sem pedido de menos movimento
const PODE_INCLINAR =
  '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

// grava --rx/--ry (inclinação) e --mx/--my (posição do mouse) no estilo, uma vez por quadro,
// sem re-renderizar o React; ao sair, a inclinação volta a 0
export function useTilt(ref) {
  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return

    let quadro = 0
    let mouse = { x: 0, y: 0 }

    const aplicar = () => {
      quadro = 0
      const caixa = elemento.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (mouse.x - caixa.left) / caixa.width))
      const y = Math.min(1, Math.max(0, (mouse.y - caixa.top) / caixa.height))
      elemento.style.setProperty('--rx', `${((0.5 - y) * 2 * INCLINACAO_MAXIMA).toFixed(2)}deg`)
      elemento.style.setProperty('--ry', `${((x - 0.5) * 2 * INCLINACAO_MAXIMA).toFixed(2)}deg`)
      elemento.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
      elemento.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    }

    const mover = (evento) => {
      // o "menos movimento" do painel de acessibilidade do site não passa pela media query
      if (semMovimento()) return
      mouse = { x: evento.clientX, y: evento.clientY }
      if (!quadro) quadro = requestAnimationFrame(aplicar)
    }

    const sair = () => {
      cancelAnimationFrame(quadro)
      quadro = 0
      elemento.style.setProperty('--rx', '0deg')
      elemento.style.setProperty('--ry', '0deg')
    }

    const ligar = () => {
      elemento.addEventListener('pointermove', mover)
      elemento.addEventListener('pointerleave', sair)
    }

    const desligar = () => {
      elemento.removeEventListener('pointermove', mover)
      elemento.removeEventListener('pointerleave', sair)
      sair()
    }

    // liga ou desliga se o aparelho mudar (mouse conectado, preferência de movimento trocada)
    const consulta = window.matchMedia(PODE_INCLINAR)
    const atualizar = () => (consulta.matches ? ligar() : desligar())
    atualizar()
    consulta.addEventListener('change', atualizar)

    return () => {
      consulta.removeEventListener('change', atualizar)
      desligar()
    }
  }, [ref])
}
