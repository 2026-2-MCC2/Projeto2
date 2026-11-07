const MINUTO = 60_000
const HORA = 60 * MINUTO
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const inicioDoDia = (data) => new Date(data.getFullYear(), data.getMonth(), data.getDate())

// dias de calendário entre as datas: 23h de ontem para 1h de hoje conta como 1 dia
export function diasEntre(data, agora = new Date()) {
  return Math.round((inicioDoDia(agora) - inicioDoDia(data)) / (24 * HORA))
}

// "agora", "há 5 min", "há 3 h", "ontem", "4 dias" e, depois de uma semana, "12 Ago"
export function tempoRelativo(iso, agora = new Date()) {
  const data = new Date(iso)
  const diferenca = agora - data
  const dias = diasEntre(data, agora)

  if (diferenca < MINUTO) return 'agora'
  if (diferenca < HORA) return `há ${Math.floor(diferenca / MINUTO)} min`
  if (dias === 0) return `há ${Math.floor(diferenca / HORA)} h`
  if (dias === 1) return 'ontem'
  if (dias < 7) return `${dias} dias`
  return `${data.getDate()} ${MESES[data.getMonth()]}`
}
