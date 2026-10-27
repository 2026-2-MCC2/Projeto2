// Regras de validação dos campos de formulário.
// Cada regra recebe o texto digitado e devolve a mensagem de erro, ou '' quando o valor é válido.
// Campo vazio não passa por aqui: quem exige o preenchimento é o atributo required do campo.

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] // prettier-ignore

const digitos = (texto) => texto.replace(/\D/g, '')

// "R$ 49.800,00" → 49800 · "20%" → 20 · texto que não é número → NaN
export function paraNumero(texto) {
  const limpo = texto.replace(/[R$\s%.]/g, '').replace(',', '.')
  return limpo === '' ? NaN : Number(limpo)
}

// "18/10/2026" → Date · data inexistente (31/02) ou fora do formato → null
export function paraData(texto) {
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!partes) return null

  const [, dia, mes, ano] = partes.map(Number)
  const data = new Date(ano, mes - 1, dia)
  return data.getDate() === dia && data.getMonth() === mes - 1 ? data : null
}

// Os dois últimos números do CNPJ são calculados a partir dos 12 primeiros.
function cnpjValido(numeros) {
  if (numeros.length !== 14 || /^(\d)\1+$/.test(numeros)) return false

  const digitoVerificador = (base) => {
    const soma = [...base]
      .reverse()
      .reduce((total, numero, indice) => total + Number(numero) * (2 + (indice % 8)), 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const primeiro = digitoVerificador(numeros.slice(0, 12))
  const segundo = digitoVerificador(numeros.slice(0, 12) + primeiro)
  return numeros.endsWith(`${primeiro}${segundo}`)
}

function inteiroPositivo(texto) {
  const numero = texto.replace(/\./g, '')
  return /^\d+$/.test(numero) && Number(numero) > 0
}

// Regras usadas pelo atributo data-validar dos campos (ver presentation/hooks/useValidacao.js).
export const REGRAS = {
  email: (texto) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto)
      ? ''
      : 'Informe um e-mail válido, como nome@empresa.com.',
  cnpj: (texto) => (cnpjValido(digitos(texto)) ? '' : 'Informe um CNPJ válido.'),
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

export const validarConfirmacaoSenha = (confirmacao, senha) =>
  confirmacao === senha ? '' : 'As senhas não conferem.'

export function validarTermino(termino, inicio) {
  const dataTermino = paraData(termino)
  const dataInicio = paraData(inicio)
  if (!dataTermino || !dataInicio) return ''
  return dataTermino >= dataInicio ? '' : 'O término não pode ser antes do início.'
}

export function validarPublicoMaximo(maximo, minimo) {
  if (!inteiroPositivo(maximo) || !inteiroPositivo(minimo)) return ''
  return paraNumero(maximo) >= paraNumero(minimo)
    ? ''
    : 'O público máximo não pode ser menor que o mínimo.'
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
