// Rascunho da proposta que o fornecedor está preenchendo, um por item (event_key + item_key).
// Fica em memória enquanto ele passa pelas 3 etapas: voltar uma etapa não perde o que foi digitado nem
// as fotos escolhidas. Recarregar a página ou sair da conta começa de novo.

import { paraData, paraNumero } from '../domain/validacao.js'

export const RASCUNHO_VAZIO = Object.freeze({
  valor: '',
  validade: '',
  descricao: '',
  naoIncluido: '',
  prazoDeEntrega: '',
  condicaoDePagamento: '',
  equipe: '',
  garantia: '',
  observacoes: '',
  // na edição, a proposta de onde os campos vieram (para não buscar de novo a cada etapa)
  chaveDaProposta: null,
})

const rascunhosPorItem = new Map()
// fotos escolhidas antes de a proposta existir (File do navegador); vão para a API logo depois do envio
const fotosPorItem = new Map()

// Etapa com campo obrigatório ainda vazio (1 ou 2), ou null: abrir a etapa 3 direto pelo endereço
// não pode pular o valor, a validade e a descrição.
export function primeiraEtapaIncompleta(rascunho) {
  if (!(paraNumero(rascunho.valor) > 0) || !paraData(rascunho.validade)) return 1
  if (!rascunho.descricao.trim()) return 2
  return null
}

const chaveDoItem = (eventKey, itemKey) => `${eventKey}/${itemKey}`

export function lerRascunho(eventKey, itemKey) {
  return rascunhosPorItem.get(chaveDoItem(eventKey, itemKey)) ?? RASCUNHO_VAZIO
}

export function atualizarRascunho(eventKey, itemKey, campos) {
  const atualizado = { ...lerRascunho(eventKey, itemKey), ...campos }
  rascunhosPorItem.set(chaveDoItem(eventKey, itemKey), atualizado)
  return atualizado
}

export function descartarRascunho(eventKey, itemKey) {
  rascunhosPorItem.delete(chaveDoItem(eventKey, itemKey))
  fotosPorItem.delete(chaveDoItem(eventKey, itemKey))
}

export function lerFotosPendentes(eventKey, itemKey) {
  return fotosPorItem.get(chaveDoItem(eventKey, itemKey)) ?? []
}

export function definirFotosPendentes(eventKey, itemKey, fotos) {
  fotosPorItem.set(chaveDoItem(eventKey, itemKey), fotos)
}

// chamada ao sair da conta: o próximo usuário da aba não vê o rascunho de outro
export function esquecerRascunhosDePropostas() {
  rascunhosPorItem.clear()
  fotosPorItem.clear()
}
