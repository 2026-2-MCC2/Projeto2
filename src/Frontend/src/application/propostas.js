// Consulta as propostas recebidas para comparação no evento do organizador.

import { api } from '../infrastructure/api.js'

export function buscarComparacaoDePropostas(eventKey) {
  return api.get(`/events/${eventKey}/proposals`)
}
