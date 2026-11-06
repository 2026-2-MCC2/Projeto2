const TOLERANCIA_DO_PONTO_FLUTUANTE = 1e-9

// o ingresso é cobrado em centavos: sem arredondar, 7.999,9999 ingressos virariam 8.001 no Math.ceil
export const precoEmCentavos = (preco) => Math.round(preco * 100) / 100

export const ingressosParaEquilibrio = (custoTotal, preco) =>
  Math.ceil(custoTotal / preco - TOLERANCIA_DO_PONTO_FLUTUANTE)

export const resultadoDoCenario = (publico, preco, custoTotal) => publico * preco - custoTotal
