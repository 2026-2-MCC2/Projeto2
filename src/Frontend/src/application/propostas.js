// Propostas: comparação e aceite pelo organizador, e envio pelo fornecedor.

import { api } from '../infrastructure/api.js'
import { paraData, paraDataIso, paraNumero } from '../domain/validacao.js'

export function buscarComparacaoDePropostas(eventKey) {
  return api.get(`/events/${eventKey}/proposals`)
}

export function aceitarPropostaDoEvento(eventKey, proposalKey) {
  return api.post(`/events/${eventKey}/proposals/${proposalKey}/accept`, {})
}

// a API manda a validade como AAAA-MM-DD
export function formatarValidade(validade) {
  const [ano, mes, dia] = validade.split('-')
  return `${dia}/${mes}/${ano}`
}

// status da proposta na API → como aparece para o fornecedor
const STATUS_DA_PROPOSTA = {
  sent: 'Enviada',
  under_review: 'Em análise',
  accepted: 'Aceita',
  rejected: 'Recusada',
}

export function traduzirStatusDaProposta(status) {
  return STATUS_DA_PROPOSTA[status] ?? status
}

// Rascunho da tela (application/rascunhosDePropostas.js) → body do POST da proposta.
// "R$ 1.500,00" vira 1500 e "30/11/2026" vira "2026-11-30"; opcionais vazios não são enviados.
export function paraPropostaDaApi(rascunho) {
  const proposta = {
    amount: paraNumero(rascunho.valor),
    valid_until: paraDataIso(paraData(rascunho.validade)),
    description: rascunho.descricao.trim(),
    delivery_terms: rascunho.prazoDeEntrega.trim(),
    payment_terms: rascunho.condicaoDePagamento.trim(),
  }

  const opcionais = {
    not_included: rascunho.naoIncluido,
    team: rascunho.equipe,
    warranty: rascunho.garantia,
    notes: rascunho.observacoes,
  }
  for (const [campo, valor] of Object.entries(opcionais)) {
    if (valor.trim()) proposta[campo] = valor.trim()
  }

  return proposta
}

// 201 { proposal_key, status }; os erros chegam com a mensagem em português (infrastructure/api.js)
export function enviarProposta(eventKey, itemKey, rascunho) {
  return api.post(
    `/supplier/events/${eventKey}/items/${itemKey}/proposals`,
    paraPropostaDaApi(rascunho),
  )
}
