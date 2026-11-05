// Evento fictício da landing (hero e "Cálculo do ticket"). Os números seguem a fórmula do app:
// ticket = custo total ÷ [público × (1 − margem)] = 228.500 ÷ (12.000 × 0,8) = R$ 23,80
// resultado do cenário = público × ticket − custo total
export const EVENTO_DE_EXEMPLO = {
  nome: 'Festival Primavera Som & Luz 2026',
  custoTotal: 228500,
  margem: 0.2,
  precoSugerido: 23.8,
  pontoDeEquilibrio: 9600,
  publicoMaximo: 15000,
  cenarios: [
    { nome: 'Pessimista', publico: 8000, resultado: -38100 },
    { nome: 'Realista', publico: 12000, resultado: 57100, referencia: true },
    { nome: 'Otimista', publico: 15000, resultado: 128500 },
  ],
}
