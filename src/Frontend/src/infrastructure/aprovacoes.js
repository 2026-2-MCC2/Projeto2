// Painel de aprovações do admin: lista os cadastros pendentes e decide cada um.
// A tela usa nomes em português; aqui eles são traduzidos de/para os nomes do backend.
import { api } from './api.js'

// O backend devolve no máximo 100 por página, do cadastro mais antigo para o mais novo.
const LIMITE = 100

// { cadastros: [{ chave, nome, perfil, email, enviadoEm, cnpj, telefone }], temMais }
export async function listarCadastrosPendentes() {
  const resposta = await api.get(`/admin/users?status=pending&limit=${LIMITE}&page=0`)

  return {
    cadastros: resposta.data.map((usuario) => ({
      chave: usuario.user_key,
      nome: usuario.name,
      perfil: usuario.profile,
      email: usuario.email,
      enviadoEm: usuario.created_at,
      cnpj: usuario.cnpj,
      telefone: usuario.phone,
    })),
    temMais: !resposta.is_last_page,
  }
}

// decisao: 'aprovar' ou 'rejeitar'
export function decidirCadastro(chave, decisao) {
  const status = decisao === 'aprovar' ? 'approved' : 'rejected'
  return api.put(`/admin/users/${encodeURIComponent(chave)}/status`, { status: status })
}
