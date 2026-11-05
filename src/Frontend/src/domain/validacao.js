import { diaEmBrasilia, normalizarCnpj } from './formatacao.js'

// Regras de validação dos campos de formulário.
// Cada regra recebe o texto digitado e devolve a mensagem de erro, ou '' quando o valor é válido.
// Campo vazio não passa por aqui: quem exige o preenchimento é o atributo required do campo.

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] // prettier-ignore

const digitos = (texto) => texto.replace(/\D/g, '')

// "R$ 49.800,00" → 49800 · "20%" → 20 · texto que não é número → NaN
// Com ponto e vírgula, o que vem por último é o decimal ("1.500,50" e "1,500.50" valem 1500,5).
// Com um só tipo, ele é milhar quando se repete ou vem seguido de exatamente 3 dígitos ("1,500" e
// "20.000"), e decimal quando vem seguido de 1 ou 2 dígitos ("1,5" e "12.5").
export function paraNumero(texto) {
  const semSimbolos = texto.replace(/[R$\s%]/g, '')
  if (semSimbolos === '') return NaN

  const decimal = separadorDecimal(semSimbolos)
  const milhar = decimal === ',' ? '.' : ','
  const limpo = semSimbolos.split(milhar).join('').replace(decimal, '.')
  return Number(decimal ? limpo : semSimbolos.replace(/[.,]/g, ''))
}

function separadorDecimal(texto) {
  const ultimoPonto = texto.lastIndexOf('.')
  const ultimaVirgula = texto.lastIndexOf(',')
  if (ultimoPonto !== -1 && ultimaVirgula !== -1) return ultimoPonto > ultimaVirgula ? '.' : ','

  const separador = ultimoPonto !== -1 ? '.' : ultimaVirgula !== -1 ? ',' : null
  if (!separador) return null
  const repetido = texto.indexOf(separador) !== texto.lastIndexOf(separador)
  const tresDigitosDepois = new RegExp(`\\${separador}\\d{3}$`).test(texto)
  return repetido || tresDigitosDepois ? null : separador
}

// "18/10/2026" → Date · data inexistente (31/02) ou fora do formato → null
export function paraData(texto) {
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!partes) return null

  const [, dia, mes, ano] = partes.map(Number)
  const data = new Date(ano, mes - 1, dia)
  return data.getDate() === dia && data.getMonth() === mes - 1 ? data : null
}

// Date → "2026-10-18", o formato de data (sem horário) que a API recebe; usa o dia local da Date
export function paraDataIso(data) {
  const doisDigitos = (numero) => String(numero).padStart(2, '0')
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

// Os dois últimos números do CNPJ são calculados a partir dos 12 primeiros caracteres, que podem
// ter letras (CNPJ alfanumérico): na regra da Receita cada caractere vale o código ASCII menos 48.
function cnpjValido(caracteres) {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(caracteres) || /^(.)\1+$/.test(caracteres)) return false

  const digitoVerificador = (base) => {
    const soma = [...base]
      .reverse()
      .reduce(
        (total, caractere, indice) => total + (caractere.charCodeAt(0) - 48) * (2 + (indice % 8)),
        0,
      )
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const primeiro = digitoVerificador(caracteres.slice(0, 12))
  const segundo = digitoVerificador(caracteres.slice(0, 12) + primeiro)
  return caracteres.endsWith(`${primeiro}${segundo}`)
}

function inteiroPositivo(texto) {
  const numero = String(texto ?? '').replace(/\./g, '')
  return /^\d+$/.test(numero) && Number(numero) > 0
}

// Regras usadas pelo atributo data-validar dos campos (ver presentation/hooks/useValidacao.js).
export const REGRAS = {
  email: (texto) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto)
      ? ''
      : 'Informe um e-mail válido, como nome@empresa.com.',
  cnpj: (texto) => (cnpjValido(normalizarCnpj(texto)) ? '' : 'Informe um CNPJ válido.'),
  telefone: (texto) =>
    [10, 11].includes(digitos(texto).length)
      ? ''
      : 'Informe o telefone com DDD, como (11) 90000-0000.',
  senha: (texto) => (texto.length >= 8 ? '' : 'A senha precisa ter pelo menos 8 caracteres.'),
  data: (texto) => (paraData(texto) ? '' : 'Informe a data no formato dd/mm/aaaa.'),
  dataFutura: (texto) => {
    const data = paraData(texto)
    if (!data) return 'Informe a data no formato dd/mm/aaaa.'

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return data >= hoje ? '' : 'A data não pode estar no passado.'
  },
  horario: (texto) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(texto) ? '' : 'Informe o horário no formato hh:mm.',
  cep: (texto) => (digitos(texto).length === 8 ? '' : 'Informe um CEP com 8 números.'),
  estado: (texto) =>
    ESTADOS.includes(texto.toUpperCase()) ? '' : 'Informe a sigla do estado, como SP.',
  inteiro: (texto) => (inteiroPositivo(texto) ? '' : 'Informe um número inteiro maior que zero.'),
  valor: (texto) => (paraNumero(texto) >= 0 ? '' : 'Informe um valor em reais, como R$ 1.500,00.'),
  valorPositivo: (texto) =>
    paraNumero(texto) > 0 ? '' : 'Informe um valor em reais maior que zero.',
  percentual: (texto) => {
    const numero = paraNumero(texto)
    return numero >= 0 && numero < 100 ? '' : 'Informe uma porcentagem de 0 a 99.'
  },
}

// Regras que comparam dois campos.

// Validade de uma proposta: até o dia em que o evento termina. O dia do fim é o da data em UTC,
// porque é assim que a API confere; o "a partir de hoje" fica com a regra dataFutura.
export function validarValidadeDaProposta(validade, fimDoEventoIso) {
  const data = paraData(validade)
  if (!data || !fimDoEventoIso) return ''

  const fim = diaEmBrasilia(fimDoEventoIso)
  if (paraDataIso(data) <= fim) return ''

  const [ano, mes, dia] = fim.split('-')
  return `A validade não pode passar do fim do evento (${dia}/${mes}/${ano}).`
}

export const validarConfirmacaoSenha = (confirmacao, senha) =>
  confirmacao === senha ? '' : 'As senhas não conferem.'

export function validarTermino(termino, inicio) {
  const dataTermino = paraData(termino)
  const dataInicio = paraData(inicio)
  if (!dataTermino || !dataInicio) return ''
  return dataTermino >= dataInicio ? '' : 'O término não pode ser antes do início.'
}

// a capacidade do espaço é opcional: sem ela, só o mínimo limita o máximo
export function validarPublicoMaximo(maximo, minimo, capacidade) {
  if (!inteiroPositivo(maximo)) return ''
  const valor = paraNumero(maximo)
  if (inteiroPositivo(minimo) && valor < paraNumero(minimo)) {
    return 'O público máximo não pode ser menor que o mínimo.'
  }
  if (inteiroPositivo(capacidade) && valor > paraNumero(capacidade)) {
    const limite = paraNumero(capacidade).toLocaleString('pt-BR')
    return `O público máximo não pode passar da capacidade do espaço (${limite} pessoas).`
  }
  return ''
}

export function validarPublicoEsperado(esperado, minimo, maximo) {
  if (!inteiroPositivo(esperado)) return ''
  const valor = paraNumero(esperado)
  if (inteiroPositivo(minimo) && valor < paraNumero(minimo)) {
    return 'O público esperado não pode ser menor que o mínimo.'
  }
  if (inteiroPositivo(maximo) && valor > paraNumero(maximo)) {
    return 'O público esperado não pode ser maior que o máximo.'
  }
  return ''
}
