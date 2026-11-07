import { api } from './api.js'

// conversa de uma proposta entre o fornecedor e o organizador do evento
export function buscarConversa(chaveDaProposta) {
  return api.get(`/proposals/${chaveDaProposta}/messages`)
}

export function enviarMensagem(chaveDaProposta, texto) {
  return api.post(`/proposals/${chaveDaProposta}/messages`, { body: texto })
}

export function marcarConversaComoLida(chaveDaProposta) {
  return api.post(`/proposals/${chaveDaProposta}/messages/read`)
}

// { total, by_proposal: { [chave]: n } }
export function buscarMensagensNaoLidas() {
  return api.get('/messages/unread')
}

// conversas com mensagem, da última mensagem mais recente para a mais antiga (admin não tem)
export function listarConversas() {
  return api.get('/conversations')
}
