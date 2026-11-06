import { api } from '../infrastructure/api.js'
import { esquecerEventosDaSessao } from './eventos.js'
import { esquecerRascunhosDePropostas } from './rascunhosDePropostas.js'
import {
  aoLimparSessao,
  guardarSessao,
  lerSessao,
  limparSessao,
  ROTA_DO_LOGIN,
} from '../infrastructure/armazenamentoDaSessao.js'

export { ROTA_DO_LOGIN }
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
  limparSessao()
  guardarSessao({ token: resposta.token, usuario: usuario })
  return usuario
}

const SITUACOES_POR_CODIGO = {
  EVP000009: 'pendente',
  EVP000010: 'rejeitado',
  EVP000011: 'bloqueado',
}

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

// o que ficou em memória de uma conta não pode aparecer para a próxima pessoa que usar a aba
aoLimparSessao(() => {
  esquecerEventosDaSessao()
  esquecerRascunhosDePropostas()
})

export function sair() {
  limparSessao()
}

export function usuarioAtual() {
  return lerSessao()?.usuario ?? null
}

export function rotaInicialDoPerfil(perfil) {
  return ROTAS_INICIAIS[perfil] ?? ROTA_DO_LOGIN
}

// "voltar ao início": a área de quem está logado, a landing para quem não está
export function rotaDoInicio() {
  const usuario = usuarioAtual()
  return usuario ? rotaInicialDoPerfil(usuario.perfil) : '/'
}

// o menu e o topo leem o nome da sessão, então ela acompanha os dados vindos da API
function atualizarSessaoComPerfil(dados) {
  const atual = lerSessao()
  if (!dados || !atual?.token) return dados

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
  return dados
}

export async function carregarPerfilAtual() {
  return atualizarSessaoComPerfil(await obterDadosDoUsuarioAtual())
}

// só os campos enviados mudam; e-mail e CNPJ não mudam por aqui
export async function salvarMeusDados(campos) {
  return atualizarSessaoComPerfil(await api.patch('/me', campos))
}

export async function salvarMinhasCategorias(categorias) {
  return atualizarSessaoComPerfil(await api.put('/me/categorias', { categories: categorias }))
}

// a troca encerra os outros logins; o token novo mantém esta sessão aberta
export async function trocarMinhaSenha({ senhaAtual, novaSenha }) {
  const resposta = await api.put('/me/senha', {
    current_password: senhaAtual,
    new_password: novaSenha,
  })
  guardarSessao({ ...lerSessao(), token: resposta.token })
}
