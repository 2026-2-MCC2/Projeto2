import { api } from '../infrastructure/api.js'

export function listarEventosDisponiveis({ search = '', limit = 20, page = 0 } = {}) {
  const parametros = new URLSearchParams({ limit: String(limit), page: String(page) })
  if (search.trim()) parametros.set('search', search.trim())
  return api.get(`/supplier/events?${parametros}`)
}

export function buscarEventoDisponivel(eventKey) {
  return api.get(`/supplier/events/${eventKey}`)
}
