import { useEffect, useRef } from 'react'
import { semMovimento } from '../movimento.js'
import { useNaTela } from './useNaTela.js'

// a linha começa a se desenhar quando o topo da lista chega a 80% da altura da tela
// e termina de se desenhar quando o fundo dela chega a 50%
const INICIO = 0.8
const FIM = 0.5
const ALCANCADA = 'etapa-landing--alcancada'

// Curvas que ligam os pontos na ordem: cada trecho sai e chega na vertical, então vira um "S"
// quando muda de linha no grid e fica reto quando os pontos estão na mesma linha ou coluna
const caminhoEntre = (pontos) =>
  pontos
    .map(({ x, y }, indice) => {
      if (indice === 0) return `M ${x} ${y}`
      const anterior = pontos[indice - 1]
      const meio = (y - anterior.y) / 2
      return `C ${anterior.x} ${anterior.y + meio}, ${x} ${y - meio}, ${x} ${y}`
    })
    .join(' ')

// Mede o centro do número de cada etapa (relativo à lista), monta o path e guarda em que fração
// do comprimento total fica cada ponto, somando o comprimento dos trechos.
// A posição do card vem do layout (offsetLeft/Top, relativos à lista, que é position: relative),
// que ignora o translate da entrada dos cards; o número é medido dentro do próprio card
function medir(lista, caminho) {
  const etapas = [...lista.querySelectorAll('.etapa-landing')]
  const pontos = etapas.map((etapa) => {
    const card = etapa.getBoundingClientRect()
    const numero = etapa.querySelector('.etapa-landing__numero strong').getBoundingClientRect()
    return {
      x: etapa.offsetLeft + numero.left - card.left + numero.width / 2,
      y: etapa.offsetTop + numero.top - card.top + numero.height / 2,
    }
  })

  const ate = [0]
  for (let indice = 1; indice < pontos.length; indice++) {
    caminho.setAttribute('d', caminhoEntre([pontos[indice - 1], pontos[indice]]))
    ate.push(ate[indice - 1] + caminho.getTotalLength())
  }
  caminho.setAttribute('d', caminhoEntre(pontos))
  const comprimento = caminho.getTotalLength()
  caminho.style.strokeDasharray = `${comprimento}`

  return {
    comprimento,
    etapas,
    fracoes: ate.map((parcial) => (comprimento ? parcial / comprimento : 0)),
  }
}

function progressoDoScroll(lista) {
  const { top, height } = lista.getBoundingClientRect()
  const tela = window.innerHeight
  const progresso = (tela * INICIO - top) / (tela * (INICIO - FIM) + height)
  return Math.min(1, Math.max(0, progresso))
}

// com menos movimento a linha já aparece inteira, sem acompanhar o scroll
function desenhar(lista, caminho, medida) {
  if (!medida) return
  const progresso = semMovimento() ? 1 : progressoDoScroll(lista)
  caminho.style.strokeDashoffset = `${medida.comprimento * (1 - progresso)}`
  medida.etapas.forEach((etapa, indice) =>
    etapa.classList.toggle(ALCANCADA, progresso >= medida.fracoes[indice] - 0.001),
  )
}

// Linha que liga os números das etapas e se desenha com o scroll. Recebe o ref da lista e devolve
// o ref para pôr no <path>. Escreve direto no path e nas classes dos itens (nada de setState por
// scroll). O scroll só é ouvido com a lista perto da tela.
// Se algo falhar na medição, o path fica sem desenho e a página segue normal.
export function useLinhaDasEtapas(listaRef) {
  const caminhoRef = useRef(null)
  const medida = useRef(null)
  const perto = useNaTela(listaRef, { limiar: 0, margem: '50% 0px', umaVez: false })

  // mede de novo quando a lista muda de tamanho (breakpoint, fonte da leitura fácil)
  // e quando as fontes terminam de carregar
  useEffect(() => {
    const lista = listaRef.current
    const caminho = caminhoRef.current
    if (!lista || !caminho) return

    let montado = true
    const refazer = () => {
      if (!montado) return
      try {
        medida.current = medir(lista, caminho)
        desenhar(lista, caminho, medida.current)
      } catch {
        medida.current = null
        caminho.removeAttribute('d')
      }
    }

    refazer()
    const observador = 'ResizeObserver' in window ? new ResizeObserver(refazer) : null
    observador?.observe(lista)
    document.fonts?.ready.then(refazer)
    return () => {
      montado = false
      observador?.disconnect()
    }
  }, [listaRef, caminhoRef])

  // perto da tela: cada scroll (ou mudança de altura da janela) só agenda um quadro
  useEffect(() => {
    const lista = listaRef.current
    const caminho = caminhoRef.current
    if (!perto || !lista || !caminho) return

    let quadro = 0
    const agendar = () => {
      if (quadro) return
      quadro = requestAnimationFrame(() => {
        quadro = 0
        desenhar(lista, caminho, medida.current)
      })
    }

    agendar()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar, { passive: true })
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
    }
  }, [perto, listaRef, caminhoRef])

  return caminhoRef
}
