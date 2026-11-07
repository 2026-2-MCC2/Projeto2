const TOLERANCIA_DO_PONTO_FLUTUANTE = 1e-9

// o ingresso é cobrado em centavos: sem arredondar, 7.999,9999 ingressos virariam 8.001 no Math.ceil
export const precoEmCentavos = (preco) => Math.round(preco * 100) / 100

export const ingressosParaEquilibrio = (custoTotal, preco) =>
  Math.ceil(custoTotal / preco - TOLERANCIA_DO_PONTO_FLUTUANTE)

export const resultadoDoCenario = (publico, preco, custoTotal) => publico * preco - custoTotal

// pessimista e otimista da calculadora da landing, a partir do público esperado (o realista)
const FATOR_PESSIMISTA = 2 / 3
const FATOR_OTIMISTA = 1.25

// margem de 0 a 1; os resultados vão em centavos para sobras do ponto flutuante não chegarem à tela
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
    barraPercentual: (equilibrio / otimista.publico) * 100,
  }
}
