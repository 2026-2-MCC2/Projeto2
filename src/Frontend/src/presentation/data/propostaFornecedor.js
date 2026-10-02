export const ETAPAS_PROPOSTA = ['Valor e validade', 'Descrição e fotos', 'Condições e envio']
export const NOME_ITEM_PROPOSTA = 'Buffet finger foods premium'

const CHAVE_PROPOSTAS_FORNECEDOR = 'trocaticket.propostas-fornecedor'

export const PROPOSTAS_FORNECEDOR_INICIAIS = [
  {
    id: 'palco-primavera',
    item: 'Palco coberto e som 360°',
    evento: 'Festival Primavera',
    valor: 29200,
    situacao: 'Aceita',
    enviadaEm: '12 Ago 2026',
  },
  {
    id: 'buffet-primavera',
    item: 'Buffet finger foods',
    evento: 'Festival Primavera',
    valor: 49800,
    situacao: 'Em análise',
    enviadaEm: '15 Ago 2026',
  },
  {
    id: 'coffee-summit',
    item: 'Coffee break executivo',
    evento: 'Summit Corporativo',
    valor: 27500,
    situacao: 'Enviada',
    enviadaEm: '01 Set 2026',
  },
  {
    id: 'jantar-regional',
    item: 'Jantar de gala',
    evento: 'Encontro Regional',
    valor: 38400,
    situacao: 'Aceita',
    enviadaEm: '22 Ago 2026',
    ocultarNoMobile: true,
  },
  {
    id: 'grafico-summit',
    item: 'Material gráfico',
    evento: 'Summit Corporativo',
    valor: 5400,
    situacao: 'Recusada',
    enviadaEm: '28 Ago 2026',
  },
]

export function lerPropostasFornecedor() {
  try {
    const propostasSalvas = JSON.parse(
      window.localStorage.getItem(CHAVE_PROPOSTAS_FORNECEDOR) ?? '[]',
    )
    return [...propostasSalvas, ...PROPOSTAS_FORNECEDOR_INICIAIS]
  } catch {
    return PROPOSTAS_FORNECEDOR_INICIAIS
  }
}

export function salvarPropostaFornecedor({ evento, item, valor }) {
  const valorNumerico =
    typeof valor === 'number'
      ? valor
      : Number(
          String(valor)
            .replace(/[^\d,]/g, '')
            .replace(',', '.'),
        )
  const partesData = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(new Date())
  const enviadaEm = `${partesData.find((parte) => parte.type === 'day').value} ${partesData
    .find((parte) => parte.type === 'month')
    .value.replace('.', '')
    .replace(/^\p{L}/u, (letra) =>
      letra.toLocaleUpperCase('pt-BR'),
    )} ${partesData.find((parte) => parte.type === 'year').value}`
  const proposta = {
    id: `proposta-${Date.now()}`,
    item,
    evento: evento.nome.replace(/\s+\d{4}$/, ''),
    valor: valorNumerico || 49800,
    situacao: 'Enviada',
    enviadaEm,
  }

  try {
    const propostasSalvas = JSON.parse(
      window.localStorage.getItem(CHAVE_PROPOSTAS_FORNECEDOR) ?? '[]',
    )
    window.localStorage.setItem(
      CHAVE_PROPOSTAS_FORNECEDOR,
      JSON.stringify([proposta, ...propostasSalvas]),
    )
  } catch {
    window.localStorage.setItem(CHAVE_PROPOSTAS_FORNECEDOR, JSON.stringify([proposta]))
  }

  return proposta
}
