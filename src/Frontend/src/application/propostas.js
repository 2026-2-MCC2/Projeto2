// Propostas: comparação e aceite pelo organizador, e envio pelo fornecedor.

import { api } from '../infrastructure/api.js'
import { relerEventoEmMemoria } from './eventos.js'
import { formatarMoeda } from '../domain/formatacao.js'
import { paraData, paraDataIso, paraNumero } from '../domain/validacao.js'

export function buscarComparacaoDePropostas(eventKey) {
  return api.get(`/events/${eventKey}/proposals`)
}

// o aceite muda o custo e o ticket do evento, que é relido em memória
export async function aceitarPropostaDoEvento(eventKey, proposalKey) {
  const comparacao = await api.post(`/events/${eventKey}/proposals/${proposalKey}/accept`, {})
  relerEventoEmMemoria(eventKey)
  return comparacao
}

// propostas que ainda esperam a decisão do organizador
const STATUS_EM_ABERTO = ['sent', 'under_review']

// a proposta em aberto, dentro da validade, com o menor valor do item (recusada, cancelada ou vencida não conta)
export function menorPropostaDisponivel(item) {
  return item.proposals
    .filter((proposta) => !proposta.is_expired && STATUS_EM_ABERTO.includes(proposta.status))
    .reduce(
      (menor, proposta) => (!menor || proposta.amount < menor.amount ? proposta : menor),
      null,
    )
}

export const propostaEscolhida = (item) =>
  item.proposals.find((proposta) => proposta.status === 'accepted')

export const itemJaDecidido = (item) => Boolean(propostaEscolhida(item))

// O organizador escolhe enquanto o evento está em cotação e a validade não passou. Com o item já
// decidido ele ainda pode trocar a escolha por outra, inclusive uma recusada na escolha anterior.
export function podeSerSelecionada(proposta, item, eventoEmCotacao) {
  if (!eventoEmCotacao || proposta.is_expired) return false
  if (itemJaDecidido(item))
    return proposta.status === 'rejected' || STATUS_EM_ABERTO.includes(proposta.status)
  return STATUS_EM_ABERTO.includes(proposta.status)
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
  canceled: 'Evento cancelado',
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
  return {
    valor: formatarMoeda(proposta.amount),
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

// Proposta nova com as fotos escolhidas na etapa 2: a foto precisa da proposta já criada, então elas
// vão uma por uma logo depois. Uma foto que falhar não desfaz a proposta: volta em fotosQueFalharam,
// e o fornecedor tenta de novo na edição.
export async function enviarPropostaComFotos(eventKey, itemKey, rascunho, fotos) {
  const { proposal_key: proposalKey } = await enviarProposta(eventKey, itemKey, rascunho)
  let fotosQueFalharam = 0
  for (const foto of fotos) {
    try {
      await enviarFotoDaProposta(proposalKey, foto)
    } catch {
      fotosQueFalharam += 1
    }
  }
  return { proposalKey, fotosQueFalharam }
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

// histórico do fornecedor logado: { data, total, is_last_page, next_cursor, counts }, da proposta mais
// recente para a mais antiga; counts traz quantas propostas há em cada status, sem o filtro (os cartões
// do topo). A próxima página usa o next_cursor (depoisDe): nova ou retirada no meio não desloca a lista
export function listarMinhasPropostas({ status, limit = 20, depoisDe } = {}) {
  const parametros = new URLSearchParams({ limit: String(limit) })
  if (status) parametros.set('status', status)
  if (depoisDe) parametros.set('after', depoisDe)
  return api.get(`/supplier/proposals?${parametros}`)
}

// até 5 fotos JPG, PNG ou WebP de até 5 MB, só em proposta já enviada; a API confere o tipo real
export const LIMITE_DE_FOTOS = 5
export const TAMANHO_MAXIMO_DA_FOTO = 5 * 1024 * 1024
export const TIPOS_DE_FOTO = ['image/jpeg', 'image/png', 'image/webp']

// mensagem do problema de uma foto escolhida, ou null se ela pode ser enviada
export function problemaDaFoto(arquivo) {
  if (!TIPOS_DE_FOTO.includes(arquivo.type)) return 'Use uma foto JPG, PNG ou WebP.'
  if (arquivo.size > TAMANHO_MAXIMO_DA_FOTO) return 'Escolha uma imagem de até 5 MB.'
  return null
}

export function enviarFotoDaProposta(proposalKey, arquivo) {
  return api.enviarArquivo(`/supplier/proposals/${proposalKey}/photos`, 'photo', arquivo)
}

export function apagarFotoDaProposta(proposalKey, photoKey) {
  return api.delete(`/supplier/proposals/${proposalKey}/photos/${photoKey}`)
}
