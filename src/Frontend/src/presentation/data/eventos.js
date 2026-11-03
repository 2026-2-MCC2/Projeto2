const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function estaVencida(validade) {
  const [dia, mes, ano] = validade.split(' ')
  const limite = new Date(Number(ano), MESES.indexOf(mes.toLowerCase()), Number(dia))
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return limite < hoje
}
