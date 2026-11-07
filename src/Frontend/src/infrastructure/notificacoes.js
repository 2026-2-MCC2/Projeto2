import { api } from './api.js'

// sininho: notificações do usuário logado, da mais recente para a mais antiga
export function listarNotificacoes({ depois, limite = 20 } = {}) {
  const parametros = new URLSearchParams({ limit: String(limite) })
  if (depois) parametros.set('after', depois)
  return api.get(`/notifications?${parametros}`)
}

export function marcarNotificacaoComoLida(chave) {
  return api.patch(`/notifications/${chave}/read`)
}

export function marcarTodasComoLidas() {
  return api.post('/notifications/read-all')
}
