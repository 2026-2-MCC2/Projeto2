import { api } from './api.js'

// máximo aceito pelo backend
const LIMITE_POR_PAGINA = 100

// categorias é null para organizador
export async function listarCadastrosPendentes() {
  const resposta = await api.get(`/admin/users?status=pending&limit=${LIMITE_POR_PAGINA}&page=0`)

  return {
    cadastros: resposta.data.map((usuario) => ({
      chave: usuario.user_key,
      nome: usuario.name,
      perfil: usuario.profile,
      email: usuario.email,
      enviadoEm: usuario.created_at,
      cnpj: usuario.cnpj,
      telefone: usuario.phone,
      categorias: usuario.categories,
    })),
    temMais: !resposta.is_last_page,
  }
}

export function decidirCadastro(chave, decisao, motivo) {
  const corpo =
    decisao === 'aprovar' ? { status: 'approved' } : { status: 'rejected', reason: motivo }
  return api.put(`/admin/users/${encodeURIComponent(chave)}/status`, corpo)
}
