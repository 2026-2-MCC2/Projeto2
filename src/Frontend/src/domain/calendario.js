export const NOMES_DOS_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Converte string 'DD/MM/AAAA' para objeto Date local (à meia-noite).
 */
export function paraDataLocal(texto) {
  if (!texto || typeof texto !== 'string') return null
  const partes = texto.trim().split('/')
  if (partes.length !== 3) return null
  const [diaStr, mesStr, anoStr] = partes
  const dia = Number(diaStr)
  const mes = Number(mesStr) - 1
  const ano = Number(anoStr)
  if (Number.isNaN(dia) || Number.isNaN(mes) || Number.isNaN(ano)) return null
  const data = new Date(ano, mes, dia)
  if (data.getFullYear() !== ano || data.getMonth() !== mes || data.getDate() !== dia) return null
  data.setHours(0, 0, 0, 0)
  return data
}

/**
 * Formata Date para 'DD/MM/AAAA'.
 */
export function formatarParaInput(data) {
  if (!data) return ''
  const d = String(data.getDate()).padStart(2, '0')
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const a = data.getFullYear()
  return `${d}/${m}/${a}`
}

/**
 * Verifica se duas datas caem no mesmo dia civil.
 */
export function saoMesmoDia(d1, d2) {
  if (!d1 || !d2) return false
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * Verifica se data é anterior a uma data limite (à meia-noite).
 */
export function ehAnterior(data, limite) {
  if (!data || !limite) return false
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  const lim = new Date(limite.getFullYear(), limite.getMonth(), limite.getDate())
  return d.getTime() < lim.getTime()
}

/**
 * Gera a matriz de dias (grade 7 colunas) para um determinado mês e ano.
 * Inclui os dias de transição do mês anterior e próximo para fechar semanas completas.
 */
export function gerarGradeDoMes(ano, mes) {
  const primeiroDiaDoMes = new Date(ano, mes, 1)
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0)

  const dias = []
  const diaDaSemanaInicio = primeiroDiaDoMes.getDay() // 0 (Dom) a 6 (Sáb)

  // Dias do mês anterior para completar o início da semana
  const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate()
  for (let i = diaDaSemanaInicio - 1; i >= 0; i--) {
    const diaNum = ultimoDiaMesAnterior - i
    const data = new Date(ano, mes - 1, diaNum)
    data.setHours(0, 0, 0, 0)
    dias.push({
      data,
      dia: diaNum,
      mes: data.getMonth(),
      ano: data.getFullYear(),
      eDoMesAtual: false,
      chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`,
    })
  }

  // Dias do mês corrente
  const totalDiasMes = ultimoDiaDoMes.getDate()
  for (let diaNum = 1; diaNum <= totalDiasMes; diaNum++) {
    const data = new Date(ano, mes, diaNum)
    data.setHours(0, 0, 0, 0)
    dias.push({
      data,
      dia: diaNum,
      mes,
      ano,
      eDoMesAtual: true,
      chave: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`,
    })
  }

  // Dias do próximo mês para fechar a grade (múltiplo de 7)
  const restante = (7 - (dias.length % 7)) % 7
  for (let diaNum = 1; diaNum <= restante; diaNum++) {
    const data = new Date(ano, mes + 1, diaNum)
    data.setHours(0, 0, 0, 0)
    dias.push({
      data,
      dia: diaNum,
      mes: data.getMonth(),
      ano: data.getFullYear(),
      eDoMesAtual: false,
      chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`,
    })
  }

  return dias
}
