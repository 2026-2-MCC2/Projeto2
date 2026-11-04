// Consulta as propostas recebidas para comparação no evento do organizador.

import { api } from '../infrastructure/api.js'

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
