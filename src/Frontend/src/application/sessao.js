// Sessão de quem está logado: o único lugar que sabe entrar, sair e quem é o usuário atual.
//   const usuario = await entrar({ email, senha })   // { chave, nome, perfil }
//   usuarioAtual()                                    // o mesmo objeto, ou null se ninguém entrou
//   perfilAtual()                                     // 'organizador' | 'fornecedor' | 'admin' | null
//   rotaInicialDoPerfil('admin')                      // '/admin/aprovacoes'
//   sair()
import { api } from '../infrastructure/api.js'
import { guardarSessao, lerSessao, limparSessao } from '../infrastructure/armazenamentoDaSessao.js'

// Para onde cada perfil vai depois do login (e quando tenta abrir a área de outro perfil).
const ROTAS_INICIAIS = {
  organizador: '/organizador/eventos',
  fornecedor: '/fornecedor/eventos',
  admin: '/admin/aprovacoes',
}

// Erros da API chegam com a mensagem em português (ver infrastructure/api.js).
export async function entrar({ email, senha }) {
  const resposta = await api.post('/auth/login', { email: email, password: senha })

  const usuario = {
    chave: resposta.user.user_key,
    nome: resposta.user.name,
    perfil: resposta.user.profile,
  }
  guardarSessao({ token: resposta.token, usuario: usuario })
  return usuario
}

export function sair() {
  limparSessao()
}

export function usuarioAtual() {
  return lerSessao()?.usuario ?? null
}

export function perfilAtual() {
  return usuarioAtual()?.perfil ?? null
}

export function rotaInicialDoPerfil(perfil) {
  return ROTAS_INICIAIS[perfil] ?? '/'
}
