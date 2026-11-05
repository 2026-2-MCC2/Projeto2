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

// Detalhe da API (GET /supplier/proposals/:proposal_key) → rascunho das etapas, para editar.
// O contrário do paraPropostaDaApi: 1500 vira "R$ 1.500,00" e "2026-11-30" vira "30/11/2026".
export function paraRascunho(proposta) {
  const valor = Number(proposta.amount).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return {
    valor: `R$ ${valor}`,
    validade: formatarValidade(proposta.valid_until),
    descricao: proposta.description ?? '',
    naoIncluido: proposta.not_included ?? '',
    prazoDeEntrega: proposta.delivery_terms ?? '',
    condicaoDePagamento: proposta.payment_terms ?? '',
    equipe: proposta.team ?? '',
    garantia: proposta.warranty ?? '',
    observacoes: proposta.notes ?? '',
  }
}

// Só a proposta enviada (ainda não analisada) de um evento em cotação pode ser editada ou retirada;
// é a mesma regra que a API confere (ela responde 409 nos outros casos).
export function propostaPodeSerAlterada(proposta) {
  return proposta.status === 'sent' && proposta.event?.status === 'open_for_quotes'
}

// 201 { proposal_key, status }; os erros chegam com a mensagem em português (infrastructure/api.js)
export function enviarProposta(eventKey, itemKey, rascunho) {
  return api.post(
    `/supplier/events/${eventKey}/items/${itemKey}/proposals`,
    paraPropostaDaApi(rascunho),
  )
}

// mesmo body do envio; responde o detalhe atualizado
export function atualizarProposta(proposalKey, rascunho) {
  return api.put(`/supplier/proposals/${proposalKey}`, paraPropostaDaApi(rascunho))
}

// 204: a proposta é apagada e o fornecedor pode enviar outra para o item
export function retirarProposta(proposalKey) {
  return api.delete(`/supplier/proposals/${proposalKey}`)
}

export function buscarMinhaProposta(proposalKey) {
  return api.get(`/supplier/proposals/${proposalKey}`)
}

// histórico do fornecedor logado: { data, total, is_last_page, counts }, da proposta mais recente para a
// mais antiga; counts traz quantas propostas há em cada status, sem o filtro (os cartões do topo)
export function listarMinhasPropostas({ status, limit = 20, page = 0 } = {}) {
  const parametros = new URLSearchParams({ limit: String(limit), page: String(page) })
  if (status) parametros.set('status', status)
  return api.get(`/supplier/proposals?${parametros}`)
}

// até 5 fotos JPG, PNG ou WebP de até 5 MB, só em proposta já enviada; a API confere o tipo real
export const LIMITE_DE_FOTOS = 5
export const TAMANHO_MAXIMO_DA_FOTO = 5 * 1024 * 1024

export function enviarFotoDaProposta(proposalKey, arquivo) {
  return api.enviarArquivo(`/supplier/proposals/${proposalKey}/photos`, 'photo', arquivo)
}

export function apagarFotoDaProposta(proposalKey, photoKey) {
  return api.delete(`/supplier/proposals/${proposalKey}/photos/${photoKey}`)
}
