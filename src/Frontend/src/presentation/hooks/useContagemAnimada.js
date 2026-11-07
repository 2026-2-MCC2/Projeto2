import { useEffect, useRef, useState } from 'react'
import { semMovimento } from '../movimento.js'

const easeOutCubic = (t) => 1 - (1 - t) ** 3

// leva o número até o alvo em `duracao` ms; um alvo novo no meio continua do número que está na tela,
// então arrastar rápido não faz pular. Com duração 0 ou menos movimento, vai direto
export function useContagemAnimada(valorAlvo, { duracao = 300 } = {}) {
  const [naTela, setNaTela] = useState(valorAlvo)
  const ultimoNaTela = useRef(valorAlvo)
  const direto = duracao <= 0 || semMovimento()

  useEffect(() => {
    if (direto) {
      // a tela mostra o alvo direto; o estado acompanha para não voltar velho se o movimento religar
      ultimoNaTela.current = valorAlvo
      const quadro = requestAnimationFrame(() => setNaTela(valorAlvo))
      return () => cancelAnimationFrame(quadro)
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
