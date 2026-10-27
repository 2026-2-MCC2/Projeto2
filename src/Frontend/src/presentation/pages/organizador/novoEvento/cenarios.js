export const CENARIOS = [
  { valor: 'minimo', nome: 'Público mínimo' },
  { valor: 'esperado', nome: 'Público esperado' },
  { valor: 'maximo', nome: 'Público máximo' },
]

export const nomeDoCenario = (valor) => CENARIOS.find((cenario) => cenario.valor === valor)?.nome
