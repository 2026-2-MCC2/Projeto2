import { api } from './api.js'

export function buscarRelatorioAdmin({
  limit = 20,
  page = 0,
  eventName,
  organizerName,
  from,
  to,
} = {}) {
  const parametros = new URLSearchParams({ limit: String(limit), page: String(page) })
  if (eventName) parametros.set('event_name', eventName)
  if (organizerName) parametros.set('organizer_name', organizerName)
  if (from) parametros.set('from', from)
  if (to) parametros.set('to', to)
  return api.get(`/admin/reports?${parametros.toString()}`)
}
