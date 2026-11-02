import { api } from './api.js'

export function buscarRelatorioAdmin({ limit = 20, page = 0 } = {}) {
  const parametros = new URLSearchParams({ limit: String(limit), page: String(page) })
  return api.get(`/admin/reports?${parametros.toString()}`)
}
