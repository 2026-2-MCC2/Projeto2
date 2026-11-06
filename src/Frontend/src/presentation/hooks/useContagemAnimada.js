import { useEffect, useRef, useState } from 'react'
import { semMovimento } from '../movimento.js'

const easeOutCubic = (t) => 1 - (1 - t) ** 3

// Leva o número da tela até `valorAlvo` em `duracao` ms (easeOutCubic, com requestAnimationFrame).
// Se o alvo muda no meio, a animação anterior é cancelada e a nova começa do número que está na
// tela, então arrastar rápido não faz o número pular nem tremer.
// Com duração 0 ou com menos movimento, o número vai direto ao alvo.
export function useContagemAnimada(valorAlvo, { duracao = 300 } = {}) {
  const [naTela, setNaTela] = useState(valorAlvo)
  const ultimoNaTela = useRef(valorAlvo)
  const direto = duracao <= 0 || semMovimento()

  useEffect(() => {
    if (direto) {
      ultimoNaTela.current = valorAlvo
      return
    }
    const origem = ultimoNaTela.current
    if (origem === valorAlvo) return

    const inicio = performance.now()
    let quadro = 0
    const passo = (agora) => {
      const progresso = Math.min(1, Math.max(0, (agora - inicio) / duracao))
      const numero = origem + (valorAlvo - origem) * easeOutCubic(progresso)
      ultimoNaTela.current = numero
      setNaTela(numero)
      if (progresso < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [valorAlvo, duracao, direto])

  return direto ? valorAlvo : naTela
}
