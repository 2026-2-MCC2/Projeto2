import { formatarMoedaSemCentavos } from '../../domain/formatacao.js'
import { calcularTicket } from '../../utils/calcularTicket.js'

// valores do exemplo da landing: a calculadora do "Cálculo do ticket" começa (e restaura) neles
export const VALORES_DO_EXEMPLO = { custoTotal: 228500, margem: 0.2, publico: 12000 }

// ticket = custo total ÷ [público × (1 − margem)], como na tela de cálculo do app
const calculo = calcularTicket(VALORES_DO_EXEMPLO)

export const EVENTO_DE_EXEMPLO = {
  nome: 'Festival Primavera Som & Luz 2026',
  precoSugerido: calculo.preco,
}

export const NUMEROS_DO_EXEMPLO = {
  custoTotal: formatarMoedaSemCentavos(VALORES_DO_EXEMPLO.custoTotal),
  margem: `${Math.round(VALORES_DO_EXEMPLO.margem * 100)}%`,
  equilibrio: `${calculo.equilibrio.toLocaleString('pt-BR')} ingressos`,
}
