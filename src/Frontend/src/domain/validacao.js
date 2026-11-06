import { diaEmBrasilia, digitos, normalizarCnpj } from './formatacao.js'

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] // prettier-ignore

// separador único é milhar se repete ou vem seguido de 3 dígitos ("20.000"), senão é decimal ("12,5")
export function paraNumero(texto) {
  const semSimbolos = texto.replace(/[R$\s%]/g, '')
  if (semSimbolos === '') return NaN

  const decimal = separadorDecimal(semSimbolos)
  const milhar = decimal === ',' ? '.' : ','
  const limpo = semSimbolos.split(milhar).join('').replace(decimal, '.')
  return Number(decimal ? limpo : semSimbolos.replace(/[.,]/g, ''))
}

// os valores em reais são guardados como DECIMAL(12,2)
const VALOR_MAXIMO = 9_999_999_999.99

function casasDecimais(texto) {
  const semSimbolos = texto.replace(/[R$\s%]/g, '')
  const decimal = separadorDecimal(semSimbolos)
  return decimal ? semSimbolos.length - semSimbolos.lastIndexOf(decimal) - 1 : 0
}

// porcentagem não tem milhar: "2,125" vale 2,125% e não 2125%
export function paraPercentual(texto) {
  const semSimbolos = texto.replace(/[\s%]/g, '')
  if (!/^\d+([.,]\d+)?$/.test(semSimbolos)) return NaN
  return Number(semSimbolos.replace(',', '.'))
}

function separadorDecimal(texto) {
  const ultimoPonto = texto.lastIndexOf('.')
  const ultimaVirgula = texto.lastIndexOf(',')
  if (ultimoPonto !== -1 && ultimaVirgula !== -1) return ultimoPonto > ultimaVirgula ? '.' : ','

  const separador = ultimoPonto !== -1 ? '.' : ultimaVirgula !== -1 ? ',' : null
  if (!separador) return null
  const repetido = texto.indexOf(separador) !== texto.lastIndexOf(separador)
  const tresDigitosDepois = new RegExp(`\\${separador}\\d{3}$`).test(texto)
  const parteInteiraZero = Number(texto.slice(0, texto.indexOf(separador))) === 0
  return repetido || (tresDigitosDepois && !parteInteiraZero) ? null : separador
}

// antes de 1900 vira null: o Date leva os anos 0 a 99 para 1900 a 1999
export function paraData(texto) {
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!partes) return null

  const [, dia, mes, ano] = partes.map(Number)
  if (ano < 1900) return null
  const data = new Date(ano, mes - 1, dia)
  return data.getDate() === dia && data.getMonth() === mes - 1 ? data : null
}

export function paraDataIso(data) {
  const doisDigitos = (numero) => String(numero).padStart(2, '0')
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

// CNPJ alfanumérico: na regra da Receita cada caractere vale o código ASCII menos 48
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

export const REGRAS = {
  email: (texto) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto)
      ? ''
      : 'Informe um e-mail válido, como nome@empresa.com.',
  cnpj: (texto) => (cnpjValido(normalizarCnpj(texto)) ? '' : 'Informe um CNPJ válido.'),
  // as mesmas regras da API: só números, espaço, parênteses, + e -, até 20 caracteres e 10 ou 11 dígitos
  telefone: (texto) =>
    /^[\d\s()+-]{10,20}$/.test(texto) && [10, 11].includes(digitos(texto).length)
      ? ''
      : 'Informe o telefone com DDD, como (11) 90000-0000.',
  senha: (texto) => (texto.length >= 8 ? '' : 'A senha precisa ter pelo menos 8 caracteres.'),
  data: (texto) => (paraData(texto) ? '' : 'Informe a data no formato dd/mm/aaaa.'),
  // "hoje" é o dia de Brasília, o mesmo que a API usa, e não o do relógio de quem está digitando
  dataFutura: (texto) => {
    const data = paraData(texto)
    if (!data) return 'Informe a data no formato dd/mm/aaaa.'

    return paraDataIso(data) >= diaEmBrasilia(Date.now()) ? '' : 'A data não pode estar no passado.'
  },
  horario: (texto) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(texto) ? '' : 'Informe o horário no formato hh:mm.',
  cep: (texto) => (digitos(texto).length === 8 ? '' : 'Informe um CEP com 8 números.'),
  estado: (texto) =>
    ESTADOS.includes(texto.toUpperCase()) ? '' : 'Informe a sigla do estado, como SP.',
  inteiro: (texto) => (inteiroPositivo(texto) ? '' : 'Informe um número inteiro maior que zero.'),
  valor: (texto) => (paraNumero(texto) >= 0 ? '' : 'Informe um valor em reais, como R$ 1.500,00.'),
  valorPositivo: (texto) => {
    const numero = paraNumero(texto)
    if (!(numero > 0)) return 'Informe um valor em reais maior que zero.'
    if (numero > VALOR_MAXIMO) return 'Informe um valor de até R$ 9.999.999.999,99.'
    return casasDecimais(texto) > 2 ? 'Use até 2 casas decimais, como R$ 1.500,50.' : ''
  },
  // a margem é guardada com 4 casas da fração (DECIMAL(5,4)), ou seja, até 2 casas na porcentagem
  percentual: (texto) => {
    const numero = paraPercentual(texto)
    if (!(numero >= 0 && numero < 100)) return 'Informe uma porcentagem de 0 a 99.'
    return /[.,]\d{3,}/.test(texto) ? 'Use até 2 casas decimais, como 12,5%.' : ''
  },
}

// o fim do evento é contado no dia de Brasília, como a API confere
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
