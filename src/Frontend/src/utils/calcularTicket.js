import { ingressosParaEquilibrio, precoEmCentavos, resultadoDoCenario } from '../domain/ticket.js'

// cenários de público a partir do público esperado (o realista)
const FATOR_PESSIMISTA = 2 / 3
const FATOR_OTIMISTA = 1.25

// Calculadora da landing: ticket = custo total ÷ [público × (1 − margem)], com o equilíbrio e o
// resultado de cada cenário. margem vai de 0 a 1. Os resultados são arredondados para centavos,
// para sobras do ponto flutuante (como 0,1 × 3 = 0,30000000000000004) não chegarem à tela.
export function calcularTicket({ custoTotal, margem, publico }) {
  const preco = precoEmCentavos(custoTotal / (publico * (1 - margem)))
  const equilibrio = ingressosParaEquilibrio(custoTotal, preco)

  const cenario = (publicoDoCenario) => ({
    publico: publicoDoCenario,
    resultado: precoEmCentavos(resultadoDoCenario(publicoDoCenario, preco, custoTotal)),
  })
  const pessimista = cenario(Math.round(publico * FATOR_PESSIMISTA))
  const realista = cenario(publico)
  const otimista = cenario(Math.round(publico * FATOR_OTIMISTA))

  return {
    preco,
    equilibrio,
    cenarios: { pessimista, realista, otimista },
    barraPercentual: Math.min(100, (equilibrio / otimista.publico) * 100),
  }
}
