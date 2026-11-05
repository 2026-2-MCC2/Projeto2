// valor fora do formato esperado volta como veio, para nunca esconder um dado

export const digitos = (texto) => String(texto ?? '').replace(/\D/g, '')

export function mascararCep(texto) {
  const limpo = digitos(texto).slice(0, 8)
  if (limpo.length > 5) {
    return `${limpo.slice(0, 5)}-${limpo.slice(5)}`
  }
  return limpo
}

// o CNPJ alfanumérico (emitido desde 07/2026) tem letras nos 12 primeiros caracteres
export const normalizarCnpj = (texto) =>
  String(texto ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

export function formatarCnpj(cnpj) {
  const caracteres = normalizarCnpj(cnpj)
  if (caracteres.length !== 14) return cnpj ?? ''
  return caracteres.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5')
}

export function formatarTelefone(telefone) {
  const numeros = digitos(telefone)
  if (numeros.length === 11) return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (numeros.length === 10) return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return telefone ?? ''
}

export function formatarData(dataIso) {
  const data = new Date(dataIso)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

export function iniciais(nome) {
  return String(nome ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palavra) => palavra[0]?.toUpperCase() ?? '')
    .join('')
}

// dia (AAAA-MM-DD) no horário de Brasília, o mesmo que a API usa para a validade das propostas
const FORMATO_DO_DIA_EM_BRASILIA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
})

export const diaEmBrasilia = (dataIso) => FORMATO_DO_DIA_EM_BRASILIA.format(new Date(dataIso))

// 49800 → "R$ 49.800,00"; valor ausente ou que não é número vira "R$ 0,00"
export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return 'R$ 0,00'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// "15% acima do previsto" · "8% abaixo do orçamento" · "Igual ao previsto"; null quando falta um dos
// valores (previsto zero não serve de base para a porcentagem)
export function comparacaoComPrevisto(valor, previsto, referencia = 'previsto') {
  if (!(valor > 0) || !(previsto > 0)) return null
  const diferenca = ((valor - previsto) / previsto) * 100
  if (Math.abs(diferenca) < 0.05) return `Igual ao ${referencia}`

  const percentual = Math.abs(diferenca).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${percentual}% ${diferenca > 0 ? 'acima' : 'abaixo'} do ${referencia}`
}
