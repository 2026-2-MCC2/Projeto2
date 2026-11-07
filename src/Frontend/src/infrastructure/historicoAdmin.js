import { api } from './api.js'

const POR_PAGINA = 20

export async function listarHistorico(pagina = 0) {
  const resposta = await api.get(`/admin/status-history?limit=${POR_PAGINA}&page=${pagina}`)

  return {
    registros: resposta.data.map((evento) => ({
      chave: `${evento.user_key}-${evento.decided_at}-${evento.new_status}`,
      nome: evento.name,
      email: evento.email,
      perfil: evento.profile,
      de: evento.old_status,
      para: evento.new_status,
      motivo: evento.reason,
      decididoEm: evento.decided_at,
      responsavel: evento.admin_name,
    })),
    temMais: !resposta.is_last_page,
  }
}
