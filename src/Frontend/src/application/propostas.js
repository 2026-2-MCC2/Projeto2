import { api } from '../infrastructure/api.js'
import { relerEventoEmMemoria } from './eventos.js'
import { diaEmBrasilia, formatarMoeda } from '../domain/formatacao.js'
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

export async function recusarPropostaDoEvento(eventKey, proposalKey) {
  const comparacao = await api.post(`/events/${eventKey}/proposals/${proposalKey}/reject`, {})
  relerEventoEmMemoria(eventKey)
  return comparacao
}

const STATUS_EM_ABERTO = ['sent', 'under_review']

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

// com o item já decidido, a escolha pode trocar inclusive para uma recusada antes
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

const UM_DIA = 24 * 60 * 60 * 1000

// a validade (AAAA-MM-DD) vale até o fim do dia; a conta usa o dia de hoje em Brasília, como a API
export function diasAteVencer(validade) {
  return Math.round((Date.parse(validade) - Date.parse(diaEmBrasilia(Date.now()))) / UM_DIA)
}

const STATUS_DA_PROPOSTA = {
  sent: 'Enviada',
  under_review: 'Em análise',
  accepted: 'Aceita',
  rejected: 'Recusada',
  canceled: 'Evento cancelado',
  withdrawn: 'Retirada',
}

export function traduzirStatusDaProposta(status) {
  return STATUS_DA_PROPOSTA[status] ?? status
}

function paraPropostaDaApi(rascunho) {
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

// mesma regra que a API confere (ela responde 409 nos outros casos)
export function propostaPodeSerAlterada(proposta) {
  return proposta.status === 'sent' && proposta.event?.status === 'open_for_quotes'
}

function enviarProposta(eventKey, itemKey, rascunho) {
  return api.post(
    `/supplier/events/${eventKey}/items/${itemKey}/proposals`,
    paraPropostaDaApi(rascunho),
  )
}

// a foto precisa da proposta já criada; uma que falhar não desfaz a proposta e é reenviada na edição
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

export function atualizarProposta(proposalKey, rascunho) {
  return api.put(`/supplier/proposals/${proposalKey}`, paraPropostaDaApi(rascunho))
}

export function retirarProposta(proposalKey) {
  return api.delete(`/supplier/proposals/${proposalKey}`)
}

export function buscarMinhaProposta(proposalKey) {
  return api.get(`/supplier/proposals/${proposalKey}`)
}

// paginação por cursor: proposta nova ou retirada no meio não desloca a lista
export function listarMinhasPropostas({ status, limit = 20, depoisDe } = {}) {
  const parametros = new URLSearchParams({ limit: String(limit) })
  if (status) parametros.set('status', status)
  if (depoisDe) parametros.set('after', depoisDe)
  return api.get(`/supplier/proposals?${parametros}`)
}

export const LIMITE_DE_FOTOS = 5
const TAMANHO_MAXIMO_DA_FOTO = 5 * 1024 * 1024
export const TIPOS_DE_FOTO = ['image/jpeg', 'image/png', 'image/webp']

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
