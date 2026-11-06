import { formatarMoedaSemCentavos } from '../../domain/formatacao.js'

// as mesmas regras do cálculo do ticket do app: preço em centavos e equilíbrio arredondado para cima
const custoTotal = 228500
const margem = 0.2
const publicoDeReferencia = 12000
const precoSugerido = Math.round((custoTotal / (publicoDeReferencia * (1 - margem))) * 100) / 100
const pontoDeEquilibrio = Math.ceil(custoTotal / precoSugerido - 1e-9)

const cenario = (nome, publico, referencia = false) => ({
  nome,
  publico,
  resultado: Math.round(publico * precoSugerido - custoTotal),
  referencia,
})

export const EVENTO_DE_EXEMPLO = {
  nome: 'Festival Primavera Som & Luz 2026',
  custoTotal,
  margem,
  precoSugerido,
  pontoDeEquilibrio,
  publicoMaximo: 15000,
  cenarios: [
    cenario('Pessimista', 8000),
    cenario('Realista', publicoDeReferencia, true),
    cenario('Otimista', 15000),
  ],
}

export const NUMEROS_DO_EXEMPLO = {
  custoTotal: formatarMoedaSemCentavos(custoTotal),
  margem: `${Math.round(margem * 100)}%`,
  equilibrio: `${pontoDeEquilibrio.toLocaleString('pt-BR')} ingressos`,
}
