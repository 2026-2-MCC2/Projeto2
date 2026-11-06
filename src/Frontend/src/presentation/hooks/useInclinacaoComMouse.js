import { useEffect, useRef } from 'react'

const INCLINACAO_MAXIMA = 10 // graus, para cada lado

// Segue o mouse sobre o elemento do ref e grava no estilo dele, uma vez por quadro:
// --rx/--ry (inclinação em graus) e --mx/--my (posição do mouse em %). O CSS usa as variáveis;
// o React não re-renderiza a cada movimento. Ao sair, a inclinação volta a 0.
export function useInclinacaoComMouse() {
  const alvo = useRef(null)

  useEffect(() => {
    const elemento = alvo.current
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

    // só mouse: no toque o "hover" ficaria preso depois do dedo sair
    const mover = (evento) => {
      if (evento.pointerType !== 'mouse') return
      mouse = { x: evento.clientX, y: evento.clientY }
      if (!quadro) quadro = requestAnimationFrame(aplicar)
    }

    const sair = () => {
      cancelAnimationFrame(quadro)
      quadro = 0
      elemento.style.setProperty('--rx', '0deg')
      elemento.style.setProperty('--ry', '0deg')
    }

    elemento.addEventListener('pointermove', mover)
    elemento.addEventListener('pointerleave', sair)
    return () => {
      cancelAnimationFrame(quadro)
      elemento.removeEventListener('pointermove', mover)
      elemento.removeEventListener('pointerleave', sair)
    }
  }, [])

  return alvo
}
