// Formata para exibição os dados que o backend devolve só com números.
// Valor fora do formato esperado volta como veio, para nunca esconder um dado.

const digitos = (texto) => String(texto ?? '').replace(/\D/g, '')

// '11222333000181' → '11.222.333/0001-81'
export function formatarCnpj(cnpj) {
  const numeros = digitos(cnpj)
  if (numeros.length !== 14) return cnpj ?? ''
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// '11999998888' → '(11) 99999-8888' · '1133334444' → '(11) 3333-4444'
export function formatarTelefone(telefone) {
  const numeros = digitos(telefone)
  if (numeros.length === 11) return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (numeros.length === 10) return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return telefone ?? ''
}

// '2026-11-02T14:31:30.000Z' → '02 de nov. de 2026'
export function formatarData(dataIso) {
  const data = new Date(dataIso)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// 'Kauã Casella Produções' → 'KC' (avatar com as iniciais)
export function iniciais(nome) {
  return String(nome ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palavra) => palavra[0]?.toUpperCase() ?? '')
    .join('')
}
