import { api } from '../infrastructure/api.js'
import { guardarSessao, lerSessao, limparSessao } from '../infrastructure/armazenamentoDaSessao.js'
import { obterDadosDoUsuarioAtual } from '../infrastructure/usuarios.js'

// também usada quando alguém tenta abrir a área de outro perfil
const ROTAS_INICIAIS = {
  organizador: '/organizador/eventos',
  fornecedor: '/fornecedor/eventos',
  admin: '/admin/aprovacoes',
}

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

const SITUACOES_POR_CODIGO = { EVP000009: 'pendente', EVP000010: 'rejeitado' }

// login barrado por cadastro pendente ou rejeitado: dados para a tela de acompanhamento, ou null
export function acompanhamentoDoCadastro(falhaNoLogin) {
  const situacao = SITUACOES_POR_CODIGO[falhaNoLogin.codigo]
  const detalhes = falhaNoLogin.detalhes
  if (!situacao || !detalhes) return null

  return {
    situacao,
    perfil: detalhes.profile,
    nome: detalhes.name,
    cnpj: detalhes.cnpj,
    categorias: detalhes.categories,
    enviadoEm: detalhes.submitted_at,
    decididoEm: detalhes.decided_at,
    motivo: detalhes.reason,
  }
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

export async function carregarPerfilAtual() {
  const dados = await obterDadosDoUsuarioAtual()
  if (dados) {
    const atual = lerSessao()
    if (atual?.token) {
      guardarSessao({
        token: atual.token,
        usuario: {
          ...atual.usuario,
          chave: dados.user_key,
          nome: dados.name,
          email: dados.email,
          perfil: dados.profile,
          cnpj: dados.cnpj,
          phone: dados.phone,
          responsible_name: dados.responsible_name,
          city: dados.city,
          state: dados.state,
          categories: dados.categories,
        },
      })
    }
  }
  return dados
}
