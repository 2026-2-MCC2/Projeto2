import { useEffect, useRef, useState } from 'react'
import { semMovimento } from '../movimento.js'

const easeOutCubic = (t) => 1 - (1 - t) ** 3

const cadaNumero = (numeros, calcular) =>
  Object.fromEntries(Object.keys(numeros).map((chave) => [chave, calcular(chave)]))

// Leva os números da tela até `alvos` ({ chave: número }) com requestAnimationFrame.
// Quando `ativo` fica true pela primeira vez, eles contam de 0 em `duracaoDaEntrada`; depois, cada
// mudança faz um tween de `duracaoDaTroca` a partir do que está na tela. Um tween novo cancela o
// anterior e começa de onde ele parou, então arrastar rápido não faz os números tremerem.
// Com menos movimento, os números vão direto ao alvo.
// Devolve [números da tela, se a contagem de entrada ainda está rodando].
export function useNumerosAnimados(
  alvos,
  { ativo, duracaoDaEntrada = 1200, duracaoDaTroca = 300 },
) {
  const [naTela, setNaTela] = useState(() => cadaNumero(alvos, () => 0))
  const [entrou, setEntrou] = useState(false)
  const ultimosNaTela = useRef(naTela)
  const jaEntrou = useRef(false)
  const parado = semMovimento()
  // os alvos chegam como objeto novo a cada render: a animação lê o objeto deste ref (atualizado
  // pelo efeito de cima, que roda antes) e só recomeça quando algum número muda (`assinatura`)
  const assinatura = Object.values(alvos).join('|')
  const alvosAtuais = useRef(alvos)
  useEffect(() => {
    alvosAtuais.current = alvos
  })

  useEffect(() => {
    if (!ativo || parado) return
    const destino = alvosAtuais.current

    // a entrada só conta como feita quando termina: se for interrompida (StrictMode rodando o efeito
    // duas vezes, ou o slider mexido no meio), a próxima continua contando de onde parou
    const deEntrada = !jaEntrou.current
    const origem = ultimosNaTela.current
    const duracao = deEntrada ? duracaoDaEntrada : duracaoDaTroca
    const inicio = performance.now()
    let quadro = 0

    const passo = (agora) => {
      const progresso = Math.min(1, (agora - inicio) / duracao)
      const fator = easeOutCubic(progresso)
      const numeros = cadaNumero(
        destino,
        (chave) => origem[chave] + (destino[chave] - origem[chave]) * fator,
      )
      ultimosNaTela.current = numeros
      setNaTela(numeros)

      if (progresso < 1) {
        quadro = requestAnimationFrame(passo)
      } else if (deEntrada) {
        jaEntrou.current = true
        setEntrou(true)
      }
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [assinatura, ativo, parado, duracaoDaEntrada, duracaoDaTroca])

  if (parado) return [alvos, false]
  return [naTela, ativo && !entrou]
}
