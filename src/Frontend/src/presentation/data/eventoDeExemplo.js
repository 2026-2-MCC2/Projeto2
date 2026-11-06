import { formatarMoedaSemCentavos } from '../../domain/formatacao.js'
import {
  ingressosParaEquilibrio,
  precoEmCentavos,
  resultadoDoCenario,
} from '../../domain/ticket.js'

const custoTotal = 228500
const margem = 0.2
const publicoDeReferencia = 12000
// ticket = custo total ÷ [público × (1 − margem)], como na tela de cálculo do app
const precoSugerido = precoEmCentavos(custoTotal / (publicoDeReferencia * (1 - margem)))
const pontoDeEquilibrio = ingressosParaEquilibrio(custoTotal, precoSugerido)

const cenario = (nome, publico, referencia = false) => ({
  nome,
  publico,
  resultado: Math.round(resultadoDoCenario(publico, precoSugerido, custoTotal)),
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
